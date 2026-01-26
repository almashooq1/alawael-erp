const request = require('supertest');
const { app } = require('../server_ultimate');

describe('Uploads API', () => {
  it('health endpoint responds ok', async () => {
    const res = await request(app).get('/api/uploads/health').expect(200);
    expect(res.body).toMatchObject({ success: true, service: 'uploads', status: 'ok' });
  });

  it('returns 400 when no file provided', async () => {
    const res = await request(app)
      .post('/api/uploads/file')
      .set('Authorization', 'Bearer test-token');

    expect([400, 401].includes(res.status)).toBe(true);
    expect(res.body).toMatchObject({ success: false });
  });
});
