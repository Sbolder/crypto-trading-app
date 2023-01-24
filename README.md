# crypto-trading-app

simple aws serverless application to trading crypto assets.

to try it you have to do the following steps:

- have an aws account
- have a confirmed binance account and generate api_key api_secret
- create a aws secrets manager like this [prod/appTrading/telegram] and [prod/appTrading/binance-api]
- register secretManager prod/appTrading/telegram with value  telegramApiToken <value> and telegramChatId <value>
- register secretManager prod/appTrading/binance-apiwith value binanceApiKey <value> and binanceApiSecret <value>
- create dynamo table with the dynamo_cloudFormation.yaml
- run npm install and npm start-dev to try it locally
- npm run build and serverless deploy to deploy it on aws account
