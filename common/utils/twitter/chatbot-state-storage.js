'use strict'

var moment = require('moment')
var winston = require('winston')
var LOGGER = new (winston.Logger)({
  level: process.env.LOGLEVEL,
  transports: [
    new (winston.transports.Console)({ 'timestamp': (process.env.isLocal === 'true') })
  ]
})

var app = require('../../../server/server')

var ChatbotStateStorage = function () {}

let SAVETO = {
  'memory': {
    getConversationState: 'getStateFromMemory',
    setConversationState: 'setStateToMemory',
    endConversation: 'destroyStateInMemory'
  },
  'cloudant': {
    getConversationState: 'getStateFromCloudant',
    setConversationState: 'setStateToCloudant',
    endConversation: 'destroyStateInCloudant'
  }
}

ChatbotStateStorage.prototype.init = function (_options, cb) {
  this.options = _options
  // Setup the storage
  if (this.options.saveType === 'memory') {
    this.conversationState = {}
  } else {
    if (this.options.saveType === 'cloudant') {
      this.conversationState = app.models.ConversationState
    }
  }
  // Map the save type (fs, terminal, cloudant) to a function
  let saveTypeFuncs = SAVETO[this.options.saveType]
  if (!saveTypeFuncs) {
    throw new Error('Save type was\'t specified or is incorrectly specified.')
  }
  cb(saveTypeFuncs)
}

// This function returns the Previous Conversation Context
ChatbotStateStorage.prototype.getStateFromMemory = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      if (!this.conversationStates[tweet.user.screen_name]) {
        resolve({
          userId: tweet.user.screen_name,
          started_at: moment().valueOf(),
          conext: {}
        })
      }
      resolve(this.conversationStates[tweet.user.screen_name])
    } catch (err) {
      reject(err)
    }
  })
}

// This function returns the Previous Conversation Context
ChatbotStateStorage.prototype.getStateFromCloudant = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      let user = tweet.user.screen_name
      this.conversationState.find({ where: { userId: user } }, (err, existing) => {
        if (!err && existing && existing.length > 0) {
          resolve(existing[0])
        } else {
          resolve({
            userId: user,
            started_at: moment().valueOf(),
            conext: {}
          })
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

// Saves the Conversation Context into the Conversation State
ChatbotStateStorage.prototype.setStateToMemory = function (state) {
  return new Promise((resolve, reject) => {
    try {
      if (!this.conversationStates[state.userId]) {
        LOGGER.debug('Something went wrong, the conversation state couldnt be found: ' + state.userId)
      }
      this.conversationStates[state.userId] = state
      LOGGER.debug('Conversation state saved.')
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

ChatbotStateStorage.prototype.setStateToCloudant = function (state) {
  return new Promise((resolve, reject) => {
    try {
      this.conversationState.replaceOrCreate(state, (err, saved) => {
        if (err) return reject(err)
        resolve(saved)
      })
    } catch (err) {
      reject(err)
    }
  })
}

ChatbotStateStorage.prototype.destroyStateInMemory = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      delete this.conversationStates[tweet.user.screen_name]
      LOGGER.debug('Conversation State successfully removed.')
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

ChatbotStateStorage.prototype.destroyStateInCloudant = function (tweet) {
  return new Promise((resolve, reject) => {
    try {
      this.getStateFromCloudant(tweet).then((state) => {
        this.conversationState.destroyById(state.id, (err, destroyed) => {
          if (err) return reject(err)
          LOGGER.debug('Conversation State successfully removed.')
          resolve()
        })
      })
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = new ChatbotStateStorage()
