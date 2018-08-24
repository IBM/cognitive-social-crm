import * as nano from "nano";
import * as winston from "winston";
import { Promise } from "es6-promise";
import * as dotenv from "dotenv";
import { TwitterOptions } from "../model/CRMModel";

export class CloudantDAO {

    private cloudantDB: nano.DocumentScope<{}>;
    private options: TwitterOptions = <TwitterOptions>{};
    private maxBufferSize: number;
    private bulkSaveBuffer: nano.BulkModifyDocsWrapper;
    private duplicateDetectionCache: any;
    private duplicateDetectionCacheThreshold: number;

    private LOGGER = winston.createLogger({
        level: process.env.LOGLEVEL,
        transports: [
            new (winston.transports.Console)({ format: winston.format.simple() })]
    });

    /**
     * @param cloudant
     * @param dbname
     * @param options
     */
    constructor(cloudant: any, dbname: string) {
        dotenv.config();
        this.cloudantDB = cloudant.db.use(dbname);
        // options settings
        this.options.outputType = process.env.OUTPUT_TYPE || "";
        this.options.saveType = process.env.SAVE_TYPE || "";
        this.bulkSaveBuffer = {
            docs: []
        };
        this.maxBufferSize = this.options.maxBufferSize ? this.options.maxBufferSize : 1;
        // Initialize the duplicate tweet detection cache.
        this.duplicateDetectionCache = {
            tweetIdCache: {},
            tweetTextCache: {}
        };
        // Once you reach this limit, start removing some of the old entries.
        this.duplicateDetectionCacheThreshold = 50;
    }

    listByView(design: string, view: string, limit: number, skip: number, params: nano.DocumentViewParams) {
        return new Promise((resolve, reject) => {
            try {
                params = {
                    reduce: false,
                    descending: true,
                    include_docs: true,
                    limit: !limit ? 5 : limit,
                    skip: !skip ? 0 : skip
                };
                this.cloudantDB.view(design, view, params, (err, resp) => {
                    if (err) return reject(err);
                    // Map the results to the response for the client
                    const response = {
                        total: resp.total_rows,
                        data: resp.rows
                    };
                    resolve(response);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    bulk(bulkRequest: nano.BulkModifyDocsWrapper) {
        return new Promise((resolve, reject) => {
            this.cloudantDB.bulk(bulkRequest, (err, resp) => {
                if (err) return reject(err);
                resolve(resp);
            });
        });
    }

    saveToCloudant(data: any, force: boolean) {
        return new Promise((resolve, reject) => {
            try {
                if (data && data.text) {
                    this.bulkSaveBuffer.docs.push(data);
                }
                this.LOGGER.debug("Length of Buffer: : " + this.bulkSaveBuffer.docs.length);
                // If the bulk buffer threshold is reached, or the force flag is true,
                // Then save the buffer to cloudant.
                if (this.bulkSaveBuffer.docs.length >= this.maxBufferSize || force) {
                    // Throttle the save to not exceed Cloudant free plan limits
                    this.LOGGER.debug("Saving to Cloudant...");
                    setTimeout(() => {
                        // Save the meta data to Cloudant
                        this.cloudantDB.bulk(this.bulkSaveBuffer, (err, result) => {
                            if (err) {
                                reject(err);
                            } else {
                                this.LOGGER.debug("Successfully saved " + this.bulkSaveBuffer.docs.length + " docs to Cloudant.");
                                this.bulkSaveBuffer.docs = [];
                                resolve();
                            }
                        });
                    }, 1000);
                } else {
                    resolve();
                }
            } catch (err) {
                reject(err);
            }
        });
    }


    /** This function will check for duplicate tweets in a memory cache and if not found,
     * will then check in Cloudant if the output type is cloudant.
     */
    duplicateCheck(tweet: any) {
        return new Promise((resolve, reject) => {
            try {
                this.LOGGER.debug("In Duplicate Detection.");
                if (this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()]) {
                    this.LOGGER.info("Duplicate Tweet ID found.");
                    return reject();
                }
                this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()] = true;
                if (Object.keys(this.duplicateDetectionCache.tweetIdCache).length > this.duplicateDetectionCacheThreshold) {
                    this.trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetIdCache);
                }
                // Now check if the text of the tweet is in the cache.
                if (this.duplicateDetectionCache.tweetTextCache[tweet.text]) {
                    this.LOGGER.info("Duplicate Tweet Text found.");
                    return reject();
                }
                this.duplicateDetectionCache.tweetTextCache[tweet.text] = true;
                if (Object.keys(this.duplicateDetectionCache.tweetTextCache).length > this.duplicateDetectionCacheThreshold) {
                    this.trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetTextCache);
                }
                if (this.options.saveType === "cloudant") {
                    this.LOGGER.info("Checking in Cloudant.");
                    this.cloudantDuplicateCheck(tweet).then(() => {
                        resolve();
                    }).catch((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            reject();
                        }
                    });
                } else {
                    resolve();
                }
            } catch (err) {
                this.LOGGER.error(err);
                reject(err);
            }
        });
    }


    cloudantDuplicateCheck(tweet: any) {
        return new Promise((resolve, reject) => {
            try {
                if (!tweet) {
                    return resolve();
                }
                this.LOGGER.info("In Cloudant Duplicate Tweet Check.");
                // First check if the tweet was already processed
                const selector = { "selector": { "tweet_id": tweet.id } };

                this.cloudantDB.find(selector, (err, result) => {
                    if (err) return reject(err);
                    this.LOGGER.info("Result of tweet id check = " + JSON.stringify(result));
                    if (result.docs.length > 0) {
                        this.LOGGER.info("Duplicate detected... Ignoring the tweet...");
                        return reject();
                    }
                    // Check for duplicate tweets based on the tweet text to avoid any spamming
                    this.cloudantDB.search("analysis-db", "tweet-text-search", { q: 'tweet_text:"' + tweet.text + '"' }, (err, result) => {
                        if (err) return reject(err);
                        this.LOGGER.info("Result of duplicate tweet text check = " + JSON.stringify(result));
                        if (result && result.total_rows > 0) {
                            this.LOGGER.info("Tweet is filtered because of duplicate tweet text detection");
                            return reject();
                        }
                        resolve();
                    });
                });
            } catch (err) {
                console.log(err);
                reject(err);
            }
        });
    }

    /**
     * Remove the a quarter of the cached entries from the duplicate detection cache.
     * @param threshold
     * @param cacheObject
     */
    trimCache(threshold: number, cacheObject: string[]) {
        const count = Math.round(threshold / 4);
        this.LOGGER.debug("Trimming " + count + " items from the cache.");
        const itemsToDelete: string[] = [];
        for (const key in cacheObject) {
            if (itemsToDelete.length < count) {
                itemsToDelete.push(key);
            } else {
                break;
            }
        }
        for (const i in itemsToDelete) {
            delete cacheObject[i];
        }
    }

    bulkBufferLength() {
        return this.bulkSaveBuffer.docs.length;
    }
}
