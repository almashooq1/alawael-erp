const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
  it('should return OK status', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('message');
  });
});
