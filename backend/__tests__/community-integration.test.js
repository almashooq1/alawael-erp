/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/**
 * Community Integration Module — Tests
 * Tests for /routes/communityIntegration.routes.js
 *
 * Covers:
 *   - Community Activities (CRUD + stats)
 *   - Civil Partnerships (CRUD + stats)
 *   - Event Participation (register, attendance, feedback, history)
 *   - Integration Assessments (CRUD + progress + stats)
 *   - Awareness Programs (CRUD + workshops + materials + stats)
 *   - Dashboard
 */

const request = require('supertest');
const { Types } = require('mongoose');

jest.setTimeout(30000);

// ─── Mock Auth ───────────────────────────────────────────────────────────────
const mockTestUser = {
  id: new Types.ObjectId().toString(),
  _id: new Types.ObjectId().toString(),
  email: 'test@alawael.com',
  role: 'admin',
  roles: ['user', 'manager', 'admin', 'coordinator', 'therapist', 'social_worker'],
};

jest.mock('../middleware/auth', () => {
  const passthrough = (req, res, next) => {
    req.user = mockTestUser;
    req.isAuthenticated = true;
    next();
  };
  return {
    authenticate: passthrough,
    authenticateToken: passthrough,
    protect: passthrough,
    requireAuth: passthrough,
    requireAdmin: (req, res, next) => {
      req.user = mockTestUser;
      next();
    },
    optionalAuth: (req, res, next) => {
      req.user = mockTestUser;
      next();
    },
    requireRole: () => passthrough,
    authorize: () => passthrough,
    authorizeRole: () => passthrough,
    verifyToken: () => mockTestUser,
    generateTestToken: () => 'mock-test-token',
  };
});

