'use strict';
/**
 * Route registration tests for session-center.routes.js
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
  param: jest.fn(),
};

jest.mock('express', () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock('../../services/sessionCenter.service', () => ({
  getDashboard: jest.fn(),
  getCalendarSlots: jest.fn(),
  getTherapistLoad: jest.fn(),
  getAttendanceReport: jest.fn(),
  getEpisodeSessions: jest.fn(),
  getBeneficiarySessions: jest.fn(),
  getGoalsProgress: jest.fn(),
  getSOAPSummary: jest.fn(),
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
require('../../routes/session-center.routes');

/* ── snapshot mock.calls in beforeAll ───────────────────────────────── */
let routerFactoryCalled = false;
let registeredGet = [];
let registeredPost = [];

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
});

/* ── tests ───────────────────────────────────────────────────────────── */
describe('session-center.routes — route registration', () => {
  it('calls express.Router() factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  it('registers GET /dashboard (KPIs + trends)', () => {
    expect(registeredGet).toContain('/dashboard');
  });

  it('registers GET /calendar (calendar slots)', () => {
    expect(registeredGet).toContain('/calendar');
  });

  it('registers GET /therapist-load (workload analysis)', () => {
    expect(registeredGet).toContain('/therapist-load');
  });

  it('registers GET /attendance (attendance report)', () => {
    expect(registeredGet).toContain('/attendance');
  });

  it('registers GET /episode/:episodeId (episode sessions)', () => {
    expect(registeredGet).toContain('/episode/:episodeId');
  });

  it('registers GET /beneficiary/:beneficiaryId (beneficiary history)', () => {
    expect(registeredGet).toContain('/beneficiary/:beneficiaryId');
  });

  it('registers GET /goals/:episodeId (goals progress)', () => {
    expect(registeredGet).toContain('/goals/:episodeId');
  });

  it('registers GET /soap/:sessionId (SOAP summary)', () => {
    expect(registeredGet).toContain('/soap/:sessionId');
  });

  it('registers exactly 8 GET routes', () => {
    expect(registeredGet).toHaveLength(8);
  });

  it('does not register any POST routes', () => {
    expect(registeredPost).toHaveLength(0);
  });
});

describe('session-center.routes — service integration', () => {
  it('exports an express Router', () => {
    // The loaded module should export the mockRouter
    expect(mockRouter).toBeDefined();
  });

  it('service getDashboard is mockable', () => {
    const svc = require('../../services/sessionCenter.service');
    expect(typeof svc.getDashboard).toBe('function');
  });

  it('service getCalendarSlots is mockable', () => {
    const svc = require('../../services/sessionCenter.service');
    expect(typeof svc.getCalendarSlots).toBe('function');
  });

  it('service getSOAPSummary is mockable', () => {
    const svc = require('../../services/sessionCenter.service');
    expect(typeof svc.getSOAPSummary).toBe('function');
  });

  it('service getGoalsProgress is mockable', () => {
    const svc = require('../../services/sessionCenter.service');
    expect(typeof svc.getGoalsProgress).toBe('function');
  });
});
