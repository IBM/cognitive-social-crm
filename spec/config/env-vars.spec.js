// Perform basic validation of environment configuration

let validUrl = require('validator').isURL

// Test the values supplied as environment variables
// As new environment variables are added, they should be validated here

describe('application configuration:', () => {
  it('expects CLOUDANT_CONNECTION_URL to be specified and in valid form', () => {
    expect(process.env['CLOUDANT_CONNECTION_URL']).toBeDefined()
    expect(validUrl(process.env['CLOUDANT_CONNECTION_URL'], {protocols: ['http', 'https']})).toBe(true)
  })
  it('expects CLOUDANT_ANALYSIS_DB_NAME to be specified and in valid form', () => {
    expect(process.env['CLOUDANT_ANALYSIS_DB_NAME']).toBeDefined()
    expect(process.env['CLOUDANT_ANALYSIS_DB_NAME']).toEqual(jasmine.any(String))
  })
  it('expects CONVERSATION_API_URL to be specified and in valid form', () => {
    expect(process.env['CONVERSATION_API_URL']).toBeDefined()
    expect(validUrl(process.env['CONVERSATION_API_URL'], {protocols: ['http', 'https']})).toBe(true)
  })
  it('expects CONVERSATION_API_USER to be specified and in valid form', () => {
    expect(process.env['CONVERSATION_API_USER']).toBeDefined()
    expect(/\w{8}-(\w{4}-){3}\w{12}/.test(process.env['CONVERSATION_API_USER'])).toBe(true)
  })
  it('expects CONVERSATION_API_PASSWORD to be specified and in valid form', () => {
    expect(process.env['CONVERSATION_API_PASSWORD']).toBeDefined()
    expect(/\w{12}/.test(process.env['CONVERSATION_API_PASSWORD'])).toBe(true)
  })
  it('expects NLU_API_USER to be specified and in valid form', () => {
    expect(process.env['NLU_API_USER']).toBeDefined()
    expect(/\w{8}-(\w{4}-){3}\w{12}/.test(process.env['NLU_API_USER'])).toBe(true)
  })
  it('expects NLU_API_PASSWORD to be specified and in valid form', () => {
    expect(process.env['NLU_API_PASSWORD']).toBeDefined()
    expect(/\w{12}/.test(process.env['NLU_API_PASSWORD'])).toBe(true)
  })
})
