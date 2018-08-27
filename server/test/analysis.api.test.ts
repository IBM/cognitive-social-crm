import * as request from 'supertest';
import app from '../src';

describe('GET /analysis', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis')
            .expect(200);
  });
});

describe('GET /analysis/classificationSummary', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/classificationSummary')
            .expect(200);
  });
});

describe('GET /analysis/classificationSummary', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/classificationSummary')
            .expect(200);
  });
});

describe('GET /analysis/sentimentOverTime', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/sentimentOverTime')
            .expect(200);
  });
});

describe('GET /analysis/sentimentSummary', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/sentimentSummary')
            .expect(200);
  });
});

describe('GET /analysis/keywordsSummary', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/keywordsSummary')
            .expect(200);
  });
});

describe('GET /analysis/emotionalToneOvertime', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/emotionalToneOvertime')
            .expect(200);
  });
});

describe('GET /analysis/listByPostDate', () => {
  it('should return 200 OK', () => {
    return request(app).get('/analysis/listByPostDate')
            .expect(200);
  });
});
