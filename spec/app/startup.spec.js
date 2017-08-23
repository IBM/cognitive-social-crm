// Test that the application can startup sucessfully

describe('application startup:', () => {
  let app
  let error = false
  beforeAll((done) => {
    try {
      app = require('../../server/server')
      app.on('started', () => {
        done()
      })
      app.on('not started', () => {
        error = true
        done()
      })
    } catch (e) {
      error = e
      done()
    }
  })
  // Simply verify that the app starts
  it('application should start up without throwing an error', () => {
    expect(error).toBe(false)
  })
})
