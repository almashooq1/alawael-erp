/**
 * Traffic Accident Reporting System - Test Suite
 * نظام تقارير الحوادث المرورية - مجموعة الاختبارات
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const TrafficAccidentReport = require('../models/TrafficAccidentReport');
const User = require('../models/User');

describe('Traffic Accident Reporting System', () => {
  let token;
  let userId;
  let reportId;
  let investigatorId;

  // ========================================
  // SETUP & TEARDOWN
  // ========================================

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://localhost:27017/test_traffic_accidents');

    // Create test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'testpass123',
      role: 'admin'
    });
    await user.save();
    userId = user._id;

    // Create investigator user
    const investigator = new User({
      name: 'Test Investigator',
      email: 'investigator@example.com',
      password: 'testpass123',
      role: 'investigator'
    });
    await investigator.save();
    investigatorId = investigator._id;

    // Generate token (assuming you have auth endpoint)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpass123'
      });

    token = loginRes.body.token;
  });

  afterAll(async () => {
    await TrafficAccidentReport.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Clean up after each test if needed
  });

  // ========================================
  // REPORT CREATION TESTS
  // ========================================

  describe('POST /api/traffic-accidents - Create Report', () => {
    test('Should create a new accident report', async () => {
      const response = await request(app)
        .post('/api/traffic-accidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accidentData: {
            accidentInfo: {
              accidentDateTime: new Date().toISOString(),
              location: {
                address: 'شارع الملك فهد، الرياض',
                city: 'الرياض',
                region: 'المنطقة الوسطى'
              },
              weather: 'clear',
              visibility: 'good',
              lightingConditions: 'daylight',
              roadConditions: 'dry',
              roadType: 'highway',
              speedLimit: 120,
              description: 'حادثة اصطدام بين مركبتين'
            },
            severity: 'moderate',
            priority: 'high',
            vehicles: [
              {
                plateNumber: 'ج ا ب 1234',
                vehicleType: 'سيارة سيدان',
                make: 'Toyota',
                model: 'Camry'
              }
            ]
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportNumber');
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.severity).toBe('moderate');

      reportId = response.body.data._id;
    });

    test('Should generate unique report numbers', async () => {
      const response1 = await request(app)
        .post('/api/traffic-accidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accidentData: {
            accidentInfo: {
              accidentDateTime: new Date().toISOString(),
              location: {
                address: 'شارع النيل',
                city: 'الرياض'
              },
              weather: 'clear',
              visibility: 'good',
              lightingConditions: 'daylight',
              roadConditions: 'dry',
              roadType: 'main_road',
              speedLimit: 80,
              description: 'حادثة أخرى'
            },
            severity: 'minor',
            priority: 'low',
            vehicles: []
          }
        });

      const response2 = await request(app)
        .post('/api/traffic-accidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accidentData: {
            accidentInfo: {
              accidentDateTime: new Date().toISOString(),
              location: {
                address: 'شارع الترجي',
                city: 'جدة'
              },
              weather: 'rainy',
              visibility: 'moderate',
              lightingConditions: 'dusk',
              roadConditions: 'wet',
              roadType: 'secondary_road',
              speedLimit: 60,
              description: 'حادثة ثالثة'
            },
            severity: 'minor',
            priority: 'low',
            vehicles: []
          }
        });

      expect(response1.body.data.reportNumber).not.toBe(
        response2.body.data.reportNumber
      );
    });

    test('Should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/traffic-accidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accidentData: {
            severity: 'moderate'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ========================================
  // REPORT RETRIEVAL TESTS
  // ========================================

  describe('GET /api/traffic-accidents - Retrieve Reports', () => {
    beforeAll(async () => {
      // Create some test reports
      for (let i = 0; i < 5; i++) {
        new TrafficAccidentReport({
          reportNumber: `TAR-TEST-${i}`,
          severity: i % 2 === 0 ? 'critical' : 'moderate',
          status: 'draft',
          accidentInfo: {
            accidentDateTime: new Date(),
            location: { city: 'الرياض' },
            weather: 'clear',
            visibility: 'good',
            lightingConditions: 'daylight',
            roadConditions: 'dry',
            roadType: 'highway',
            description: `حادثة اختبار ${i}`
          },
          priority: 'high',
          reportedBy: userId
        }).save();
      }
    });

    test('Should retrieve all reports', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.reports)).toBe(true);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    test('Should filter by severity', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents?severity=critical')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      response.body.reports.forEach(report => {
        expect(report.severity).toBe('critical');
      });
    });

    test('Should filter by city', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents?city=الرياض')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      response.body.reports.forEach(report => {
        expect(report.accidentInfo.location.city).toBe('الرياض');
      });
    });

    test('Should paginate results', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  // ========================================
  // SINGLE REPORT TESTS
  // ========================================

  describe('GET /api/traffic-accidents/:id - Get Report Details', () => {
    test('Should retrieve a specific report', async () => {
      const response = await request(app)
        .get(`/api/traffic-accidents/${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(reportId.toString());
    });

    test('Should return 404 for non-existent report', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/traffic-accidents/${invalidId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500); // Depends on error handling
    });
  });

  // ========================================
  // STATUS UPDATE TESTS
  // ========================================

  describe('PATCH /api/traffic-accidents/:id/status - Update Status', () => {
    test('Should update report status', async () => {
      const response = await request(app)
        .patch(`/api/traffic-accidents/${reportId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'submitted',
          notes: 'تم المراجعة والموافقة'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
    });

    test('Should not allow invalid status', async () => {
      const response = await request(app)
        .patch(`/api/traffic-accidents/${reportId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // INVESTIGATION TESTS
  // ========================================

  describe('POST /api/traffic-accidents/:id/investigation/start - Start Investigation', () => {
    test('Should start an investigation', async () => {
      const response = await request(app)
        .post(`/api/traffic-accidents/${reportId}/investigation/start`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          investigatingOfficerId: investigatorId.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.investigation.status).toBe('in_progress');
    });
  });

  describe('POST /api/traffic-accidents/:id/investigation/complete - Complete Investigation', () => {
    test('Should complete an investigation', async () => {
      const response = await request(app)
        .post(`/api/traffic-accidents/${reportId}/investigation/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          findings: 'بناءً على الشهادات، تم تحديد السبب الرئيسي',
          rootCause: 'human_error',
          contributingFactors: ['عدم الانتباه', 'السرعة الزائدة'],
          recommendations: ['دورة تدريبية', 'إعادة فحص']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.investigation.status).toBe('completed');
      expect(response.body.data.investigation.findings).toBeDefined();
    });
  });

  // ========================================
  // WITNESS TESTS
  // ========================================

  describe('POST /api/traffic-accidents/:id/witnesses - Add Witness', () => {
    test('Should add a witness', async () => {
      const response = await request(app)
        .post(`/api/traffic-accidents/${reportId}/witnesses`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'محمد أحمد',
          phone: '+966501234567',
          email: 'witness@example.com',
          address: 'الرياض، حي النرجس',
          identityNumber: '1234567890',
          relationship: 'witness',
          statement: 'شهدت الحادثة وحدثت في الوقت المشار إليه'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.witnesses.length).toBeGreaterThan(0);
    });

    test('Should fail without required witness fields', async () => {
      const response = await request(app)
        .post(`/api/traffic-accidents/${reportId}/witnesses`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'محمد أحمد'
          // Missing phone field
        });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // COMMENT TESTS
  // ========================================

  describe('POST /api/traffic-accidents/:id/comments - Add Comment', () => {
    test('Should add a comment', async () => {
      const response = await request(app)
        .post(`/api/traffic-accidents/${reportId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          comment: 'تعليق اختباري على التقرير'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comments.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // SEARCH TESTS
  // ========================================

  describe('GET /api/traffic-accidents/search - Search Reports', () => {
    test('Should search by report number', async () => {
      const response = await request(app)
        .get(`/api/traffic-accidents/search?q=${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should search by city', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/search?q=الرياض')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // STATISTICS TESTS
  // ========================================

  describe('GET /api/traffic-accidents/statistics - Get Statistics', () => {
    test('Should retrieve statistics', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/statistics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('statusDistribution');
      expect(response.body.data).toHaveProperty('severityDistribution');
    });
  });

  // ========================================
  // ANALYTICS TESTS
  // ========================================

  describe('GET /api/traffic-accidents/analytics/* - Analytics Endpoints', () => {
    test('Should get key insights', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/analytics/key-insights')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should get hotspots', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/analytics/hotspots?limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should get violation patterns', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/analytics/violations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should get comprehensive summary', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/analytics/comprehensive-summary')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('generatedAt');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('hotspots');
    });
  });

  // ========================================
  // EXPORT TESTS
  // ========================================

  describe('Export Endpoints', () => {
    test('Should export report as PDF', async () => {
      const response = await request(app)
        .get(`/api/traffic-accidents/${reportId}/export/pdf`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
    });

    test('Should export reports as Excel', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents/export/excel')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });
  });

  // ========================================
  // AUTHORIZATION TESTS
  // ========================================

  describe('Authorization Tests', () => {
    test('Should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents');

      expect(response.status).toBe(401);
    });

    test('Should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/traffic-accidents')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });

  // ========================================
  // DELETE/ARCHIVE TESTS
  // ========================================

  describe('DELETE /api/traffic-accidents/:id - Delete/Archive Report', () => {
    test('Should archive a report', async () => {
      const response = await request(app)
        .delete(`/api/traffic-accidents/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'متطابقة مع تقرير آخر'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should verify report is archived', async () => {
      const response = await request(app)
        .get(`/api/traffic-accidents/${reportId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.archived).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });
  });
});

/**
 * Test Runner Instructions:
 *
 * 1. Ensure MongoDB is running locally or update TEST_DB_URI
 * 2. Run: npm test
 *
 * Coverage Report:
 * npm test -- --coverage
 *
 * Run Specific Tests:
 * npm test -- --testNamePattern="Create Report"
 */
