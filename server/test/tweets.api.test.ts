import * as request from 'supertest';
import app from '../src';

describe('GET /tweets', () => {
  it('should return 200 OK', () => {
    return request(app).get('/tweets')
      .expect(200);
  });
});
