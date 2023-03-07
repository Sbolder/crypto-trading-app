import { Injectable } from "@nestjs/common";
import { AppService } from "../app.service";
import { TechnicalIndicator, TechnicalIndicatorData } from "../models/taapi.model";
import { BinanceService } from "./binance.service";
import { TaapiService } from "./taapi.service";
import { TelegramService } from "./telegram.service";

@Injectable()
export class TradingService {

    //
    private symbolForIndicator: string;
    private symbolForBinance: string;
    private bet: number = 25;


    constructor(private binance: BinanceService,
        private readonly indicatorService: TaapiService,
        private readonly appService: AppService,
        private readonly bot: TelegramService) {

    }

    async applyStrategy(symbol: string, quantity: number = this.bet, percentStopLoss:number): Promise<string> {
        this.bet = quantity;
        this.symbolForIndicator = symbol;
        this.symbolForBinance = symbol.replace("/", "");
        console.info(`apply strategy for symbolIndicator: ${this.symbolForIndicator}, binance: ${this.symbolForBinance}, for quantity: ${this.bet}`);


        var operation = await this.indicatorService.runStrategy(this.symbolForIndicator);
        if (operation.operation == "B") {
            console.info("BUY signal");
            await this.ExecuteBuyOperation(percentStopLoss, operation.TechnicalIndicators);
        }
        else if (operation.operation == "S") {
            console.info("SELL signal");
            await this.ExecuteSellOperation();
        }
        else if (operation.operation == "H") {
            console.info("HOLD SIGNAL --- NOTHING TO DO");
        }
        return String(operation.operation);
    }


    private async ExecuteBuyOperation(percentStopLoss: number, indicators: TechnicalIndicatorData) {
        const assetPrice = await this.binance.getAssetPrice(this.symbolForBinance);
        const currentBalance = await this.binance.getAccountBalance("USDT");
        if (currentBalance < this.bet) {
            console.error("USDT not avaiable on binace account");
            this.bot.sendMessage("BUY SIGNAL was received, but no USDT avaiable on binance account");
            return;
        }
        var amount: number = this.bet / assetPrice;
        var finalAmount = await this.appService.checkLimitMarket(this.symbolForBinance, amount, assetPrice, "BUY");


        const response = await this.binance.MarketBuy(this.symbolForBinance, finalAmount);
        this.bot.sendMessage(JSON.stringify(response));


        if (response.status == "FILLED") {
            const fills = response.fills;
            const price = Number(fills[0].price);
            const quantityExchanged = fills[0].qty;
            const stopPrice = this.calculateStopLossPrice(percentStopLoss, price, indicators);
            const marketStopLossResult = await this.binance.PlaceStopLossOrder(this.symbolForBinance, quantityExchanged, stopPrice);
            console.log("stoploss result", marketStopLossResult);
            this.bot.sendMessage(JSON.stringify(marketStopLossResult));
        }
        
        
    }

    private async ExecuteSellOperation() {
        await this.binance.CancelAllOpenOrders(this.symbolForBinance);
        const currentBalance = await this.binance.getAccountBalance(this.symbolForIndicator.replace("/USDT",""));
        const assetPrice = await this.binance.getAssetPrice(this.symbolForBinance);
        var finalAmount = await this.appService.checkLimitMarket(this.symbolForBinance, currentBalance, assetPrice, "S");

        
        const response = await this.binance.marketSellAllForSymbol(this.symbolForBinance, finalAmount);
        
        this.bot.sendMessage(JSON.stringify(response));
    }

    private calculateStopLossPrice(percentStopLoss: number, price: number, indicators: TechnicalIndicatorData): number {
        console.info("calculating exit strategy ");
        const fibonacciretracement = indicators.data.find(obj => obj.id === 'fibonacciretracement');
        console.info("fibonacciTrand: ", fibonacciretracement.result['trend']);

        if (fibonacciretracement.result['trend'] === "DOWNTREND") {
            console.info("Calculate stop loss on fibonacci trand with tollerance")
            const stopLossAmount = fibonacciretracement.result['endPrice'] * (percentStopLoss / 100);
            const stopLossPrice = fibonacciretracement.result['endPrice'] - stopLossAmount;
            return +stopLossPrice.toFixed(2);
        }
        console.info("buy operation executed, but finobacci trand not in downtrand, so is settend stop loss with default tolleration risk.")
        percentStopLoss = percentStopLoss + 0,25;
        const stopLossAmount = price * (percentStopLoss / 100);
        const stopLossPrice = price - stopLossAmount;
        console.info("payedPrice: ", price, " percentStopLoss is: ", percentStopLoss, " stopLossPrice: ", stopLossPrice);
        return +stopLossPrice.toFixed(2);
    }
}