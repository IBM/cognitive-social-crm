'use strict'

var Twitter = require('twit')
var ConversationV1 = require('watson-developer-cloud/conversation/v1')
var ChatbotStateStorage = require('./chatbot-state-storage')

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  level: process.env.LOGLEVEL,
  transports: [
    new (winston.transports.Console)({ 'timestamp': (process.env.isLocal === 'true') })
  ]
})

var TwitterChatbot = function () {}

TwitterChatbot.prototype.init = function (options, cb) {
  this.options = options
  LOGGER.level = this.options.logLevel ? this.options.logLevel : 'info'
  LOGGER.info('Tweet Chatbot listener initialize.')
  // Create the Twitter client
  this.twitterClient = new Twitter({
    consumer_key: options.consumer_key,
    consumer_secret: options.consumer_secret,
    access_token: options.access_token,
    access_token_secret: options.access_token_secret,
    timeout_ms: 60 * 1000  // optional HTTP request timeout to apply to all requests.
  })
  // Initialize the Conversation Instance the chatbot will be using.
  this.conversation = new ConversationV1({
    username: options.conversation_username,
    password: options.conversation_password,
    version_date: '2017-05-26'
  })
  this.conversationParams = {
    workspace_id: options.conversation_workspace_id
  }
  // Initialize the Storage (memory or cloudant) where the state will be saved to.
  ChatbotStateStorage.init(options, (saveTypeFuncs) => {
    this.saveTypeFuncs = saveTypeFuncs
    cb()
  })
}

// Start the Stream to receive tweets from Twitter for the Chatbot screen name.
TwitterChatbot.prototype.startListener = function () {
  LOGGER.info('Tweet Chatbot is started.')
  if (this.stream) {
    LOGGER.info('Twitter Chatbot requested to be started, but there is one already running.')
    return
  }
  this.stream = this.twitterClient.stream('statuses/filter', { track: this.options.chatbot_screen_name, language: 'en' })

  this.stream.on('error', (err) => {
    this.handleTwitterConnectionError(err)
  })

  this.stream.on('tweet', (tweet) => {
    try {
      LOGGER.info('Receiving Charbot message: ' + tweet.text)
      // This is required so that the bot don't respond to its own tweets.
      if (tweet.user.screen_name.includes(this.options.chatbot_screen_name)) {
        return
      }
      // First check if the user wants to end a conversation
      if (tweet.text.includes('#thankswatson')) {
        LOGGER.debug('User requested to end the conversation.')
        // Try and end the conversation
        ChatbotStateStorage[this.saveTypeFuncs.endConversation](tweet).then(() => {})
        return
      }
      // Get the Conversation Context from the Conversation State Storage
      ChatbotStateStorage[this.saveTypeFuncs.getConversationState](tweet).then((state) => {
        // Call the Conversation API with the tweet and the context
        this.callConversation(tweet, state.context).then((response) => {
          // Send the reply via Twitter
          this.sendReply(tweet, response.output.text).then(() => {
            // Save the Conversation State for the next message from this user.
            state.context = response.context
            ChatbotStateStorage[this.saveTypeFuncs.setConversationState](state).then(() => {
              LOGGER.info('Conversation sequence completed.')
            }).catch((err) => {
              LOGGER.error(err)
            })
          }).catch((err) => {
            LOGGER.error(err)
          })
        }).catch((err) => {
          LOGGER.error(err)
        })
      }).catch((err) => {
        LOGGER.error(err)
      })
    } catch (err) {
      LOGGER.error(err)
    }
  })
}

TwitterChatbot.prototype.callConversation = function (tweet, context) {
  return new Promise((resolve, reject) => {
    try {
      this.conversationParams.input = {}
      this.conversationParams.input.text = tweet.text
      this.conversationParams.context = context
      this.conversation.message(this.conversationParams, (err, success) => {
        if (err) {
          LOGGER.error(err)
          reject(err)
        }
        LOGGER.debug('Conversation API successfully called.')
        resolve(success)
      })
    } catch (err) {
      reject(err)
    }
  })
}

TwitterChatbot.prototype.sendReply = function (tweet, reply) {
  return new Promise((resolve, reject) => {
    try {
      // Make the reply an array if not one already
      if (typeof reply === 'string') {
        reply = [reply]
      }
      var msg = reply.shift()

      // Check if the message is empty
      if (!msg || msg.trim().length === 0) {
        resolve()
      }
      LOGGER.info('Reply back to the tweet with: ' + msg)

      var status = ('.@' + tweet.user.screen_name + ' ' + msg).substring(0, 140)
      var params = {
        status: status,
        in_reply_to_status_id: tweet.id_str
      }

      this.twitterClient.post('statuses/update',
        params,
        (err, data, response) => {
          if (err) {
            LOGGER.error(err)
            reject(err)
          } else {
            if (reply.length > 0) {
              this.sendReply(data, reply).then(() => {
                resolve()
              }).catch((err) => {
                reject(err)
              })
            } else {
              resolve()
            }
          }
        }
      )
    } catch (err) {
      LOGGER.error(err)
      reject(err)
    }
  })
}

/** This is required to handle connection errors to the Twitter API.
 */
TwitterChatbot.prototype.handleTwitterConnectionError = function (err) {
  LOGGER.error(err)
}

module.exports = new TwitterChatbot()
