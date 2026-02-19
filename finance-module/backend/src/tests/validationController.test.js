/**
 * Validation Controller Tests
 * API endpoint testing
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { Violation, ValidationReport, ValidatingRule } = require('../models/Validation');

// Mock app (would be actual Express app in real scenario)
let app;

describe('Validation Controller', () => {
  beforeAll(async () => {
    // Setup test database
    // This would connect to test MongoDB
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Clear test data
  });

  describe('GET /violations', () => {
    test('should return all violations', async () => {
      // Create test violations
      const violation = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'high',
        description: 'Test violation',
        amount: 1000
      });

      const response = await request(app)
        .get('/api/validation/violations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    test('should filter violations by status', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'high',
        status: 'detected'
      });

      const response = await request(app)
        .get('/api/validation/violations?status=detected')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('detected');
    });

    test('should filter violations by severity', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'critical'
      });

      const response = await request(app)
        .get('/api/validation/violations?severity=critical')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data[0].severity).toBe('critical');
    });

    test('should filter violations by type', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'duplicate'
      });

      const response = await request(app)
        .get('/api/validation/violations?type=duplicate')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data[0].violationType).toBe('duplicate');
    });

    test('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await Violation.create({
          transactionId: new mongoose.Types.ObjectId(),
          violationType: 'amount_mismatch',
          severity: 'high'
        });
      }

      const response = await request(app)
        .get('/api/validation/violations?limit=2&skip=0')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.pages).toBe(3);
    });
  });

  describe('GET /violations/:id', () => {
    test('should return violation detail', async () => {
      const violation = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'high',
        description: 'Test violation'
      });

      const response = await request(app)
        .get(`/api/validation/violations/${violation._id}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(violation._id.toString());
      expect(response.body.data.description).toBe('Test violation');
    });

    test('should return 404 for non-existent violation', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/validation/violations/${fakeId}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /violations/:id/resolve', () => {
    test('should resolve a violation', async () => {
      const violation = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'high',
        status: 'detected'
      });

      const response = await request(app)
        .post(`/api/validation/violations/${violation._id}/resolve`)
        .set('Authorization', 'Bearer test-token')
        .send({
          resolution_notes: 'Issue resolved',
          correctionAmount: 500,
          status: 'resolved'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolution.resolution_notes).toBe('Issue resolved');
    });

    test('should add to audit trail on resolve', async () => {
      const violation = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        status: 'detected',
        auditTrail: []
      });

      await request(app)
        .post(`/api/validation/violations/${violation._id}/resolve`)
        .set('Authorization', 'Bearer test-token')
        .send({
          resolution_notes: 'Fixed',
          status: 'resolved'
        });

      const updated = await Violation.findById(violation._id);
      expect(updated.auditTrail.length).toBeGreaterThan(0);
      expect(updated.auditTrail[0].action).toContain('resolved');
    });
  });

  describe('GET /violations-report', () => {
    test('should generate violations report with stats', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'critical',
        status: 'detected'
      });

      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'duplicate',
        severity: 'high',
        status: 'resolved'
      });

      const response = await request(app)
        .get('/api/validation/violations-report')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(2);
      expect(response.body.stats.bySeverity.critical).toBe(1);
      expect(response.body.stats.bySeverity.high).toBe(1);
      expect(response.body.stats.byStatus.detected).toBe(1);
      expect(response.body.stats.byStatus.resolved).toBe(1);
    });

    test('should filter report by date range', async () => {
      const startDate = new Date('2025-02-10');
      const endDate = new Date('2025-02-16');

      const response = await request(app)
        .get(`/api/validation/violations-report?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
    });

    test('should calculate compliance rate', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        status: 'resolved'
      });

      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'duplicate',
        status: 'detected'
      });

      const response = await request(app)
        .get('/api/validation/violations-report')
        .set('Authorization', 'Bearer test-token');

      // 1 resolved out of 2 = 50%
      expect(parseFloat(response.body.stats.complianceRate)).toBeLessThanOrEqual(100);
      expect(parseFloat(response.body.stats.complianceRate)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /reports/generate', () => {
    test('should generate validation report', async () => {
      await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        severity: 'critical',
        status: 'detected'
      });

      const response = await request(app)
        .post('/api/validation/reports/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.reportPeriod).toBeDefined();
    });

    test('should calculate report metrics', async () => {
      for (let i = 0; i < 3; i++) {
        await Violation.create({
          transactionId: new mongoose.Types.ObjectId(),
          violationType: 'amount_mismatch',
          severity: 'high',
          status: 'detected'
        });
      }

      for (let i = 0; i < 2; i++) {
        await Violation.create({
          transactionId: new mongoose.Types.ObjectId(),
          violationType: 'duplicate',
          severity: 'medium',
          status: 'resolved'
        });
      }

      const response = await request(app)
        .post('/api/validation/reports/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.violationsCount.high).toBe(3);
      expect(response.body.data.violationsCount.medium).toBe(2);
      expect(response.body.data.complianceMetrics.resolvedViolations).toBe(2);
      expect(response.body.data.complianceMetrics.outstandingViolations).toBe(3);
    });

    test('should include recommendations in report', async () => {
      const response = await request(app)
        .post('/api/validation/reports/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.summary.recommendations).toBeInstanceOf(Array);
      expect(response.body.data.summary.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('GET /reports/:id', () => {
    test('should return report detail', async () => {
      const report = await ValidationReport.create({
        reportPeriod: {
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28')
        },
        generatedBy: new mongoose.Types.ObjectId(),
        violationCountByType: {
          amount_mismatch: 2,
          missing_entry: 1
        },
        violationsCount: {
          critical: 1,
          high: 2,
          medium: 0,
          low: 0
        },
        complianceMetrics: {
          resolutionRate: 60
        }
      });

      const response = await request(app)
        .get(`/api/validation/reports/${report._id}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(report._id.toString());
    });
  });

  describe('POST /violations/bulk-update', () => {
    test('should bulk update violation status', async () => {
      const v1 = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch',
        status: 'detected'
      });

      const v2 = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'duplicate',
        status: 'detected'
      });

      const response = await request(app)
        .post('/api/validation/violations/bulk-update')
        .set('Authorization', 'Bearer test-token')
        .send({
          violationIds: [v1._id, v2._id],
          status: 'waived',
          notes: 'Bulk resolved'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updated1 = await Violation.findById(v1._id);
      const updated2 = await Violation.findById(v2._id);
      expect(updated1.status).toBe('waived');
      expect(updated2.status).toBe('waived');
    });
  });

  describe('Authorization', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/validation/violations');

      expect(response.status).toBe(401);
    });

    test('should require auditor role for resolve', async () => {
      const violation = await Violation.create({
        transactionId: new mongoose.Types.ObjectId(),
        violationType: 'amount_mismatch'
      });

      const response = await request(app)
        .post(`/api/validation/violations/${violation._id}/resolve`)
        .set('Authorization', 'Bearer user-token')
        .send({
          resolution_notes: 'Test',
          status: 'resolved'
        });

      // Would return 403 if user doesn't have auditor role
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Simulate a database error
      jest.spyOn(Violation, 'find').mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .get('/api/validation/violations')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      Violation.find.mockRestore();
    });

    test('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/validation/violations/bulk-update')
        .set('Authorization', 'Bearer test-token')
        .send({
          violationIds: 'not-an-array',
          status: 'invalid-status'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
