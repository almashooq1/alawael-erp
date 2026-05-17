'use strict';
/**
 * Unit tests — routes/rehab-measures.routes.js
 * Verifies route registration without HTTP server.
 *
 * NOTE: jest.config.js has clearMocks:true which wipes mock.calls before every
 * test. We snapshot the recorded paths in beforeAll (runs before clearMocks)
 * and assert against the snapshot in each it() block.
 */

const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  put: jest.fn().mockReturnThis(),
  patch: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis(),
  all: jest.fn().mockReturnThis(),
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
  json: jest.fn(() => jest.fn()),
  urlencoded: jest.fn(() => jest.fn()),
}));

// rehab-measures-library and smart-assessment-engine are pure in-memory —
// no DB, no network. Load the route file at module scope to intercept express.Router().
require('../../routes/rehab-measures.routes');

// Snapshot recorded paths BEFORE clearMocks wipes them between tests
let registeredGet = [];
let registeredPost = [];
let routerFactoryCalled = false;
let deleteCalled = false;

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
  deleteCalled = mockRouter.delete.mock.calls.length > 0;
});

describe('rehab-measures.routes.js — route registration', () => {
  it('called express Router factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  // ── GET routes ──────────────────────────────────────────────────────────
  it('registers GET /catalog', () => {
    expect(registeredGet).toContain('/catalog');
  });

  it('registers GET /catalog/:key', () => {
    expect(registeredGet).toContain('/catalog/:key');
  });

  it('registers GET /categories', () => {
    expect(registeredGet).toContain('/categories');
  });

  it('registers GET /suggest', () => {
    expect(registeredGet).toContain('/suggest');
  });

  // ── POST routes ─────────────────────────────────────────────────────────
  it('registers POST /score', () => {
    expect(registeredPost).toContain('/score');
  });

  it('registers POST /score-battery', () => {
    expect(registeredPost).toContain('/score-battery');
  });

  it('registers POST /progress/:measureKey', () => {
    expect(registeredPost).toContain('/progress/:measureKey');
  });

  it('registers POST /assessment-plan', () => {
    expect(registeredPost).toContain('/assessment-plan');
  });

  it('registers POST /clinical-summary', () => {
    expect(registeredPost).toContain('/clinical-summary');
  });

  it('registers POST /goals/:measureKey', () => {
    expect(registeredPost).toContain('/goals/:measureKey');
  });

  // ── Safety ──────────────────────────────────────────────────────────────
  it('no DELETE routes registered', () => {
    expect(deleteCalled).toBe(false);
  });

  it('total GET routes = 4', () => {
    expect(registeredGet.length).toBe(4);
  });

  it('total POST routes = 6', () => {
    expect(registeredPost.length).toBe(6);
  });
});
