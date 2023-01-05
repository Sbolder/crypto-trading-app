import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb.service';

export interface MarketBuyModel {
    id: string;
    symbol: string;
    price: string;
    atDate: string;
    order: string;
}

@Injectable()
export class OrderBuyMarketRepository {
    private readonly tableName: string = "market-order-buy";
    constructor(private readonly dynamoDB: DynamoDBService) { }


    async insertOrderBuyMarket(order: MarketBuyModel): Promise<AWS.DynamoDB.Types.PutItemOutput> {
        const now = new Date();
        const createdAt = now.toISOString();

        const params = {
            TableName: this.tableName,
            Item: {
                'id': { S: order.id },
                'symbol': { S: order.symbol },
                'price': { N: order.price },
                'atDate': { S: createdAt },
                'order': { S: order.order }
            },
        };
        return this.dynamoDB.putItem(params);
    }
}