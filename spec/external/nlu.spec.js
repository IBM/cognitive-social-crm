// Test the connection to NLU
// Confirm values are valid and response is as expected

let genericRequestRawPromise = require('../../server/utils/api').genericRequestRawPromise

describe('conversation configuration:', () => {
  let response = null
  beforeAll((done) => {
    // Test a simple analyze call
    genericRequestRawPromise({
      url: process.env.NLU_API_ANALYZE_URL,
      method: 'POST',
      json: true,
      auth: {
        username: process.env.NLU_API_USER,
        password: process.env.NLU_API_PASSWORD
      },
      qs: {
        version: process.env.NLU_API_VERSION
      },
      body: {
        text: 'hello world',
        language: 'en',
        features: {
          keywords: {}
        }
      }
    })
    .then(result => {
      response = result
      done()
    })
    .catch((err) => {
      console.error(err)
      done.fail('failed to get a response')
    })
  })
  it('should receieve a response from nlu', () => {
    expect(response).toBeDefined()
  })
  it('should not receive an unexpected response code', () => {
    expect(response.code).not.toBeDefined()
  })
  it('should expect a response that is in the expected format', () => {
    expect(response.keywords).toEqual(jasmine.any(Object))
  })
})
