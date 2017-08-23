let request = require('request')
function genericRequestPromise (options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error || Number(response.statusCode) > 400) {
        console.log(error || 'status code: ' + response.statusCode)
        reject(error)
      }
      resolve(JSON.parse(body))
    })
  })
}

function genericRequestRawPromise (options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        console.log(error)
        reject(error)
      }
      resolve(body)
    })
  })
}

module.exports = {
  genericRequestPromise,
  genericRequestRawPromise
}
