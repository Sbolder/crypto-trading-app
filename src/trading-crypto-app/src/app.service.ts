import { Injectable } from '@nestjs/common';
import { SecretService, initializeBinanceClient } from './secret.service';
import { HistoryDataRepository, HistoryModel } from './repositories/history-data.repository';
import { OrderBuyMarketRepository, MarketBuyModel } from './repositories/market-buy-data.repository'
import Binance from 'node-binance-api';
import { v4 as uuidv4 } from 'uuid';
import { TelegramService } from './services/telegram.service';

@Injectable()
export class AppService {
    private client: Binance;
    private readonly symbolValueExchange: string = "BUSD";
    private readonly currency: string = "EUR";

    constructor(private readonly secretService: SecretService,
        private repository: HistoryDataRepository,
        private marketBuyRepository: OrderBuyMarketRepository,
        private bot: TelegramService) {
        this.initializeClient();
    }

    private async initializeClient() {
        const apiKey = await this.secretService.getApiKey();
        const apiSecret = await this.secretService.getApiSecret();
        this.client = initializeBinanceClient(apiKey, apiSecret);
    }

    async searchBetterBuyOpportunity() {

        const BUSDBalance = await this.getAccountBalance(this.symbolValueExchange);

        //console.log("TE", symbolsList);
        if (BUSDBalance <= 10)
            return 'BUSD Balance too low';
        else {
            console.info('BUSD Balance:', BUSDBalance, ' trying to search good opportunity');
            const symbolsList = await this.getExchangeInfo();
            const worsteperformnacesymbol = await this.getWorstPerformingSymbol(symbolsList);
            const singleTransactionQuantity = BUSDBalance / 5;
            for (const [symbol, priceChangePercent] of Object.entries(worsteperformnacesymbol)) {
                console.log(`Symbol: ${symbol}, Price Change Percent: ${priceChangePercent}`);
                this.marketBuy(symbol, singleTransactionQuantity);

            }

        }

    }

    //method to retrive account balance of specific symbol
    async getAccountBalance(symbol: string): Promise<number> {

        return this.client.balance()
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
            const data = await this.client.prevDay(symbol);
            return { symbol: data.symbol, priceChangePercent: data.priceChangePercent };
        }));

        priceChanges.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
        const worstPerformingSymbols = priceChanges.slice(-2);
        return worstPerformingSymbols.reduce((obj, symbol) => {
            obj[symbol.symbol] = symbol.priceChangePercent;
            return obj;
        }, {});
    }

    //utils method to retrive full list of symbol available on binance for EUR currency
    async getExchangeInfo(): Promise<string[]> {
        return await this.client.exchangeInfo()
            .then((exchangeInfo) => {
                const symbols = exchangeInfo.symbols;
                const busdSymbols = symbols.filter(symbol => symbol.quoteAsset === this.currency);
                return busdSymbols.map(symbol => symbol.symbol);

            })
            .catch((error) => {
                // Handle the error
            });

    }

    //utils method to retrive full list of symbol available on binance for EUR currency
    async checkLimitMarket(symbol: string, quantity: number, price: number): Promise<boolean> {
        return (async () => {
            const exchangeInfo = await this.client.exchangeInfo();
            const symbolInfo = exchangeInfo.symbols.find((s) => s.symbol === symbol);
            const minNotional = symbolInfo.filters[3].minNotional;

            // Check if the notional value of the order is above the minimum allowed value
            if (quantity * price < minNotional) {
                throw new Error(`Order notional value is below the minimum allowed value of ${minNotional}`);
            }

            if (symbolInfo.filters[1].minQty < quantity && symbolInfo.filters[1].maxQty > quantity) {
                console.info('minQty: ', symbolInfo.filters[1].minQty, ' maxQty: ', symbolInfo.filters[1].maxQty, ' order Quantity: ', quantity);
                return true;
            } else {
                throw new Error(`Order quantity value is not in the range min e max`);
                
            }
        })();
    }


    //order buy a crypto not in async place order and store result in dynamodb 
    async marketBuy(symbol: string, quantity: number) {
        const correctSymbolExchange = symbol.replace(this.currency, this.symbolValueExchange);
        
        try {
            const assetPrice = await this.getAssetPrice(correctSymbolExchange);
            const quantityExchange = Math.trunc(quantity / assetPrice);
            const orderValid = await this.checkLimitMarket(correctSymbolExchange, quantityExchange, assetPrice);
            if (orderValid) {
                console.info('order quantity is valid -- proceed to place a order on market', correctSymbolExchange)
                const order = await this.client.marketBuy(correctSymbolExchange, quantityExchange);
                const now = new Date();
                const createdAt = now.toISOString();
                const orderDetail: MarketBuyModel = {
                    id: uuidv4(),
                    symbol: correctSymbolExchange,
                    price: String(assetPrice),
                    atDate: createdAt,
                    order: JSON.stringify(order)
                };
                this.marketBuyRepository.insertOrderBuyMarket(orderDetail);
                this.bot.sendMessage(`Buy on market details: ${orderDetail.order}`)
            }
            else {
                console.warn("order failed because min or max quantity is out of range symbol: ", symbol);
            }

        } catch (error) {
            console.error(error);
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
            const assetPrice = await this.client.prices(historyModel.symbol)
            historyModel.price = assetPrice[historyModel.symbol];
            this.repository.insertItem(historyModel)
            return assetPrice[historyModel.symbol];

        })();

    }








}
