import { Promise } from 'es6-promise';
import * as nano from 'nano';
import * as moment from 'moment';
import * as winston from 'winston';
import config from '../config';
import * as Cloudant from '@cloudant/cloudant';
import tweets = require('../data/SampleTweets');
import { EnrichmentPipeline } from '../util/EnrichmentPipeline';
import cloudantConfig from '../data/cloudant.config';
import { ClassificationSummary, EmotionalToneOverTime, SentimentOverTime, SentimentSummary, CloudantOptions } from '../model/CRMModel';
import logger from '../util/Logger';

export class CloudantDAO {

  public static getInstance(options: CloudantOptions, enrichmentPipeline: EnrichmentPipeline) {
    if (this.cloudantDao === undefined) {
      this.cloudantDao = new CloudantDAO(cloudantConfig, options, enrichmentPipeline);
    }
    return this.cloudantDao;
  }
  private static cloudantDao: CloudantDAO;

  private cloudantDB!: Cloudant.DocumentScope<{}>;
  private options: CloudantOptions = {} as CloudantOptions;
  private maxBufferSize: number;
  private bulkSaveBuffer: nano.BulkModifyDocsWrapper;
  private duplicateDetectionCache: any;
  private duplicateDetectionCacheThreshold: number;
  private cloudant: Cloudant.ServerScope;
  private dbName!: string;
  private enrichmentPipeline: EnrichmentPipeline;

  private dbConfig: any;
  private status: any;

  private LOGGER = winston.createLogger({
    level: config.log_level,
    transports: [
      new (winston.transports.Console)({ format: winston.format.simple() })],
  });

  /**
   * @param cloudant
   * @param dbname
   * @param options
   */
  private constructor(dbConfig: any, options: CloudantOptions, enrichmentPipeline: EnrichmentPipeline) {
    this.dbConfig = dbConfig;
    const cloudant = Cloudant({
      account: config.cloudant_username,
      password: config.cloudant_password,
      plugins: { retry: { retryErrors: false, retryStatusCodes: [429] } },
    });
    this.cloudant = cloudant;

    this.enrichmentPipeline = enrichmentPipeline;

    // options settings
    this.bulkSaveBuffer = {
      docs: [],
    };
    this.options = options;
    this.maxBufferSize = this.options.maxBufferSize ? this.options.maxBufferSize : 1;
    // Initialize the duplicate tweet detection cache.
    this.duplicateDetectionCache = {
      tweetIdCache: {},
      tweetTextCache: {},
    };
    // Once you reach this limit, start removing some of the old entries.
    this.duplicateDetectionCacheThreshold = 50;
  }

