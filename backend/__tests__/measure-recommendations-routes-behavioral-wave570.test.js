'use strict';

/**
 * measure-recommendations-routes-behavioral-wave570.test.js — W570.
 *
 * Route-LAYER behavioral coverage for the W562 measure-recommendations
 * route (the W561/W562 work shipped with pure-core + service-behavioral
 * tests but no HTTP-layer test — same gap CLAUDE.md flagged for Phase B
 * routes). Boots a minimal Express app with the auth/branch middleware +
 * the service mocked, so it isolates the ROUTE's own behavior:
 *   • invalid :beneficiaryId → 400 (before any service call)
 *   • enforceBeneficiaryBranch is invoked with the path id (W269 contract)
 *   • a 403 from enforceBeneficiaryBranch maps to HTTP 403
 *   • a service error carrying statusCode maps to that HTTP status
 *   • happy path → 200 { success, data }
 *   • query options (administrableOnly / includeCurrent / limit) are parsed
 *     and forwarded to the service
 *
 * jest.mock factory vars are `mock`-prefixed per the hoisting rule.
 */

jest.unmock('mongoose'); // route uses mongoose.isValidObjectId (pure — no DB)

const mockState = { user: { _id: 'u1', role: 'therapist', branchId: 'b1' } };
const mockEnforce = jest.fn().mockResolvedValue(undefined);
const mockRecommend = jest.fn();

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(), // role gating covered statically
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));
jest.mock('../middleware/assertBranchMatch', () => ({
  enforceBeneficiaryBranch: (...args) => mockEnforce(...args),
}));
jest.mock('../services/measureRecommendation.service', () => ({
  measureRecommendationService: { recommendForBeneficiary: (...a) => mockRecommend(...a) },
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/measure-recommendations', require('../routes/measure-recommendations.routes'));
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
}

const app = buildApp();
const VALID_ID = new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  mockState.user = { _id: 'u1', role: 'therapist', branchId: 'b1' };
  mockEnforce.mockReset().mockResolvedValue(undefined);
  mockRecommend.mockReset();
});

describe('W570 — measure-recommendations route HTTP behavior', () => {
  test('invalid :beneficiaryId → 400, no service call', async () => {
    const res = await request(app).get('/api/v1/measure-recommendations/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockRecommend).not.toHaveBeenCalled();
  });

  test('enforces beneficiary branch with the path id (W269)', async () => {
    mockRecommend.mockResolvedValue({ recommendations: [], total: 0 });
    await request(app).get(`/api/v1/measure-recommendations/${VALID_ID}`);
    expect(mockEnforce).toHaveBeenCalledTimes(1);
    expect(String(mockEnforce.mock.calls[0][1])).toBe(VALID_ID);
  });

  test('403 from enforceBeneficiaryBranch → HTTP 403', async () => {
    const err = new Error('cross-branch');
    err.statusCode = 403;
    mockEnforce.mockRejectedValue(err);
    const res = await request(app).get(`/api/v1/measure-recommendations/${VALID_ID}`);
    expect(res.status).toBe(403);
    expect(mockRecommend).not.toHaveBeenCalled();
  });

  test('service statusCode error maps to that HTTP status', async () => {
    const err = new Error('beneficiary not found');
    err.statusCode = 404;
    mockRecommend.mockRejectedValue(err);
    const res = await request(app).get(`/api/v1/measure-recommendations/${VALID_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/);
  });

  test('happy path → 200 { success, data }', async () => {
    const payload = { total: 2, recommendations: [{ measureCode: 'PEDSQL' }], counts: { high: 1 } };
    mockRecommend.mockResolvedValue(payload);
    const res = await request(app).get(`/api/v1/measure-recommendations/${VALID_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendations[0].measureCode).toBe('PEDSQL');
  });

  test('query options are parsed + forwarded to the service', async () => {
    mockRecommend.mockResolvedValue({ recommendations: [] });
    await request(app).get(
      `/api/v1/measure-recommendations/${VALID_ID}?administrableOnly=1&includeCurrent=true&limit=3&category=screening`
    );
    const opts = mockRecommend.mock.calls[0][1];
    expect(opts.administrableOnly).toBe(true);
    expect(opts.includeCurrent).toBe(true);
    expect(opts.limit).toBe(3);
    expect(opts.category).toBe('screening');
  });

  test('non-positive limit is ignored', async () => {
    mockRecommend.mockResolvedValue({ recommendations: [] });
    await request(app).get(`/api/v1/measure-recommendations/${VALID_ID}?limit=0`);
    expect(mockRecommend.mock.calls[0][1].limit).toBeUndefined();
  });
});
