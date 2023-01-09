import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb.service';


export interface MarketBuyModel {
    id: string;
    symbol: string;
    price: string;
    quantity: string;
    status: string;
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
                'price': { S: order.price },
                'quantity': { S: order.quantity },
                'status': { S: order.status },
                'atDate': { S: createdAt },
                'order': { S: order.order }
            },
        };
        return this.dynamoDB.putItem(params);
    }

    async queryByStatus(status: string): Promise<AWS.DynamoDB.Types.ScanOutput> {
        const params = {
            TableName: this.tableName,
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': {
                    S: status,
                },
            },
        };

        return this.dynamoDB.scan(params);
    }
}