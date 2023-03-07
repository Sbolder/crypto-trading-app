import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { DynamoDBService } from './dynamodb.service';
import { HistoryDataRepository } from './repositories/history-data.repository';
import { OrderBuyMarketRepository } from './repositories/market-buy-data.repository';
import { SecretService } from './secret.service';
import { BinanceService } from './services/binance.service';
import { TelegramService } from './services/telegram.service';
import * as dotenv from 'dotenv';
import { IndicatorsController } from './controllers/indicators.controller';
import { TaapiService } from './services/taapi.service';
import { TechnicalIndicatorsRepository } from './repositories/technical-indicators.repository';
import { TradingController } from './controllers/trading.controller';
import { TradingService } from './services/trading.service';
dotenv.config();

@Module({
    imports: [
        ConfigModule.forRoot(),
    ],
    controllers: [IndicatorsController, TradingController],
    providers: [AppService,
        SecretService,
        DynamoDBService,
        HistoryDataRepository,
        OrderBuyMarketRepository,
        TechnicalIndicatorsRepository,
        TelegramService,
        BinanceService,
        TaapiService,
        TradingService
        ],
})
export class AppModule { }
