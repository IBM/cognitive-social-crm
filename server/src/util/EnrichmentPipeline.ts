import * as winston from "winston";
import * as watson from "watson-developer-cloud";
import { Promise } from "es6-promise";
import config from "../../src/config";

export class EnrichmentPipeline {

    private LOGGER = winston.createLogger({
        level: config.log_level,
        transports: [
            new (winston.transports.Console)({ format: winston.format.simple() })]
    });

    private nlu: watson.NaturalLanguageUnderstandingV1;
    private toneAnalyzer: watson.ToneAnalyzerV3;
    private conversation: watson.ConversationV1;

    private conversationParams: any = {
        "workspace_id": config.conversationClassificationId
    };

    private nluParams: any = {
        "features": {
            "emotion": {},
            "sentiment": {},
            "entities": {
                "emotion": false,
                "sentiment": false,
                "limit": 2
            },
            "keywords": {
                "emotion": false,
                "sentiment": false,
                "limit": 2
            }
        }
    };

    private toneParams: any = {};

    constructor() {
        this.nlu = new watson.NaturalLanguageUnderstandingV1({
            version: "2018-03-16"
        });

        this.toneAnalyzer = new watson.ToneAnalyzerV3({
            version: "2017-09-21"
        });

        this.conversation = new watson.ConversationV1({
            version: "2018-07-10"
        });
    }

    enrich(text: string) {
        return new Promise((resolve, reject) => {
            try {
                const enrichmentPromises = [this.nluEnrichment(text), this.toneEnrichment(text), this.conversationEnrichment(text)];
                Promise.all(enrichmentPromises).then((enrichments) => {
                    const response: { [index: string]: any } = {};
                    for (const e of enrichments) {
                        const ets = <{ [index: string]: any }>e;
                        response[Object.keys(e)[0]] = ets[Object.keys(e)[0]];
                    }
                    resolve(response);
                }).catch((err) => {
                    reject(err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }


    nluEnrichment(text: string) {
        return new Promise((resolve, reject) => {
            try {
                this.nluParams.text = text;
                this.nlu.analyze(this.nluParams, (err, success) => {
                    if (err) {
                        this.LOGGER.error("NLU: " + err);
                        return reject("NLU: " + err);
                    }
                    resolve({ nlu: success });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    toneEnrichment(text: string) {
        return new Promise((resolve, reject) => {
            try {
                this.toneParams.text = text;
                this.toneParams.sentences = false;
                this.toneAnalyzer.tone(this.toneParams, (err: any, success: any) => {
                    if (err) {
                        this.LOGGER.error("Tone: " + err);
                        return reject("Tone: " + err);
                    }
                    resolve({ tone: success });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    conversationEnrichment(text: string) {
        return new Promise((resolve, reject) => {
            try {
                this.conversationParams.input = {};
                this.conversationParams.input.text = text;
                this.LOGGER.info(JSON.stringify(this.conversationParams));
                this.conversation.message(this.conversationParams, (err: any, success: any) => {
                    if (err) {
                        this.LOGGER.error("Conversation: " + err);
                        return reject("Conversation: " + err);
                    }
                    resolve({ intents: success.intents });
                });
            } catch (err) {
                reject(err);
            }
        });
    }


}