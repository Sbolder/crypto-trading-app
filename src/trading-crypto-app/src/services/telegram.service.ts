import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretService } from '../secret.service';
const TelegramBot = require('node-telegram-bot-api');


@Injectable()
export class TelegramService {
    private bot;
    private chatId: string;

    constructor(private readonly secretService: SecretService, private configService: ConfigService) {
        if (this.configService.get<boolean>('TELEGRAM_INTEGRATION')) {
            console.info("Telegram integration are enabled");
            this.inizializeBot();
        }
            
    }

    private async inizializeBot() {
            const apiToken = await this.secretService.GetTelegramApiToken();
            this.chatId = await this.secretService.GetTelegramChatId();
            this.bot = new TelegramBot(apiToken);
        
    }

    async sendMessage(text: string): Promise<void> {

        if (this.configService.get<boolean>('TELEGRAM_INTEGRATION')) {
            await this.bot.sendMessage(this.chatId, text);
        }

    }

}