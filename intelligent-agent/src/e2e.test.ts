// اختبار End-to-End لمسار NLP
import request from 'supertest';
import { app } from './server';

describe('E2E: NLP API', () => {
  it('should return NLP result for valid request', async () => {
    const res = await request(app)
      .post('/v1/nlp')
      .set('x-tenant-id', 'tenant1')
      .set('Authorization', 'Bearer testtoken')
      .send({ text: 'هذا نص للاختبار', userId: '1', roles: ['admin'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sentiment');
  });
});
