'use strict'

var SearchTweets = require('../common/utils/twitter/search-tweets')
var EnrichmentPipeline = require('../common/utils/enrichment-pipeline')
var inquirer = require('inquirer')

function TwitterSearch () {}

var searchCount = [
  {
    message: 'How many tweets would you like to search for?',
    name: 'count',
    default: 10
  }
]

TwitterSearch.prototype.run = function (done) {
  inquirer.prompt(searchCount).then((answer) => {
    let options = {
      logLevel: 'debug',
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_SECRET,
      filter_from: process.env.TWITTER_FILTER_FROM,
      filter_containing: process.env.TWITTER_FILTER_CONTAINING,
      process_retweets: process.env.TWITTER_PROCESS_RETWEETS,
      cloudant_username: process.env.CLOUDANT_USERNAME,
      cloudant_password: process.env.CLOUDANT_PASSWORD,
      cloudant_db: process.env.CLOUDANT_ANALYSIS_DB_NAME,
      max: parseInt(answer.count),
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
    console.log('Initializing...')
    SearchTweets.init(options, () => {
      console.log('Receiver Started...')
      SearchTweets.search({ q: process.env.TWITTER_LISTEN_FOR }).then(() => {
        console.log('Search Completed.')
        done(null, { success: true })
      })
    })
  })
}

module.exports = new TwitterSearch()
