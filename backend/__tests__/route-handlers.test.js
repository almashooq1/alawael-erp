const request = require('supertest');
const app = require('../app');

describe('Route Handlers', () => {
  it('should respond to GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});
