import { Injectable } from '@nestjs/common';
import { SecretService} from './secret.service';
import { HistoryDataRepository, HistoryModel } from './repositories/history-data.repository';
import { OrderBuyMarketRepository, MarketBuyModel } from './repositories/market-buy-data.repository'
import Binance from 'node-binance-api';
import { v4 as uuidv4 } from 'uuid';
import { TelegramService } from './services/telegram.service';
import { BinanceService } from './services/binance.service';

@Injectable()
export class AppService {
    //private client: Binance;
    private readonly symbolValueExchange: string = "BUSD";
    private readonly currency: string = "EUR";

    constructor(private readonly secretService: SecretService,
        private repository: HistoryDataRepository,
        private marketBuyRepository: OrderBuyMarketRepository,
        private bot: TelegramService,
        private binance: BinanceService) {
        //this.initializeClient();
    }

    /*async initializeClient() {
        try {


            const apiKey = await this.secretService.getApiKey();
            const apiSecret = await this.secretService.getApiSecret();
            this.client = new Binance().options({
                APIKEY: apiKey,
                APISECRET: apiSecret,
                'family': 4,
            });
        } catch (error) {
            console.error(`Error getting secrets: ${error}`);
        }
    }*/

    async searchBetterBuyOpportunity() {

        const BUSDBalance = await this.getAccountBalance(this.symbolValueExchange);

        if (BUSDBalance <= 10) {
            console.info("BUSD balance to low")
            return;
        }

        else {
            console.info('BUSD Balance:', BUSDBalance, ' trying to search good opportunity');
            const symbolsList = await this.getExchangeInfo();
            const worsteperformnacesymbol = await this.getWorstPerformingSymbol(symbolsList);
            let singleTransactionQuantity = 0;
            if (BUSDBalance >= 100)
                singleTransactionQuantity = BUSDBalance / 5;
            else if (BUSDBalance < 100 && BUSDBalance >= 50)
                singleTransactionQuantity = BUSDBalance / 2;
            else if (BUSDBalance < 50)
                singleTransactionQuantity = BUSDBalance;
            let counterbuy = 0;
            for (const [symbol, priceChangePercent] of Object.entries(worsteperformnacesymbol)) {
                console.info(`Symbol: ${symbol}, Price Change Percent: ${priceChangePercent}`);
                //check the worste performance is in negative, else wait next execution to check better opportunity
                if (priceChangePercent != 0 && counterbuy < 2) {
                    let result = await this.marketBuy(symbol, singleTransactionQuantity);
                    if (result)
                        counterbuy++;
                }
                else {
                    console.info(`Symbol: ${symbol}, Price Change Percent: ${priceChangePercent} then do nothing, wait better opportunity`);
                    this.bot.sendMessage("didn't find good opportunity, try later");

                }


            }

        }

    }

    //method to retrive account balance of specific symbol
    async getAccountBalance(symbol: string): Promise<number> {
        let client = await this.binance.getBinanceClient()
        return await client.balance()
            .then((response) => {
                return response[symbol].available;
            })
            .catch((error) => {
                // Handle the error
                console.error("error in balance account retriving: ", error);

            })
    }

    //utils method to find the 3 worste performnac ein the last 24h and retrive a key value pair of symbol and percent of performance
    async getWorstPerformingSymbol(symbols: string[]): Promise<{ [key: string]: number }> {

        const priceChanges = await Promise.all(symbols.map(async symbol => {
            let client = await this.binance.getBinanceClient()
            const data = await client.prevDay(symbol);
            return { symbol: data.symbol, priceChangePercent: data.priceChangePercent };
        }));
        priceChanges.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
        const worstPerformingSymbols = priceChanges.slice(-10);
        return worstPerformingSymbols.reduce((obj, symbol) => {
            obj[symbol.symbol] = symbol.priceChangePercent;
            return obj;
        }, {});
    }

    //utils method to retrive full list of symbol available on binance for EUR currency
    async getExchangeInfo(): Promise<string[]> {
        let client = await this.binance.getBinanceClient()
        return await client.exchangeInfo()
            .then((exchangeInfo) => {
                const symbols = exchangeInfo.symbols;
                const busdSymbols = symbols.filter(symbol => symbol.quoteAsset === this.currency);
                return busdSymbols.map(symbol => symbol.symbol);

            })
            .catch((error) => {
                console.error("Error during retrieving exchangeInfo from binance", error)
                throw new Error(error);
                // Handle the error
            });

    }

