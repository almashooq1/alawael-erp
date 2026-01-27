import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const request = require('supertest');
const express = require('express');
let mongoose;
let server;
let complianceRouter;
let mongod;

beforeAll(async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongoose = await import('mongoose');
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  complianceRouter = (await import('../src/routes/compliance-policy')).default;
  const app = express();
  app.use(express.json());
  app.use('/policies', complianceRouter);
  server = app;
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Compliance Policy API Validation', () => {
  let createdId = '';

  it('should reject missing name', async () => {
    const res = await request(server).post('/policies').send({ description: 'desc', enabled: true });
    expect(res.status).toBe(400);
  });

  it('should create valid policy', async () => {
    const res = await request(server).post('/policies').send({ name: 'Policy1', description: 'desc', enabled: true });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Policy1');
    createdId = res.body._id;
  });

  it('should reject duplicate name', async () => {
    const res = await request(server).post('/policies').send({ name: 'Policy1', description: 'desc', enabled: true });
    expect(res.status).toBe(400);
  });

  it('should list all policies', async () => {
    const res = await request(server).get('/policies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should update policy', async () => {
    const res = await request(server).put(`/policies/${createdId}`).send({ name: 'Policy1-updated', enabled: false });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Policy1-updated');
    expect(res.body).toHaveProperty('enabled', false);
  });

  it('should reject update with invalid id', async () => {
    const res = await request(server).put('/policies/invalid-id').send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('should delete policy', async () => {
    const res = await request(server).delete(`/policies/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('should reject delete with invalid id', async () => {
    const res = await request(server).delete('/policies/invalid-id');
    expect(res.status).toBe(400);
  });
});
