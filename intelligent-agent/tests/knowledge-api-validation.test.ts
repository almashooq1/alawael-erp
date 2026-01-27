
import { describe, it, expect, beforeAll } from 'vitest';
const request = require('supertest');
const express = require('express');

let knowledgeRouter;


describe('Knowledge API Validation', () => {
  let app;
  beforeAll(async () => {
    knowledgeRouter = (await import('../src/routes/knowledge')).default;
    app = express();
    app.use(express.json());
    app.use('/articles', knowledgeRouter);
  });

  describe('POST /articles', () => {
    it('should reject missing fields', async () => {
      const res = await request(app).post('/articles').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
    it('should reject short title', async () => {
      const res = await request(app).post('/articles').send({ title: 'a', content: 'valid content', tags: ['tag'] });
      expect(res.status).toBe(400);
    });
    it('should reject missing tags', async () => {
      const res = await request(app).post('/articles').send({ title: 'Valid Title', content: 'Valid content' });
      expect(res.status).toBe(400);
    });
    it('should accept valid article', async () => {
      const res = await request(app).post('/articles').send({ title: 'Valid Title', content: 'Valid content here', tags: ['tag1'] });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('title', 'Valid Title');
    });
  });

  describe('PUT /articles/:id', () => {
    it('should reject invalid id', async () => {
      const res = await request(app).put('/articles/invalid-id').send({ title: 'New Title' });
      expect(res.status).toBe(400);
    });
    it('should reject invalid title length', async () => {
      const res = await request(app).put('/articles/1').send({ title: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /articles/:id', () => {
    it('should reject invalid id', async () => {
      const res = await request(app).get('/articles/invalid-id');
      expect(res.status).toBe(400);
    });
  });
});
