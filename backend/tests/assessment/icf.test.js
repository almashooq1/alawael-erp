const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const ICFAssessment = require('../../models/assessment/ICFAssessmentLegacy');

// Test data
const testAssessment = {
  patient: new mongoose.Types.ObjectId(),
  assessor: new mongoose.Types.ObjectId(),
  coreSetType: 'rehab',
  scores: {
    'b110': { performance: 1, capacity: 0, environmental: 0 },
    'b114': { performance: 2, capacity: 1, environmental: 0 },
    'b117': { performance: 1, capacity: 1, environmental: 0 },
    'd440': { performance: 3, capacity: 2, environmental: -1 },
    'd510': { performance: 2, capacity: 1, environmental: 0 },
    'e110': { performance: 0, capacity: 0, environmental: 2 },
  },
  status: 'draft',
};

describe('ICF Assessment API', () => {
  let authToken;
  let createdAssessmentId;

  beforeAll(async () => {
    // Create test user and get auth token
    // This would normally involve creating a user and logging in
    authToken = 'test-token';
  });

  afterAll(async () => {
    await ICFAssessment.deleteMany({});
  });

  describe('POST /api/v1/assessment/icf', () => {
    it('should create a new assessment', async () => {
      const response = await request(app)
        .post('/api/v1/assessment/icf')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAssessment)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overallScore).toBeDefined();
      
      createdAssessmentId = response.body.data._id;
    });

    it('should validate required fields', async () => {
      const invalidAssessment = {
        coreSetType: 'rehab',
      };

      const response = await request(app)
        .post('/api/v1/assessment/icf')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAssessment)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/assessment/icf/patient/:patientId', () => {
    it('should get assessments for a patient', async () => {
      const response = await request(app)
        .get(`/api/v1/assessment/icf/patient/${testAssessment.patient}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/v1/assessment/icf/patient/${testAssessment.patient}?status=draft`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every(a => a.status === 'draft')).toBe(true);
    });
  });

  describe('GET /api/v1/assessment/icf/:id', () => {
    it('should get a specific assessment', async () => {
      const response = await request(app)
        .get(`/api/v1/assessment/icf/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(createdAssessmentId);
    });

    it('should return 404 for non-existent assessment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/assessment/icf/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/assessment/icf/:id', () => {
    it('should update an assessment', async () => {
      const updateData = {
        notes: 'Updated notes',
        scores: {
          ...testAssessment.scores,
          'b710': { performance: 2, capacity: 1, environmental: 0 },
        },
      };

      const response = await request(app)
        .put(`/api/v1/assessment/icf/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Updated notes');
    });
  });

  describe('POST /api/v1/assessment/icf/:id/submit', () => {
    it('should submit an assessment', async () => {
      const response = await request(app)
        .post(`/api/v1/assessment/icf/${createdAssessmentId}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });

    it('should reject incomplete assessment', async () => {
      // Create assessment with too few scores
      const incompleteAssessment = {
        ...testAssessment,
        scores: {
          'b110': { performance: 1, capacity: 0, environmental: 0 },
        },
      };

      const createResponse = await request(app)
        .post('/api/v1/assessment/icf')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteAssessment)
        .expect(201);

      const response = await request(app)
        .post(`/api/v1/assessment/icf/${createResponse.body.data._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/assessment/icf/patient/:patientId/progress', () => {
    it('should get progress data', async () => {
      const response = await request(app)
        .get(`/api/v1/assessment/icf/patient/${testAssessment.patient}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progressData).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
    });
  });

  describe('GET /api/v1/assessment/icf/stats/overview', () => {
    it('should get statistics', async () => {
      const response = await request(app)
        .get('/api/v1/assessment/icf/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('DELETE /api/v1/assessment/icf/:id', () => {
    it('should delete an assessment', async () => {
      const response = await request(app)
        .delete(`/api/v1/assessment/icf/${createdAssessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});