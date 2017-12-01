'use strict'

require('../server/utils/wsl-env')

var inquirer = require('inquirer')
var CloudantSetup = require('./cloudant-setup')
var TwitterSetup = require('./twitter-setup')
var TwitterTest = require('./twitter-test')
var TwitterSearch = require('./twitter-search')

var mainMenu = [{
  message: 'Component Configuration Selection',
  name: 'action',
  type: 'list',
  choices: ['Cloudant', 'Twitter', 'Test Twitter', 'Search Twitter', 'Exit']
}]

function SocialCrmSetup () {
  console.log('')
  console.log('***********************************************************************************************')
  console.log('* Welcome to the Social Crm Accelerator Setup Utility.')
  console.log('* This Utility assist you in Creating the Cloudant Database and walking you through the steps')
  console.log('* to configure, test and search Twitter.  Credentials can be obtained from the connections')
  console.log('* page on IBM Cloud and the Twitter Application Page.')
  console.log('***********************************************************************************************')
  console.log('')
  mainMenuHandler()
}

function mainMenuHandler () {
  inquirer.prompt(mainMenu).then((selections) => {
    switch (selections.action) {
      case 'Cloudant':
        CloudantSetup.run(() => mainMenuHandler())
        break
      case 'Twitter':
        TwitterSetup.run(() => {
          mainMenuHandler()
        })
        break
      case 'Test Twitter':
        TwitterTest.run((err, success) => {
          if (err) console.log(err)
        })
        break
      case 'Search Twitter':
        console.log('')
        console.log('* Search Twitter and load the tweets into Cloudant.  To run this function, you have to configure')
        console.log('* the vcap-local.json file with the service credentials required for enrichment.')
        console.log('')
        TwitterSearch.run((err, success) => {
          if (err) console.log(err)
        })
        break
      default:
    }
  })
}

module.exports = new SocialCrmSetup()
