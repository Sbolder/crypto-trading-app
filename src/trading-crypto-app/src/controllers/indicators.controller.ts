import { Body, Controller, Post } from '@nestjs/common';
import { TaapiService } from '../services/taapi.service';


@Controller('indicators')
export class IndicatorsController {
    constructor(private readonly service: TaapiService) { }

    @Post('calculate')
    async tradingController(@Body() body) {
        return this.service.applyStrategy(body.symbol);
       
    }



}
