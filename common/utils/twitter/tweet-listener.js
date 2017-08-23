'use strict'

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  level: process.env.LOGLEVEL,
  transports: [
    new (winston.transports.Console)({ 'timestamp': (process.env.isLocal === 'true') })
  ]
})

var Twitter = require('twit')
var moment = require('moment')

var OutputFormatter = require('./output-formatter')
var SaveTo = require('./save-to')

var TweetListener = function () {
  this.status = {}
}

/** This is an empty enrichment promise if no other enrichment pipline is specified.
 */
var noEnrichment = function (data) {
  return new Promise((resolve, reject) => {
    resolve(data)
  })
}

/** Initialze the tweet collector.  The options drive the behaviour of the collector.
 */
TweetListener.prototype.init = function (_options, cb) {
  this.options = _options
  // Default to the info log level
  LOGGER.level = this.options.logLevel ? this.options.logLevel : 'info'
  LOGGER.info('Tweet listener initialize.')
  // Initialize the Status object
  this.status = {
    listening: 'N/A',
    started_at: new Date(),
    received: 0,
    filtered: 0,
    saved: 0,
    errors: 0,
    last_received_at: null,
    last_error: null,
    state: 'initialized'
  }
  // If the max isn't specified in the options, then set it to unlimited for listen.  100 for search.
  if (!this.options.max) {
    this.options.max = -1
  }
  this.outCount = 0
  // If no enrichment promise is specified, then default to the one in this module.
  if (this.options.enrichment_promise === undefined || this.options.outputType === 'csv') {
    LOGGER.debug('Enrichment set to No Enrichment.')
    this.options.enrichment_promise = noEnrichment
  }
  // Initialize the output formatter
  this.outputAsFunc = OutputFormatter.init(this.options)
  // Initialize where the output should be saved to.
  this.saveTypeFunc = SaveTo.init(this.options)
  // Create the Twitter client
  this.twitterClient = new Twitter({
    consumer_key: this.options.consumer_key,
    consumer_secret: this.options.consumer_secret,
    access_token: this.options.access_token,
    access_token_secret: this.options.access_token_secret,
    timeout_ms: 60 * 1000  // optional HTTP request timeout to apply to all requests.
  })
  // Lookup the user ids if listen_to was specified.
  if (this.options.listen_to) {
    this.lookupUsers(this.options.listen_to).then((userIds) => {
      this.options.user_ids = userIds
      cb()
    }, (err) => {
      LOGGER.error(err)
      cb(err)
    })
  } else {
    cb()
  }
}

/** Lookup screen_names for user ids.  Required when you want to listen for tweets from
 *  a specific Twitter user.
 */
TweetListener.prototype.lookupUsers = function (listenTo) {
  return new Promise((resolve, reject) => {
    try {
      let userIds = []
      // Retrieve the User ID's from Twitter for the requested Screennames
      this.twitterClient.get('users/lookup', { screen_name: listenTo })
      .catch(function (err) {
        LOGGER.error(err.stack)
        reject(err.stack)
      })
      .then(function (result) {
        if (result.data.errors) {
          return reject(result.data.errors[0])
        }
        for (let userData of result.data) {
          userIds.push(userData.id)
        }
        resolve(userIds)
      })
    } catch (err) {
      LOGGER.error(err)
      reject(err)
    }
  })
}

/** Start a Twitter Stream to receive tweets as they are tweeted.
 */
TweetListener.prototype.startListener = function () {
  // Check that there isn't a listener already started.
  if (this.status.state === 'started') {
    LOGGER.error('Twitter Listener requested to be started, but there is one already running.')
    return
  }
  LOGGER.info('Tweet Listener is started.')
  if (this.options.listen_to) {
    this.status.listening = this.options.listen_to
    this.stream = this.twitterClient.stream('statuses/filter', { follow: this.options.user_ids, language: 'en' })
  } else {
    this.status.listening = this.options.listen_for
    this.stream = this.twitterClient.stream('statuses/filter', { track: this.options.listen_for, language: 'en' })
  }
  // Update the status to started.
  this.status.state = 'started'
  this.status.started_at = new Date()
  delete this.status.paused_at
  delete this.status.will_resume_at

  this.stream.on('error', (err) => {
    this.handleTwitterConnectionError(err)
  })

  this.stream.on('tweet', (tweet) => {
    this.receiveTweet(tweet)
  })
}

