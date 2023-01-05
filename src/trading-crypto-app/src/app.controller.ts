import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('trading')
  async tradingController(@Body() body): Promise<string> {
    console.info("symbol:", body.symbol)
    return await this.appService.tradeCrypto(body.symbol);
  }
}
