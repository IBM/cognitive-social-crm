'use strict'

var TwitterChatbot = require('../../common/utils/twitter/twitter-chatbot')

module.exports = function (app, done) {
  let options = {
    logLevel: process.env.LOGLEVEL,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
    cloudant_username: process.env.CLOUDANT_USERNAME,
    cloudant_password: process.env.CLOUDANT_PASSWORD,
    cloudant_db: process.env.CLOUDANT_CONVERSATION_STATE_DB_NAME,
    chatbot_screen_name: process.env.TWITTER_CHATBOT_SCREENNAME,
    conversation_username: process.env.CONVERSATION_API_USER,
    conversation_password: process.env.CONVERSATION_API_PASSWORD,
    conversation_workspace_id: process.env.CONVERSATION_CHATBOT_WORKSPACE_ID,
    saveType: 'cloudant'
  }
  TwitterChatbot.init(options, () => {
    if (process.env.TWITTER_CHATBOT_START_AT_BOOT === 'true') {
      TwitterChatbot.startListener()
      done()
    } else {
      done()
    }
  })
}
