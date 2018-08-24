import * as dotenv from "dotenv";
dotenv.config();

export const ENV = {
    dev: "development",
    prod: "production",
    test: "testing"
};

let config = {
    environment: process.env.NODE_ENV || ENV.dev,
    port: process.env.PORT || 3000,
    logging: process.env.LOGGING,
    log_level: process.env.LOG_LEVEL,
    cloudant_username: process.env.CLOUDANT_USERNAME,
    cloudant_password: process.env.CLOUDANT_PASSWORD,
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
    conversationClassificationId: process.env.ASSISTANT_CLASSIFICATION_WORKSPACE_ID,
    isLocal: true

};

// merge environment specific config to default config.
config = { ...config, ...require(`./${config.environment}`).config };

export default config;