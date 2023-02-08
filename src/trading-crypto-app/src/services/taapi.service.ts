import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaapiRequestModel, TechnicalIndicatorData } from '../models/taapi.model';
import { SecretService } from '../secret.service';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { TechnicalIndicatorsRepository } from '../repositories/technical-indicators.repository';


@Injectable()
export class TaapiService {
    private taapiUrl: string;
    private taapiSecretToken: string;
    private request: TaapiRequestModel;
    private s3 = new AWS.S3();

    constructor(private readonly secretService: SecretService,
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
                        id: "movingAverage",
                        indicator: "ma"
                    },
                    {
                        id: "rsi",
                        indicator: "rsi"
                    },
                    {
                        id: "macd",
                        indicator: "macd"
                    },
                    {
                        id: "fibonacciretracement",
                        indicator: "fibonacciretracement"
                    },
                    {
                        id: "ichimoku",
                        indicator: "ichimoku"
                    },
                    {
                        id: "stoch",
                        indicator: "stoch"
                    },
                    {
                        id: "aroon",
                        indicator: "aroon"
                    },
                    {
                        id: "obv",
                        indicator: "obv"
                    },
                    {
                        id: "sar",
                        indicator: "sar"
                    },
                    {
                        id: "bbands2",
                        indicator: "bbands2"
                    }
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
        const indicators = await this.getIndicators(symbol);
        var buyOperation = await this.evalutionBuy(indicators);
        var sellOperation = await this.evaluationSell(indicators);
        const reportToFile = `${symbol}|${buyOperation}|${sellOperation}|${requestId}`;
        await this.writeLineToFile(reportToFile);
        await this.repository.insertItem(requestId, indicators);
        return String("BUY evaluation: " + buyOperation + " SELL evaluation: " + sellOperation);
    }

    private async evaluationSell(indicators: TechnicalIndicatorData): Promise<boolean> {
        const movingAverageObject = indicators.data.find(obj => obj.id === 'movingAverage');
        const bbands2Object = indicators.data.find(obj => obj.id === 'bbands2');
        const rsiObject = indicators.data.find(obj => obj.id === 'rsi');
        const macdObject = indicators.data.find(obj => obj.id === 'macd');
        const fibonacciretracementObject = indicators.data.find(obj => obj.id === 'fibonacciretracement');
        const ichimokuObject = indicators.data.find(obj => obj.id === 'ichimoku');
        const stochObject = indicators.data.find(obj => obj.id === 'stoch');
        const obvObject = indicators.data.find(obj => obj.id === 'obv');
        const sarObject = indicators.data.find(obj => obj.id === 'sar');

        if (
            movingAverageObject.result['value'] < bbands2Object.result['valueUpperBand'] &&
            rsiObject.result['value'] > 70 &&
            macdObject.result['valueMACD'] < macdObject.result['valueMACDSignal'] &&
            fibonacciretracementObject.result['value'] < ichimokuObject.result['base'] &&
            stochObject.result['valueD'] < 20 &&
            obvObject.result['value'] < sarObject.result['value']) {


            var stopLoss = movingAverageObject.result['value'] * 0.98;
            if (stopLoss >= bbands2Object.result['valuelowerBand']) {
                return true; //SELL
            }

            var takeProfit = movingAverageObject.result['value'] * 1.02;
            if (takeProfit <= bbands2Object.result['valueUpperBand']) {
                return true; //SELL
            }

            return false;

        }
        // HOLD
        return false;


    }

    private async evalutionBuy(indicators: TechnicalIndicatorData): Promise<boolean> {
        const movingAverageObject = indicators.data.find(obj => obj.id === 'movingAverage');
        const bbands2Object = indicators.data.find(obj => obj.id === 'bbands2');
        const rsiObject = indicators.data.find(obj => obj.id === 'rsi');
        const macdObject = indicators.data.find(obj => obj.id === 'macd');
        const fibonacciretracementObject = indicators.data.find(obj => obj.id === 'fibonacciretracement');
        const ichimokuObject = indicators.data.find(obj => obj.id === 'ichimoku');
        const stochObject = indicators.data.find(obj => obj.id === 'stoch');
        const obvObject = indicators.data.find(obj => obj.id === 'obv');
        const sarObject = indicators.data.find(obj => obj.id === 'sar');



        if (
            movingAverageObject.result['value'] < bbands2Object.result['valueLowerBand'] &&
            rsiObject.result['value'] < 30 &&
            macdObject.result['valueMACD'] > macdObject.result['valueMACDSignal'] &&
            fibonacciretracementObject.result['value'] > ichimokuObject.result['base'] &&
            stochObject.result['valueD'] > 80 &&
            obvObject.result['value'] > sarObject.result['value']) {
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