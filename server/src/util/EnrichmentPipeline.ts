import { Promise } from 'es6-promise';
import * as watson from 'watson-developer-cloud';
import * as winston from 'winston';
import config from '../config';

export class EnrichmentPipeline {

  public static getInstance(workspaceId: string) {
    if (this.enrichmentPipeline === undefined) {
      this.enrichmentPipeline = new EnrichmentPipeline(workspaceId);
    }
    return this.enrichmentPipeline;
  }

  private static enrichmentPipeline: EnrichmentPipeline;

  private LOGGER = winston.createLogger({
    level: config.log_level,
    transports: [
      new (winston.transports.Console)({ format: winston.format.simple() })],
  });

  private nlu: watson.NaturalLanguageUnderstandingV1;
  private toneAnalyzer: watson.ToneAnalyzerV3;
  private conversation: watson.ConversationV1;
  private workspaceId: string;

  private nluParams: any = {
    features: {
      emotion: {},
      sentiment: {},
      entities: {
        emotion: false,
        sentiment: false,
        limit: 2,
      },
      keywords: {
        emotion: false,
        sentiment: false,
        limit: 2,
      },
    },
  };

  private toneParams: any = {};

  private constructor(workspaceId: string) {
    this.nlu = new watson.NaturalLanguageUnderstandingV1({
      version: '2018-03-16',
    });

    this.toneAnalyzer = new watson.ToneAnalyzerV3({
      version: '2017-09-21',
    });

    this.conversation = new watson.ConversationV1({
      version: '2018-07-10',
    });

    this.workspaceId = workspaceId;
  }

  public enrich(text: string) {
    return new Promise((resolve, reject) => {
      try {
        const enrichmentPromises = [
          this.nluEnrichment(text),
          this.toneEnrichment(text),
          this.conversationEnrichment(text),
        ];
        Promise.all(enrichmentPromises).then((enrichments) => {
          const response: { [index: string]: any } = {};
          for (const e of enrichments) {
            const ets = e as { [index: string]: any };
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

  public nluEnrichment(text: string) {
    return new Promise((resolve, reject) => {
      try {
        this.nluParams.text = text;
        this.nluParams.language = 'en';
        this.nlu.analyze(this.nluParams, (err, success) => {
          if (err) {
            this.LOGGER.error('NLU: ' + err);
            return reject('NLU: ' + err);
          }
          resolve({ nlu: success });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public toneEnrichment(text: string) {
    return new Promise((resolve, reject) => {
      try {
        this.toneParams.text = text;
        this.toneParams.sentences = false;
        this.toneAnalyzer.tone(this.toneParams, (err: any, success: any) => {
          if (err) {
            this.LOGGER.error('Tone: ' + err);
            return reject('Tone: ' + err);
          }
          resolve({ tone: success });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public conversationEnrichment(text: string) {
    return new Promise((resolve, reject) => {
      try {
        const conversationParams: any = {
          workspace_id: this.workspaceId,
          input: {
            text,
          },
        };
        this.conversation.message(conversationParams, (err: any, success: any) => {
          if (err) {
            this.LOGGER.error('Conversation: ' + err);
            return reject('Conversation: ' + err);
          }
          resolve({ intents: success.intents });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

}
