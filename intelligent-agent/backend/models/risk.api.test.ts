import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';

describe('Risk Management API', () => {
  let createdId: string;

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new risk', async () => {
    const res = await request(app)
      .post('/api/risks')
      .send({
        title: 'اختبار المخاطر',
        description: 'وصف تجريبي',
        category: 'تشغيلي',
        likelihood: 4,
        impact: 5,
        owner: 'admin',
        status: 'open',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('اختبار المخاطر');
    createdId = res.body._id;
  });

  it('should get all risks', async () => {
    const res = await request(app).get('/api/risks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should update a risk', async () => {
    const res = await request(app)
      .put(`/api/risks/${createdId}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
  });

  it('should delete a risk', async () => {
    const res = await request(app).delete(`/api/risks/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
