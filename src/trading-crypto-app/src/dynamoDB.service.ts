import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

AWS.config.update({
    region: 'eu-central-1'
});

@Injectable()
export class DynamoDBService {
    private readonly dynamoDB = new AWS.DynamoDB();

    async getItem(params: AWS.DynamoDB.Types.GetItemInput): Promise<AWS.DynamoDB.Types.GetItemOutput> {
        return this.dynamoDB.getItem(params).promise();
    }

    async putItem(params: AWS.DynamoDB.Types.PutItemInput): Promise<AWS.DynamoDB.Types.PutItemOutput> {
        return this.dynamoDB.putItem(params).promise();
    }

    async scan(params: AWS.DynamoDB.Types.ScanInput): Promise<AWS.DynamoDB.Types.PutItemOutput> {
        return this.dynamoDB.scan(params).promise();
    }

    async updateItem(params: AWS.DynamoDB.Types.UpdateItemInput): Promise<AWS.DynamoDB.Types.UpdateItemOutput> {
        return this.dynamoDB.updateItem(params).promise();
    }

    // Other methods to interact with DynamoDB...
}
