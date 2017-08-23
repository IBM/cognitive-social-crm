'use strict'

var TweetListener = require('../../common/utils/twitter/tweet-listener')
var EnrichmentPipeline = require('../../common/utils/enrichment-pipeline')

module.exports = function (app, done) {
  let options = {
    logLevel: process.env.LOGLEVEL,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
    listen_for: process.env.TWITTER_LISTEN_FOR,
    filter_from: process.env.TWITTER_FILTER_FROM,
    filter_containing: process.env.TWITTER_FILTER_CONTAINING,
    process_retweets: process.env.TWITTER_PROCESS_RETWEETS,
    cloudant_username: process.env.CLOUDANT_USERNAME,
    cloudant_password: process.env.CLOUDANT_PASSWORD,
    cloudant_db: process.env.CLOUDANT_ANALYSIS_DB_NAME,
    max: -1,
    outputType: 'json',
    saveType: 'cloudant',
    enrichment_promise: function (data) {
      return new Promise((resolve, reject) => {
        EnrichmentPipeline.enrich(data.text).then((enrichments) => {
          data.enrichments = enrichments
          resolve(data)
        }).catch((err) => {
          reject(err)
        })
      })
    }
  }
  TweetListener.init(options, () => {
    if (process.env.TWITTER_RECEIVER_START_AT_BOOT === 'true') {
      TweetListener.startListener()
      done()
    } else {
      done()
    }
  })
}
