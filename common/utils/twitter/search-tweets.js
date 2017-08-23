'use strict'

var Twitter = require('twit')

var OutputFormatter = require('./output-formatter')
var SaveTo = require('./save-to')

var SearchTweet = function () {}

// This is an empty enrichment promise if none are specified by the caller.
var noEnrichment = function (data) {
  return new Promise((resolve, reject) => {
    data.enrichment_at = new Date()
    resolve(data)
  })
}

// Initialze the tweet collector.  The options object drives the behaviour of the collector.
SearchTweet.prototype.init = function (_options, cb) {
  this.options = _options
  this.page = 0
  this.outCount = 0
  // If no enrichment promise is specified, then default to the one in this module.
  if (this.options.enrichment_promise === undefined || this.options.outputType === 'csv') {
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
  cb()
}

// Search for tweets based on the parameters.  This function will also be called recursively to page through more results.
SearchTweet.prototype.search = function (params) {
  return new Promise((resolve, reject) => {
    try {
      // If no max is specified, then default to 100 being returned
      this.options.max = this.options.max === -1 ? 100 : this.options.max
      if (this.options.max < 100) {
        params.count = this.options.max
      }
      if (this.options.max && this.outCount >= this.options.max) {
        console.log('Exiting with ' + this.outCount + ' tweets processed')
        return resolve()
      }
      if (!params.max_id) {
        this.page = 0
      }
      this.twitterClient.get('search/tweets', params, (err, data, response) => {
        if (err) {
          reject(err)
          console.log(err)
        } else {
          let skip = this.page === 0 ? 0 : 1
          this.handleSearchResponse(data, skip).then(() => {
            // Page to the next set of tweets
            if (data.statuses.length > 1) {
              if (data.search_metadata.max_id) {
                params.max_id = data.statuses[data.statuses.length - 1].id_str
                this.outCount += data.statuses.length
                console.log(this.outCount + ' of ' + this.options.max)
                this.page++
                console.log('Searching again... Page ' + this.page)
                this.search(params).then(() => {
                  resolve()
                })
              } else {
                resolve()
              }
            } else {
              resolve()
            }
          })
        }
      })
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

// Handle the search response.
SearchTweet.prototype.handleSearchResponse = function (data, skip) {
  let self = this
  return new Promise((resolve, reject) => {
    try {
      if (data.statuses.length <= 1) {
        console.log('Ran out of tweets before I could reach the maximum.')
        return resolve()
      }
      console.log('Processing ' + data.statuses.length + ' tweets...')
      loopOverTweets(data.statuses, skip, self, () => {
        // If the output type is Cloudant, then check if the bulk buffer has any tweets left to save.
        if (self.options.saveType === 'cloudant' && SaveTo.bulkBufferLength() > 0) {
          SaveTo[self.saveTypeFunc](null, true).then(() => {
          })
        }
        resolve()
      })
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })

  // This function will do the work of async tweet processing.
  function loopOverTweets (tweets, i, utils, cb) {
    OutputFormatter[utils.outputAsFunc](tweets[i]).then((out) => {
      utils.options.enrichment_promise(out).then((enrichedData) => {
        SaveTo[utils.saveTypeFunc](enrichedData, false, tweets[i]).then(() => {
          i++
          if (i < tweets.length) {
            loopOverTweets(tweets, i, utils, function () {
              cb()
            })
          } else {
            cb()
          }
        })
      }).catch((err) => {
        console.log(err)
        i++
        cb()
      })
    })
  }
}

module.exports = new SearchTweet()
