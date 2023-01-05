import { Injectable } from '@nestjs/common';
import { SecretService } from '../secret.service';
const TelegramBot = require('node-telegram-bot-api');


@Injectable()
export class TelegramService {
    private bot;
    private chatId: string;

    constructor(private readonly secretService: SecretService) {
        this.inizializeBot();
    }

    private async inizializeBot() {
        const apiToken = await this.secretService.GetTelegramApiToken();
        this.chatId = await this.secretService.GetTelegramChatId();
        this.bot = new TelegramBot(apiToken);
    }

    async sendMessage(text: string): Promise<void> {
        await this.bot.sendMessage(this.chatId, text);
    }

}