'use strict'

var inquirer = require('inquirer')
var fs = require('fs')

var twitterSetup = [
  {
    message: 'What is the Twitter Consumer Key?',
    name: 'consumer_key',
    validate: required
  },
  {
    message: 'What is the Twitter Consumer Secret?',
    name: 'consumer_secret',
    validate: required
  },
  {
    message: 'What is the Twitter Access Token?',
    name: 'access_token',
    validate: required
  },
  {
    message: 'What is the Twitter Access Secret?',
    name: 'access_secret',
    validate: required
  },
  {
    message: 'What is the Watson Conversation Service Workspace ID used for Classification?',
    name: 'classification_workspace_id',
    validate: required
  },
  {
    message: 'Tweets containing what (@something, a keyword, a hashtag), would you like to receive? (comma separated)',
    name: 'listen_for',
    validate: required
  },
  {
    message: 'Are there any tweets from specific screen names you would like to ignore? (comma separated)',
    name: 'filter_form'
  },
  {
    message: 'Would you like to ignore a tweet if it contain any specific term (@something, a keyword, a hashtag)? (comma separated)',
    name: 'filter_container'
  },
  {
    message: 'Enter the screen name of the chatbot account (Blank to not enable the Chatbot).  THIS SHOULD NOT BE THE SAME SCREEN NAME YOU ARE DOING ANALYSIS ON!!!',
    name: 'chatbot_screenname'
  },
  {
    message: 'What is the Watson Conversation Service Workspace ID used for the Chatbot implementation?',
    name: 'chatbot_workspace_id',
    validate: required
  }
]

function TwitterSetup () {}

TwitterSetup.prototype.run = function (done) {
  inquirer.prompt(twitterSetup).then((answers) => {
    setupTwitter(answers).then(() => {
      console.log('Twitter configuration complete.')
      done()
    })
  })
}

function setupTwitter (answers) {
  return new Promise((resolve, reject) => {
    console.log('Setting up your Twitter Listener...')
    let envVars = JSON.parse(fs.readFileSync('./env-vars.json'))
    envVars.TWITTER_CONSUMER_KEY = answers.consumer_key
    envVars.TWITTER_CONSUMER_SECRET = answers.consumer_secret
    envVars.TWITTER_ACCESS_TOKEN = answers.access_token
    envVars.TWITTER_ACCESS_SECRET = answers.access_secret
    envVars.TWITTER_LISTEN_FOR = answers.listen_for
    envVars.TWITTER_FILTER_FROM = answers.filter_from
    envVars.TWITTER_FILTER_CONTAINING = answers.filter_container
    envVars.TWITTER_CHATBOT_SCREENNAME = answers.chatbot_screenname
    envVars.CONVERSATION_CLASSIFICATION_WORKSPACE_ID = answers.classification_workspace_id
    envVars.CONVERSATION_CHATBOT_WORKSPACE_ID = answers.chatbot_workspace_id
    fs.writeFileSync('./env-vars.json', JSON.stringify(envVars, null, 2))
    resolve()
  })
}

function required (input) {
  if (typeof input === 'string') {
    return (input && input.trim().length > 0)
  } else {
    return !isNaN(input)
  }
}

module.exports = new TwitterSetup()
