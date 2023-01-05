import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
const Binance = require('node-binance-api');

AWS.config.update({
  region: 'eu-central-1'
});

@Injectable()
export class SecretService {
  private readonly secretsManager = new AWS.SecretsManager();

  async getApiKey(): Promise<string> {
    const secret = await this.secretsManager
      .getSecretValue({ SecretId: 'prod/appTrading/binance-api' })
      .promise();
    return JSON.parse(secret.SecretString).binanceApiKey;
  }

  async getApiSecret(): Promise<string> {
    const secret = await this.secretsManager
      .getSecretValue({ SecretId: 'prod/appTrading/binance-api' })
      .promise();
    return JSON.parse(secret.SecretString).binanceApiSecret;
  }
}


export const initializeBinanceClient = (clientId: string, secret: string) => {
  const client = new Binance().options({
    APIKEY: clientId,
    APISECRET: secret
  });
  return client;
};