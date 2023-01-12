import { Injectable } from '@nestjs/common';
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

}

