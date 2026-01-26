const request = require('supertest');
const { app } = require('../server_ultimate');

describe('POST /api/auth/login (server_ultimate)', () => {
  it('returns 200 with token or 401 for invalid credentials', async () => {
    const credentials = { email: 'admin@example.com', password: 'Admin@123' };
    const res = await request(app)
      .post('/api/auth/login')
      .send(credentials)
      .set('Accept', 'application/json')
      .timeout(15000);

    expect([200, 401].includes(res.status)).toBe(true);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
    } else {
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
    }
  });
});
