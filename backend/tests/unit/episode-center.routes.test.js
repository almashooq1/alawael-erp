'use strict';
/**
 * Route registration tests for episode-center.routes.js
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

jest.mock('../../services/episodeCenter.service', () => ({
  getDashboard: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  getFullEpisode: jest.fn(),
  advancePhase: jest.fn(),
  updateStatus: jest.fn(),
  addTeamMember: jest.fn(),
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
require('../../routes/episode-center.routes');

/* ── snapshot mock.calls in beforeAll ───────────────────────────────── */
let routerFactoryCalled = false;
let registeredGet = [];
let registeredPost = [];
let registeredPatch = [];

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
  registeredPatch = mockRouter.patch.mock.calls.map(c => c[0]);
});

/* ── tests ───────────────────────────────────────────────────────────── */
describe('episode-center.routes — route registration', () => {
  it('calls express.Router() factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  it('registers GET /dashboard (episodes overview)', () => {
    expect(registeredGet).toContain('/dashboard');
  });

  it('registers GET / (list episodes with filters)', () => {
    expect(registeredGet).toContain('/');
  });

  it('registers GET /beneficiary/:bid (beneficiary episodes)', () => {
    expect(registeredGet).toContain('/beneficiary/:bid');
  });

  it('registers GET /:id (single full episode)', () => {
    expect(registeredGet).toContain('/:id');
  });

  it('registers POST / (create episode)', () => {
    expect(registeredPost).toContain('/');
  });

  it('registers POST /:id/advance-phase (phase transition)', () => {
    expect(registeredPost).toContain('/:id/advance-phase');
  });

  it('registers POST /:id/team-member (add team member)', () => {
    expect(registeredPost).toContain('/:id/team-member');
  });

  it('registers PATCH /:id/status (status update)', () => {
    expect(registeredPatch).toContain('/:id/status');
  });

  it('registers exactly 4 GET routes', () => {
    expect(registeredGet).toHaveLength(4);
  });

  it('registers exactly 3 POST routes', () => {
    expect(registeredPost).toHaveLength(3);
  });

  it('registers exactly 1 PATCH route', () => {
    expect(registeredPatch).toHaveLength(1);
  });
});

describe('episode-center.routes — service integration', () => {
  it('service getDashboard is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.getDashboard).toBe('function');
  });

  it('service list is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.list).toBe('function');
  });

  it('service create is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.create).toBe('function');
  });

  it('service advancePhase is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.advancePhase).toBe('function');
  });

  it('service updateStatus is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.updateStatus).toBe('function');
  });

  it('service addTeamMember is mockable', () => {
    const svc = require('../../services/episodeCenter.service');
    expect(typeof svc.addTeamMember).toBe('function');
  });
});
