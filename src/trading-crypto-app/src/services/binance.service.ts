import { Injectable } from '@nestjs/common';
import { AppService } from '../app.service';
import { SecretService } from '../secret.service';
const Binance = require('node-binance-api');

@Injectable()
export class BinanceService {
    private binance: any;

    constructor(private readonly secretService: SecretService) { }



    async getBinanceClient(): Promise<any> {
        if (this.binance != null)
            return this.binance;

        const apiKey = await this.secretService.getApiKey();
        const apiSecret = await this.secretService.getApiSecret();
        const client = await new Binance().options({
            APIKEY: apiKey,
            APISECRET: apiSecret,
            'family': 4,
        });
        return client;
    }

    //Method to buy specific symbol per precalculated quantity
    async MarketBuy(symbol: string, quantity: number): Promise<any> {

        try {
            console.info('Try to place an order on market for symbol: ', symbol, " for quantity: ", quantity);

            let client = await this.getBinanceClient()
            const order = await client.marketBuy(symbol, quantity);
            return order;
            

        } catch (error) {
            console.error(error);
            return false;
        }

    }

    //Method that sell all avaiable crypto for symbol
    async marketSellAllForSymbol(symbol: string, quantity: number): Promise<any> {
        try {

            let client = await this.getBinanceClient()
            const result = await client.marketSell(symbol, quantity);
            return result;

        } catch (error) {
            console.error(error);
        }
    }



    //method to get asset current price - store value on our database
    async getAssetPrice(symbol: string): Promise<number> {


        return (async () => {
            let client = await this.getBinanceClient()
            const assetPrice = await client.prices(symbol)

            return assetPrice[symbol];

        })();

    }


    //method to retrive account balance of specific symbol
    async getAccountBalance(symbol: string): Promise<number> {
        let client = await this.getBinanceClient()
        return await client.balance()
            .then((response) => {
                return response[symbol].available;
            })
            .catch((error) => {
                // Handle the error
                console.error("error in balance account retriving: ", error);

            })
    }

    //method to retrive account balance of specific symbol
    async PlaceStopLossOrder(symbol: string, quantity: number, stopPrice: number): Promise<number> {
        let type = "STOP_LOSS_LIMIT";

        let client = await this.getBinanceClient()
        let price = await this.getAssetPrice(symbol);
        return await client.sell(symbol, quantity, stopPrice, { stopPrice: stopPrice, type: type })
            .then((response) => {
                return response;
            })
            .catch((error) => {
                console.error("error during place a market stop loss", error);
                return "STOP_LOSS_ERROR";
            })
        
    }

    async CancelAllOpenOrders(symbol: string) {

        let client = await this.getBinanceClient()
        const deleteAllOrder = await client.cancelAll(symbol);
        console.info("delete all open orders result: ", JSON.stringify(deleteAllOrder));

    }
}