TweetListener.prototype.stopListener = function () {
  LOGGER.info('Tweet Listener stopped.')
  this.status.stopped = new Date()
  this.stream.stop()
}

TweetListener.prototype.pauseListener = function (minutes) {
  LOGGER.info('Tweet Listener paused.')
  let now = moment()
  let pauseDuration = moment()
  if (minutes) {
    pauseDuration = moment().add(minutes, 'm')
  }
  if (this.stream) {
    this.status.state = 'paused'
    this.status.paused_at = new Date()
    this.status.will_resume_at = pauseDuration.toDate()
    this.stream.stop()
  }
  LOGGER.debug('Listener will resume at ' + pauseDuration.format('dddd, MMMM Do YYYY, h:mm:ss a'))
  setTimeout(() => {
    this.startListener()
  }, (pauseDuration - now))
}

TweetListener.prototype.receiveTweet = function (tweet) {
  try {
    LOGGER.silly('Tweet Received: ' + JSON.stringify(tweet))
    if (tweet.text.length < 10) {
      LOGGER.debug('Tweet Length to short to process.')
      return
    }
    this.status.last_received_at = new Date()
    this.status.received++
    // Filter the tweets.
    if (!this.options.process_retweets && tweet.retweeted_status) {
      this.status.filtered++
      LOGGER.debug('Retweet filter applied')
      return
    }
    if (this.options.filter_from === tweet.user.screen_name) {
      this.status.filtered++
      LOGGER.debug('Screen name filter applied')
      return
    }
    if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
      LOGGER.debug('Using the extended text.')
      tweet.text = tweet.extended_tweet.full_text
    }
    let s = this.options.filter_containing.split(',')
    if (s && s.length > 0) {
      for (let m of s) {
        if (m.trim().length > 0 && tweet.text.toLowerCase().indexOf(m) > -1) {
          this.status.filtered++
          LOGGER.debug('Keyword filter is applied.')
          return
        }
      }
    }

    // Process the tweet if not filtered, but delay the processing 5 seconds if running locally
    setTimeout(() => {
      this.processTweet(tweet)
    }, (process.env.isLocal ? 0 : 5000))
  } catch (err) {
    LOGGER.error(err)
  }
}

/** Process the received Tweet, transform it to a format, call the enrichment and save it somewhere.
 */
TweetListener.prototype.processTweet = function (tweet) {
  LOGGER.debug('Processing Tweet.')
  SaveTo.duplicateCheck(tweet).then(() => {
    // Convert the tweet into a format...
    OutputFormatter[this.outputAsFunc](tweet).then((data) => {
      // Do some enrichment
      this.options.enrichment_promise(data).then((enrichedData) => {
        // Then save it to something...
        SaveTo[this.saveTypeFunc](enrichedData).then(() => {
          this.status.saved++
          this.outCount++
          LOGGER.debug(this.outCount + ' Tweets processed with a maximum of ' + (this.options.max === -1 ? 'Unlimited' : this.options.max))
          if (this.options.max > 0 && this.outCount >= this.options.max) {
            LOGGER.debug('>> Maximum saved count was reached, stop listening...')
            // If cloudant, then using a bulk buffer and it needs to be cleared out.
            if (this.options.saveType === 'cloudant') {
              this[this.saveTypeFunc](enrichedData, true).then(() => {})
            }
            this.stream.stop()
          }
        }).catch((err) => {
          LOGGER.error('Error saving to ' + this.options.saveType + ': ' + err)
        })
      }).catch((err) => {
        this.status.lastError = err
        this.status.errors++
        // If it's not an unsupported text language error, then we pause the listener.
        if (err.indexOf('unsupported text language') === -1) {
          LOGGER.debug('An Enrichment error occurred, the listener is being paused for 15 minutes to see if it resolved the problem.')
          this.pauseListener(15)
        }
      })
    })
  }).catch((err) => {
    if (err) {
      LOGGER.info('Error checking for duplicate: ' + err)
      return
    }
    LOGGER.info('Tweet is a duplicate')
  })
}

/** This is required to hanlde connection errors to the Twitter API.
 */
TweetListener.prototype.handleTwitterConnectionError = function (err) {
  LOGGER.error(err)
}

/** Access function to retrieve the current status of this connector.
 */
TweetListener.prototype.getStatus = function () {
  if (this.status) {
    return this.status
  } else {
    return { status: 'Listner isn\'t started yet.' }
  }
}

module.exports = new TweetListener()
