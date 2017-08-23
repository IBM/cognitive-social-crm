'use strict'

var moment = require('moment')

var CloudantUtils = require('../utils/cloudant-utils')
CloudantUtils.init(process.env.CLOUDANT_ANALYSIS_DB_NAME)

var Cloudant = require('cloudant')
var cloudant = Cloudant({ account: process.env.CLOUDANT_USERNAME, password: process.env.CLOUDANT_PASSWORD })
var analysisDB = cloudant.db.use(process.env.CLOUDANT_ANALYSIS_DB_NAME)

module.exports = function (Analysis) {
  Analysis.listByPostDate = function (skip, limit, cb) {
    try {
      CloudantUtils.listByView(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'created-at-view', limit, skip).then((result) => {
        cb(null, result)
      }).catch((err) => {
        cb(err)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.sentimentSummary = function (cb) {
    try {
      var params = {
        group: true
      }
      // doc.enrichments.nlu.sentiment.document.label, doc.enrichments.nlu.sentiment.document.score
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'sentiment-view', params, (err, result) => {
        if (err) return cb(err)
        // Map the results to a format better suited for the client
        let response = {
          total: 0,
          data: {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        }
        for (let row of result.rows) {
          response.total += row.value
          response.data[row.key] = row.value
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.sentimentOvertime = function (cb) {
    try {
      let endKey = moment().subtract(7, 'days')
      var params = {
        group: true,
        descending: true,
        endkey: [endKey.year(), endKey.month(), endKey.date()]
      }
      // [d.getFullYear(), d.getMonth(), d.getDate(), doc.enrichments.nlu.sentiment.document.label], 1
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'sentiment-overtime-view', params, (err, result) => {
        if (err) return cb(err)
        // This response does suite c3.js json data format
        var response = {
          dates: [],
          positive: [],
          neutral: [],
          negative: []
        }
        for (let row of result.rows) {
          if (row.key[3] === 'unknown') continue
          // Label is in format MM-DD-YYYY
          var label = (Number(row.key[1]) + 1) + '-' + row.key[2] + '-' + row.key[0]
          if (response.dates.indexOf(label) < 0) {
            response.dates.unshift(label)
          }
          var sentiment = row.key[3]
          response[sentiment].unshift(row.value)
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.classificationSummary = function (cb) {
    try {
      var params = {
        group: true
      }
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'classification-view', params, (err, result) => {
        if (err) return cb(err)
        var rows = result.rows
        rows.sort((a, b) => {
          if (a.value < b.value) {
            return 1
          }
          if (a.value > b.value) {
            return -1
          }
          return 0
        })
        rows = rows.slice(0, 5)
        let response = {
          classification: [],
          count: []
        }
        for (let row of rows) {
          response.classification.push(row.key)
          response.count.push(row.value)
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.emotionalToneSummary = function (cb) {
    try {
      var params = {
        group: true
      }
      // top score of doc.enrichments.nlu.emotion.document.emotion
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'emotional-tone-view', params, (err, result) => {
        if (err) return cb(err)
        let response = {
          total: 0,
          data: {
          }
        }
        for (let row of result.rows) {
          if (row.value === 'unknown') continue
          response.total += row.value
          response.data[row.key] = row.value
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.emotionalToneOvertime = function (cb) {
    try {
      let endKey = moment().subtract(7, 'days')
      var params = {
        group: true,
        descending: true,
        endkey: [endKey.year(), endKey.month(), endKey.date()]
      }
      // top score of doc.enrichments.nlu.emotion.document.emotion over time
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'emotional-overtime-view', params, (err, result) => {
        if (err) return cb(err)
        // This response does suite c3.js json data format
        var response = {
          dates: [],
          anger: [],
          disgust: [],
          fear: [],
          joy: [],
          sadness: []
        }
        for (let row of result.rows) {
          if (row.key[3] === 'unknown') continue
          // Label is in format MM-DD-YYYY
          var label = (Number(row.key[1]) + 1) + '-' + row.key[2] + '-' + row.key[0]
          if (response.dates.indexOf(label) < 0) {
            response.dates.unshift(label)
          }
          var emotion = row.key[3]
          response[emotion].unshift(row.value)
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.entitiesSummary = function (cb) {
    try {
      var params = {
        group: true
      }
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'entities-view', params, (err, result) => {
        if (err) return cb(err)
        var rows = result.rows
        rows.sort((a, b) => {
          if (a.value < b.value) {
            return 1
          }
          if (a.value > b.value) {
            return -1
          }
          return 0
        })
        rows.slice(0, 10)
        cb(null, { 'rows': rows })
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.keywordsSummary = function (cb) {
    try {
      var params = {
        group: true
      }
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'keywords-view', params, (err, result) => {
        if (err) return cb(err)
        var rows = result.rows
        rows.sort((a, b) => {
          if (a.value < b.value) {
            return 1
          }
          if (a.value > b.value) {
            return -1
          }
          return 0
        })
        let response = {
          data: rows.slice(0, 100)
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.sentimentTrend = function (cb) {
    try {
      var params = {
        reduce: false,
        descending: true,
        include_docs: true,
        limit: 300
      }
      analysisDB.view(process.env.CLOUDANT_ANALYSIS_DB_NAME, 'created-at-view', params, (err, result) => {
        if (err) return cb(err)
        // Map the results to the response for the client
        let response = {
          trend: ''
        }
        let positive = 0
        let negative = 0
        for (let row of result.rows) {
          if (row.doc.enrichments.nlu.sentiment.document.label === 'positive' ||
              row.doc.enrichments.nlu.sentiment.document.label === 'neutral') {
            positive++
          } else {
            negative++
          }
        }
        if (positive > negative) {
          response.trend = 'Positive'
        } else {
          response.trend = 'Negative'
        }
        cb(null, response)
      })
    } catch (err) {
      cb(err)
    }
  }
  Analysis.deleteBefore = function (before, cb) {
    let dt = moment(before)
    CloudantUtils.deleteBefore(dt, process.env.CLOUDANT_ANALYSIS_DB_NAME, 'created-at-view').then((result) => {
      cb(null, result)
    })
  }
}
