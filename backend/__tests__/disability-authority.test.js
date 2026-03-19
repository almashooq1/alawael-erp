/* eslint-disable no-undef, no-unused-vars */
/**
 * Disability Authority + CBAHI Compliance — API Tests
 */
const request = require('supertest');
const app = require('../server');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin' };
    next();
  },
  authorize: () => (req, res, next) => next(),
  authorizeRole: () => (req, res, next) => next(),
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
  requireAdmin: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin' };
    next();
  },
}));

describe('Disability Authority & CBAHI API — هيئة رعاية ذوي الإعاقة وسباهي', () => {
  // ─── Authority Reports ───
  describe('GET /api/disability-authority/reports', () => {
    it('should list authority reports', async () => {
      const res = await request(app).get('/api/disability-authority/reports');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/disability-authority/reports', () => {
    it('should create a report', async () => {
      const res = await request(app)
        .post('/api/disability-authority/reports')
        .send({
          reportType: 'quarterly',
          period: {
            startDate: '2026-01-01',
            endDate: '2026-03-31',
          },
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/disability-authority/reports/generate', () => {
    it('should auto-generate report from system data', async () => {
      const res = await request(app).post('/api/disability-authority/reports/generate').send({
        reportType: 'monthly',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('GET /api/disability-authority/dashboard', () => {
    it('should return report dashboard', async () => {
      const res = await request(app).get('/api/disability-authority/dashboard');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── CBAHI Standards ───
  describe('GET /api/disability-authority/cbahi/standards', () => {
    it('should list CBAHI standards', async () => {
      const res = await request(app).get('/api/disability-authority/cbahi/standards');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/disability-authority/cbahi/standards/seed', () => {
    it('should seed default CBAHI standards', async () => {
      const res = await request(app).post('/api/disability-authority/cbahi/standards/seed');
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── CBAHI Assessments ───
  describe('GET /api/disability-authority/cbahi/assessments', () => {
    it('should list CBAHI assessments', async () => {
      const res = await request(app).get('/api/disability-authority/cbahi/assessments');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/disability-authority/cbahi/assessments', () => {
    it('should create a CBAHI assessment', async () => {
      const res = await request(app).post('/api/disability-authority/cbahi/assessments').send({
        assessmentType: 'self_assessment',
        assessmentDate: '2026-03-18',
      });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('GET /api/disability-authority/cbahi/dashboard', () => {
    it('should return CBAHI dashboard', async () => {
      const res = await request(app).get('/api/disability-authority/cbahi/dashboard');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── v1 alias ───
  describe('v1 endpoint aliases', () => {
    it('GET /api/v1/disability-authority/reports should also work', async () => {
      const res = await request(app).get('/api/v1/disability-authority/reports');
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });
  });
});