  public listByView(design: string, view: string, limit: number, skip: number, params: nano.DocumentViewParams) {
    return new Promise((resolve, reject) => {
      try {
        params = {
          reduce: false,
          descending: true,
          include_docs: true,
          limit: !limit ? 5 : limit,
          skip: !skip ? 0 : skip,
        };
        this.cloudantDB.view(design, view, params, (err, resp) => {
          if (err) { return reject(err); }
          // Map the results to the response for the client
          const response = {
            total: resp.total_rows,
            data: resp.rows,
          };
          resolve(response);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public bulk(bulkRequest: nano.BulkModifyDocsWrapper) {
    return new Promise((resolve, reject) => {
      this.cloudantDB.bulk(bulkRequest, (err, resp) => {
        if (err) { return reject(err); }
        resolve(resp);
      });
    });
  }

  public saveToCloudant(data: any, force: boolean) {
    return new Promise((resolve, reject) => {
      try {
        if (data && data.text) {
          this.bulkSaveBuffer.docs.push(data);
        }
        this.LOGGER.debug('Length of Buffer: : ' + this.bulkSaveBuffer.docs.length);
        // If the bulk buffer threshold is reached, or the force flag is true,
        // Then save the buffer to cloudant.
        if (this.bulkSaveBuffer.docs.length >= this.maxBufferSize || force) {
          // Throttle the save to not exceed Cloudant free plan limits
          this.LOGGER.debug('Saving to Cloudant...');
          this.cloudantDB.bulk(this.bulkSaveBuffer, (err, result) => {
            if (err) {
              this.LOGGER.error('Error while saving to database::' + err);
              reject(err);
            } else {
              this.LOGGER.debug('Successfully saved ' + this.bulkSaveBuffer.docs.length + ' docs to Cloudant.');
              this.bulkSaveBuffer.docs = [];
              resolve();
            }
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /** This function will check for duplicate tweets in a memory cache and if not found,
   * will then check in Cloudant if the output type is cloudant.
   */
  public duplicateCheck(tweet: any) {
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.debug('In Duplicate Detection.');
        if (this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()]) {
          this.LOGGER.info('Duplicate Tweet ID found.');
          return reject();
        }
        this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()] = true;
        if (Object.keys(this.duplicateDetectionCache.tweetIdCache).length > this.duplicateDetectionCacheThreshold) {
          this.trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetIdCache);
        }
        // Now check if the text of the tweet is in the cache.
        if (this.duplicateDetectionCache.tweetTextCache[tweet.text]) {
          this.LOGGER.info('Duplicate Tweet Text found.');
          return reject();
        }
        this.duplicateDetectionCache.tweetTextCache[tweet.text] = true;
        if (Object.keys(this.duplicateDetectionCache.tweetTextCache).length > this.duplicateDetectionCacheThreshold) {
          this.trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetTextCache);
        }

        this.LOGGER.info('Checking in Cloudant.');
        this.cloudantDuplicateCheck(tweet).then(() => {
          resolve();
        }).catch((err) => {
          if (err) {
            reject(err);
          } else {
            reject();
          }
        });

      } catch (err) {
        this.LOGGER.error(err);
        reject(err);
      }
    });
  }

  public cloudantDuplicateCheck(tweet: any) {
    return new Promise((resolve, reject) => {
      try {
        if (!tweet) {
          return resolve();
        }
        this.LOGGER.info('In Cloudant Duplicate Tweet Check.');
        // First check if the tweet was already processed
        const selector = { selector: { tweet_id: tweet.id } };

        this.cloudantDB.find(selector, (err, result) => {
          if (err) { return reject(err); }
          this.LOGGER.info('Result of tweet id check = ' + JSON.stringify(result));
          if (result.docs.length > 0) {
            this.LOGGER.info('Duplicate detected... Ignoring the tweet...');
            return reject();
          }
          // Check for duplicate tweets based on the tweet text to avoid any spamming
          const query: {} = { q: 'tweet_text:"' + tweet.text + '"' };
          this.cloudantDB.search('analysis-db', 'tweet-text-search', query, (error, response) => {
            if (error) { return reject(error); }
            this.LOGGER.info('Result of duplicate tweet text check = ' + JSON.stringify(result));
            if (response && response.total_rows > 0) {
              this.LOGGER.info('Tweet is filtered because of duplicate tweet text detection');
              return reject();
            }
            resolve();
          });
        });
      } catch (err) {
        this.LOGGER.log(err);
        reject(err);
      }
    });
  }

  /**
   * Remove the a quarter of the cached entries from the duplicate detection cache.
   * @param threshold
   * @param cacheObject
   */
  public trimCache(threshold: number, cacheObject: string[]) {
    const count = Math.round(threshold / 4);
    this.LOGGER.debug('Trimming ' + count + ' items from the cache.');
    const itemsToDelete: string[] = [];
    for (const key in cacheObject) {
      if (itemsToDelete.length < count) {
        itemsToDelete.push(key);
      } else {
        break;
      }
    }
    for (const key in itemsToDelete) {
      if (itemsToDelete.hasOwnProperty(key)) {
        delete itemsToDelete[key];
      }
    }
  }

  public bulkBufferLength() {
    return this.bulkSaveBuffer.docs.length;
  }

  /**
   * Check Cloudant against the cloudant-config.json file.
   */
  public checkCloudant() {
    const dbDefinitions = this.dbConfig['db-definitions'];
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Checking cloudant...');
        const dbCheckPromises = [];
        for (const dbName of Object.keys(dbDefinitions)) {
          const dbConfig = dbDefinitions[dbName];
          dbCheckPromises.push(this.checkDatabase(dbName, dbConfig));
        }
        this.LOGGER.info('Number of databases in configuration that will be checked : ' + dbCheckPromises.length);
        Promise.all(dbCheckPromises).then((dbResult) => {
          this.LOGGER.info('Done checking cloudant...');
          resolve(dbResult);
        }).catch((err) => {
          this.LOGGER.info('Error checking cloudant : ' + err);
          reject(err);
        });
      } catch (err) {
        this.LOGGER.info('Error checking cloudant : ' + err);
        reject(err);
      }
    });
  }
  /** Utility functionto tell you whether you need to sync the db config
   */
  public needSync(checkResult: any) {
    try {
      this.LOGGER.info('*** Checking if cloudant sync is required. ***');
      let needSync = false;
      for (let i = 0; i < checkResult.length; i++) {
        if (!checkResult[i].exist) {
          needSync = true;
          break;
        } else {
          for (let j = 0; j < checkResult[i].design.length; j++) {
            if (!checkResult[i].design[j].exist) {
              needSync = true;
              break;
            }
          }
        }
      }
      this.LOGGER.info('*** Cloudant sync is' + (needSync ? ' required ' : ' not required. ***'));
      return needSync;
    } catch (err) {
      this.LOGGER.info('Error checking if cloudant sync is required : ' + err);
      return false;
    }
  }
  /** Sync the cloudant instance with the configuration in the cloudant-config.json file.
   */
  public syncCloudantConfig(checkResult: any) {
    const dbDefinitions = this.dbConfig['db-definitions'];
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Syncing cloudant configuration...');
        const createHash = this.getCreateManifest(checkResult);
        const dbCreatePromises = [];
        for (const dbName of Object.keys(dbDefinitions)) {
          const dbConfig = dbDefinitions[dbName];
          dbCreatePromises.push(this.createCloudantDB(dbName, dbConfig, createHash));
        }
        Promise.all(dbCreatePromises).then((dbResult: any) => {
          this.LOGGER.info('Done syncing cloudant configuration');
          const db = dbResult[0].dbName;
          this.dbName = db;
          this.cloudantDB = this.cloudant.use(db);
          resolve(dbResult);
        }).catch((err) => {
          reject(err);
        });

      } catch (err) {
        this.LOGGER.info('Error syncing cloudant configuration : ' + err);
        reject(err);
      }
    });
  }

