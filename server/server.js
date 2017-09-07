require("cf-deployment-tracker-client").track();
require('./utils/wsl-env')

var loopback = require('loopback')
var boot = require('loopback-boot')

var multer = require('multer')

// Define the storage for the files being upload.
var storage = multer.memoryStorage()

var app = module.exports = loopback()

// Add the middleware to parse multipart forms
app.use(multer({storage: storage}).any())

app.start = function () {
  // start the web server
  return app.listen(function () {
    var baseUrl = app.get('url').replace(/\/$/, '')
    console.log('Web server listening at: %s', baseUrl)
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath)
    }
    console.log('*************************************************************')
    console.log('* Please wait for BrowserSync to start your Browser Session.')
    console.log('*************************************************************')
  })
}
// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) {
    app.emit('not started')
    throw err
  }
  app.emit('started')
  // start the server if `$ node server.js`
  if (require.main === module) {
    app.start()
  }
})
