import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaapiRequestModel, TechnicalIndicatorData } from '../models/taapi.model';
import { SecretService } from '../secret.service';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { TechnicalIndicatorsRepository } from '../repositories/technical-indicators.repository';
import { AppService } from '../app.service';
const fetch = require('node-fetch');


@Injectable()
export class TaapiService {
    private taapiUrl: string;
    private taapiSecretToken: string;
    private request: TaapiRequestModel;
    private s3 = new AWS.S3();

    constructor(private readonly appService: AppService,
        private configService: ConfigService,
        private repository: TechnicalIndicatorsRepository) {
        this.taapiUrl = this.configService.get<string>('TAAPI_URL');
        this.taapiSecretToken = this.configService.get<string>('TAAPI_SECRET_TOKEN');
        this.request = {
            secret: this.taapiSecretToken,
            construct: {
                exchange: "binance",
                symbol: "DEFAULT",
                interval: "1m",
                indicators: [
                    {
                        id: "movingAverageBuy",
                        indicator: "ma",
                        period: 6
                    },
                    {
                        id: "movingAverageSell",
                        indicator: "ma",
                        period: 10
                    },
                    {
                        id: "rsi",
                        indicator: "rsi",
                        period: 5
                    },
                    {
                        id: "rsiSell",
                        indicator: "rsi",
                        period: 14
                    },
                    {
                        id: "bbands2",
                        indicator: "bbands2",
                        period: 200
                    },
                    {
                        id: "mom",
                        indicator: "mom",
                        period: 10
                    },
                    {
                        id: "fibonacciretracement",
                        indicator: "fibonacciretracement"
                    },
                ]
            }
        };

    }

    private async getIndicators(symbol: string): Promise<TechnicalIndicatorData> {
        this.request.construct.symbol = symbol;
        const response = await fetch(this.taapiUrl + '/bulk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.request)
        });
        const data = await response.json();
        return data as TechnicalIndicatorData;

    }

    async applyStrategy(symbol: string): Promise<string> {
        var requestId = uuidv4();
        console.info("try to retrieve technical indicator for symbol: ", symbol)
        var symbolForBinance: string = symbol.replace("/", "");
        const actualPrice = await this.appService.getAssetPrice(symbolForBinance);
        const indicators = await this.getIndicators(symbol);
        var buyOperation = await this.evalutionBuy(indicators);
        var sellOperation = await this.evaluationSell(indicators);
        const reportToFile = `${symbol}|${buyOperation}|${sellOperation}|${actualPrice}|${requestId}`;
        await this.writeLineToFile(reportToFile);
        await this.repository.insertItem(requestId, indicators);
        return String("BUY evaluation: " + buyOperation + " SELL evaluation: " + sellOperation);
    }

    async runStrategy(symbol: string): Promise<{ operation: string, TechnicalIndicators: any }> {

        console.info("try to retrieve technical indicator for symbol: ", symbol)
        const indicators = await this.getIndicators(symbol);
        var buyOperation = await this.evalutionBuy(indicators);
        var sellOperation = await this.evaluationSell(indicators);
        if (buyOperation)
            return { operation: "B", TechnicalIndicators: indicators };
        else if (sellOperation)
            return { operation: "S", TechnicalIndicators: indicators };
        else
            return { operation: "H", TechnicalIndicators: indicators };
    }

    //SELL SELL SELL SELL SELL SELL SELL SELL SELL SELL SELL
    private async evaluationSell(indicators: TechnicalIndicatorData): Promise<boolean> {
        const movingAverageObject = indicators.data.find(obj => obj.id === 'movingAverageSell');
        const bbands2Object = indicators.data.find(obj => obj.id === 'bbands2');
        const rsiObject = indicators.data.find(obj => obj.id === 'rsiSell');

        if (
            movingAverageObject.result['value'] > bbands2Object.result['valueUpperBand'] &&
            rsiObject.result['value'] > 70) {


            return true;

        }
        // HOLD
        return false;


    }
    //BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY BUY
    private async evalutionBuy(indicators: TechnicalIndicatorData): Promise<boolean> {
        const movingAverageObject = indicators.data.find(obj => obj.id === 'movingAverageBuy');
        const bbands2Object = indicators.data.find(obj => obj.id === 'bbands2');
        const rsiObject = indicators.data.find(obj => obj.id === 'rsi');
        const momObject = indicators.data.find(obj => obj.id === "mom");




        if (
            movingAverageObject.result['value'] < bbands2Object.result['valueLowerBand'] &&
            rsiObject.result['value'] < 30 &&
            momObject.result['value'] > -20) {
            // BUY
            return true;
        }
        // HOLD
        return false;
    }


    async writeLineToFile(line: string) {
        const existingContent = await this.s3.getObject({ Bucket: 'trading-crypto-app', Key: 'data.csv' }).promise();
        const newContent = existingContent.Body + line + '\n';

        await this.s3.putObject({
            Bucket: 'trading-crypto-app',
            Key: 'data.csv',
            Body: newContent
        }).promise();
    }




}