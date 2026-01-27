import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const request = require('supertest');
const express = require('express');
let mongoose;
let server;
let complianceEventRouter;
let mongod;

beforeAll(async () => {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongoose = await import('mongoose');
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  complianceEventRouter = (await import('../src/routes/compliance')).default;
  const app = express();
  app.use(express.json());
  app.use('/events', complianceEventRouter);
  server = app;
});

afterAll(async () => {
  if (mongoose.connection && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Compliance Event API Validation', () => {
  it('should list events (empty)', async () => {
    const res = await request(server).get('/events/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('should create event with missing fields (should fail)', async () => {
    const res = await request(server).post('/events/events').send({});
    expect(res.status).toBe(404); // No POST implemented yet
  });

  it('should get stats (empty)', async () => {
    const res = await request(server).get('/events/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total', 0);
    expect(Array.isArray(res.body.byStatus)).toBe(true);
  });

  it('should get alerts (empty)', async () => {
    const res = await request(server).get('/events/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
