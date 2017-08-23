'use strict'

var fs = require('fs')
var Cloudant = require('cloudant')

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  level: process.env.LOGLEVEL,
  transports: [
    new (winston.transports.Console)({ 'timestamp': (process.env.isLocal === 'true') })
  ]
})

var SaveTo = function () {}

const SAVETO = {
  'write': 'writeToFile',
  'append': 'appendToFile',
  'terminal': 'printToConsole',
  'cloudant': 'saveToCloudant'
}

/** Initialize the Save To Module.
 */
SaveTo.prototype.init = function (_options) {
  this.options = _options
  LOGGER.level = !_options.logLevel ? 'info' : _options.logLevel
  // Setup the storage
  if (this.options.saveType === 'write') {
    this.outCount = this.countExistingFilesInOutputFolder(this.options.outputFolder, this.options.outputFileName)
  } else {
    this.outCount = 0
    if (this.options.saveType === 'cloudant') {
      this.options.outputType = 'json'
      this.bulkSaveBuffer = {
        docs: []
      }
      this.maxBufferSize = this.options.max_buffer_size ? this.options.max_buffer_size : 10
      var cloudant = Cloudant({ account: this.options.cloudant_username, password: this.options.cloudant_password })
      this.cloudantDB = cloudant.db.use(this.options.cloudant_db)
    }
  }
  // Initialize the duplicate tweet detection cache.
  this.duplicateDetectionCache = {
    tweetIdCache: {},
    tweetTextCache: {}
  }
  // Once you reach this limit, start removing some of the old entries.
  this.duplicateDetectionCacheThreshold = 50
  // Map the save type (fs, terminal, cloudant) to a function
  let saveTypeFunc = SAVETO[this.options.saveType]
  if (!saveTypeFunc) {
    throw new Error('Save type was\'t specified or is incorrectly specified.')
  }
  return saveTypeFunc
}

/** Append to an existing file.  This is best used for a format like CSV.
 */
SaveTo.prototype.appendToFile = function (data) {
  let fileName = this.options.outputFolder + '/' + this.options.outputFileName
  return new Promise((resolve, reject) => {
    fs.appendFile(fileName, (data + '\n'), (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

/** Write to a file and maintain a counter that will be added to the file name.  This works well when you want
 *  to export the tweets to separate JSON files.
 */
SaveTo.prototype.writeToFile = function (data) {
  let fileName = this.options.outputFolder + '/' + this.options.outputFileName + '_' + this.outCount + '.json'
  return new Promise((resolve, reject) => {
    let outString
    if (typeof data === 'object') {
      outString = JSON.stringify(data, null, 4)
    } else {
      outString = data
    }
    fs.writeFile(fileName, outString, (err) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
}

/** Save the enriched data to cloudant.
 */
SaveTo.prototype.saveToCloudant = function (data, force) {
  var self = this
  return new Promise(function (resolve, reject) {
    try {
      if (data && data.text) {
        self.bulkSaveBuffer.docs.push(data)
      }
      // If the bulk buffer threshold is reached, or the force flag is true,
      // Then save the buffer to cloudant.
      if (self.bulkSaveBuffer.docs.length >= self.maxBufferSize || force) {
        // Throttle the save to not exceed Cloudant free plan limits
        setTimeout(() => {
          // Save the meta data to Cloudant
          self.cloudantDB.bulk(self.bulkSaveBuffer, (err, result) => {
            if (err) {
              reject(err)
            } else {
              LOGGER.debug('Successfully saved ' + self.bulkSaveBuffer.docs.length + ' docs to Cloudant.')
              self.bulkSaveBuffer.docs = []
              resolve()
            }
          })
        }, 1000)
      } else {
        resolve()
      }
    } catch (err) {
      reject(err)
    }
  })
}

/** This function will check for duplicate tweets in a memory cache and if not found,
 * will then check in Cloudant if the output type is cloudant.
 */
SaveTo.prototype.duplicateCheck = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      LOGGER.debug('In Duplicate Detection.')
      if (this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()]) {
        LOGGER.info('Duplicate Tweet ID found.')
        return reject()
      }
      this.duplicateDetectionCache.tweetIdCache[tweet.id_str.toString()] = true
      if (Object.keys(this.duplicateDetectionCache.tweetIdCache).length > this.duplicateDetectionCacheThreshold) {
        trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetIdCache)
      }
      // Now check if the text of the tweet is in the cache.
      if (this.duplicateDetectionCache.tweetTextCache[tweet.text]) {
        LOGGER.info('Duplicate Tweet Text found.')
        return reject()
      }
      this.duplicateDetectionCache.tweetTextCache[tweet.text] = true
      if (Object.keys(this.duplicateDetectionCache.tweetTextCache).length > this.duplicateDetectionCacheThreshold) {
        trimCache(this.duplicateDetectionCacheThreshold, this.duplicateDetectionCache.tweetTextCache)
      }
      if (this.options.saveType === 'cloudant') {
        LOGGER.info('Checking in Cloudant.')
        this.cloudantDuplicateCheck(tweet).then(() => {
          resolve()
        }).catch((err) => {
          if (err) {
            reject(err)
          } else {
            reject()
          }
        })
      } else {
        resolve()
      }
    } catch (err) {
      LOGGER.error(err)
      reject(err)
    }
  })
}

/** Remove the a quarter of the cached entries from the duplicate detection cache.
 */
function trimCache (threshold, cacheObject) {
  let count = Math.round(threshold / 4)
  LOGGER.debug('Trimming ' + count + ' items from the cache.')
  let itemsToDelete = []
  for (let key in cacheObject) {
    if (itemsToDelete.length < count) {
      itemsToDelete.push(key)
    } else {
      break
    }
  }
  for (let i of itemsToDelete) {
    delete cacheObject[i]
  }
}

/** Check for duplicate tweets in the database.
 */
SaveTo.prototype.cloudantDuplicateCheck = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      if (!tweet) {
        return resolve()
      }
      LOGGER.info('In Cloudant Duplicate Tweet Check.')
      // First check if the tweet was already processed
      var selector = { 'selector': { 'tweet_id': tweet.id } }

      this.cloudantDB.find(selector, (err, result) => {
        if (err) return reject(err)
        LOGGER.info('Result of tweet id check = ' + JSON.stringify(result))
        if (result.docs.length > 0) {
          LOGGER.info('Duplicate detected... Ignoring the tweet...')
          return reject()
        }
        // Check for duplicate tweets based on the tweet text to avoid any spamming
        this.cloudantDB.search('analysis-db', 'tweet-text-search', { q: 'tweet_text:"' + tweet.text + '"' }, (err, result) => {
          if (err) return reject(err)
          LOGGER.info('Result of duplicate tweet text check = ' + JSON.stringify(result))
          if (result && result.total_rows > 0) {
            LOGGER.info('Tweet is filtered because of duplicate tweet text detection')
            return reject()
          }
          resolve()
        })
      })
    } catch (err) {
      console.log(err)
      reject(err)
    }
  })
}

SaveTo.prototype.bulkBufferLength = function () {
  return this.bulkSaveBuffer.docs.length
}

SaveTo.prototype.printToConsole = function (data) {
  return new Promise((resolve, reject) => {
    console.log(JSON.stringify(data, null, 4))
    resolve()
  })
}

module.exports = new SaveTo()
