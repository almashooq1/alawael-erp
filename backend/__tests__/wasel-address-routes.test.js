/**
 * wasel-address-routes.test.js — exercises the new Wasel HTTP surface end to
 * end against the mock adapter (WASEL_MODE defaults to 'mock'). We can't
 * hit the real auth middleware here (requires a provisioned user +
 * JWT); instead we patch authenticate/authorize to pass-through so the
 * route logic itself is covered.
 */

'use strict';

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'user-1', role: 'admin', branchId: 'br_1', tenantId: 't_1' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');

describe('Wasel national address routes', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    app = express();
    app.use(express.json());
    app.use('/api/v1/wasel/address', require('../routes/wasel-address.routes'));
  });

  it('verifies a well-formed short code via the mock adapter', async () => {
    const res = await request(app)
      .post('/api/v1/wasel/address/verify-short-code')
      .send({ shortCode: 'RFYA1234' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('match');
    expect(res.body.city).toBeTruthy();
  });

  it('rejects missing shortCode with 400 MISSING_SHORT_CODE', async () => {
    const res = await request(app)
      .post('/api/v1/wasel/address/verify-short-code')
      .send({})
      .expect(400);
    expect(res.body.code).toBe('MISSING_SHORT_CODE');
  });

  it('flags not_found on the 00 mock sentinel', async () => {
    const res = await request(app)
      .post('/api/v1/wasel/address/verify-short-code')
      .send({ shortCode: 'RFYA1200' })
      .expect(200);
    expect(res.body.status).toBe('not_found');
  });

  it('flags invalid_format when the short code fails regex', async () => {
    const res = await request(app)
      .post('/api/v1/wasel/address/verify-short-code')
      .send({ shortCode: 'bad' })
      .expect(200);
    expect(res.body.status).toBe('invalid_format');
  });

  it('searchByNationalId returns multiple mock addresses', async () => {
    const res = await request(app)
      .post('/api/v1/wasel/address/search-by-id')
      .send({ nationalId: '1087654321' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.addresses)).toBe(true);
  });

  it('health endpoint returns connection + config snapshot', async () => {
    const res = await request(app).get('/api/v1/wasel/address/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.connection).toBeTruthy();
    expect(res.body.config.provider).toBe('wasel');
  });
});
