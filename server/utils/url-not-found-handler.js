'use strict'

var path = require('path')

module.exports = function () {
  // 4XX - URLs not found
  return function customRaiseUrlNotFoundError (req, res, next) {
    console.log('A route was received by the server to be resolved: ' + req.path)
    if (/^(.*\..*)/.test(req.path)) {
      console.log('This route is an image or something with an extension, responding back with the file url.')
      res.send(req.originalUrl)
    } else {
      console.log('This isn\'t a route that is known to the server, but angular might know about it.')
      res.sendFile(path.resolve('dist/client/index.html'))
    }
  }
}