    //utils method to retrive full list of symbol available on binance for EUR currency
    async checkLimitMarket(symbol: string, quantity: number, price: number): Promise<number> {
        return (async () => {
            let client = await this.binance.getBinanceClient()
            const exchangeInfo = await client.exchangeInfo();
            const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol);
            const minNotional = symbolInfo.filters[3].minNotional;
            const lotSizeFilter = symbolInfo.filters.find((f) => f.filterType === "LOT_SIZE");
            const lotSize = lotSizeFilter.stepSize;
            const precisionFilter = symbolInfo.filters.find((f) => f.filterType === "PRICE_FILTER");
            const maxPrecision = precisionFilter.tickSize;
            let newQuantity = quantity;

            // Check if the notional value of the order is above the minimum allowed value
            if (quantity * price < minNotional) {
                throw new Error(`Order notional value is below the minimum allowed value of ${minNotional}`);
            }

            //check if quantity is multiple of lotSize
            if (quantity % lotSize !== 0) {
                const rounding = Math.round(quantity / lotSize);
                newQuantity = rounding * lotSize;
                if (newQuantity > quantity) {
                    newQuantity = newQuantity - lotSize;
                }
            }

            // Check if the precision of the quantity is within the allowed range
            if (newQuantity.toString().split(".")[1].length > maxPrecision) {
                newQuantity = Number(newQuantity.toFixed(maxPrecision));
                console.info(`Quantity precision has been rounded to ${maxPrecision} decimal places`);
            }


            // Check if the order quantity is within the range of minQty and maxQty 
            if (symbolInfo.filters[1].minQty <= newQuantity && symbolInfo.filters[1].maxQty >= newQuantity) {
                console.info('minQty: ', symbolInfo.filters[1].minQty, ' maxQty: ', symbolInfo.filters[1].maxQty, ' order Quantity: ', newQuantity);
                return newQuantity;
            } else {
                throw new Error(`Order quantity value is not in the range min e max`);
            }
        })();
    }


    //order buy a crypto not in async place order and store result in dynamodb 
    async marketBuy(symbol: string, quantity: number): Promise<boolean> {
        const correctSymbolExchange = symbol.replace(this.currency, this.symbolValueExchange);

        try {
            const assetPrice = await this.getAssetPrice(correctSymbolExchange);
            const quantityExchange = Math.trunc(quantity / assetPrice);
            const newQuantity = await this.checkLimitMarket(correctSymbolExchange, quantityExchange, assetPrice);
            if (newQuantity > 0) {
                console.info('order quantity is valid -- proceed to place a order on market', correctSymbolExchange)
                let client = await this.binance.getBinanceClient()
                const order = await client.marketBuy(correctSymbolExchange, newQuantity);
                const now = new Date();
                const createdAt = now.toISOString();
                const orderDetail: MarketBuyModel = {
                    id: uuidv4(),
                    symbol: correctSymbolExchange,
                    price: String(assetPrice),
                    quantity: String(newQuantity),
                    status: 'IN-PORTFOLIO',
                    atDate: createdAt,
                    order: JSON.stringify(order)
                };
                this.marketBuyRepository.insertOrderBuyMarket(orderDetail);
                this.bot.sendMessage(`Buy on market details: ${orderDetail.order}`)
                return true;
            }
            else {
                console.warn("order failed because min or max quantity is out of range symbol: ", symbol);
                return false;
            }

        } catch (error) {
            console.error(error);
            this.bot.sendMessage(`Error during buy assets ${JSON.stringify(error)}`);
        }
    }

    //method to get asset current price - store value on our database
    async getAssetPrice(symbol: string): Promise<number> {
        const now = new Date();
        const createdAt = now.toISOString();
        const historyModel: HistoryModel = {
            id: uuidv4(),
            symbol: `${symbol}`,
            price: null,
            atDate: createdAt
        };

        return (async () => {
            let client = await this.binance.getBinanceClient()
            const assetPrice = await client.prices(historyModel.symbol)
            historyModel.price = assetPrice[historyModel.symbol];
            this.repository.insertItem(historyModel)
            return assetPrice[historyModel.symbol];

        })();

    }

    //method to check that there are a profit and decide sell asset or no
    //percent of profit was selected from user in api parameter
    async checkProfit(percentProfit: number) {

        const portfolioAssetList = await this.marketBuyRepository.queryByStatus('IN-PORTFOLIO');
        for (const item of portfolioAssetList.Items) {
            let currentPrice = await this.getAssetPrice(item.symbol.S);
            let investment = Number(item.price.S) * Number(item.quantity.S);
            let profit = (currentPrice - Number(item.price.S)) * Number(item.quantity.S);

            if (profit / investment > percentProfit / 100) {
                const marketBuyModel: MarketBuyModel = {
                    id: item.id.S,
                    symbol: item.symbol.S,
                    price: item.price.S,
                    quantity: item.quantity.S,
                    status: item.status.S,
                    atDate: item.atDate.S,
                    order: item.order.S
                }
                console.info("SELL currentPrice: ", currentPrice, "olderprice, ", item.price.S);
                await this.marketSell(marketBuyModel);
            } else {
                console.info("NO SELL currentPrice: ", currentPrice, "olderprice, ", item.price.S);
                this.bot.sendMessage(`NO SELL OPERATION no profit for: ${item.symbol.S} because currentPrice is ${currentPrice} but we have payed ${item.price.S}`)
            }

        }


    }


    //order sell a crypto place order and store result in dynamodb and send message at telegram account
    async marketSell(order: MarketBuyModel) {
        try {
            console.info('order quantity is valid -- proceed to place a order on market', order.symbol)
            const trueQuantity = await this.getAccountBalance(order.symbol.replace(this.symbolValueExchange, ""));
            const assetPrice = await this.getAssetPrice(order.symbol);
            const newQuantity = await this.checkLimitMarket(order.symbol, trueQuantity, assetPrice);
            let client = await this.binance.getBinanceClient()
            const result = await client.marketSell(order.symbol, newQuantity);
            if (result.status == 'FILLED') {
                const updatedFields = { status: 'SOLD' };

                await this.marketBuyRepository.updateOrderBuyMarket(order.id, order.symbol, updatedFields);
                this.bot.sendMessage(`SELL assets operation executed: market details: ${JSON.stringify(result)}`)

            }
            else {
                console.error("Error during sell assets operation: ", result);
                this.bot.sendMessage(`SELL ERROR: ${JSON.stringify(result)}`)
            }

        } catch (error) {
            console.error(error);
            this.bot.sendMessage(`SELL ERROR: ${JSON.stringify(error)}`)
        }
    }








}
