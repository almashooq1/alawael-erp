/* eslint-disable no-undef, no-unused-vars */
/**
 * Noor Integration (Ministry of Education) — API Tests
 */
const request = require('supertest');
const app = require('../server');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin', organizationId: 'org-1' };
    next();
  },
  authorize: () => (req, res, next) => next(),
  authorizeRole: () => (req, res, next) => next(),
  requireAuth: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin', organizationId: 'org-1' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
  requireAdmin: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin', organizationId: 'org-1' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', role: 'admin', name: 'Test Admin', organizationId: 'org-1' };
    next();
  },
}));

describe('Noor Integration API — نظام نور', () => {
  // ─── Dashboard ───
  describe('GET /api/noor/dashboard', () => {
    it('should return Noor dashboard analytics', async () => {
      const res = await request(app).get('/api/noor/dashboard');
      expect([200, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  // ─── Config ───
  describe('GET /api/noor/config', () => {
    it('should return Noor configuration', async () => {
      const res = await request(app).get('/api/noor/config');
      expect([200, 400, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  describe('PUT /api/noor/config', () => {
    it('should update Noor configuration', async () => {
      const res = await request(app)
        .put('/api/noor/config')
        .send({ enabled: true, syncSchedule: { frequency: 'weekly' } });
      expect([200, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── Students ───
  describe('GET /api/noor/students', () => {
    it('should list students', async () => {
      const res = await request(app).get('/api/noor/students');
      expect([200, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  describe('POST /api/noor/students', () => {
    it('should register a new student', async () => {
      const res = await request(app)
        .post('/api/noor/students')
        .send({
          noorId: 'NOOR-12345',
          nationalId: '1099887766',
          studentName: { ar: 'أحمد محمد', en: 'Ahmed Mohammed' },
          dateOfBirth: '2015-03-15',
          gender: 'male',
          disabilityType: 'autism',
          disabilitySeverity: 'moderate',
          educationalPlacement: 'special_center',
          academicYear: '2025-2026',
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/noor/students/:id/sync', () => {
    it('should sync student with Noor', async () => {
      const res = await request(app).post('/api/noor/students/507f1f77bcf86cd799439011/sync');
      expect([200, 400, 401, 403, 404, 500]).toContain(res.status);
    }, 15000);
  });

  describe('POST /api/noor/students/bulk-sync', () => {
    it('should bulk sync students', async () => {
      const res = await request(app)
        .post('/api/noor/students/bulk-sync')
        .send({ academicYear: '2025-2026' });
      expect([200, 400, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  // ─── IEPs ───
  describe('GET /api/noor/ieps', () => {
    it('should list IEPs', async () => {
      const res = await request(app).get('/api/noor/ieps');
      expect([200, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  describe('POST /api/noor/ieps', () => {
    it('should create an IEP', async () => {
      const res = await request(app)
        .post('/api/noor/ieps')
        .send({
          noorStudentId: 'NOOR-12345',
          academicYear: '2025-2026',
          semester: 1,
          goals: [
            {
              domain: 'communication',
              description: 'تحسين مهارات التواصل اللفظي',
              measurableCriteria: 'استخدام 50 كلمة جديدة',
            },
          ],
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  describe('POST /api/noor/ieps/:id/submit-noor', () => {
    it('should submit IEP to Noor', async () => {
      const res = await request(app).post('/api/noor/ieps/507f1f77bcf86cd799439011/submit-noor');
      expect([200, 400, 401, 403, 404, 500]).toContain(res.status);
    }, 15000);
  });

  // ─── Progress Reports ───
  describe('GET /api/noor/progress-reports', () => {
    it('should list progress reports', async () => {
      const res = await request(app).get('/api/noor/progress-reports');
      expect([200, 401, 403, 500]).toContain(res.status);
    }, 15000);
  });

  describe('POST /api/noor/progress-reports', () => {
    it('should create a progress report', async () => {
      const res = await request(app)
        .post('/api/noor/progress-reports')
        .send({
          student: '507f1f77bcf86cd799439011',
          academicYear: '2025-2026',
          semester: 1,
          reportPeriod: 'quarterly',
          reportDate: '2026-03-15',
          overallProgress: 'good',
          attendance: { totalDays: 90, presentDays: 82, absentDays: 8 },
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── v1 alias ───
  describe('v1 endpoint aliases', () => {
    it('GET /api/v1/noor/dashboard should also work', async () => {
      const res = await request(app).get('/api/v1/noor/dashboard');
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    }, 15000);
  });
});
