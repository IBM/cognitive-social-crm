import * as moment from "moment";
import * as Cloudant from "@cloudant/cloudant";
import { CloudantDAO } from "../dao/CloudantDAO";
import * as nano from "nano";
import { SentimentOverTime, ClassificationSummary, SentimentSummary, EmotionalToneOverTime } from "../model/CRMModel";
import config from "../../src/config";
import logger from "../util/Logger";

export class AnalysisService {

    private cloudantDAO: CloudantDAO;
    private analysisDB: nano.DocumentScope<{}>;
    private dbName: string;

    constructor() {
        const cloudant = Cloudant({
            account: config.cloudant_username,
            password: config.cloudant_password
        });
        this.dbName = config.cloudant_db || "";
        this.cloudantDAO = new CloudantDAO(cloudant, this.dbName);
        this.analysisDB = cloudant.db.use(this.dbName);
    }

    listByPostDate(skip: number, limit: number, cb: (err?: Error, result?: any) => void) {
        try {
            const params = {};
            this.cloudantDAO.listByView(this.dbName, "created-at-view", limit, skip, params)
                .then((result) => {
                    cb(undefined, result);
                })
                .catch((err) => {
                    cb(err, undefined);
                });
        } catch (error) {
            cb(error, undefined);
        }
    }

    sentimentSummary(cb: (err?: Error, result?: any) => void) {
        try {
            const params: nano.DocumentViewParams = {
                group: true
            };
            // doc.enrichments.nlu.sentiment.document.label, doc.enrichments.nlu.sentiment.document.score
            this.analysisDB.view(this.dbName, "sentiment-view", params, (err, sot) => {
                if (err) return cb(err);
                // Map the results to a format better suited for the client
                const response: SentimentSummary = <SentimentSummary>{};
                for (const row of sot.rows) {
                    response.total += <number>row.value;
                    const dataKey = <string>row.key;
                    switch (dataKey) {
                        case "positive": {
                            response.positive = <number>row.value;
                            break;
                        }

                        case "neutral": {
                            response.neutral = <number>row.value;
                            break;
                        }

                        case "negative": {
                            response.negative = <number>row.value;
                            break;
                        }
                    }
                }
                cb(undefined, response);
            });
        } catch (err) {
            cb(err, undefined);
        }
    }

    sentimentOvertime(cb: (err?: Error, result?: any) => void) {
        try {
            const endKey = moment().subtract(7, "days");
            const params = {
                group: true,
                descending: true,
                // endkey: [endKey.year(), endKey.month(), endKey.date()]
            };

            const response: SentimentOverTime = <SentimentOverTime>{};
            response.date = [];
            response.negative = [];
            response.positive = [];
            response.neutral = [];

            // [d.getFullYear(), d.getMonth(), d.getDate(), doc.enrichments.nlu.sentiment.document.label], 1
            this.analysisDB.view(this.dbName, "sentiment-overtime-view", params, (err, result) => {
                if (err) return cb(err);
                for (const row of result.rows) {
                    if (row.key[3] === "unknown") continue;
                    // Label is in format MM-DD-YYYY
                    const month: number = Number(row.key[1]) + 1;
                    const label = month + "-" + row.key[2] + "-" + row.key[0];
                    if (response.date.indexOf(label) < 0) {
                        response.date.unshift(label);
                    }
                    const sentiment = <string>row.key[3];
                    switch (sentiment) {
                        case "positive": {
                            response.positive.unshift(<number>row.value);
                            break;
                        }

                        case "neutral": {
                            response.neutral.unshift(<number>row.value);
                            break;
                        }

                        case "negative": {
                            response.negative.unshift(<number>row.value);
                            break;
                        }
                    }
                }
                cb(undefined, response);
            });
        } catch (err) {
            cb(err);
        }
    }

