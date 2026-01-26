/**
 * Integration Tests for Disability Rehabilitation API
 * Jest + Supertest Integration Test Suite
 */

const request = require('supertest');

// Force test-friendly settings before loading the app
process.env.SMART_TEST_MODE = process.env.SMART_TEST_MODE || 'true';
process.env.USE_MOCK_DB = process.env.USE_MOCK_DB || 'true';

const app = require('../server');
const DisabilityRehabilitation = require('../models/disability-rehabilitation.model');

// Test data
const validProgramData = {
  program_info: {
    name_ar: 'برنامج تأهيل تجريبي',
    name_en: 'Test Rehabilitation Program',
    start_date: new Date(),
    status: 'active',
    severity: 'moderate',
  },
  beneficiary: {
    id: 'BENE0001',
    name_ar: 'مستفيد اختبار',
    name_en: 'Test Beneficiary',
    date_of_birth: new Date(2000, 0, 1),
  },
  disability_info: {
    primary_disability: 'physical',
    severity_level: 'moderate',
  },
  rehabilitation_goals: [
    {
      category: 'mobility',
      description_ar: 'تحسين القدرات الحركية',
      target_date: new Date(),
      priority: 'high',
    },
  ],
  rehabilitation_services: [
    {
      type: 'physiotherapy',
      frequency: 'weekly',
      duration_per_session_minutes: 60,
      start_date: new Date(),
    },
  ],
};

const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

describe('Disability Rehabilitation API Integration Tests', () => {
  let createdProgramId;

  beforeAll(async () => {
    // Connect to test database
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    try {
      // Add timeout and connection check to prevent buffering issues
      if (
        DisabilityRehabilitation.collection &&
        DisabilityRehabilitation.collection.conn.readyState === 1
      ) {
        await Promise.race([
          DisabilityRehabilitation.deleteMany({}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), 5000)),
        ]);
      }
    } catch (err) {
      console.warn('Cleanup warning (non-blocking):', err.message);
      // Continue anyway - don't fail tests due to cleanup
    }
  }, 10000);

  describe('POST /api/disability-rehabilitation/programs', () => {
    it('should create a new program', async () => {
      const res = await request(app)
        .post('/api/disability-rehabilitation/programs')
        .set('Authorization', mockToken)
        .send(validProgramData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBeDefined();
      createdProgramId = res.body.data._id;
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/disability-rehabilitation/programs')
        .set('Authorization', mockToken)
        .send({ program_info: {} })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/disability-rehabilitation/programs')
        .send(validProgramData)
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/disability-rehabilitation/programs', () => {
    it('should retrieve all programs', async () => {
      const res = await request(app)
        .get('/api/disability-rehabilitation/programs')
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter programs by disability type', async () => {
      const res = await request(app)
        .get('/api/disability-rehabilitation/programs?disability_type=physical')
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      if (res.body.data.length > 0) {
        res.body.data.forEach(program => {
          expect(program.disability_info.primary_disability).toBe('physical');
        });
      }
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/disability-rehabilitation/programs?page=1&limit=5')
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/disability-rehabilitation/programs/:id', () => {
    it('should retrieve a specific program', async () => {
      const res = await request(app)
        .get(`/api/disability-rehabilitation/programs/${createdProgramId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdProgramId);
    });

    it('should return 404 for non-existent program', async () => {
      const res = await request(app)
        .get('/api/disability-rehabilitation/programs/invalidId')
        .set('Authorization', mockToken)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/disability-rehabilitation/programs/:id', () => {
    it('should update a program', async () => {
      const updateData = {
        program_info: {
          name_ar: 'برنامج محدث',
          status: 'in_progress',
        },
      };

      const res = await request(app)
        .put(`/api/disability-rehabilitation/programs/${createdProgramId}`)
        .set('Authorization', mockToken)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.program_info.name_ar).toBe('برنامج محدث');
    });
  });

  describe('POST /api/disability-rehabilitation/programs/:id/sessions', () => {
    it('should add a therapy session', async () => {
      const sessionData = {
        session_date: new Date(),
        duration_minutes: 60,
        type: 'individual',
        attendance: 'present',
        notes: 'جلسة ناجحة',
      };

      const res = await request(app)
        .post(`/api/disability-rehabilitation/programs/${createdProgramId}/sessions`)
        .set('Authorization', mockToken)
        .send(sessionData)
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/disability-rehabilitation/programs/:id/goals/:goalId', () => {
    it('should update goal status', async () => {
      // First, get the program to extract goal ID
      const getRes = await request(app)
        .get(`/api/disability-rehabilitation/programs/${createdProgramId}`)
        .set('Authorization', mockToken);

      const goalId = getRes.body.data.rehabilitation_goals[0].goal_id;

      const res = await request(app)
        .put(`/api/disability-rehabilitation/programs/${createdProgramId}/goals/${goalId}`)
        .set('Authorization', mockToken)
        .send({
          status: 'in_progress',
          progress_percentage: 50,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/disability-rehabilitation/programs/:id/assessments', () => {
    it('should add an assessment', async () => {
      const assessmentData = {
        assessment_date: new Date(),
        type: 'initial_assessment',
        assessor_name: 'محقق تقييم',
        findings: 'نتائج التقييم',
        recommendations: 'التوصيات',
        overall_score: 75,
      };

      const res = await request(app)
        .post(`/api/disability-rehabilitation/programs/${createdProgramId}/assessments`)
        .set('Authorization', mockToken)
        .send(assessmentData)
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/disability-rehabilitation/statistics', () => {
    it('should retrieve system statistics', async () => {
      const res = await request(app)
        .get('/api/disability-rehabilitation/statistics')
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/disability-rehabilitation/performance/:year/:month', () => {
    it('should retrieve monthly performance', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const res = await request(app)
        .get(`/api/disability-rehabilitation/performance/${year}/${month}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/disability-rehabilitation/programs/:id/complete', () => {
    it('should complete a program', async () => {
      const res = await request(app)
        .put(`/api/disability-rehabilitation/programs/${createdProgramId}/complete`)
        .set('Authorization', mockToken)
        .send({ completion_notes: 'البرنامج مكتمل بنجاح' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/disability-rehabilitation/programs/:id', () => {
    it('should delete a program (admin only)', async () => {
      // Create a temporary program to delete
      const createRes = await request(app)
        .post('/api/disability-rehabilitation/programs')
        .set('Authorization', mockToken)
        .send(validProgramData)
        .expect(201);

      const programId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/disability-rehabilitation/programs/${programId}`)
        .set('Authorization', mockToken)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
