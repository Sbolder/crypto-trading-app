import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb.service';

export interface HistoryModel {
    id: string;
    symbol: string;
    price: string;
    atDate: string;
}

@Injectable()
export class HistoryDataRepository {
    private readonly tableName: string = "symbol-price-history";
    constructor(private readonly dynamoDB: DynamoDBService) { }

    async getPrice(userId: string): Promise<AWS.DynamoDB.Types.GetItemOutput> {
        const params = {
            TableName: this.tableName,
            Key: {
                'symbol': { S: "TEST" },
                'version': { N: "0" },
            },
        };
        return this.dynamoDB.getItem(params);
    }

    async insertItem(history: HistoryModel): Promise<AWS.DynamoDB.Types.PutItemOutput> {
        const now = new Date();
        const createdAt = now.toISOString();

        const params = {
            TableName: this.tableName,
            Item: {
                'id': { S: history.id },
                'symbol': { S: history.symbol },
                'price': { N: history.price },
                'atDate': { S: createdAt },
            },
        };
        return this.dynamoDB.putItem(params);
    }
}

