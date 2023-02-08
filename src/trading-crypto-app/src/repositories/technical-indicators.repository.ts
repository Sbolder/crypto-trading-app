import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb.service';
import { TechnicalIndicatorData } from '../models/taapi.model';

export interface TechnicalIndicatorModel {
    id: string;
    data: any;
}

@Injectable()
export class TechnicalIndicatorsRepository {
    private readonly tableName: string = "technical_indicators";
    constructor(private readonly dynamoDB: DynamoDBService) { }


    async insertItem(id: string, data: TechnicalIndicatorData): Promise<AWS.DynamoDB.Types.PutItemOutput> {
        const now = new Date();
        const createdAt = now.toISOString();

        const params = {
            TableName: this.tableName,
            Item: {
                'id': { S: id },
                'data': { S: JSON.stringify(data.data) }
            },
        };
        return this.dynamoDB.putItem(params);
    }
}

