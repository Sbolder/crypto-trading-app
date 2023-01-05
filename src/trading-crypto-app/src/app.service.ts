import { Injectable } from '@nestjs/common';
import { SecretService, initializeBinanceClient } from './secret.service';
import {HistoryDataRepository, HistoryModel} from './repositories/history-data.repository';
import Binance from 'node-binance-api';
import {v4 as uuidv4} from 'uuid';

@Injectable()
export class AppService {
  private client: Binance;
  private readonly symbolValueExchange:string = "BUSD";

  constructor(private readonly secretService: SecretService, private repository: HistoryDataRepository) {
    this.initializeClient();
  }

  private async initializeClient() {
    const apiKey = await this.secretService.getApiKey();
    const apiSecret = await this.secretService.getApiSecret();
    this.client = initializeBinanceClient(apiKey, apiSecret);
  }

  async tradeCrypto(symbol: string): Promise<string> {
    const now = new Date();
    const createdAt = now.toISOString();
    const historyModel: HistoryModel = {
      id: uuidv4(),
      symbol: `${symbol}${this.symbolValueExchange}`,
      price: null,
      atDate: createdAt
    };

    this.client.prices(historyModel.symbol)
    .then((response)=> {
      historyModel.price = response[historyModel.symbol];
      this.repository.insertItem(historyModel)
    })
    .catch((error)=> {
      // Handle the error
    })
    
    return 'Hello World!';
  }
}
