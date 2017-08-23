'use strict'

var TweetListener = require('../utils/twitter/tweet-listener')

module.exports = function (Twitter) {
  Twitter.status = function (cb) {
    cb(null, TweetListener.getStatus())
  }
}
