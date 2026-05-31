/**
 * Audit #23 — visitor JWT moved from localStorage to an httpOnly cookie.
 *
 * Verifies the backend contract of routes/visitor-auth.routes.js:
 *   - GET  /my-submissions authenticates from the `visitor_jwt` cookie,
 *   - falls back to the `Authorization: Bearer` header (transitional clients),
 *   - 401s when neither is present,
 *   - POST /logout clears the cookie.
 *
 * No Mongo / no OTP randomness: FormSubmission is mocked and the JWT is signed
 * directly with the test secret. supertest drives the mounted router.
 */
'use strict';

jest.mock('../models/FormSubmission', () => ({
  exists: jest.fn().mockResolvedValue(true),
  find: jest.fn(() => ({
    select: () => ({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
  })),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = 'test-visitor-secret';

function makeApp() {
  process.env.JWT_SECRET = SECRET;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/public/visitor', require('../routes/visitor-auth.routes'));
  return app;
}

function visitorToken(contact = 'a@b.com') {
  return jwt.sign({ contact, role: 'visitor' }, SECRET, { expiresIn: '24h' });
}

describe('visitor-auth httpOnly cookie (audit #23)', () => {
  const app = makeApp();

  test('my-submissions authenticates from the visitor_jwt cookie', async () => {
    const res = await request(app)
      .get('/api/v1/public/visitor/my-submissions')
      .set('Cookie', [`visitor_jwt=${visitorToken('cookie@x.com')}`]);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.contact).toBe('cookie@x.com');
  });

  test('my-submissions still accepts a Bearer header (transitional fallback)', async () => {
    const res = await request(app)
      .get('/api/v1/public/visitor/my-submissions')
      .set('Authorization', `Bearer ${visitorToken('bearer@x.com')}`);
    expect(res.status).toBe(200);
    expect(res.body.contact).toBe('bearer@x.com');
  });

  test('my-submissions 401s with neither cookie nor header', async () => {
    const res = await request(app).get('/api/v1/public/visitor/my-submissions');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NO_TOKEN');
  });

  test('a non-visitor token is rejected even via the cookie', async () => {
    const adminToken = jwt.sign({ contact: 'x@x.com', role: 'admin' }, SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/public/visitor/my-submissions')
      .set('Cookie', [`visitor_jwt=${adminToken}`]);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('NOT_VISITOR_TOKEN');
  });

  test('logout clears the visitor_jwt cookie', async () => {
    const res = await request(app).post('/api/v1/public/visitor/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const setCookie = (res.headers['set-cookie'] || []).join(';');
    expect(setCookie).toMatch(/visitor_jwt=/);
    // cleared cookie carries an expiry in the past (Expires=… 1970 or Max-Age=0/negative)
    expect(setCookie).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0|Max-Age=-/i);
  });
});
