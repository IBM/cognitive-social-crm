'use strict'

var Cloudant = require('cloudant')
/**
 * This utility can be used to initialize, check and load a cloudant database for you.
 * It should be called from the boot scripts in loopback.
 */
var debug = require('debug')('app:init-cloudant')

/** Create an instance of the Cloudant Initializer.
 */
var CloudantInitializer = function (_username, _password, _config) {
  // Initialize Cloudant with my account.
  this.connection = Cloudant({ account: _username, password: _password })
  this.config = _config
}

/** Check Cloudant against the cloudant-config.json file.
 */
CloudantInitializer.prototype.checkCloudant = function () {
  var dbDefinitions = this.config['db-definitions']

  return new Promise((resolve, reject) => {
    try {
      debug('Checking cloudant...')
      var dbCheckPromises = []
      for (var dbName in dbDefinitions) {
        var dbConfig = dbDefinitions[dbName]
        dbCheckPromises.push(checkDatabase(this.connection, dbName, dbConfig))
      }
      debug('Number of databases in configuration that will be checked : ' + dbCheckPromises.length)

      Promise.all(dbCheckPromises).then(function (dbResult) {
        debug('Done checking cloudant...')
        resolve(dbResult)
      }).catch((err) => {
        debug('Error checking cloudant : ' + err)
        reject(err)
      })
    } catch (err) {
      debug('Error checking cloudant : ' + err)
      reject(err)
    }
  })
}

/** Utility function to tell you whether you need to sync the db config
 */
CloudantInitializer.prototype.needSync = function (checkResult) {
  try {
    debug('*** Checking if cloudant sync is required. ***')
    var needSync = false
    for (var i = 0; i < checkResult.length; i++) {
      if (!checkResult[i].exist) {
        needSync = true
        break
      } else {
        for (var j = 0; j < checkResult[i].design.length; j++) {
          if (!checkResult[i].design[j].exist) {
            needSync = true
            break
          }
        }
      }
    }
    debug('*** Cloudant sync is' + (needSync ? ' required ' : ' not required. ***'))
    return needSync
  } catch (err) {
    debug('Error checking if cloudant sync is required : ' + err)
    return false
  }
}

/** Sync the cloudant instance with the configuration in the cloudant-config.json file.
 */
CloudantInitializer.prototype.syncCloudantConfig = function (checkResult) {
  var dbDefinitions = this.config['db-definitions']

  return new Promise((resolve, reject) => {
    try {
      debug('Syncing cloudant configuration...')
      var createHash = getCreateManifest(checkResult)
      var dbCreatePromises = []
      for (var dbName in dbDefinitions) {
        var dbConfig = dbDefinitions[dbName]
        dbCreatePromises.push(createCloudantDB(this.connection, dbName, dbConfig, createHash))
      }
      Promise.all(dbCreatePromises).then(function (dbResult) {
        debug('Done syncing cloudant configuration')
        resolve(dbResult)
      }).catch((err) => {
        reject(err)
      })
    } catch (err) {
      debug('Error syncing cloudant configuration : ' + err)
      reject(err)
    }
  })
}

/** Loads data into the Cloudant Database
 */
CloudantInitializer.prototype.syncData = function (dataCollection) {
  return new Promise((resolve, reject) => {
    try {
      var dataLoadPromises = []
      for (var dbName in dataCollection) {
        debug('Data will be loaded into ' + dbName)
        dataLoadPromises.push(loadData(this.connection, dbName, dataCollection[dbName]))
      }
      Promise.all(dataLoadPromises).then(function (loadDataResult) {
        debug('Done syncing cloudant data')
        resolve(loadDataResult)
      }).catch((err) => {
        reject(err)
      })
    } catch (err) {
      debug('Error syncing cloudant data : ' + err)
      reject(err)
    }
  })
}

/** Print the results of the check out
 */
