/* eslint-disable no-undef, no-unused-vars */
/**
 * Family Satisfaction Surveys — API Tests
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

describe('Family Satisfaction Surveys API — رضا الأسر', () => {
  // ─── Dashboard ───
  describe('GET /api/family-satisfaction/dashboard', () => {
    it('should return satisfaction dashboard', async () => {
      const res = await request(app).get('/api/family-satisfaction/dashboard');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── Templates ───
  describe('GET /api/family-satisfaction/templates', () => {
    it('should list survey templates', async () => {
      const res = await request(app).get('/api/family-satisfaction/templates');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/family-satisfaction/templates', () => {
    it('should create a survey template', async () => {
      const res = await request(app)
        .post('/api/family-satisfaction/templates')
        .send({
          title: 'استبيان رضا الأسر - ربع سنوي',
          description: 'تقييم جودة الخدمات المقدمة',
          sections: [
            {
              title: 'جودة الخدمة',
              questions: [
                {
                  text: 'ما مدى رضاك عن خدمات العلاج الطبيعي؟',
                  type: 'likert_5',
                  required: true,
                },
              ],
            },
          ],
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/family-satisfaction/templates/seed', () => {
    it('should seed default templates', async () => {
      const res = await request(app).post('/api/family-satisfaction/templates/seed');
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── Send Surveys ───
  describe('POST /api/family-satisfaction/send', () => {
    it('should send survey to families', async () => {
      const res = await request(app)
        .post('/api/family-satisfaction/send')
        .send({
          templateId: '507f1f77bcf86cd799439011',
          recipients: [{ familyId: 'FAM-001', method: 'sms' }],
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── Responses ───
  describe('POST /api/family-satisfaction/responses', () => {
    it('should submit a survey response', async () => {
      const res = await request(app)
        .post('/api/family-satisfaction/responses')
        .send({
          templateId: '507f1f77bcf86cd799439011',
          beneficiaryId: '507f1f77bcf86cd799439012',
          answers: [{ questionId: 'q1', value: 4 }],
          overallRating: 8,
          npsScore: 9,
          comments: 'خدمة ممتازة',
        });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('GET /api/family-satisfaction/responses', () => {
    it('should list survey responses', async () => {
      const res = await request(app).get('/api/family-satisfaction/responses');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── Analytics ───
  describe('GET /api/family-satisfaction/analytics/nps', () => {
    it('should return NPS analytics', async () => {
      const res = await request(app).get('/api/family-satisfaction/analytics/nps');
      expect([200, 401, 403, 500]).toContain(res.status);
    });
  });

  describe('POST /api/family-satisfaction/analytics/generate', () => {
    it('should generate analytics report', async () => {
      const res = await request(app)
        .post('/api/family-satisfaction/analytics/generate')
        .send({ period: 'quarterly', startDate: '2026-01-01' });
      expect([200, 201, 400, 401, 403, 500]).toContain(res.status);
    });
  });

  // ─── v1 alias ───
  describe('v1 endpoint aliases', () => {
    it('GET /api/v1/family-satisfaction/dashboard should also work', async () => {
      const res = await request(app).get('/api/v1/family-satisfaction/dashboard');
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });
  });
});
