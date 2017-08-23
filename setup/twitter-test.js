'use strict'

var TwitterReceiver = require('../common/utils/twitter/tweet-listener')

function TwitterTest () {}

TwitterTest.prototype.run = function (done) {
  let options = {
    logLevel: 'debug',
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
    listen_for: process.env.TWITTER_LISTEN_FOR,
    filter_from: process.env.TWITTER_FILTER_FROM,
    filter_containing: process.env.TWITTER_FILTER_CONTAINING,
    process_retweets: process.env.TWITTER_PROCESS_RETWEETS,
    max: 10,
    outputType: 'json',
    saveType: 'terminal'
  }
  console.log('Initializing...')
  TwitterReceiver.init(options, () => {
    console.log('Receiver Started...')
    TwitterReceiver.startListener()
    done(null, { success: true })
  })
}

module.exports = new TwitterTest()