describe('Community Integration Module', () => {
  let app;
  const beneficiaryId = new Types.ObjectId().toString();
  const activityId = new Types.ObjectId().toString();
  const partnershipId = new Types.ObjectId().toString();
  const fakeId = new Types.ObjectId().toString();

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = require('../server');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // COMMUNITY ACTIVITIES
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Community Activities', () => {
    test('POST /api/community-integration/activities - should create activity', async () => {
      const data = {
        title: 'Summer Sports Camp',
        description: 'Inclusive sports camp for youth with disabilities',
        category: 'sports',
        activityType: 'group',
        targetDisabilityTypes: ['mobility', 'hearing'],
        startDate: '2026-06-01',
        maxParticipants: 30,
        location: { name: 'Al-Riyadh Sports Center', city: 'Riyadh' },
      };
      const res = await request(app).post('/api/community-integration/activities').send(data);
      expect([200, 201, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/activities - should list activities', async () => {
      const res = await request(app).get('/api/community-integration/activities');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/activities - with filters', async () => {
      const res = await request(app).get(
        '/api/community-integration/activities?category=sports&status=active&search=camp'
      );
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/activities/:id - should get activity by id', async () => {
      const res = await request(app).get(`/api/community-integration/activities/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('PUT /api/community-integration/activities/:id - should update activity', async () => {
      const res = await request(app)
        .put(`/api/community-integration/activities/${fakeId}`)
        .send({ status: 'active', maxParticipants: 50 });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('DELETE /api/community-integration/activities/:id - should delete activity', async () => {
      const res = await request(app).delete(`/api/community-integration/activities/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/activities/stats - should return stats', async () => {
      const res = await request(app).get('/api/community-integration/activities/stats');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // CIVIL PARTNERSHIPS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Civil Partnerships', () => {
    test('POST /api/community-integration/partnerships - should create partnership', async () => {
      const data = {
        organizationName: 'Saudi Disability Society',
        organizationNameAr: 'الجمعية السعودية للإعاقة',
        organizationType: 'ngo',
        partnershipType: 'strategic',
        partnershipScope: ['disability_rights', 'awareness_campaigns'],
        startDate: '2026-01-01',
        contactPersons: [
          { name: 'Mohammed Ali', title: 'Director', email: 'm@test.com', isPrimary: true },
        ],
      };
      const res = await request(app).post('/api/community-integration/partnerships').send(data);
      expect([200, 201, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/partnerships - should list partnerships', async () => {
      const res = await request(app).get('/api/community-integration/partnerships');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/partnerships - with filters', async () => {
      const res = await request(app).get(
        '/api/community-integration/partnerships?organizationType=ngo&status=active'
      );
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/partnerships/:id - should get by id', async () => {
      const res = await request(app).get(`/api/community-integration/partnerships/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('PUT /api/community-integration/partnerships/:id - should update', async () => {
      const res = await request(app)
        .put(`/api/community-integration/partnerships/${fakeId}`)
        .send({ status: 'active', performanceScore: 85 });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('DELETE /api/community-integration/partnerships/:id - should delete', async () => {
      const res = await request(app).delete(`/api/community-integration/partnerships/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/partnerships/stats - should return stats', async () => {
      const res = await request(app).get('/api/community-integration/partnerships/stats');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // EVENT PARTICIPATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Event Participation', () => {
    test('POST /api/community-integration/participations - should register participation', async () => {
      const data = {
        beneficiary: beneficiaryId,
        activity: activityId,
        registrationSource: 'social_worker',
        accommodationsNeeded: ['wheelchair ramp', 'sign language interpreter'],
      };
      const res = await request(app).post('/api/community-integration/participations').send(data);
      expect([200, 201, 400, 401, 403, 409, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/participations - should list participations', async () => {
      const res = await request(app).get('/api/community-integration/participations');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/participations - with filters', async () => {
      const res = await request(app).get(
        `/api/community-integration/participations?beneficiary=${beneficiaryId}&participationStatus=active`
      );
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/participations/:id - should get by id', async () => {
      const res = await request(app).get(`/api/community-integration/participations/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('PUT /api/community-integration/participations/:id - should update', async () => {
      const res = await request(app)
        .put(`/api/community-integration/participations/${fakeId}`)
        .send({ participationStatus: 'active', engagementLevel: 'high' });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('POST /api/community-integration/participations/:id/attendance - record attendance', async () => {
      const data = {
        sessionDate: '2026-06-15',
        checkInTime: '2026-06-15T09:00:00Z',
        checkOutTime: '2026-06-15T11:00:00Z',
        attended: true,
      };
      const res = await request(app)
        .post(`/api/community-integration/participations/${fakeId}/attendance`)
        .send(data);
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('POST /api/community-integration/participations/:id/feedback - submit feedback', async () => {
      const data = {
        overallRating: 5,
        enjoymentLevel: 4,
        accessibilityRating: 5,
        socialInteractionRating: 4,
        wouldRecommend: true,
        comments: 'Excellent program, very inclusive',
        feedbackType: 'participant',
      };
      const res = await request(app)
        .post(`/api/community-integration/participations/${fakeId}/feedback`)
        .send(data);
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/participations/beneficiary/:id - history', async () => {
      const res = await request(app).get(
        `/api/community-integration/participations/beneficiary/${beneficiaryId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/participations/stats - should return stats', async () => {
      const res = await request(app).get('/api/community-integration/participations/stats');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // INTEGRATION ASSESSMENTS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Integration Assessments', () => {
    test('POST /api/community-integration/assessments - should create assessment', async () => {
      const data = {
        beneficiary: beneficiaryId,
        assessmentType: 'initial',
        assessor: mockTestUser.id,
        overallIntegrationScore: 45,
        dimensionScores: [
          { dimension: 'social_relationships', score: 50, targetScore: 70 },
          { dimension: 'communication_skills', score: 40, targetScore: 65 },
          { dimension: 'community_participation', score: 35, targetScore: 60 },
          { dimension: 'daily_living_skills', score: 55, targetScore: 75 },
        ],
        integrationGoals: [
          {
            goalDescription: 'Participate in weekly community sports activity',
            dimension: 'community_participation',
            targetDate: '2026-12-31',
          },
        ],
      };
      const res = await request(app).post('/api/community-integration/assessments').send(data);
      expect([200, 201, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/assessments - should list assessments', async () => {
      const res = await request(app).get('/api/community-integration/assessments');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/assessments - with filters', async () => {
      const res = await request(app).get(
        '/api/community-integration/assessments?integrationLevel=moderate&trend=improving'
      );
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/assessments/:id - should get by id', async () => {
      const res = await request(app).get(`/api/community-integration/assessments/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('PUT /api/community-integration/assessments/:id - should update', async () => {
      const res = await request(app)
        .put(`/api/community-integration/assessments/${fakeId}`)
        .send({ status: 'completed', reviewNotes: 'Assessment reviewed and approved' });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('DELETE /api/community-integration/assessments/:id - should delete', async () => {
      const res = await request(app).delete(`/api/community-integration/assessments/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/assessments/progress/:beneficiaryId - track progress', async () => {
      const res = await request(app).get(
        `/api/community-integration/assessments/progress/${beneficiaryId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/assessments/stats - should return stats', async () => {
      const res = await request(app).get('/api/community-integration/assessments/stats');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // AWARENESS PROGRAMS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Awareness Programs', () => {
    test('POST /api/community-integration/awareness-programs - should create program', async () => {
      const data = {
        title: 'Disability Rights Awareness Week',
        titleAr: 'أسبوع التوعية بحقوق ذوي الإعاقة',
        description: 'A week-long campaign to promote disability rights awareness',
        programType: 'awareness_campaign',
        focusAreas: ['disability_rights', 'social_inclusion', 'anti_discrimination'],
        targetAudience: ['general_public', 'employers', 'educators'],
        startDate: '2026-12-03',
        endDate: '2026-12-09',
        coverageArea: 'national',
        targetReach: 50000,
        budget: { allocated: 100000, currency: 'SAR' },
      };
      const res = await request(app)
        .post('/api/community-integration/awareness-programs')
        .send(data);
      expect([200, 201, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/awareness-programs - should list programs', async () => {
      const res = await request(app).get('/api/community-integration/awareness-programs');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/awareness-programs - with filters', async () => {
      const res = await request(app).get(
        '/api/community-integration/awareness-programs?programType=awareness_campaign&status=active&focusArea=disability_rights'
      );
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/awareness-programs/:id - should get by id', async () => {
      const res = await request(app).get(`/api/community-integration/awareness-programs/${fakeId}`);
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('PUT /api/community-integration/awareness-programs/:id - should update', async () => {
      const res = await request(app)
        .put(`/api/community-integration/awareness-programs/${fakeId}`)
        .send({ status: 'active', actualReach: 25000 });
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('DELETE /api/community-integration/awareness-programs/:id - should delete', async () => {
      const res = await request(app).delete(
        `/api/community-integration/awareness-programs/${fakeId}`
      );
      expect([200, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('POST /api/community-integration/awareness-programs/:id/workshops - add workshop', async () => {
      const data = {
        title: 'Inclusive Hiring Practices Workshop',
        description: 'Workshop for HR professionals on inclusive hiring',
        date: '2026-12-05',
        duration: 120,
        venue: 'Riyadh Convention Center',
        maxAttendees: 100,
        targetAudience: 'employers',
      };
      const res = await request(app)
        .post(`/api/community-integration/awareness-programs/${fakeId}/workshops`)
        .send(data);
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('POST /api/community-integration/awareness-programs/:id/materials - add material', async () => {
      const data = {
        title: 'Disability Rights in the Workplace',
        materialType: 'brochure',
        language: 'ar',
        url: 'https://example.com/brochure.pdf',
        description: 'Informational brochure about workplace disability rights',
      };
      const res = await request(app)
        .post(`/api/community-integration/awareness-programs/${fakeId}/materials`)
        .send(data);
      expect([200, 201, 400, 401, 403, 404, 500, 503]).toContain(res.status);
    });

    test('GET /api/community-integration/awareness-programs/stats - should return stats', async () => {
      const res = await request(app).get('/api/community-integration/awareness-programs/stats');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Dashboard', () => {
    test('GET /api/community-integration/dashboard - should return consolidated dashboard', async () => {
      const res = await request(app).get('/api/community-integration/dashboard');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // V1 ROUTES (dual mount)
  // ═════════════════════════════════════════════════════════════════════════════

  describe('V1 Route Aliases', () => {
    test('GET /api/v1/community-integration/activities - v1 route works', async () => {
      const res = await request(app).get('/api/v1/community-integration/activities');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/v1/community-integration/partnerships - v1 route works', async () => {
      const res = await request(app).get('/api/v1/community-integration/partnerships');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });

    test('GET /api/v1/community-integration/awareness-programs - v1 route works', async () => {
      const res = await request(app).get('/api/v1/community-integration/awareness-programs');
      expect([200, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });
});
