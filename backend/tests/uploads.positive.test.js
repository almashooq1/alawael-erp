const request = require('supertest');
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

// Mock upload middleware to avoid disk I/O hanging in CI
jest.mock('../middleware/upload', () => ({
  upload: {
    single: () => (req, res, next) => {
      req.file = {
        originalname: 'sample.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        path: 'fake/path/sample.pdf',
      };
      next();
    },
  },
}));

// Mount uploads router in a lightweight app to avoid unrelated dependencies
const uploadsRouter = require('../routes/uploads.routes');
const app = express();
app.use('/api/uploads', uploadsRouter);

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const makeAdminToken = () =>
  jwt.sign({ id: 't1', email: 'test@admin', role: 'admin' }, TEST_SECRET);

describe('Uploads API (positive)', () => {
  it('accepts a small PDF upload', async () => {
    const token = makeAdminToken();
    const res = await request(app)
      .post('/api/uploads/file')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('file.path');
    expect(res.body.file.path).toContain('/public/uploads/');
  }, 20000);
});
