/*
# Copyright 2016 IBM Corp. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License")  you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
# limitations under the License.
*/

/*
 * This module solves the following problems.
 * 1. Local VCAP vs IBM Cloud VCAP.
 * 2. Local Environment variables.
 * 3. Loopback requires environment variables that comes from VCAP.
 *
 * The module provides the following functionality.
 * 1. The VCAP is either loaded from IBM Cloud or locally from the vcap-local.json file.
 * 2. The environment variables are loaded from the env-vars.json file and the following is done.
 *  2.1 The field names in the env-vars.json file are made process.env fields.
 *  2.2 If the value for the field is not an object, then the process.env value for the field is set to the value in the file.
 *  2.3 If the value for the field is an object, then it uses the expr field to extract the service from the vcap, and extract the
 *      the value using the field value.
 *  2.4 Once the value is extracted, the value from the vcap is set as the process.env value.
*/
'use strict'
var cfenv = require('cfenv')
var fs = require('fs-sync')

module.exports = (function () {
  var VCAP_LOCAL_JSON_FILE = './vcap-local.json'
  var ENV_VARS_JSON_FILE = './env-vars.json'

  var appEnv = null
  var envVars = null
  // Short utility function to read in JSON file.
  function getJSONFile (filename) {
    var parsedJSON
    if (fs.exists(filename)) {
      parsedJSON = fs.readJSON(filename)
    }
    return parsedJSON
  }

  // Initialize based on whether running locally or in cloud.
  function init () {
    process.env.isLocal = false
    if (!process.env.VCAP_SERVICES) {
      process.env.isLocal = true
      // running locally
      // First try to load vcap-local.json
      if (fs.exists(VCAP_LOCAL_JSON_FILE)) {
        try {
          // Read the vcap file locally
          var vcapLocalJson = getJSONFile(VCAP_LOCAL_JSON_FILE)
          // Also read the environment variables locally
          if (fs.exists(ENV_VARS_JSON_FILE)) {
            try {
              var envLocalJson = getJSONFile(ENV_VARS_JSON_FILE)
            } catch (err) {
              // Some kind of problem reading the file or parsing the JSON
              throw err
            }
          }

          var envOptions = {
            // provide values for the VCAP_SERVICES value in env.json
            vcap: {services: vcapLocalJson}
          }
          // Set the appEnv for everything to use
          appEnv = cfenv.getAppEnv(envOptions)
          // Resolve the environment variables from the vcap variables
          resolveEnvironmentFromVcap(envLocalJson)
        } catch (err) {
          // Some kind of problem reading the file or parsing the JSON
          throw err
        }
      } else {
        let err = 'Could not read configuration file ' +
          VCAP_LOCAL_JSON_FILE
        throw err
      }
    }
    if (!appEnv) {
      // We're either running in the cloud or env.log could not be
      // loaded. So, just let cfenv process VCAP_SERVICES and
      // VCAP_APPLICATION for us
      appEnv = cfenv.getAppEnv()
      // Also read the environment variables locally
      if (fs.exists(ENV_VARS_JSON_FILE)) {
        try {
          envLocalJson = getJSONFile(ENV_VARS_JSON_FILE)
        } catch (err) {
          // Some kind of problem reading the file or parsing the JSON
          throw err
        }
      }
      // Resolve the environment variables from the vcap variables
      resolveEnvironmentFromVcap(envLocalJson)
    }
    // Function that will take the fields in the local environment variables file and
    // resolve them in the vcap and add them to process.env for Loopback to use.
    function resolveEnvironmentFromVcap (envLocalJson) {
      // Loop over the defined fields in the local-env.json file
      for (var valName in envLocalJson) {
        // If it's an object, it indicates that we need to extract it from vcap
        if (typeof envLocalJson[valName] === 'object' && !Array.isArray(envLocalJson[valName])) {
          var expr = envLocalJson[valName].expr
          var field = envLocalJson[valName].field
          var append = envLocalJson[valName].append
          var re = new RegExp(expr)
          var json = appEnv.getService(re)
          if (!json) {
            console.log(JSON.stringify(appEnv.getServices()))
            throw new Error('The regex ' + expr + ' did not match a service in the VCAP.')
          }
          // If the field is an array then we want to extract all the values
          // and use the valuePattern to build the value
          var val = getValue(valName, json, field)
          if (val) {
            // If something needs to be appended to the value from the vcap
            if (append) {
              process.env[valName] = val + append
            } else {
              process.env[valName] = val
            }
          } else {
            let err = 'Field could not be set for ' +
              valName + ' because ' +
              field + ' could not be found in json'
            throw err
          }
        } else {
          if (Array.isArray(envLocalJson[valName])) {
            process.env[valName] = JSON.stringify(envLocalJson[valName])
          } else {
            // Prefer to get literal values from appEnv
            // Otherwise default to fs
            if (!process.env[valName]) {
              process.env[valName] = envLocalJson[valName]
            }
          }
        }
      }
    }
    // Function that will navigate to a specific dot notation field
    // in the json and return the value
    function getValue (valName, json, path) {
      try {
        var _path = path.split('.')

        var cur = json
        _path.forEach(function (field) {
          if (cur[field]) {
            cur = cur[field]
          }
        })

        return cur
      } catch (err) {
        throw new Error('Error trying to extract ' + valName + ' from VCAP LOCAL')
      }
    }
  }
  init()

  /*
   * Expose a getAppEnv function that returns a wrapped cfenv.
   */
  return {
    getAppEnv: function () {
      if (appEnv) {
        return {
          app: appEnv.app,
          services: appEnv.services,
          isLocal: appEnv.isLocal,
          name: appEnv.name,
          port: appEnv.port,
          bind: appEnv.bind,
          urls: appEnv.urls,
          url: appEnv.url,

          getServices: function () {
            // pass-through to cfenv
            return appEnv.getServices()
          },

          getService: function (name) {
            // pass-through to cfenv
            return appEnv.getService(name)
          },

          getServiceURL: function (name, replacements) {
            // pass-through to cfenv
            return appEnv.getServiceURL(name, replacements)
          },

          getServiceCreds: function (spec) {
            // pass-through to cfenv
            return appEnv.getServiceCreds(spec)
          },

          /* Unlike the others, these functions don't wrapper
           * cfenv function. If we're runnning locally, first try to
           * get the value(s) from env.log data. Otherwise (or if
           * not found), look at process.env.
           */
          getEnvVars: function () {
            var value
            if (envVars) {
              value = envVars
            }

            if (!value) {
              value = process.env
            }

            return value
          },

          getEnvVar: function (name) {
            var value
            if (envVars) {
              value = envVars[name]
            }

            if (!value) {
              value = process.env[name]
            }

            return value
          }
        }
      } else {
      // Problem getting the environment
        return null
      }
    }
  }
}())
