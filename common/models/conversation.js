'use strict'

var app = require('../../server/server')
var moment = require('moment')
var ConversationV1 = require('watson-developer-cloud/conversation/v1')

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({'timestamp': process.env.isLocal})
  ]
})

var conversation = new ConversationV1({
  username: process.env.CONVERSATION_API_USER,
  password: process.env.CONVERSATION_API_PASSWORD,
  version_date: '2017-05-26'
})

var conversationParams = {
  workspace_id: process.env.CONVERSATION_CHATBOT_WORKSPACE_ID
}

module.exports = function (Conversation) {
  Conversation.disableRemoteMethodByName('invoke', true)
  Conversation.send = function (req, cb) {
    try {
      let conversationState = app.models.ConversationState
      let text = req.body.input.text
      LOGGER.info('Received a chatbot message from the Web Client.')
      let user = req.body.input.user
      // First check if the user wants to end a conversation
      if (text.includes('#thankswatson')) {
        LOGGER.debug('User requested to end the conversation with tweet: ' + text)
        // End the conversation by removing the state from storage.
        conversationState.find({ where: { userId: user } }, (err, existing) => {
          if (err) return cb(err)
          LOGGER.info('Deleting the exsting conversation with id: ' + JSON.stringify(existing))
          conversationState.destroyById(existing[0].id, (err, destroyed) => {
            if (err) return cb(err)
            cb(null, { text: 'You are welcome human.' })
          })
        })
      } else {
        if (text.length === 0) {
          // Setup the parameters for the conversation
          conversationParams.context = {}
          conversationParams.input = {}
          conversationParams.input.text = text
          let state = { userId: user, started_at: moment().valueOf() }
          // Call the conversation api
          conversation.message(conversationParams, (err, success) => {
            if (err) {
              return cb(err)
            }
            LOGGER.debug('Return with conversation response: ' + success.output.text[0])
            state.context = success.context
            // Save the updated conversation context back to the datasource
            conversationState.replaceOrCreate(state, (err, saved) => {
              if (err) return cb(err)
              cb(null, { text: success.output.text[0] })
            })
          })
        } else {
          // Check if there is an existing conversation context in the Conversation State Storage
          conversationState.find({ where: { userId: user } }, (err, existing) => {
            // Create a state object to be saved into storage.  The started_at is used to delete old conversations.
            let state = { userId: user, started_at: moment().valueOf() }
            // Setup the parameters for the conversation
            conversationParams.input = {}
            conversationParams.input.text = text
            // This is a new conversation, so set the conversation params to the context retrieved.
            if (!err && existing && existing.length > 0) {
              LOGGER.debug('Found an existing conversation')
              conversationParams.context = existing[0].context
              state = existing[0]
            }
            // Call the conversation api
            conversation.message(conversationParams, (err, success) => {
              if (err) {
                return cb(err)
              }
              LOGGER.debug('Return with conversation response: ' + success.output.text[0])
              state.context = success.context
              // Save the updated conversation context back to the datasource
              conversationState.replaceOrCreate(state, (err, saved) => {
                if (err) return cb(err)
                cb(null, { text: success.output.text[0] })
              })
            })
          })
        }
      }
    } catch (err) {
      cb(err)
    }
  }
}
