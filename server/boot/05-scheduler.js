'use strict'

// Access to models, where we will execute some functions
var schedule = require('node-schedule')
var moment = require('moment')

var winston = require('winston')
var LOGGER = new (winston.Logger)({
  level: process.env.LOGLEVEL,
  transports: [
    new (winston.transports.Console)({ 'timestamp': (process.env.isLocal === 'true') })
  ]
})

module.exports = function (app, done) {
  LOGGER.info('Scheduling Maintenance Jobs')
  schedule.scheduleJob('0 15 */1 * *', function () {
    LOGGER.info('Executing the Analysis Maintence Job to remove old Tweets from DB')
    let before = moment().subtract(3, 'months').format('YYYY-MM-DD')
    app.models.Analysis.deleteBefore((before), (err, results) => {
      if (err) {
        LOGGER.error(err)
      } else {
        LOGGER.info('Delete Tweets older than 30 months Results: ')
        LOGGER.info(results)
      }
    })
  })
  schedule.scheduleJob('*/15 * * * *', function () {
    LOGGER.info('Executing the Conversation State Maintence Job to remove old Conversations from DB')
    app.models.ConversationState.destroyExpiredConversations((err, results) => {
      if (err) {
        LOGGER.error(err)
      } else {
        LOGGER.info('Delete Expired Conversation Results: ')
        LOGGER.info(results)
      }
    })
  })
  // Call this to continue the boot process.
  done()
}
