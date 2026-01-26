const request = require('supertest');
const { app } = require('../server_ultimate');

describe('GET /api/health (server_ultimate)', () => {
  it('returns ok with database status field', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('database');
  });
});
