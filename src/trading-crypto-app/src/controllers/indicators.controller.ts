import { Body, Controller, Header, Post, Req } from '@nestjs/common';
import * as rawbody from 'raw-body';
import { TaapiService } from '../services/taapi.service';


@Controller('indicators')
export class IndicatorsController {
    constructor(private readonly service: TaapiService) { }

    @Post('calculate')
    @Header('Content-Type', 'application/json')
    async tradingController(@Body() body, @Req() req) {
        const raw = await rawbody(req);
        const text = raw.toString().trim();
        const json = JSON.parse(text);
        console.info("try to search technical indicator for Symbol:", json.symbol )

        return this.service.applyStrategy(json.symbol);
       
    }



}
