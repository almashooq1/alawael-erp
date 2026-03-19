/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const request = require('supertest');

const app = require('../app');

// === Global RBAC Mock ===
jest.mock('../rbac', () => ({
  createRBACMiddleware: () => (req, res, next) => next(),
  checkPermission: () => (req, res, next) => next(),
  RBAC_ROLES: {},
  RBAC_PERMISSIONS: {},
}));
// === Global Auth Mock ===
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireAdmin: (req, res, next) => next(),
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) =>
      next(),
}));
describe('Route Handlers', () => {
  it('should respond to GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
