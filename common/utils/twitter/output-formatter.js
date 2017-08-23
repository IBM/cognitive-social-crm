'use strict'

var moment = require('moment')

var OutputFormatter = function () {}

const FORMATTYPES = {
  'csv': 'formatAsCsv',
  'json': 'formatAsJson'
}

OutputFormatter.prototype.init = function (_options) {
  this.options = _options
  // Map the output type (csv, json) to a function
  let outputAsFunc = FORMATTYPES[this.options.outputType]
  if (!outputAsFunc) {
    throw new Error('Output type was\'t specified or is incorrectly specified.')
  }
  return outputAsFunc
}

OutputFormatter.prototype.formatAsJson = function (tweet) {
  return new Promise((resolve, reject) => {
    if (!tweet) {
      return reject('Why are you sending me null tweets???')
    }
    // Format of date is 'Tue Jun 06 20:19:12 +0000 2017'
    let dt = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY')
    let outJson = {
      source: 'twitter',
      tweet_id: tweet.id,
      post_by: tweet.user.screen_name,
      post_date: dt.toISOString(),
      text: cleanText(tweet.text),
      retweet_count: tweet.retweet_count,
      retweet_from: tweet.retweeted_status ? tweet.retweeted_status.user.screen_name : '',
      coordinates: tweet.coordinates
    }
    resolve(outJson)
  })
}

OutputFormatter.prototype.formatAsCsv = function (tweet) {
  return new Promise((resolve, reject) => {
    if (!tweet) {
      return reject('Why are you sending me null tweets???')
    }
    let dt = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY')
    var outBuffer = ''
    let header = 'TWEET_ID,POST BY,POST DATE,TEXT,RETWEET COUNT,RETWEET_FROM\n'
    if (!this.headerWritten) {
      outBuffer = header
      this.headerWritten = true
    }
    outBuffer += '"' + tweet.id + '",'
    outBuffer += '"' + tweet.user.screen_name + '",'
    outBuffer += '"' + dt.toISOString() + '",'
    outBuffer += '"' + cleanText(tweet.text) + '",'
    outBuffer += '"' + tweet.retweet_count + '",'
    let retweetFrom = tweet.retweeted_status ? tweet.retweeted_status.user.screen_name : ' '
    outBuffer += '"' + retweetFrom + '"'
    resolve(outBuffer)
  })
}

function cleanText (text) {
  let cleaned = text.replace(/\t/g, '').replace(/\n/g, '').replace(/\r/g, ' ').trim()
  // Also remove all special chars from the text and only leave ASCII behind
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, '')
  return cleaned
}

module.exports = new OutputFormatter()
