import { Body, Controller, Header, Post, Req } from '@nestjs/common';
import * as rawbody from 'raw-body';
import { TradingControllerDto } from '../dtos/tradingInput.dto';
import { TaapiService } from '../services/taapi.service';
import { TradingService } from '../services/trading.service';


@Controller('trading')
export class TradingController {
    constructor(private readonly service: TradingService) { }

    @Post('execute')
    @Header('Content-Type', 'application/json')
    async tradingController(@Body() input: TradingControllerDto, @Req() req) {
        const raw = await rawbody(req);
        const text = raw.toString().trim();
        const json = JSON.parse(text);
        const result = await this.service.applyStrategy(json.symbol, json.betQuantity, json.percentStopLoss);
        return {
            result: result
        };

    }



}


