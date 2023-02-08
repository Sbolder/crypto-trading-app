export interface TaapiRequestModel {
    secret: string;
    construct: {
        exchange: string;
        symbol: string;
        interval: string;
        indicators: Array<{
            id: string;
            indicator: string;
        }>;
    };
}


export interface TechnicalIndicator {
    id: string;
    result: { [key: string]: any };
    errors: any[];
}

export interface TechnicalIndicatorData {
    data: TechnicalIndicator[];
}
