import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('trading/buy')
  async tradingController(@Body() body): Promise<string> {
      return await this.appService.searchBetterBuyOpportunity();
  }
}
