/**
 * performance-routes.test.js
 * اختبارات أساسية لمسارات مقاييس الأداء
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  const express = require('express');
  app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), role: 'admin' };
    next();
  });

  app.use('/api/v1/performance', require('../routes/performance.routes'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

function expectSuccess(res) {
  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Expected success but got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}

describe('Performance Routes', () => {
  it('GET /api/v1/performance/dashboard should return dashboard summary', async () => {
    const res = await request(app).get('/api/v1/performance/dashboard');
    expectSuccess(res);
    expect(res.body.data).toHaveProperty('webVitals');
    expect(res.body.data).toHaveProperty('latestLighthouse');
    expect(res.body.data).toHaveProperty('latestPageSpeed');
    expect(res.body.data).toHaveProperty('openAlerts');
  });

  it('GET /api/v1/performance/web-vitals should return metrics summary', async () => {
    const res = await request(app).get('/api/v1/performance/web-vitals');
    expectSuccess(res);
    expect(res.body.data).toHaveProperty('overall');
    expect(res.body.data).toHaveProperty('trends');
    expect(res.body.data).toHaveProperty('distribution');
  });

  it('GET /api/v1/performance/budget should return default budget', async () => {
    const res = await request(app).get('/api/v1/performance/budget');
    expectSuccess(res);
    expect(res.body.data).toHaveProperty('thresholds');
    expect(res.body.data).toHaveProperty('lighthouseScores');
  });

  it('POST /api/v1/performance/web-vitals should accept metrics', async () => {
    process.env.PERFORMANCE_MONITORING_ENABLED = 'true';
    process.env.WEB_VITALS_SAMPLE_RATE = '1';

    const res = await request(app)
      .post('/api/v1/performance/web-vitals')
      .send({
        metrics: [
          {
            name: 'LCP',
            value: 2000,
            pageUrl: 'https://example.com',
            pagePath: '/',
          },
        ],
      });

    if (res.status !== 201 || !res.body.success) {
      throw new Error(`Expected 201 success but got ${res.status}: ${JSON.stringify(res.body)}`);
    }

    expect(res.body.saved).toBe(1);
  });
});
