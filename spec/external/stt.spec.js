// Test the connection to Watson STT
// Confirm values are valid and response is as expected

let genericRequestRawPromise = require('../../server/utils/api').genericRequestRawPromise
describe('stt configuration:', () => {
  let response = null
  beforeAll((done) => {
    genericRequestRawPromise({
      url: `${process.env.STT_API_URL}/v1/models`,
      method: 'GET',
      json: true,
      auth: {
        password: process.env.STT_API_PASSWORD,
        username: process.env.STT_API_USER
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
  it('should receieve a response from watson conversation', () => {
    expect(response).toBeDefined()
  })
  it('should not receive an unexpected response code', () => {
    expect(response.code).not.toBeDefined()
  })
  it('should expect a response that is in the expected format', () => {
    expect(response.models).toEqual(jasmine.any(Array))
  })
})