CloudantInitializer.prototype.printCheckResults = function (checkResult) {
  try {
    for (var i = 0; i < checkResult.length; i++) {
      debug('Database ' + checkResult[i].dbName + (checkResult[i].exist ? ' exist' : ' does not exist'))
      for (var j = 0; j < checkResult[i].design.length; j++) {
        if (checkResult[i].design[j].type === 'index') {
          debug('> Index ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'))
        } else {
          debug('> Design ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'))
        }
      }
    }
  } catch (err) {
    debug('Error printing check result : ' + err)
    return false
  }
}

var loadData = function (connection, dbName, data) {
  return new Promise(function (resolve, reject) {
    try {
      var db = connection.db.use(dbName)
      db.bulk(data, function (err, result) {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

var checkDatabase = function (connection, dbName, dbConfig) {
  return new Promise(function (resolve, reject) {
    try {
      connection.db.get(dbName, function (err, body) {
        var designs
        if (err) {
          // No database exist
          var result = {
            'dbName': dbName,
            'exist': false,
            'rows': 0,
            'design': []
          }
          // if the database doesn't exist, nothing else will, so set it up that way
          designs = dbConfig.design ? dbConfig.design : []
          for (let design of designs) {
            var designName = design.name
            result.design.push({ 'type': 'design', 'name': designName, 'exist': false })
          }
          var indexes = dbConfig.index ? dbConfig.index : []
          for (let index of indexes) {
            result.design.push({ 'type': 'index', 'name': index.name, 'exist': false })
          }
          resolve(result)
        } else {
          designs = dbConfig.design ? dbConfig.design : []
          var designCheckPromises = []
          for (let design of designs) {
            designName = design.name
            designCheckPromises.push(checkDesign(connection, dbName, designName))
          }
          indexes = dbConfig.index ? dbConfig.index : []
          for (let index of indexes) {
            designCheckPromises.push(checkIndex(connection, dbName, index.name))
          }
          Promise.all(designCheckPromises).then(function (designResult) {
            var db = connection.db.use(dbName)
            var options = {
              endkey: '_'
            }
            db.list(options, function (err, rowResult) {
              if (err) {
                reject(err)
              } else {
                var dbResult = { 'dbName': dbName, 'exist': true, 'rows': rowResult.rows.length, 'design': [] }
                dbResult.design = designResult
                resolve(dbResult)
              }
            })
          }, function (err) {
            debug('Error returned from checking design documents : ' + err)
          })
        }
      })
    } catch (err) {
      debug('Error in checking databases : ' + err)
      reject(err)
    }
  })
}

var checkDesign = function (connection, dbName, designName) {
  return new Promise(function (resolve, reject) {
    try {
      debug('Checking for design ' + designName + ' in database ' + dbName)
      var db = connection.db.use(dbName)

      db.get('_design/' + designName, function (err, body) {
        if (!err) {
          resolve({ 'type': 'design', 'name': designName, 'exist': true })
        } else {
          resolve({ 'type': 'design', 'name': designName, 'exist': false })
        }
      })
    } catch (err) {
      debug('Error in checking for design : ' + err)
      reject(err)
    }
  })
}

var checkIndex = function (connection, dbName, indexName) {
  return new Promise(function (resolve, reject) {
    try {
      var db = connection.db.use(dbName)
      debug('Checking for index ' + indexName + ' in database ' + dbName)
      db.index(function (err, body) {
        if (!err) {
          var indexes = body.indexes
          var found = false
          for (var i = 0; i < indexes.length; i++) {
            if (indexes[i].name === indexName) {
              debug('Index ' + indexName + ' already exist.')
              found = true
              break
            }
          }
          resolve({ 'type': 'index', 'name': indexName, 'exist': found })
        } else {
          resolve({ 'type': 'index', 'name': indexName, 'exist': false })
        }
      })
    } catch (err) {
      debug('Error in checking for index : ' + err)
      reject(err)
    }
  })
}

var createCloudantDB = function (connection, dbName, dbConfig, createHash) {
  return new Promise(function (resolve, reject) {
    try {
      var createDb = createHash.db[dbName]
      if (createDb) {
        debug('Creating cloudant database ' + dbName)
        connection.db.create(dbName, function (err) {
          if (err) {
            debug('Error returned from cloudant trying to create a database : ' + JSON.stringify(err))
            resolve({ 'dbName': dbName, 'exist': false })
          } else {
            // Now create any design docs that might be defined
            var designCreatePromises = buildDesignCreatePromiseArray(connection, dbName, dbConfig, createHash)

            Promise.all(designCreatePromises).then(function (designResult) {
              var dbResult = { 'dbName': dbName, 'exist': true, 'design': [] }
              dbResult.design = designResult
              resolve(dbResult)
            })
          }
        })
      } else {
        debug('Database ' + dbName + ' already exist, creating designs')
        // Now create any design docs that might be defined
        var designCreatePromises = buildDesignCreatePromiseArray(connection, dbName, dbConfig, createHash)

        Promise.all(designCreatePromises).then(function (designResult) {
          var dbResult = { 'dbName': dbName, 'exist': true, 'design': [] }
          dbResult.design = designResult
          resolve(dbResult)
        })
      }
    } catch (err) {
      debug('Error in creating cloudant database : ' + err)
      reject(err)
    }
  })
}

var buildDesignCreatePromiseArray = function (connection, dbName, dbConfig, createHash) {
  var designs = dbConfig.design ? dbConfig.design : []
  var designCreatePromises = []
  for (let design of designs) {
    var designName = design.name
    designCreatePromises.push(createCloudantDesign(connection, dbName, designName, design, createHash))
  }
  var indexes = dbConfig.index ? dbConfig.index : []
  for (let index of indexes) {
    var indexName = index.name
    designCreatePromises.push(createCloudantIndex(connection, dbName, indexName, index, createHash))
  }
  return designCreatePromises
}

var createCloudantIndex = function (connection, dbName, indexName, indexDef, createHash) {
  return new Promise(function (resolve, reject) {
    try {
      debug('Creating cloudant index with name ' + indexName + ' in database ' + dbName)
      var createIndex = createHash.design[dbName + '-' + indexName + '-index']
      if (createIndex) {
        var db = connection.db.use(dbName)
        db.index(indexDef, function (err, body) {
          if (!err) {
            resolve({ 'type': 'index', 'name': indexName, 'exist': true })
          } else {
            debug('Error returned from cloudant trying to create an index : ' + JSON.stringify(err))
            resolve({ 'type': 'index', 'name': indexName, 'exist': false })
          }
        })
      } else {
        resolve({ 'indexName': indexName, 'exist': true })
      }
    } catch (err) {
      debug('Error creating index : ' + err)
      reject(err)
    }
  })
}

var createCloudantDesign = function (connection, dbName, designName, design, createHash) {
  return new Promise(function (resolve, reject) {
    try {
      debug('Creating cloudant design document ' + designName + ' in database ' + dbName)
      var createDesign = createHash.design[dbName + '-' + designName + '-design']
      if (createDesign) {
        var db = connection.db.use(dbName)
        db.insert(design, '_design/' + designName, function (err, body) {
          if (!err) {
            resolve({ 'type': 'design', 'name': designName, 'exist': true })
          } else {
            debug('Error returned from cloudant trying to create a design document : ' + JSON.stringify(err))
            resolve({ 'type': 'design', 'name': designName, 'exist': false })
          }
        })
      } else {
        resolve({ 'designName': designName, 'exist': true })
      }
    } catch (err) {
      debug('Error creating cloudant design document : ' + err)
      reject(err)
    }
  })
}

var getCreateManifest = function (checkResult) {
  var createHash = {
    'db': {},
    'design': {}
  }
  try {
    for (var i = 0; i < checkResult.length; i++) {
      createHash.db[checkResult[i].dbName] = !checkResult[i].exist
      for (var j = 0; j < checkResult[i].design.length; j++) {
        var name = checkResult[i].dbName + '-' + checkResult[i].design[j].name + '-' + checkResult[i].design[j].type
        createHash.design[name] = !checkResult[i].design[j].exist
      }
    }
    return createHash
  } catch (err) {
    debug('Error in building the sync manifest : ' + err)
  }
}

module.exports = CloudantInitializer
