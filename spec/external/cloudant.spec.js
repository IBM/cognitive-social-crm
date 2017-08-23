// Test the connection to Cloudant
// Just a simple connection to verify the values
let genericRequestRawPromise = require('../../server/utils/api').genericRequestRawPromise
describe('cloudant configuration:', () => {
  let response = null
  beforeAll((done) => {
    genericRequestRawPromise({
      url: `${process.env.CLOUDANT_CONNECTION_URL}/${process.env.CLOUDANT_DB_NAME}`,
      method: 'GET',
      json: true
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
  it('should expect a response that is in the expected format', () => {
    // Just test the basics of the response
    expect(response.db_name).toEqual(process.env.CLOUDANT_DB_NAME)
    expect(response.sizes).toEqual(jasmine.any(Object))
  })
})
