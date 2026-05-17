'use strict';
/**
 * Route registration tests for measures-library.routes.js
 *
 * Pattern: module-scope require → beforeAll snapshot → clearMocks-safe assertions.
 * clearMocks: true in jest.config.js wipes mock.calls before each it(),
 * so we capture everything in beforeAll() into plain local variables.
 */

/* ── mocks ──────────────────────────────────────────────────────────── */
const mockRouter = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock('../../services/measuresLibrary.service', () => ({
  getDashboard: jest.fn(),
  list: jest.fn(),
  suggest: jest.fn(),
  getById: jest.fn(),
  getScoringGuide: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../middleware/auth', () => ({
  requireAuth: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/* ── load the route module at module scope (before clearMocks fires) ── */
require('../../routes/measures-library.routes');

/* ── snapshot mock.calls in beforeAll ───────────────────────────────── */
let routerFactoryCalled = false;
let registeredGet = [];
let registeredPost = [];
let registeredPut = [];

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
  registeredPut = mockRouter.put.mock.calls.map(c => c[0]);
});

/* ── tests ───────────────────────────────────────────────────────────── */
describe('measures-library.routes — route registration', () => {
  it('calls express.Router() factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  it('registers GET /dashboard (library statistics)', () => {
    expect(registeredGet).toContain('/dashboard');
  });

  it('registers GET / (list + search + filter)', () => {
    expect(registeredGet).toContain('/');
  });

  it('registers GET /suggest (AI-powered measure suggestions)', () => {
    expect(registeredGet).toContain('/suggest');
  });

  it('registers GET /:id (single measure details)', () => {
    expect(registeredGet).toContain('/:id');
  });

  it('registers GET /:id/scoring (scoring guide)', () => {
    expect(registeredGet).toContain('/:id/scoring');
  });

  it('registers POST / (add new measure)', () => {
    expect(registeredPost).toContain('/');
  });

  it('registers PUT /:id (update measure)', () => {
    expect(registeredPut).toContain('/:id');
  });

  it('registers exactly 5 GET routes', () => {
    expect(registeredGet).toHaveLength(5);
  });

  it('registers exactly 1 POST route', () => {
    expect(registeredPost).toHaveLength(1);
  });

  it('registers exactly 1 PUT route', () => {
    expect(registeredPut).toHaveLength(1);
  });
});

describe('measures-library.routes — service integration', () => {
  it('service getDashboard is mockable', () => {
    const svc = require('../../services/measuresLibrary.service');
    expect(typeof svc.getDashboard).toBe('function');
  });

  it('service list is mockable', () => {
    const svc = require('../../services/measuresLibrary.service');
    expect(typeof svc.list).toBe('function');
  });

  it('service suggest is mockable', () => {
    const svc = require('../../services/measuresLibrary.service');
    expect(typeof svc.suggest).toBe('function');
  });

  it('service create is mockable', () => {
    const svc = require('../../services/measuresLibrary.service');
    expect(typeof svc.create).toBe('function');
  });

  it('service update is mockable', () => {
    const svc = require('../../services/measuresLibrary.service');
    expect(typeof svc.update).toBe('function');
  });
});
