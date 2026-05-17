'use strict';
/**
 * Route registration tests for activity-library-routes.js
 *
 * Pattern: module-scope require → beforeAll snapshot → clearMocks-safe assertions.
 * The clearMocks: true in jest.config.js wipes mock.calls before each it(),
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

jest.mock('mongoose', () => ({
  Types: { ObjectId: { isValid: jest.fn(() => false) } },
}));

jest.mock('../../models/ActivityLibrary', () => ({
  Activity: {
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  DISCIPLINES: ['speech', 'ot', 'pt', 'behavior', 'special_ed'],
  DOMAINS: ['communication', 'cognitive', 'motor_gross'],
  DIFFICULTY: ['beginner', 'intermediate', 'advanced'],
}));

jest.mock('../../rehabilitation-services/activity-library-seed', () => ({
  BUILT_IN_ACTIVITIES: [],
}));

jest.mock('../../utils/safeError', () => jest.fn());

/* ── load the route module at module scope (before clearMocks fires) ── */
require('../../rehabilitation-services/activity-library-routes');

/* ── snapshot mock.calls in beforeAll ───────────────────────────────── */
let routerFactoryCalled = false;
let registeredGet = [];
let registeredPost = [];
let registeredPatch = [];
let deleteCalled = false;

beforeAll(() => {
  const { Router } = require('express');
  routerFactoryCalled = Router.mock.calls.length > 0;
  registeredGet = mockRouter.get.mock.calls.map(c => c[0]);
  registeredPost = mockRouter.post.mock.calls.map(c => c[0]);
  registeredPatch = mockRouter.patch.mock.calls.map(c => c[0]);
  deleteCalled = mockRouter.delete.mock.calls.length > 0;
});

/* ── tests ───────────────────────────────────────────────────────────── */
describe('activity-library-routes — route registration', () => {
  it('calls express.Router() factory', () => {
    expect(routerFactoryCalled).toBe(true);
  });

  it('registers GET /activities (list with filters)', () => {
    expect(registeredGet).toContain('/activities');
  });

  it('registers GET /activities/disciplines (enum helper)', () => {
    expect(registeredGet).toContain('/activities/disciplines');
  });

  it('registers GET /activities/stats (dashboard aggregate)', () => {
    expect(registeredGet).toContain('/activities/stats');
  });

  it('registers GET /activities/:id (fetch single by id or code)', () => {
    expect(registeredGet).toContain('/activities/:id');
  });

  it('registers POST /activities/seed (idempotent built-in loader)', () => {
    expect(registeredPost).toContain('/activities/seed');
  });

  it('registers POST /activities (create custom activity)', () => {
    expect(registeredPost).toContain('/activities');
  });

  it('registers POST /activities/:id/use (increment usage counter)', () => {
    expect(registeredPost).toContain('/activities/:id/use');
  });

  it('registers PATCH /activities/:id (update activity fields)', () => {
    expect(registeredPatch).toContain('/activities/:id');
  });

  it('does not register any DELETE routes', () => {
    expect(deleteCalled).toBe(false);
  });

  it('total GET routes = 4', () => {
    expect(registeredGet.length).toBe(4);
  });

  it('total POST routes = 3 (/activities/seed, /activities, /activities/:id/use)', () => {
    expect(registeredPost.length).toBe(3);
  });

  it('total PATCH routes = 1', () => {
    expect(registeredPatch.length).toBe(1);
  });
});
