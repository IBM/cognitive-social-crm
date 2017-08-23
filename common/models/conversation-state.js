'use strict'

var Cloudant = require('cloudant')
var cloudant = Cloudant({ account: process.env.CLOUDANT_USERNAME, password: process.env.CLOUDANT_PASSWORD })
var conversationStateDB = cloudant.db.use(process.env.CLOUDANT_CONVERSATION_STATE_DB_NAME)

var moment = require('moment')

module.exports = function (Conversationstate) {
  Conversationstate.destroyExpiredConversations = function (cb) {
    let expiry = moment().subtract(60, 'minutes').valueOf()
    var params = {
      reduce: false,
      descending: true,
      limit: 1000,
      skip: 0,
      endkey: expiry
    }
    conversationStateDB.view('conversation-state-db', 'created-at-view', params, (err, expired) => {
      if (err) return cb(err)
      if (expired.rows.length === 0) {
        return cb(null, 'No conversations to delete at this time.')
      }
      let bulkDelete = {
        docs: []
      }
      for (let doc of expired.rows) {
        bulkDelete.docs.push({ _id: doc._id, _rev: doc._rev, _deleted: true })
      }
      conversationStateDB.bulk(bulkDelete, (err, deleted) => {
        if (err) return cb(err)
        cb(null, deleted)
      })
    })
  }
}
