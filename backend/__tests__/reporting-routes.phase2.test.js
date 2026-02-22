/**
 * Reporting Routes Comprehensive Test Suite - Phase 2
 * Tests for advanced report generation and analytics
 * Target: Improve from 41.3% to 60%+ coverage
 */

const request = require('supertest');
const app = require('../server');

// Mock reporting service
jest.mock('../services/advancedReportingService', () => {
  return {
    generateReport: jest.fn((type, options) => {
      return {
        _id: `report_${Date.now()}`,
        type: type || 'summary',
        name: `${type || 'Report'} Report`,
        data: { totalTransactions: 150, totalAmount: 50000, ...((options && options.data) || {}) },
        generatedAt: new Date(),
        status: 'completed',
        charts: (options && options.chartTypes) ? { types: options.chartTypes } : undefined,
        comparison: (options && options.compareWith) ? { compareWith: options.compareWith } : undefined,
        ...options,
      };
    }),
    getReports: jest.fn(() => [
      {
        _id: 'report1',
        name: 'January Report',
        type: 'summary',
        status: 'completed',
      },
    ]),
    scheduleReport: jest.fn((templateId, frequency, recipients) => ({
      _id: `sched_${Date.now()}`,
      templateId,
      reportId: `report_${Date.now()}`,
      frequency,
      recipients: recipients || [],
      nextRun: new Date(),
    })),
    exportReport: jest.fn((reportId, format) => ({
      success: true,
      format: format || 'pdf',
      fileSize: 2048000,
      contentType: {
        pdf: 'application/pdf',
        excel: 'application/vnd.ms-excel',
        csv: 'text/csv',
        json: 'application/json',
      }[format || 'pdf'],
    })),
    getReportMetrics: jest.fn(() => ({
      totalReports: 50,
      totalGenerated: 500,
      avgGenerationTime: 250,
      mostUsedMetric: 'revenue',
    })),
  };
});


// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  },
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', name: 'Test User', role: 'admin' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden' });
      }
    },
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => next(),
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => next(),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Reporting Routes - Phase 2 Coverage', () => {
  describe('Report Generation', () => {
    it('should generate summary report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 1,
          year: 2026,
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.report).toHaveProperty('_id');
      expect(res.body.report.type).toBe('summary');
    });

    it('should generate detailed report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'detailed',
          period: 'quarterly',
          quarter: 1,
          year: 2026,
        })
        .expect(201);

      expect(res.body.report.type).toBe('detailed');
    });

    it('should generate analytics report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'analytics',
          metrics: ['revenue', 'expenses', 'profit'],
          period: 'yearly',
          year: 2026,
        })
        .expect(201);

      expect(res.body.report).toHaveProperty('data');
    });

    it('should generate custom report with filters', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'custom',
          filters: {
            department: 'sales',
            region: 'north',
            minAmount: 1000,
          },
          metrics: ['total', 'average', 'count'],
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
    });

    it('should include charts in report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 1,
          year: 2026,
          includeCharts: true,
          chartTypes: ['bar', 'pie', 'line'],
        })
        .expect(201);

      expect(res.body.report).toHaveProperty('charts');
    });

    it('should generate report with comparison', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'comparison',
          compareWith: 'previous_period',
          period: 'monthly',
          month: 2,
          year: 2026,
        })
        .expect(201);

      expect(res.body.report).toHaveProperty('comparison');
    });

    it('should handle report generation errors', async () => {
      const reportService = require('../services/advancedReportingService');
      reportService.generateReport.mockImplementationOnce(() => {
        throw new Error('Generation failed');
      });

      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 1,
          year: 2026,
        })
        .expect(500);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          // Missing period
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Report Retrieval', () => {
    it('should get all reports', async () => {
      const res = await request(app).get('/api/reports').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('should get reports with pagination', async () => {
      const res = await request(app).get('/api/reports?page=1&limit=10').expect(200);

      expect(res.body.reports).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter reports by type', async () => {
      const res = await request(app).get('/api/reports?type=summary').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should filter reports by status', async () => {
      const res = await request(app).get('/api/reports?status=completed').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should search reports by name', async () => {
      const res = await request(app).get('/api/reports/search?q=sales').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should get single report by ID', async () => {
      const res = await request(app).get('/api/reports/report123').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.report).toHaveProperty('_id');
    });

    it('should sort reports by date', async () => {
      const res = await request(app).get('/api/reports?sort=-generatedAt').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should get report statistics', async () => {
      const res = await request(app).get('/api/reports/statistics').expect(200);

      expect(res.body).toHaveProperty('totalReports');
      expect(res.body).toHaveProperty('totalGenerated');
    });
  });

  describe('Report Scheduling', () => {
    it('should schedule report generation', async () => {
      const res = await request(app)
        .post('/api/reports/schedule')
        .send({
          reportType: 'summary',
          frequency: 'monthly',
          dayOfMonth: 1,
          time: '08:00',
          recipients: ['admin@example.com'],
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.schedule).toHaveProperty('_id');
    });

    it('should schedule weekly reports', async () => {
      const res = await request(app)
        .post('/api/reports/schedule')
        .send({
          reportType: 'analytics',
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          time: '09:00',
          recipients: ['team@example.com'],
        })
        .expect(201);

      expect(res.body.schedule).toBeDefined();
    });

    it('should schedule daily reports', async () => {
      const res = await request(app)
        .post('/api/reports/schedule')
        .send({
          reportType: 'summary',
          frequency: 'daily',
          time: '06:00',
          recipients: ['manager@example.com'],
        })
        .expect(201);

      expect(res.body.schedule).toBeDefined();
    });

    it('should get scheduled reports', async () => {
      const res = await request(app).get('/api/reports/scheduled').expect(200);

      expect(Array.isArray(res.body.schedules)).toBe(true);
    });

    it('should update scheduled report', async () => {
      const res = await request(app)
        .put('/api/reports/schedule/sched123')
        .send({
          frequency: 'weekly',
          recipients: ['newemail@example.com'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should delete scheduled report', async () => {
      const res = await request(app).delete('/api/reports/schedule/sched123').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should pause/resume schedule', async () => {
      const res = await request(app).patch('/api/reports/schedule/sched123/pause').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Report Export', () => {
    it('should export report as PDF', async () => {
      const res = await request(app).get('/api/reports/report123/export/pdf').expect(200);

      expect(res.type).toContain('application/pdf');
    });

    it('should export report as Excel', async () => {
      const res = await request(app).get('/api/reports/report123/export/excel').expect(200);

      expect(res.type).toContain('application/vnd.ms-excel');
    });

    it('should export report as CSV', async () => {
      const res = await request(app).get('/api/reports/report123/export/csv').expect(200);

      expect(res.type).toContain('text/csv');
    });

    it('should export report as JSON', async () => {
      const res = await request(app).get('/api/reports/report123/export/json').expect(200);

      expect(res.type).toContain('application/json');
    });

    it('should export multiple reports', async () => {
      const res = await request(app)
        .post('/api/reports/export-bulk')
        .send({
          reportIds: ['report1', 'report2', 'report3'],
          format: 'zip',
        })
        .expect(200);

      expect(res.type).toContain('application/zip');
    });

    it('should email exported report', async () => {
      const res = await request(app)
        .post('/api/reports/report123/email')
        .send({
          recipients: ['user@example.com'],
          format: 'pdf',
          subject: 'Monthly Report',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should schedule automated exports', async () => {
      const res = await request(app)
        .post('/api/reports/report123/schedule-export')
        .send({
          format: 'pdf',
          frequency: 'monthly',
          recipients: ['recipient@example.com'],
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Report Filtering & Sorting', () => {
    it('should filter by date range', async () => {
      const res = await request(app).get('/api/reports?from=2026-01-01&to=2026-02-10').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should filter by department', async () => {
      const res = await request(app).get('/api/reports?department=sales').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should filter by region', async () => {
      const res = await request(app).get('/api/reports?region=north').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should apply multiple filters', async () => {
      const res = await request(app)
        .get('/api/reports?department=sales&region=north&type=summary')
        .expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should sort by generation date', async () => {
      const res = await request(app).get('/api/reports?sort=-generatedAt').expect(200);

      expect(res.body.reports).toBeDefined();
    });

    it('should sort by name', async () => {
      const res = await request(app).get('/api/reports?sort=name').expect(200);

      expect(res.body.reports).toBeDefined();
    });
  });

  describe('Report Analytics', () => {
    it('should get report metrics', async () => {
      const res = await request(app).get('/api/reports/metrics').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.metrics).toBeDefined();
    });

    it('should get most used report types', async () => {
      const res = await request(app).get('/api/reports/analytics/top-types').expect(200);

      expect(res.body).toHaveProperty('types');
    });

    it('should get report performance stats', async () => {
      const res = await request(app).get('/api/reports/analytics/performance').expect(200);

      expect(res.body).toHaveProperty('avgGenerationTime');
      expect(res.body).toHaveProperty('successRate');
    });

    it('should get report usage trends', async () => {
      const res = await request(app).get('/api/reports/analytics/trends').expect(200);

      expect(res.body).toHaveProperty('trends');
    });

    it('should get most accessed reports', async () => {
      const res = await request(app).get('/api/reports/analytics/most-accessed').expect(200);

      expect(res.body).toHaveProperty('reports');
    });
  });

  describe('Report Sharing', () => {
    it('should share report with user', async () => {
      const res = await request(app)
        .post('/api/reports/report123/share')
        .send({
          email: 'colleague@example.com',
          permissions: 'view',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should generate public share link', async () => {
      const res = await request(app)
        .post('/api/reports/report123/share-link')
        .send({
          expiresIn: 7, // Days
          permissions: 'view',
        })
        .expect(201);

      expect(res.body).toHaveProperty('shareLink');
    });

    it('should get shared reports', async () => {
      const res = await request(app).get('/api/reports/shared-with-me').expect(200);

      expect(Array.isArray(res.body.reports)).toBe(true);
    });

    it('should revoke share access', async () => {
      const res = await request(app).delete('/api/reports/report123/share/user456').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should update share permissions', async () => {
      const res = await request(app)
        .patch('/api/reports/report123/share')
        .send({
          userId: 'user456',
          permissions: 'edit',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Report Management', () => {
    it('should delete report', async () => {
      const res = await request(app).delete('/api/reports/report123').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should archive report', async () => {
      const res = await request(app).patch('/api/reports/report123/archive').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should restore archived report', async () => {
      const res = await request(app).patch('/api/reports/report123/restore').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should rename report', async () => {
      const res = await request(app)
        .patch('/api/reports/report123/rename')
        .send({
          name: 'Q1 2026 Income Report',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should duplicate report configuration', async () => {
      const res = await request(app)
        .post('/api/reports/report123/duplicate')
        .send({
          newName: 'Q2 2026 Income Report',
        })
        .expect(201);

      expect(res.body.report).toHaveProperty('_id');
    });

    it('should add tags to report', async () => {
      const res = await request(app)
        .patch('/api/reports/report123/tags')
        .send({
          tags: ['quarterly', 'important', 'financial'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should add comments to report', async () => {
      const res = await request(app)
        .post('/api/reports/report123/comments')
        .send({
          comment: 'Please review these figures',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Report Error Handling', () => {
    it('should handle missing report', async () => {
      const res = await request(app).get('/api/reports/nonexistent').expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle database errors', async () => {
      const reportService = require('../services/advancedReportingService');
      reportService.getReports.mockImplementationOnce(() => {
        throw new Error('DB Error');
      });

      const res = await request(app).get('/api/reports').expect(500);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should log report operations', async () => {
      const logger = require('../utils/logger');

      await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 1,
          year: 2026,
        })
        .expect(201);

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('Report Edge Cases', () => {
    it('should handle concurrent report generation', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/reports/generate')
            .send({
              type: 'summary',
              period: 'monthly',
              month: 1 + i,
              year: 2026,
            })
        );
      }

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      });
    });

    it('should handle very large reports', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'detailed',
          period: 'yearly',
          year: 2026,
          includeCharts: true,
          deepAnalysis: true,
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
    });

    it('should handle empty result sets in reports', async () => {
      const reportService = require('../services/advancedReportingService');
      reportService.generateReport.mockResolvedValueOnce({
        _id: 'report123',
        name: 'Empty Report',
        data: [],
        status: 'completed',
      });

      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 3,
          year: 2026,
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
    });

    it('should handle special characters in report names', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .send({
          type: 'summary',
          period: 'monthly',
          month: 1,
          year: 2026,
          customName: 'Q1 2026 - ربع السنة الأول/Financial Report',
        })
        .expect(201);

      expect(res.body.report).toBeDefined();
    });
  });
});
