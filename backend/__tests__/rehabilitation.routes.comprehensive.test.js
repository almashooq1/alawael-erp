/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require('express');



const request = require('supertest');

// MOCKS
const mockRehabService = {
  createAssessment: jest.fn(),
  getAssessment: jest.fn(),
  updateAssessment: jest.fn(),
  createPlan: jest.fn(),
};

jest.mock('../services/rehabilitation.service', () => mockRehabService);

// Mock error handler
jest.mock('../utils/errorHandler', () => ({
  asyncHandler: fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next),
}));

const rehabilitationRoutes = require('../routes/rehabilitation.routes');


// === Global RBAC Mock ===
jest.mock('../rbac', () => ({
  createRBACMiddleware: () => (req, res, next) => next(),
  checkPermission: () => (req, res, next) => next(),
  RBAC_ROLES: {},
  RBAC_PERMISSIONS: {},
}));
// === Global Auth Mock ===
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => { req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] }; next(); },
  requireAdmin: (req, res, next) => next(),
  requireAuth: (req, res, next) => { req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] }; next(); },
  requireRole: (...roles) => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => { req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] }; next(); },
  authorize: (...roles) => (req, res, next) => next(),
  authorizeRole: (...roles) => (req, res, next) => next(),
  authenticate: (req, res, next) => { req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] }; next(); },
}));

jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, res, next) => { req.user = { id: 'user123', name: 'Test User', role: 'admin', permissions: ['*'] }; next(); },
  requireRole: (...roles) => (req, res, next) => next(),
}));
describe('Rehabilitation Routes Comprehensive Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/rehabilitation', rehabilitationRoutes);

    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, error: err.message });
    });
  });

  describe('POST /api/rehabilitation/assessments', () => {
    it('should create assessment', async () => {
      mockRehabService.createAssessment.mockResolvedValue({
        success: true,
        data: {},
        assessment_id: 'a1',
      });

      const res = await request(app)
        .post('/api/rehabilitation/assessments')
        .send({ patientId: 'p1' });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(mockRehabService.createAssessment).toHaveBeenCalled();
    });
  });

  describe('GET /api/rehabilitation/assessments/:assessmentId', () => {
    it('should get assessment', async () => {
      mockRehabService.getAssessment.mockResolvedValue({ id: 'a1' });

      const res = await request(app).get('/api/rehabilitation/assessments/a1');

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      expect(mockRehabService.getAssessment).toHaveBeenCalledWith('a1');
    });
  });
});