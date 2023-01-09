import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('app')
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Post('trading/buy')
    async tradingController(@Body() body) {
        await this.appService.searchBetterBuyOpportunity();
    }


    @Post('trading/profit')
    async tradingControllerProfit(@Body() body) {
        const percentProfit = body.percentProfit;
        await this.appService.checkProfit(percentProfit)
    }
}
