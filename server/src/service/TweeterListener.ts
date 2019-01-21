import * as Cloudant from '@cloudant/cloudant';
import { Promise } from 'es6-promise';
import * as moment from 'moment';
import * as Twit from 'twit';
import * as winston from 'winston';
import config from '../config';
import { CloudantDAO } from '../dao/CloudantDAO';
import { TwitterOptions, TwitterResponse, CloudantOptions } from '../model/CRMModel';
import { EnrichmentPipeline } from '../util/EnrichmentPipeline';
import { OutputFormatter } from '../util/OutputFormatter';
import logger from '../util/Logger';

export class TweeterListener {

  public static getInstance(options: TwitterOptions, enrichmentPipeline: EnrichmentPipeline) {
    if (this.tweeterListener === undefined) {
      this.tweeterListener = new TweeterListener(options, enrichmentPipeline);
    }
    return this.tweeterListener;
  }

  private static tweeterListener: TweeterListener;

  private status: any;
  private options: TwitterOptions;
  private twitterClient: Twit;
  private outCount: number;
  private stream!: Twit.Stream;
  private cloudantDAO: CloudantDAO;
  private outputFormatter: OutputFormatter;
  private enrichmentPipeline: EnrichmentPipeline;

  private LOGGER = winston.createLogger({
    level: config.log_level,
    transports: [
      new (winston.transports.Console)({ format: winston.format.simple() })],
  });

  private constructor(options: TwitterOptions, enrichmentPipeline: EnrichmentPipeline) {
    this.options = options;
    this.options.listenFor = config.listenFor || '';
    this.options.listenTo = config.listenTo || '';
    this.options.filterContaining = config.filterContaining || '';
    this.options.filterFrom = config.filterFrom || '';
    this.options.processRetweets = config.processRetweets || false;

    // Initialize the Status object
    this.status = {
      listening: 'N/A',
      started_at: new Date(),
      received: 0,
      filtered: 0,
      saved: 0,
      errors: 0,
      last_received_at: undefined,
      last_error: undefined,
      state: 'initialized',
    };

    // If the max isn't specified in the options, then set it to unlimited for listen.  100 for search.
    if (!this.options.max) {
      this.options.max = -1;
    }
    this.outCount = 0;

    const cloudantOptions: CloudantOptions = {} as CloudantOptions;
    cloudantOptions.maxBufferSize = 1;
    this.cloudantDAO = CloudantDAO.getInstance(options, enrichmentPipeline);

    this.outputFormatter = new OutputFormatter();
    this.enrichmentPipeline = enrichmentPipeline;

    const twitOptions: Twit.Options = {} as Twit.Options;
    twitOptions.consumer_key = config.consumer_key || '';
    twitOptions.consumer_secret = config.consumer_secret || '';
    twitOptions.access_token = config.access_token;
    twitOptions.access_token_secret = config.access_token_secret;
    twitOptions.timeout_ms = 60 * 1000;  // optional HTTP request timeout to apply to all requests.
    this.twitterClient = new Twit(twitOptions);

    this.LOGGER.info('Tweet listener initialized.');
  }

