'use strict'

var debug = require('debug')('app:init-access')

module.exports = function (app, done) {
  var Auth = app.models.Auth
  var Role = app.models.Role
  var RoleMapping = app.models.RoleMapping
  var AccessToken = app.models.AccessToken

  var seedUsers = [
      {username: 'watson', email: 'watson@ibm.com', password: 'p@ssw0rd'},
      {username: 'admin', email: 'admin@ibm.com', password: '@dm1n'}
  ]

  var seedRoles = [
    {name: 'admin'}
  ]

  // Controller...
  debug('*** Checking Access is Configured...')
  checkUsers().then((result) => {
    checkRoles().then((result) => {
      debug('*** All Good, Keep Going...')
      done()
    }, (err) => {
      debug(err)
      done()
    })
  }, (err) => {
    debug(err)
    done()
  })

  // Function that will be called each time a user logs in.  This function will
  // clean the old tokens from the mem_db.json file.
  Auth.beforeRemote('login', function (ctx, modelInstance, next) {
    try {
      AccessToken.find({ where: { userId: modelInstance.id } }, function (err, data) {
        if (!err) {
          if (data.length > 0) {
            for (let token of data) {
              let now = new Date()
              let created = new Date(token.created)
              let alive = (now - created) / 1000
              if (alive > 3600) {
                AccessToken.destroyById(token.id, function (err, data) {
                  if (err) {
                    debug(err)
                  } else {
                    debug('*** Removing expired token for user.')
                  }
                })
              }
            }
          }
        }
      })
    } catch (err) {
      debug(err)
    }
    next()
  })

  // Implementation functions...
  function checkUsers () {
    return new Promise(function (resolve, reject) {
      try {
        for (let user of seedUsers) {
          checkAndCreateUser(user).then((result) => {
            resolve(result)
          }, (err) => reject(err))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  function checkAndCreateUser (user) {
    return new Promise(function (resolve, reject) {
      try {
        Auth.findOne({ where: { username: user.username } }, function (err, result) {
          if (err || !result) {
            createUser(user).then((result) => {
              resolve(result)
            }, (err) => reject(err))
          } else {
            resolve(result)
          }
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  function createUser (user) {
    return new Promise(function (resolve, reject) {
      try {
        Auth.create(user, function (err, result) {
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

  function checkRoles () {
    return new Promise(function (resolve, reject) {
      try {
        for (let role of seedRoles) {
          checkAndCreateRole(role).then((result) => {
            resolve(result)
          }, (err) => reject(err))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  function checkAndCreateRole (role) {
    return new Promise(function (resolve, reject) {
      try {
        Role.findOne({ where: { name: role.name } }, function (err, result) {
          if (err || !result) {
            createRole(role).then((result) => {
              resolve(result)
            }, (err) => reject(err))
          } else {
            resolve(result)
          }
        })
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
  }

  function createRole (role) {
    return new Promise(function (resolve, reject) {
      try {
        Role.create(role, function (err, result) {
          if (err) {
            reject(err)
          } else {
            createPrincipals(result, 2).then((result) => {
              resolve(result)
            }, (err) => reject(err))
          }
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  function createPrincipals (role, userId) {
    return new Promise(function (resolve, reject) {
      try {
        role.principals.create({ principalType: RoleMapping.USER, principalId: userId }, function (err, principal) {
          if (err) {
            reject(err)
          } else {
            resolve(principal)
          }
        })
      } catch (err) {
        console.log(err)
        reject(err)
      }
    })
  }
}
