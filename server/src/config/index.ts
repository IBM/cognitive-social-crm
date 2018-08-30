import * as dotenv from 'dotenv';
dotenv.config();
// let vcapServices = require('vcap_services');
// let cloudantCreds = vcapServices.getCredentials('cloudantNoSQLDB');

export const ENV = {
  dev: 'development',
  prod: 'production',
  test: 'testing',
};

/* let cloudant_username: string;
let cloudant_password: string;
if(process.env.NODE_ENV === 'production'){    
  cloudant_username = cloudantCreds.username;
  cloudant_password = cloudantCreds.password;  
}else {
  cloudant_username = process.env.CLOUDANT_USERNAME || '';
  cloudant_password = process.env.CLOUDANT_PASSWORD || '';
} */

let config = {
  environment: process.env.NODE_ENV || ENV.dev,
  port: process.env.PORT || 3000,
  logging: process.env.LOGGING,
  log_level: process.env.LOGLEVEL,
  // cloudant_username: cloudant_username,
  // cloudant_password: cloudant_password,
  cloudant_username: process.env.CLOUDANT_USERNAME || '',
  cloudant_password: process.env.CLOUDANT_PASSWORD || '',
  cloudant_db: process.env.CLOUDANT_ANALYSIS_DB_NAME,
  listenFor: process.env.TWITTER_LISTEN_FOR,
  listenTo: process.env.TWITTER_LISTEN_TO,
  filterContaining: process.env.TWITTER_FILTER_CONTAINING,
  filterFrom: process.env.TWITTER_FILTER_FROM,
  processRetweets: Boolean(process.env.TWITTER_PROCESS_RETWEETS),
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,  
  isLocal: true,

};

// merge environment specific config to default config.
// tslint:disable-next-line:no-var-requires
config = { ...config, ...require(`./${config.environment}`).config };

export default config;
