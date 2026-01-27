// process.integration.test.ts
// اختبار تكامل API العمليات

import request from 'supertest';
import express from 'express';
import processRouter from './process.integration';

describe('Process API Integration', () => {
  const app = express();
  app.use(express.json());
  app.use(processRouter);

  it('should add and fetch a process', async () => {
    const res1 = await request(app)
      .post('/processes')
      .send({ name: 'Test Process', status: 'active', steps: [], createdAt: '', updatedAt: '' });
    expect(res1.status).toBe(201);
    expect(res1.body.name).toBe('Test Process');

    const res2 = await request(app).get('/processes');
    expect(res2.body.length).toBeGreaterThan(0);
    expect(res2.body[0].name).toBe('Test Process');
  });

  it('should update a process', async () => {
    const res1 = await request(app)
      .post('/processes')
      .send({ name: 'To Update', status: 'active', steps: [], createdAt: '', updatedAt: '' });
    const id = res1.body._id;
    const res2 = await request(app)
      .put(`/processes/${id}`)
      .send({ name: 'Updated Name' });
    expect(res2.body.name).toBe('Updated Name');
  });

  it('should delete a process', async () => {
    const res1 = await request(app)
      .post('/processes')
      .send({ name: 'To Delete', status: 'active', steps: [], createdAt: '', updatedAt: '' });
    const id = res1.body._id;
    const res2 = await request(app).delete(`/processes/${id}`);
    expect(res2.status).toBe(204);
    const res3 = await request(app).get('/processes');
    expect(res3.body.find((p:any) => p._id === id)).toBeUndefined();
  });
});
