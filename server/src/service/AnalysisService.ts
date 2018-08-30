import * as Cloudant from '@cloudant/cloudant';
import * as moment from 'moment';
import * as nano from 'nano';
import config from '../../src/config';
import { CloudantDAO } from '../dao/CloudantDAO';
import { ClassificationSummary, EmotionalToneOverTime, SentimentOverTime, SentimentSummary, CloudantOptions } from '../model/CRMModel';
import logger from '../util/Logger';

export class AnalysisService {

  private cloudantDAO: CloudantDAO;
  private analysisDB: nano.DocumentScope<{}>;
  private dbName: string;

  constructor() {
    const cloudant = Cloudant({
      account: config.cloudant_username,
      password: config.cloudant_password,
    });
    this.dbName = config.cloudant_db || '';
    const cloudantOptions: CloudantOptions = {} as CloudantOptions;
    cloudantOptions.maxBufferSize = 1;
    this.cloudantDAO = new CloudantDAO(cloudant, this.dbName,cloudantOptions);
    this.analysisDB = cloudant.db.use(this.dbName);
  }

  public listByPostDate(skip: number, limit: number, cb: (err?: Error, result?: any) => void) {
    try {
      const params = {};
      this.cloudantDAO.listByView(this.dbName, 'created-at-view', limit, skip, params)
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

  public sentimentSummary(cb: (err?: Error, result?: any) => void) {
    try {
      const params: nano.DocumentViewParams = {
        group: true,
      };
      // doc.enrichments.nlu.sentiment.document.label, doc.enrichments.nlu.sentiment.document.score
      this.analysisDB.view(this.dbName, 'sentiment-view', params, (err, sot) => {
        if (err) { return cb(err); }
        // Map the results to a format better suited for the client
        const response: SentimentSummary = {} as SentimentSummary;
        for (const row of sot.rows) {
          response.total += row.value as number;
          const dataKey = row.key as string;
          switch (dataKey) {
          case 'positive': {
            response.positive = row.value as number;
            break;
          }

          case 'neutral': {
            response.neutral = row.value as number;
            break;
          }

          case 'negative': {
            response.negative = row.value as number;
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

  public sentimentOvertime(cb: (err?: Error, result?: any) => void) {
    try {
      const endKey = moment().subtract(7, 'days');
      const params = {
        group: true,
        descending: true,
        // endkey: [endKey.year(), endKey.month(), endKey.date()]
      };

      const response: SentimentOverTime = {} as SentimentOverTime;
      response.date = [];
      response.negative = [];
      response.positive = [];
      response.neutral = [];

      // [d.getFullYear(), d.getMonth(), d.getDate(), doc.enrichments.nlu.sentiment.document.label], 1
      this.analysisDB.view(this.dbName, 'sentiment-overtime-view', params, (err, result) => {
        if (err) { return cb(err); }
        for (const row of result.rows) {
          if (row.key[3] === 'unknown') { continue; }
          // Label is in format MM-DD-YYYY
          const month: number = Number(row.key[1]) + 1;
          const label = month + '-' + row.key[2] + '-' + row.key[0];
          if (response.date.indexOf(label) < 0) {
            response.date.unshift(label);
          }
          const sentiment = row.key[3] as string;
          switch (sentiment) {
          case 'positive': {
            response.positive.unshift(row.value as number);
            break;
          }

          case 'neutral': {
            response.neutral.unshift(row.value as number);
            break;
          }

          case 'negative': {
            response.negative.unshift(row.value as number);
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

  public classificationSummary(cb: (err?: Error, result?: any) => void) {
    try {
      const params = {
        group: true,
      };
      this.analysisDB.view(this.dbName, 'classification-view', params, (err, result) => {
        if (err) { return cb(err); }
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
          const cs: ClassificationSummary = {} as ClassificationSummary;
          cs.key = row.key;
          cs.value = row.value as number;
          response.push(cs);
        }
        cb(undefined, response);
      });
    } catch (err) {
      cb(err);
    }
  }

  public emotionalToneOvertime(cb: (err?: Error, result?: any) => void) {
    try {
      const endKey = moment().subtract(7, 'days');
      const params = {
        group: true,
        descending: true,
        // endkey: [endKey.year(), endKey.month(), endKey.date()]
      };

      const response: EmotionalToneOverTime = {} as EmotionalToneOverTime;
      response.date = [];
      response.anger = [];
      response.fear = [];
      response.disgust = [];
      response.joy = [];
      response.sadness = [];
      // top score of doc.enrichments.nlu.emotion.document.emotion over time
      this.analysisDB.view(this.dbName, 'emotional-overtime-view', params, (err, result) => {
        if (err) { return cb(err); }
        for (const row of result.rows) {
          if (row.key[3] === 'unknown') { continue; }
          // Label is in format MM-DD-YYYY
          const label = (Number(row.key[1]) + 1) + '-' + row.key[2] + '-' + row.key[0];
          if (response.date.indexOf(label) < 0) {
            response.date.unshift(label);
          }
          const emotion = row.key[3];
          // eto.[emotion].unshift(row.value)
          switch (emotion) {
          case 'anger': {
            response.anger.unshift(row.value as number);
            break;
          }

          case 'disgust': {
            response.disgust.unshift(row.value as number);
            break;
          }

          case 'fear': {
            response.fear.unshift(row.value as number);
            break;
          }

          case 'joy': {
            response.joy.unshift(row.value as number);
            break;
          }

          case 'sadness': {
            response.sadness.unshift(row.value as number);
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

  public entitiesSummary(cb: (err?: Error, result?: any) => void) {
    try {
      const params = {
        group: true,
      };
      this.analysisDB.view(this.dbName, 'entities-view', params, (err, result) => {
        if (err) { return cb(err); }
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
        cb(undefined, { rows });
      });
    } catch (err) {
      cb(err);
    }
  }

  public keywordsSummary(cb: (err?: Error, result?: any) => void) {
    try {
      const params = {
        group: true,
      };
      this.analysisDB.view(this.dbName, 'keywords-view', params, (err, result) => {
        if (err) { return cb(err); }
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
          data: rows.slice(0, 100),
        };
        cb(undefined, response);
      });
    } catch (err) {
      cb(err);
    }
  }

  public sentimentTrend(cb: (err?: Error, result?: any) => void) {
    try {
      const params = {
        reduce: false,
        descending: true,
        include_docs: true,
        limit: 300,
      };

      this.analysisDB.view(this.dbName, 'created-at-view', params, (err, result) => {
        if (err) { return cb(err); }
        cb(undefined, result);
      });
    } catch (err) {
      cb(err);
    }
  }
}
