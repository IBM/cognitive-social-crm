// Test the connection to Watson Conversation
// Confirm values are valid and response is as expected

let genericRequestRawPromise = require('../../server/utils/api').genericRequestRawPromise

describe('conversation configuration:', () => {
  let response = null
  beforeAll((done) => {
    genericRequestRawPromise({
      url: process.env.CONVERSATION_API_URL,
      method: 'POST',
      json: true,
      auth: {
        username: process.env.CONVERSATION_API_USER,
        password: process.env.CONVERSATION_API_PASSWORD
      },
      body: {
        input: {
          text: ''
        },
        context: {}
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
    expect(response.intents).toEqual(jasmine.any(Object))
    expect(response.entities).toEqual(jasmine.any(Object))
    expect(response.input).toEqual(jasmine.any(Object))
    expect(response.output).toEqual(jasmine.any(Object))
    expect(response.context).toEqual(jasmine.any(Object))
  })
})