  /**
   * Initialzes user ids if `listen to` setting is used
   */
  public init() {
    return new Promise((resolve, reject) => {
      try {
        if (this.options.listenTo) {
          this.lookupUsers(this.options.listenTo).then((userIds) => {
            this.options.userIds = userIds as string;
            resolve();
          }, (err) => {
            this.LOGGER.error(err);
            reject(err);
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

  /**
   * Lookup screen_names for user ids.
   * Required when you want to listen for tweets
   * from a specific Twitter user.
   * @param listenTo
   */
  public lookupUsers(listenTo: string) {
    return new Promise((resolve, reject) => {
      try {
        const userIds: string[] = [];
        // Retrieve the User ID's from Twitter for the requested Screennames
        const twitParams: Twit.Params = {} as Twit.Params;
        twitParams.screen_name = listenTo;
        this.twitterClient.get('users/lookup', twitParams)
          .catch((err) => {
            this.LOGGER.error(err.stack);
            reject(err.stack);
          }).then((result) => {
            const promiseRespnose: Twit.PromiseResponse = result as Twit.PromiseResponse;
            if (!(promiseRespnose.resp.statusCode === 200)) {
              return reject('Error while getting user ids');
            }
            const twitterResponses: TwitterResponse[] = promiseRespnose.data as TwitterResponse[];
            for (const twitterResponse of twitterResponses) {
              userIds.push(twitterResponse.id_str);
            }
            resolve(userIds);
          });
      } catch (err) {
        this.LOGGER.error(err);
        reject(err);
      }
    });
  }

  public startListener() {
    // Check that there isn't a listener already started.
    if (this.status.state === 'started') {
      this.LOGGER.error('Twitter Listener requested to be started, but there is one already running.');
      return;
    }
    if (this.options.listenTo) {
      this.LOGGER.info('Twitter listening TO: ' + this.options.listenTo);
      this.status.listening = this.options.listenTo;
      const twitParams: Twit.Params = {} as Twit.Params;
      twitParams.lang = 'en';
      twitParams.follow = this.options.userIds;
      this.status.listening = this.options.listenTo;
      this.stream = this.twitterClient.stream('statuses/filter', twitParams);
    } else {
      this.LOGGER.info('Twitter listening for: ' + this.options.listenFor);
      this.status.listening = this.options.listenFor;
      const twitParams: Twit.Params = {} as Twit.Params;
      twitParams.lang = 'en';
      twitParams.track = this.options.listenFor;
      this.status.listening = this.options.listenFor;
      this.stream = this.twitterClient.stream('statuses/filter', twitParams);
    }
    // Update the status to started.
    this.status.state = 'started';
    this.status.started_at = new Date();
    delete this.status.paused_at;
    delete this.status.will_resume_at;

    this.stream.on('error', (err: any) => {
      this.LOGGER.error(err);
    });

    this.stream.on('tweet', (tweet: any) => {
      this.LOGGER.info('Tweet:: ' + JSON.stringify(tweet));
      this.receiveTweet(tweet);
    });
    this.LOGGER.info('Tweet Listener is started.');
  }

  public receiveTweet(tweet: any) {
    try {
      this.LOGGER.silly('Tweet Received: ' + JSON.stringify(tweet));
      if (tweet.text.length < 10) {
        this.LOGGER.debug('Tweet Length to short to process.');
        return;
      }
      this.status.last_received_at = new Date();
      this.status.received++;
      // Filter the tweets.
      if (!this.options.processRetweets && tweet.retweeted_status) {
        this.status.filtered++;
        this.LOGGER.debug('Retweet filter applied');
        return;
      }
      if (this.options.filterFrom === tweet.user.screen_name) {
        this.status.filtered++;
        this.LOGGER.debug('Screen name filter applied');
        return;
      }
      if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
        this.LOGGER.debug('Using the extended text.');
        tweet.text = tweet.extended_tweet.full_text;
      }
      const s = this.options.filterContaining.split(',');
      if (s && s.length > 0) {
        for (const m of s) {
          if (m.trim().length > 0 && tweet.text.toLowerCase().indexOf(m) > -1) {
            this.status.filtered++;
            this.LOGGER.debug('Keyword filter is applied.');
            return;
          }
        }
      }
      // Process the tweet if not filtered, but delay the processing 5 seconds if running locally
      setTimeout(() => {
        this.processTweet(tweet);
      }, (config.isLocal ? 0 : 5000));
    } catch (err) {
      this.LOGGER.error(err);
    }
  }

  public processTweet(tweet: any) {
    this.LOGGER.debug('Processing Tweet.');
    this.cloudantDAO.duplicateCheck(tweet).then(() => {
      // Convert the tweet into a format...
      this.outputFormatter.formatAsJson(tweet).then((data) => {
        // Do some enrichment
        this.enrichmentPromise(data).then((enrichedData) => {
          // Then save it to something...
          this.cloudantDAO.saveToCloudant(enrichedData, false).then(() => {
            this.status.saved++;
            this.outCount++;
            // tslint:disable:max-line-length
            this.LOGGER.debug(this.outCount + ' Tweets processed with a maximum of ' + (this.options.max === -1 ? 'Unlimited' : this.options.max));
            if (this.options.max > 0 && this.outCount >= this.options.max) {
              this.LOGGER.debug('>> Maximum saved count was reached, stop listening...');
              this.stream.stop();
            }
          }).catch((err) => {
            this.LOGGER.error('Error saving to cloudant ' + err);
          });
        }).catch((err) => {
          this.status.lastError = err;
          this.status.errors++;
          // If it's not an unsupported text language error, then we pause the listener.
          // tslint:disable:max-line-length
          if (err.indexOf('unsupported text language') === -1) {
            this.LOGGER.debug('An Enrichment error occurred, the listener is being paused for 15 minutes to see if it resolved the problem.');
            this.pauseListener(15);
          }
        });
      });
    }).catch((err) => {
      if (err) {
        this.LOGGER.error('Error checking for duplicate: ' + err);
        return;
      }
      this.LOGGER.error('Tweet is a duplicate');
    });
  }

  public getStatus() {
    if (this.status) {
      return this.status;
    } else {
      return { status: 'Listner isn\'t started yet.' };
    }
  }

  public pauseListener(minutes: number) {
    this.LOGGER.info('Tweet Listener paused.');
    const now = moment();
    let pauseDuration = moment();
    if (minutes) {
      pauseDuration = moment().add(minutes, 'm');
    }
    if (this.stream) {
      this.status.state = 'paused';
      this.status.paused_at = new Date();
      this.status.will_resume_at = pauseDuration.toDate();
      this.stream.stop();
    }
    this.LOGGER.debug('Listener will resume at ' + pauseDuration.format('dddd, MMMM Do YYYY, h:mm:ss a'));
    setTimeout(() => {
      this.startListener();
    }, pauseDuration.diff(now));
  }

  public enrichmentPromise(data: any) {
    return new Promise((resolve, reject) => {
      this.enrichmentPipeline.enrich(data.text).then((enrichments) => {
        data.enrichments = enrichments;
        resolve(data);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  /**
   * This is an empty enrichment promise if
   * no other enrichment pipline is specified.
   * @param data
   */
  private noEnrichment(data: any) {
    return new Promise((resolve, reject) => {
      resolve(data);
    });
  }

}
