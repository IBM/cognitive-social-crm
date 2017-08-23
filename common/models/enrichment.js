'use strict'

var EnrichmentPipeline = require('../utils/enrichment-pipeline')

module.exports = function (Enrichment) {
  Enrichment.test = function (text, cb) {
    EnrichmentPipeline.enrich(text).then((enrichments) => {
      cb(null, enrichments)
    }).catch((err) => {
      let e = new Error()
      e.status = 400
      e.message = err
      cb(e)
    })
  }
}
