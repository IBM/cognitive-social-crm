declare namespace CRMModel {
    interface SentimentOverTime {
        date: string[];
        positive: number[];
        neutral: number[];
        negative: number[];
    }

    interface SentimentSummary {
        positive: number;
        neutral: number;
        negative: number;
        total: number;
    }

    interface ClassificationSummary {
        key: string;
        value: number;
    }

    interface EmotionalToneOverTime {
        date: string[];
        anger: number[];
        disgust: number[];
        fear: number[];
        joy: number[];
        sadness: number[];
    }

    interface TwitterOptions {
        max: number; // -1
        outputType: string; // json
        saveType: string; // cloudant
        userIds: string; // comma separated string
        maxBufferSize: number;
        listenTo: string;
        listenFor: string;
        filterContaining: string;
        filterFrom: string;
        processRetweets: boolean;
    }

    interface TwitterResponse {
        id: number;
        id_str: string;
    }
}

export = CRMModel;