    classificationSummary(cb: (err?: Error, result?: any) => void) {
        try {
            const params = {
                group: true
            };
            this.analysisDB.view(this.dbName, "classification-view", params, (err, result) => {
                if (err) return cb(err);
                let rows = result.rows;
                rows.sort((a, b) => {
                    if (a.value < b.value) {
                        return 1;
                    }
                    if (a.value > b.value) {
                        return -1;
                    }
                    return 0;
                });
                rows = rows.slice(0, 5);
                const response: ClassificationSummary[] = [];
                for (const row of rows) {
                    const cs: ClassificationSummary = <ClassificationSummary>{};
                    cs.key = row.key;
                    cs.value = <number>row.value;
                    response.push(cs);
                }
                cb(undefined, response);
            });
        } catch (err) {
            cb(err);
        }
    }

    emotionalToneOvertime(cb: (err?: Error, result?: any) => void) {
        try {
            const endKey = moment().subtract(7, "days");
            const params = {
                group: true,
                descending: true,
                // endkey: [endKey.year(), endKey.month(), endKey.date()]
            };

            const response: EmotionalToneOverTime = <EmotionalToneOverTime>{};
            response.date = [];
            response.anger = [];
            response.fear = [];
            response.disgust = [];
            response.joy = [];
            response.sadness = [];
            // top score of doc.enrichments.nlu.emotion.document.emotion over time
            this.analysisDB.view(this.dbName, "emotional-overtime-view", params, (err, result) => {
                if (err) return cb(err);
                for (const row of result.rows) {
                    if (row.key[3] === "unknown") continue;
                    // Label is in format MM-DD-YYYY
                    const label = (Number(row.key[1]) + 1) + "-" + row.key[2] + "-" + row.key[0];
                    if (response.date.indexOf(label) < 0) {
                        response.date.unshift(label);
                    }
                    const emotion = row.key[3];
                    // eto.[emotion].unshift(row.value)
                    switch (emotion) {
                        case "anger": {
                            response.anger.unshift(<number>row.value);
                            break;
                        }

                        case "disgust": {
                            response.disgust.unshift(<number>row.value);
                            break;
                        }

                        case "fear": {
                            response.fear.unshift(<number>row.value);
                            break;
                        }

                        case "joy": {
                            response.joy.unshift(<number>row.value);
                            break;
                        }

                        case "sadness": {
                            response.sadness.unshift(<number>row.value);
                            break;
                        }
                    }
                }
                cb(undefined, response);
            });
        } catch (err) {
            cb(err);
        }
    }

    entitiesSummary(cb: (err?: Error, result?: any) => void) {
        try {
            const params = {
                group: true
            };
            this.analysisDB.view(this.dbName, "entities-view", params, (err, result) => {
                if (err) return cb(err);
                const rows = result.rows;
                rows.sort((a, b) => {
                    if (a.value < b.value) {
                        return 1;
                    }
                    if (a.value > b.value) {
                        return -1;
                    }
                    return 0;
                });
                rows.slice(0, 10);
                cb(undefined, { "rows": rows });
            });
        } catch (err) {
            cb(err);
        }
    }

    keywordsSummary(cb: (err?: Error, result?: any) => void) {
        try {
            const params = {
                group: true
            };
            this.analysisDB.view(this.dbName, "keywords-view", params, (err, result) => {
                if (err) return cb(err);
                const rows = result.rows;
                rows.sort((a, b) => {
                    if (a.value < b.value) {
                        return 1;
                    }
                    if (a.value > b.value) {
                        return -1;
                    }
                    return 0;
                });
                const response = {
                    data: rows.slice(0, 100)
                };
                cb(undefined, response);
            });
        } catch (err) {
            cb(err);
        }
    }

    sentimentTrend(cb: (err?: Error, result?: any) => void) {
        try {
            const params = {
                reduce: false,
                descending: true,
                include_docs: true,
                limit: 300
            };

            this.analysisDB.view(this.dbName, "created-at-view", params, (err, result) => {
                if (err) return cb(err);
                cb(undefined, result);
            });
        } catch (err) {
            cb(err);
        }
    }
}
