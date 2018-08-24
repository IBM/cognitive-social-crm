const Cloudant = require('@cloudant/cloudant');
const TweeterListener = require('../service/TweeterListener');
const tweets = require('../data/SampleTweets');
const CloudantDAO  = require("../dao/CloudantDAO");
const config = require('../config/')
/**
 * This utility can be used to initialize, check and load a cloudant database for you.
 *
 * Create an instance of the Cloudant Initializer.
 */
class CloudantInitializer {

    constructor(_username, _password, _config) {
        // Initialize Cloudant
        this.connection = Cloudant({ account: _username, password: _password });
        this.config = _config;

        // initialize twitter listener
        let twitOptions = {}
        twitOptions.max = 1;
        twitOptions.outputType = "json";
        this.tweeterListener = TweeterListener.TweeterListener.getInstance(twitOptions);        
        this.cloudantDAO = new CloudantDAO.CloudantDAO(this.connection, config.default.cloudant_db);
    }
    /** Check Cloudant against the cloudant-config.json file.
     */
    checkCloudant() {
        const dbDefinitions = this.config['db-definitions'];
        return new Promise((resolve, reject) => {
            try {
                console.log('Checking cloudant...');
                let dbCheckPromises = [];
                for (const dbName in dbDefinitions) {
                    const dbConfig = dbDefinitions[dbName];
                    dbCheckPromises.push(this.checkDatabase(this.connection, dbName, dbConfig));
                }
                console.log('Number of databases in configuration that will be checked : ' + dbCheckPromises.length);
                Promise.all(dbCheckPromises).then(function (dbResult) {
                    console.log('Done checking cloudant...');
                    resolve(dbResult);
                }).catch((err) => {
                    console.log('Error checking cloudant : ' + err);
                    reject(err);
                });
            }
            catch (err) {
                console.log('Error checking cloudant : ' + err);
                reject(err);
            }
        });
    }
    /** Utility function to tell you whether you need to sync the db config
     */
    needSync(checkResult) {
        try {
            console.log('*** Checking if cloudant sync is required. ***');
            let needSync = false;
            for (let i = 0; i < checkResult.length; i++) {
                if (!checkResult[i].exist) {
                    needSync = true;
                    break;
                }
                else {
                    for (let j = 0; j < checkResult[i].design.length; j++) {
                        if (!checkResult[i].design[j].exist) {
                            needSync = true;
                            break;
                        }
                    }
                }
            }
            console.log('*** Cloudant sync is' + (needSync ? ' required ' : ' not required. ***'));
            return needSync;
        }
        catch (err) {
            console.log('Error checking if cloudant sync is required : ' + err);
            return false;
        }
    }
    /** Sync the cloudant instance with the configuration in the cloudant-config.json file.
     */
    syncCloudantConfig(checkResult) {
        const dbDefinitions = this.config['db-definitions'];
        return new Promise((resolve, reject) => {
            try {
                console.log('Syncing cloudant configuration...');
                const createHash = this.getCreateManifest(checkResult);
                let dbCreatePromises = [];
                for (const dbName in dbDefinitions) {
                    const dbConfig = dbDefinitions[dbName];
                    dbCreatePromises.push(this.createCloudantDB(this.connection, dbName, dbConfig, createHash));
                }
                Promise.all(dbCreatePromises).then(function (dbResult) {
                    console.log('Done syncing cloudant configuration');
                    resolve(dbResult);
                }).catch((err) => {
                    reject(err);
                });
            }
            catch (err) {
                console.log('Error syncing cloudant configuration : ' + err);
                reject(err);
            }
        });
    }
    /** Loads data into the Cloudant Database
     */
    syncData(dataCollection) {
        return new Promise((resolve, reject) => {
            try {
                let dataLoadPromises = [];
                for (const dbName in dataCollection) {
                    console.log('Data will be loaded into ' + dbName);
                    dataLoadPromises.push(this.loadData(this.connection, dbName, dataCollection[dbName]));
                }
                Promise.all(dataLoadPromises).then(function (loadDataResult) {
                    console.log('Done syncing cloudant data');
                    resolve(loadDataResult);
                }).catch((err) => {
                    reject(err);
                });
            }
            catch (err) {
                console.log('Error syncing cloudant data : ' + err);
                reject(err);
            }
        });
    }
    /** Print the results of the check out
     */
    printCheckResults(checkResult) {
        try {
            for (let i = 0; i < checkResult.length; i++) {
                console.log('Database ' + checkResult[i].dbName + (checkResult[i].exist ? ' exist' : ' does not exist'));
                for (let j = 0; j < checkResult[i].design.length; j++) {
                    if (checkResult[i].design[j].type === 'index') {
                        console.log('> Index ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'));
                    }
                    else {
                        console.log('> Design ' + checkResult[i].design[j].name + (checkResult[i].design[j].exist ? ' exist' : ' does not exist'));
                    }
                }
            }
        }
        catch (err) {
            console.log('Error printing check result : ' + err);
            return false;
        }
    }

    loadData(connection, dbName, data) {
        return new Promise((resolve, reject) => {
            try {
                const db = connection.db.use(dbName)
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

    checkDatabase(connection, dbName, dbConfig) {
        return new Promise((resolve, reject) => {
            try {
                connection.db.get(dbName, (err, body) => {
                    let designs = '';
                    let designName = '';
                    if (err) {
                        // No database exist
                        const result = {
                            'dbName': dbName,
                            'exist': false,
                            'rows': 0,
                            'design': []
                        }
                        // if the database doesn't exist, nothing else will, so set it up that way
                        designs = dbConfig.design ? dbConfig.design : []
                        for (let design of designs) {
                            designName = design.name
                            result.design.push({ 'type': 'design', 'name': designName, 'exist': false })
                        }
                        const indexes = dbConfig.index ? dbConfig.index : []
                        for (let index of indexes) {
                            result.design.push({ 'type': 'index', 'name': index.name, 'exist': false })
                        }
                        resolve(result)
                    } else {
                        designs = dbConfig.design ? dbConfig.design : []
                        let designCheckPromises = []
                        for (let design of designs) {
                            designName = design.name
                            designCheckPromises.push(this.checkDesign(connection, dbName, designName))
                        }
                        let indexes = dbConfig.index ? dbConfig.index : []
                        for (let index of indexes) {
                            designCheckPromises.push(this.checkIndex(connection, dbName, index.name))
                        }
                        Promise.all(designCheckPromises).then(function (designResult) {
                            const db = connection.db.use(dbName)
                            let options = {
                                endkey: '_'
                            }
                            db.list(options, function (err, rowResult) {
                                if (err) {
                                    reject(err)
                                } else {
                                    let dbResult = { 'dbName': dbName, 'exist': true, 'rows': rowResult.rows.length, 'design': [] }
                                    dbResult.design = designResult
                                    resolve(dbResult)
                                }
                            })
                        }, function (err) {
                            console.log('Error returned from checking design documents : ' + err)
                        })
                    }
                })
            } catch (err) {
                console.log('Error in checking databases : ' + err)
                reject(err)
            }
        })
    }

    checkDesign(connection, dbName, designName) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Checking for design ' + designName + ' in database ' + dbName)
                const db = connection.db.use(dbName)

                db.get('_design/' + designName, function (err, body) {
                    if (!err) {
                        resolve({ 'type': 'design', 'name': designName, 'exist': true })
                    } else {
                        resolve({ 'type': 'design', 'name': designName, 'exist': false })
                    }
                })
            } catch (err) {
                console.log('Error in checking for design : ' + err)
                reject(err)
            }
        })
    }

    checkIndex(connection, dbName, indexName) {
        return new Promise((resolve, reject) => {
            try {
                const db = connection.db.use(dbName)
                console.log('Checking for index ' + indexName + ' in database ' + dbName)
                db.index(function (err, body) {
                    if (!err) {
                        const indexes = body.indexes
                        let found = false
                        for (let i = 0; i < indexes.length; i++) {
                            if (indexes[i].name === indexName) {
                                console.log('Index ' + indexName + ' already exist.')
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
                console.log('Error in checking for index : ' + err)
                reject(err)
            }
        })
    }

    createCloudantDB(connection, dbName, dbConfig, createHash) {
        return new Promise((resolve, reject) => {
            try {
                const createDb = createHash.db[dbName]
                if (createDb) {
                    console.log('Creating cloudant database ' + dbName)
                    connection.db.create(dbName, (err) => {
                        if (err) {
                            console.log('Error returned from cloudant trying to create a database : ' + JSON.stringify(err))
                            resolve({ 'dbName': dbName, 'exist': false })
                        } else {
                            // Now create any design docs that might be defined
                            const designCreatePromises = this.buildDesignCreatePromiseArray(connection, dbName, dbConfig, createHash)

                            Promise.all(designCreatePromises).then(function (designResult) {
                                const dbResult = { 'dbName': dbName, 'exist': true, 'design': [] }
                                dbResult.design = designResult
                                resolve(dbResult)
                            })
                        }
                    })
                } else {
                    console.log('Database ' + dbName + ' already exist, creating designs')
                    // Now create any design docs that might be defined
                    const designCreatePromises = this.buildDesignCreatePromiseArray(connection, dbName, dbConfig, createHash)

                    Promise.all(designCreatePromises).then(function (designResult) {
                        const dbResult = { 'dbName': dbName, 'exist': true, 'design': [] }
                        dbResult.design = designResult
                        resolve(dbResult)
                    })
                }
            } catch (err) {
                console.log('Error in creating cloudant database : ' + err)
                reject(err)
            }
        })
    }

    buildDesignCreatePromiseArray(connection, dbName, dbConfig, createHash) {
        const designs = dbConfig.design ? dbConfig.design : []
        let designCreatePromises = []
        for (let design of designs) {
            const designName = design.name
            designCreatePromises.push(this.createCloudantDesign(connection, dbName, designName, design, createHash))
        }
        const indexes = dbConfig.index ? dbConfig.index : []
        for (let index of indexes) {
            const indexName = index.name
            designCreatePromises.push(this.createCloudantIndex(connection, dbName, indexName, index, createHash))
        }
        return designCreatePromises
    }

    createCloudantIndex(connection, dbName, indexName, indexDef, createHash) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Creating cloudant index with name ' + indexName + ' in database ' + dbName)
                const createIndex = createHash.design[dbName + '-' + indexName + '-index']
                if (createIndex) {
                    const db = connection.db.use(dbName)
                    db.index(indexDef, (err, body) => {
                        if (!err) {
                            resolve({ 'type': 'index', 'name': indexName, 'exist': true })
                        } else {
                            console.log('Error returned from cloudant trying to create an index : ' + JSON.stringify(err))
                            resolve({ 'type': 'index', 'name': indexName, 'exist': false })
                        }
                    })
                } else {
                    resolve({ 'indexName': indexName, 'exist': true })
                }
            } catch (err) {
                console.log('Error creating index : ' + err)
                reject(err)
            }
        })
    }

    createCloudantDesign(connection, dbName, designName, design, createHash) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Creating cloudant design document ' + designName + ' in database ' + dbName)
                const createDesign = createHash.design[dbName + '-' + designName + '-design']
                if (createDesign) {
                    const db = connection.db.use(dbName)
                    db.insert(design, '_design/' + designName, (err, body) => {
                        if (!err) {
                            resolve({ 'type': 'design', 'name': designName, 'exist': true })
                        } else {
                            console.log('Error returned from cloudant trying to create a design document : ' + JSON.stringify(err))
                            resolve({ 'type': 'design', 'name': designName, 'exist': false })
                        }
                    })
                } else {
                    resolve({ 'designName': designName, 'exist': true })
                }
            } catch (err) {
                console.log('Error creating cloudant design document : ' + err)
                reject(err)
            }
        })
    }

    getCreateManifest(checkResult) {
        let createHash = {
            'db': {},
            'design': {}
        }
        try {
            for (let i = 0; i < checkResult.length; i++) {
                createHash.db[checkResult[i].dbName] = !checkResult[i].exist
                for (let j = 0; j < checkResult[i].design.length; j++) {
                    let name = checkResult[i].dbName + '-' + checkResult[i].design[j].name + '-' + checkResult[i].design[j].type
                    createHash.design[name] = !checkResult[i].design[j].exist
                }
            }
            return createHash
        } catch (err) {
            console.log('Error in building the sync manifest : ' + err)
        }
    }


    setupCloudant() {
        return new Promise((resolve, reject) => {
            // Instanciate the Cloudant Initializer                      
            this.checkCloudant().then((checkResult) => {
                const needSync = this.needSync(checkResult);
                if (needSync) {
                    this.syncCloudantConfig(checkResult).then((createResult) => {
                        this.printCheckResults(createResult)
                        console.log('*** Synchronization completed. ***')
                        setTimeout(() => {
                            this.insertSampleTweets().then(() => {
                                console.log("*** Sample tweet data inserted successfully. ***");
                                resolve()
                            }).catch((err) => {
                                console.log("*** Error while saving sample tweets to database ***");
                                reject(err);
                            });
                        }, 3000);
                    })
                } else {
                    this.printCheckResults(checkResult)
                    console.log('*** Synchronization not required. ***')
                    resolve()
                }
            }, function (err) {
                console.log(err)
                reject()
            })
        });
    }


    /**
     * insert sample tweets
     * @param {*} tweets 
     */
    insertSampleTweets() {
        return new Promise((resolve, reject) => {
            try {
                var i = 1;
                for (const tweet of tweets.default) {
                    //needed to add these as sample tweets don't haec all the details                    
                    tweet.post_by = 'system';
                    tweet.source = 'system';
                    tweet.tweet_id = i++;
                    this.tweeterListener.enrichmentPromise(tweet).then((enrichedData) => {                                                
                        // Then save it to something...
                        this.cloudantDAO.saveToCloudant(enrichedData, false).then(() => {
                            console.log("*** Saved "+ enrichedData +" to the database.")
                        }).catch((err) => {
                            console.log("Error saving to " + this.options.saveType + ": " + err);
                        });                        
                    }).catch((err) => {
                        this.status.lastError = err;
                        this.status.errors++;
                        // If it's not an unsupported text language error, then we pause the listener.
                        if (err.indexOf("unsupported text language") === -1) {
                            console.log("An Enrichment error occurred, the listener is being paused for 15 minutes to see if it resolved the problem.");
                            this.pauseListener(15);
                        }
                    });
                }
                resolve();
            } catch (err) {
                console.log('Error in saving tweets to database : ' + err)
                reject(err);
            }
        });
    }
}

module.exports = CloudantInitializer