  /** Print the results of the check out
   */
  public printCheckResults(checkResult: any) {
    try {
      for (let i = 0; i < checkResult.length; i++) {
        // tslint:disable:max-line-length
        this.LOGGER.info('Database ' + checkResult[i].dbName + (checkResult[i].exist ? ' exist' : ' does not exist'));
        for (let j = 0; j < checkResult[i].design.length; j++) {
          if (checkResult[i].design[j].type === 'index') {
            // tslint:disable:max-line-length
            this.LOGGER.info('> Index ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'));
          } else {
            // tslint:disable:max-line-length
            this.LOGGER.info('> Design ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'));
          }
        }
      }
    } catch (err) {
      this.LOGGER.info('Error printing check result : ' + err);
      return false;
    }
  }

  public checkDatabase(dbName: string, dbConfig: any) {
    return new Promise((resolve, reject) => {
      try {
        this.cloudant.db.get(dbName, (err, body) => {
          let designs: any = {};
          let designName: string = '';
          if (err) {
            // No database exist
            const result: any = {
              dbName,
              exist: false,
              rows: 0,
              design: [],
            };
            // if the database doesn't exist, nothing else will, so set it up that way
            designs = dbConfig.design ? dbConfig.design : [];
            for (const design of designs) {
              designName = design.name;
              result.design.push({ type: 'design', name: designName, exist: false });
            }
            const indexes = dbConfig.index ? dbConfig.index : [];
            for (const index of indexes) {
              result.design.push({ type: 'index', name: index.name, exist: false });
            }
            resolve(result);
          } else {
            // if the database exists then initialize the cloudant db
            this.dbName = body.db_name;
            this.cloudantDB = this.cloudant.use(this.dbName);

            designs = dbConfig.design ? dbConfig.design : [];
            const designCheckPromises = [];
            for (const design of designs) {
              designName = design.name;
              designCheckPromises.push(this.checkDesign(designName));
            }
            const indexes = dbConfig.index ? dbConfig.index : [];
            for (const index of indexes) {
              designCheckPromises.push(this.checkIndex(index.name));
            }
            Promise.all(designCheckPromises).then((designResult) => {
              const options = {
                endkey: '_',
              };
              this.cloudantDB.list(options, (error, rowResult) => {
                if (error) {
                  reject(error);
                } else {
                  const dbResult: any = { dbName: this.dbName, exist: true, rows: rowResult.rows.length, design: [] };
                  dbResult.design = designResult;
                  resolve(dbResult);
                }
              });
            }, (error1) => {
              this.LOGGER.info('Error returned from checking design documents : ' + error1);
            });
          }
        });
      } catch (err) {
        this.LOGGER.info('Error in checking databases : ' + err);
        reject(err);
      }
    });
  }

  public checkDesign(designName: string) {
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Checking for design ' + designName + ' in database ' + this.dbName);
        this.cloudantDB.get('_design/' + designName, (err, body) => {
          if (!err) {
            resolve({ type: 'design', name: designName, exist: true });
          } else {
            resolve({ type: 'design', name: designName, exist: false });
          }
        });
      } catch (err) {
        this.LOGGER.info('Error in checking for design : ' + err);
        reject(err);
      }
    });
  }

  public checkIndex(indexName: string) {
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Checking for index ' + indexName + ' in database ' + this.dbName);
        this.cloudantDB.index((err: any, body: any) => {
          if (!err) {
            const indexes = body.indexes;
            let found = false;
            for (let i = 0; i < indexes.length; i++) {
              if (indexes[i].name === indexName) {
                this.LOGGER.info('Index ' + indexName + ' already exist.');
                found = true;
                break;
              }
            }
            resolve({ type: 'index', name: indexName, exist: found });
          } else {
            resolve({ type: 'index', name: indexName, exist: false });
          }
        });
      } catch (err) {
        this.LOGGER.info('Error in checking for index : ' + err);
        reject(err);
      }
    });
  }

  public createCloudantDB(dbName: string, dbConfig: any, createHash: any) {
    return new Promise((resolve, reject) => {
      try {
        const createDb = createHash.db[dbName];
        if (createDb) {
          this.LOGGER.info('Creating cloudant database ' + dbName);
          this.cloudant.db.create(dbName, (err) => {
            if (err) {
              // tslint:disable:max-line-length
              this.LOGGER.info('Error returned from cloudant trying to create a database : ' + JSON.stringify(err));
              resolve({ dbName, exist: false });
            } else {
              this.cloudantDB = this.cloudant.use(dbName);
              this.dbName = dbName;
              // Now create any design docs that might be defined
              const designCreatePromises = this.buildDesignCreatePromiseArray(dbName, dbConfig, createHash);
              Promise.all(designCreatePromises).then((designResult) => {
                const dbResult: any = { dbName, exist: true, design: [] };
                dbResult.design = designResult;
                resolve(dbResult);
              });
            }
          });
        } else {
          this.LOGGER.info('Database ' + dbName + ' already exist, creating designs');
          // Now create any design docs that might be defined
          const designCreatePromises = this.buildDesignCreatePromiseArray(dbName, dbConfig, createHash);

          Promise.all(designCreatePromises).then((designResult) => {
            const dbResult: any = { dbName, exist: true, design: [] };
            dbResult.design = designResult;
            resolve(dbResult);
          });
        }
      } catch (err) {
        this.LOGGER.info('Error in creating cloudant database : ' + err);
        reject(err);
      }
    });
  }

  public buildDesignCreatePromiseArray(dbName: string, dbConfig: any, createHash: any) {
    const designs = dbConfig.design ? dbConfig.design : [];
    const designCreatePromises = [];
    for (const design of designs) {
      const designName = design.name;
      designCreatePromises.push(this.createCloudantDesign(dbName, designName, design, createHash));
    }
    const indexes = dbConfig.index ? dbConfig.index : [];
    for (const index of indexes) {
      const indexName = index.name;
      designCreatePromises.push(this.createCloudantIndex(dbName, indexName, index, createHash));
    }
    return designCreatePromises;
  }

  public createCloudantIndex(dbName: string, indexName: string, indexDef: any, createHash: any) {
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Creating cloudant index with name ' + indexName + ' in database ' + dbName);
        const createIndex = createHash.design[dbName + '-' + indexName + '-index'];
        if (createIndex) {
          this.cloudantDB.index(indexDef, (err: any, body: any) => {
            if (!err) {
              resolve({ type: 'index', name: indexName, exist: true });
            } else {
              this.LOGGER.info('Error returned from cloudant trying to create an index : ' + JSON.stringify(err));
              resolve({ type: 'index', name: indexName, exist: false });
            }
          });
        } else {
          resolve({ indexName, exist: true });
        }
      } catch (err) {
        this.LOGGER.info('Error creating index : ' + err);
        reject(err);
      }
    });
  }

  public createCloudantDesign(dbName: string, designName: string, design: any, createHash: any) {
    return new Promise((resolve, reject) => {
      try {
        this.LOGGER.info('Creating cloudant design document ' + designName + ' in database ' + dbName);
        const createDesign = createHash.design[dbName + '-' + designName + '-design'];
        if (createDesign) {
          this.cloudantDB.insert(design, '_design/' + designName, (err, body) => {
            if (!err) {
              resolve({ type: 'design', name: designName, exist: true });
            } else {
              this.LOGGER.info('Error returned from cloudant trying to create a design document : ' + JSON.stringify(err));
              resolve({ type: 'design', name: designName, exist: false });
            }
          });
        } else {
          resolve({ designName, exist: true });
        }
      } catch (err) {
        this.LOGGER.info('Error creating cloudant design document : ' + err);
        reject(err);
      }
    });
  }

  public getCreateManifest(checkResult: any) {
    const createHash: any = {
      db: {},
      design: {},
    };
    try {
      for (let i = 0; i < checkResult.length; i++) {
        createHash.db[checkResult[i].dbName] = !checkResult[i].exist;
        for (let j = 0; j < checkResult[i].design.length; j++) {
          const name = checkResult[i].dbName + '-' + checkResult[i].design[j].name + '-' + checkResult[i].design[j].type;
          createHash.design[name] = !checkResult[i].design[j].exist;
        }
      }
      return createHash;
    } catch (err) {
      this.LOGGER.info('Error in building the sync manifest : ' + err);
    }
  }

  public setupCloudant() {
    return new Promise((resolve, reject) => {
      // Instanciate the Cloudant Initializer
      this.checkCloudant().then((checkResult) => {
        const needSync = this.needSync(checkResult);
        if (needSync) {
          this.syncCloudantConfig(checkResult).then((createResult) => {
            this.printCheckResults(createResult);
            this.LOGGER.info('*** Synchronization completed. ***');
            this.insertSampleTweets().then((dataResult) => {
              this.LOGGER.info('*** Sample tweet data inserted successfully. ***' + dataResult);
              resolve();
            }).catch((err) => {
              this.LOGGER.info('*** Error while saving sample tweets to database ***');
              reject(err);
            });
          });
        } else {
          this.printCheckResults(checkResult);
          this.LOGGER.info('*** Synchronization not required. ***');
          resolve();
        }
      }, (err) => {
        this.LOGGER.info(err);
        reject();
      });
    });
  }

  /**
   * insert sample tweets
   * @param {*} tweets
   */
  public insertSampleTweets() {
    return new Promise((resolve, reject) => {
      try {
        let i = 1;
        const dataLoadPromises: any = [];
        for (const tweet of tweets.default) {
          // needed to add these as sample tweets don't haec all the details
          const tweetToDb: any = tweet;
          tweetToDb.post_by = 'system';
          tweetToDb.source = 'system';
          tweetToDb.tweet_id = i++;

          this.enrichmentPipeline.enrich(tweet.text).then((enrichments) => {
            // Then save it to something...
            /* this.cloudantDAO.saveToCloudant(enrichedData, false).then(() => {
                this.LOGGER.info("*** Saved " + JSON.stringify(enrichedData) + " to the database.");
            }).catch((err) => {
                this.LOGGER.info("Error saving to cloudant: " + err);
            }); */
            tweetToDb.enrichments = enrichments;
            dataLoadPromises.push(this.saveToCloudant(tweetToDb, false));
          }).catch((err) => {
            this.status.lastError = err;
            this.status.errors++;
            // If it's not an unsupported text language error, then we pause the listener.
            if (err.indexOf('unsupported text language') === -1) {
              this.LOGGER.info('An enrichment error occurred' + err);
            }
            reject(err);
          });
        }
        Promise.all(dataLoadPromises).then((loadDataResult) => {
          this.LOGGER.info('Done syncing cloudant data');
          resolve(loadDataResult);
        }).catch((err) => {
          reject(err);
        });
      } catch (err) {
        this.LOGGER.info('Error in saving tweets to database : ' + err);
        reject(err);
      }
    });
  }

  public listByPostDate(skip: number, limit: number, cb: (err?: Error, result?: any) => void) {
    try {
      const params = {};
      this.listByView(this.dbName, 'created-at-view', limit, skip, params)
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
      this.cloudantDB.view(this.dbName, 'sentiment-view', params, (err, sot) => {
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
      this.cloudantDB.view(this.dbName, 'sentiment-overtime-view', params, (err, result) => {
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
      this.cloudantDB.view(this.dbName, 'classification-view', params, (err, result) => {
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
      this.cloudantDB.view(this.dbName, 'emotional-overtime-view', params, (err, result) => {
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
      this.cloudantDB.view(this.dbName, 'entities-view', params, (err, result) => {
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
      this.cloudantDB.view(this.dbName, 'keywords-view', params, (err, result) => {
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

      this.cloudantDB.view(this.dbName, 'created-at-view', params, (err, result) => {
        if (err) { return cb(err); }
        cb(undefined, result);
      });
    } catch (err) {
      cb(err);
    }
  }

}
