'use strict'

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 'timestamp': process.env.isLocal })
  ]
})

var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1')
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3')
var ConversationV1 = require('watson-developer-cloud/conversation/v1')

var nlu = new NaturalLanguageUnderstandingV1({
  username: process.env.NLU_API_USER,
  password: process.env.NLU_API_PASSWORD,
  version_date: '2017-02-27'
})

var toneAnalyzer = new ToneAnalyzerV3({
  username: process.env.TONE_ANALYZER_USER,
  password: process.env.TONE_ANALYZER_PASSWORD,
  version_date: '2016-05-19'
})

var conversation = new ConversationV1({
  username: process.env.CONVERSATION_API_USER,
  password: process.env.CONVERSATION_API_PASSWORD,
  version_date: '2017-05-26'
})

var nluParams = {
  'features': {
    'emotion': {},
    'sentiment': {},
    'entities': {
      'emotion': false,
      'sentiment': false,
      'limit': 2
    },
    'keywords': {
      'emotion': false,
      'sentiment': false,
      'limit': 2
    }
  }
}

var toneParams = {
}

var conversationParams = {
  workspace_id: process.env.CONVERSATION_CLASSIFICATION_WORKSPACE_ID
}

var EnrichmentPipeline = function () {}

EnrichmentPipeline.prototype.enrich = function (text) {
  return new Promise((resolve, reject) => {
    try {
      let enrichmentPromises = [nluEnrichment(text), toneEnrichment(text), conversationEnrichment(text)]
      Promise.all(enrichmentPromises).then((enrichments) => {
        let response = {
        }
        for (let e of enrichments) {
          response[Object.keys(e)[0]] = e[Object.keys(e)[0]]
        }
        resolve(response)
      }).catch((err) => {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function nluEnrichment (text) {
  return new Promise((resolve, reject) => {
    try {
      nluParams.text = text
      nlu.analyze(nluParams, (err, success) => {
        if (err) {
          LOGGER.error('NLU: ' + err)
          return reject('NLU: ' + err)
        }
        resolve({ nlu: success })
      })
    } catch (err) {
      reject(err)
    }
  })
}

function toneEnrichment (text) {
  return new Promise((resolve, reject) => {
    try {
      toneParams.text = text
      toneParams.sentences = false
      toneAnalyzer.tone(toneParams, (err, success) => {
        if (err) {
          LOGGER.error('Tone: ' + err)
          return reject('Tone: ' + err)
        }
        resolve({ tone: success })
      })
    } catch (err) {
      reject(err)
    }
  })
}

function conversationEnrichment (text) {
  return new Promise((resolve, reject) => {
    try {
      conversationParams.input = {}
      conversationParams.input.text = text
      conversation.message(conversationParams, (err, success) => {
        if (err) {
          LOGGER.error('Conversation: ' + err)
          return reject('Conversation: ' + err)
        }
        resolve({ intents: success.intents })
      })
    } catch (err) {
      reject(err)
    }
  })
}
module.exports = new EnrichmentPipeline()
