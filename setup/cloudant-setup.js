'use strict'

var inquirer = require('inquirer')
var CloudantInitializer = require('../server/utils/cloudant-initializer')
var cloudantConfig = require('./config/cloudant-config.json')

var cloudantMenu = [
  {
    message: 'What is the Cloudant Username? (You can find this on the connection page of your IBM Cloud application dashboard)',
    name: 'username',
    validate: required
  },
  {
    message: 'What is the Cloudant Password? (You can find this on the connection page of your IBM Cloud application dashboard)',
    name: 'password',
    type: 'password',
    validate: required
  }
]

function CloudantSetup () {}

CloudantSetup.prototype.run = function (done) {
  inquirer.prompt(cloudantMenu).then((answers) => {
    setupCloudant(answers.username, answers.password).then(() => done(), (err) => done(err))
  }).catch((err) => {
    console.log(err)
  })
}

function setupCloudant (username, password) {
  return new Promise((resolve, reject) => {
    // Instanciate the Cloudant Initializer
    var cloudantInitializer = new CloudantInitializer(username, password, cloudantConfig)

    cloudantInitializer.checkCloudant().then(function (checkResult) {
      var needSync = cloudantInitializer.needSync(checkResult)
      if (needSync) {
        cloudantInitializer.syncCloudantConfig(checkResult).then(function (createResult) {
          cloudantInitializer.printCheckResults(createResult)
          console.log('*** Synchronization completed. ***')
          resolve()
        })
      } else {
        cloudantInitializer.printCheckResults(checkResult)
        console.log('*** Synchronization not required. ***')
        resolve()
      }
    }, function (err) {
      console.log(err)
      reject()
    })
  })
}

function required (input) {
  if (typeof input === 'string') {
    return (input && input.trim().length > 0)
  } else {
    return !isNaN(input)
  }
}

module.exports = new CloudantSetup()
