import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DynamoDBService } from './dynamodb.service';
import { HistoryDataRepository } from './repositories/history-data.repository';
import { OrderBuyMarketRepository } from './repositories/market-buy-data.repository';
import { SecretService } from './secret.service';
import { BinanceService } from './services/binance.service';
import { TelegramService } from './services/telegram.service';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService,
        SecretService,
        DynamoDBService,
        HistoryDataRepository,
        OrderBuyMarketRepository,
        TelegramService,
        BinanceService
        ],
})
export class AppModule { }
