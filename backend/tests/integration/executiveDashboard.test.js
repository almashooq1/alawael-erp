/**
 * Executive Dashboard Integration Tests
 * Comprehensive test suite for all dashboard services
 */

const request = require('supertest');
const expect = require('chai').expect;

describe('Executive Dashboard Integration Tests', () => {
  // Mock data
  const mockKPI = {
    name: 'Revenue',
    name_ar: 'الإيرادات',
    category: 'Financial',
    description: 'Monthly revenue in USD',
    target: 100000,
    current: 95000,
    unit: 'USD',
    owner: 'CFO',
    frequency: 'Monthly',
  };

  const mockAlertRule = {
    name: 'Revenue Alert',
    condition: 'below',
    threshold: 80000,
    severity: 'critical',
    notifyUsers: ['admin@company.com'],
    notifyChannels: ['email', 'in-app'],
  };

  describe('Executive Analytics Service', () => {
    it('should create a KPI', function (done) {
      request(app)
        .post('/api/executive-dashboard/kpis')
        .send(mockKPI)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          expect(res.body.name).to.equal('Revenue');
          done();
        });
    });

    it('should retrieve all KPIs', function (done) {
      request(app)
        .get('/api/executive-dashboard/kpis')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should get KPI details with analytics', function (done) {
      request(app)
        .get(`/api/executive-dashboard/kpis/${validKPIId}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('history');
          expect(res.body).to.have.property('forecast');
          expect(res.body).to.have.property('insights');
          done();
        });
    });

    it('should update KPI value', function (done) {
      request(app)
        .post(`/api/executive-dashboard/kpis/${validKPIId}/update`)
        .send({ value: 98000 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.current).to.equal(98000);
          done();
        });
    });

    it('should generate executive dashboard summary', function (done) {
      request(app)
        .get('/api/executive-dashboard')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('totalKPIs');
          expect(res.body).to.have.property('statusDistribution');
          expect(res.body).to.have.property('riskLevel');
          done();
        });
    });

    it('should get department comparison', function (done) {
      request(app)
        .get('/api/executive-dashboard/departments')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('category');
            expect(res.body[0]).to.have.property('kpis');
          }
          done();
        });
    });

    it('should generate executive report', function (done) {
      request(app)
        .get('/api/executive-dashboard/report')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('title');
          expect(res.body).to.have.property('summary');
          expect(res.body).to.have.property('recommendations');
          done();
        });
    });
  });

  describe('AI Insights Service', () => {
    it('should detect anomalies in KPI data', function (done) {
      request(app)
        .post('/api/executive-dashboard/ai-insights/anomalies')
        .send({ kpiId: validKPIId })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('anomalies');
          done();
        });
    });

    it('should generate AI insights', function (done) {
      request(app)
        .get('/api/executive-dashboard/ai-insights')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('type');
            expect(res.body[0]).to.have.property('message');
            expect(res.body[0]).to.have.property('severity');
          }
          done();
        });
    });

    it('should get AI-powered briefing', function (done) {
      request(app)
        .get('/api/executive-dashboard/ai-briefing')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('summary');
          expect(res.body).to.have.property('alerts');
          expect(res.body).to.have.property('recommendations');
          done();
        });
    });

    it('should generate trend analysis', function (done) {
      request(app)
        .post('/api/executive-dashboard/ai-insights/trend')
        .send({ kpiId: validKPIId })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('trend');
          expect(res.body).to.have.property('slope');
          expect(res.body).to.have.property('forecast');
          done();
        });
    });
  });

  describe('Real-time Dashboard Service', () => {
    it('should fetch real-time data', function (done) {
      request(app)
        .get('/api/executive-dashboard/realtime')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('sources');
          expect(res.body.sources).to.be.an('array');
          done();
        });
    });

    it('should provide aggregated dashboard data', function (done) {
      request(app)
        .get('/api/executive-dashboard/realtime/aggregated')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('financial');
          expect(res.body).to.have.property('operational');
          done();
        });
    });
  });

  describe('KPI Alert Service', () => {
    let createdRuleId;

    it('should create alert rule', function (done) {
      request(app)
        .post(`/api/executive-dashboard/kpis/${validKPIId}/alerts`)
        .send(mockAlertRule)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          createdRuleId = res.body.id;
          done();
        });
    });

    it('should retrieve alert rules for KPI', function (done) {
      request(app)
        .get(`/api/executive-dashboard/kpis/${validKPIId}/alerts`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should update alert rule', function (done) {
      request(app)
        .put(`/api/executive-dashboard/kpis/${validKPIId}/alerts/${createdRuleId}`)
        .send({ severity: 'warning' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.severity).to.equal('warning');
          done();
        });
    });

    it('should delete alert rule', function (done) {
      request(app)
        .delete(`/api/executive-dashboard/kpis/${validKPIId}/alerts/${createdRuleId}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should trigger alert when KPI violates condition', function (done) {
      // Update KPI to trigger alert
      request(app)
        .post(`/api/executive-dashboard/kpis/${validKPIId}/update`)
        .send({ value: 70000 })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('alerts');
          done();
        });
    });
  });

  describe('Dashboard Search Service', () => {
    it('should search KPIs by name', function (done) {
      request(app)
        .get('/api/executive-dashboard/search')
        .query({ query: 'Revenue' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should apply filters to KPIs', function (done) {
      request(app)
        .get('/api/executive-dashboard/search/filter')
        .query({
          categories: 'Financial',
          statuses: 'critical',
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should get search suggestions', function (done) {
      request(app)
        .get('/api/executive-dashboard/search/suggestions')
        .query({ query: 'Rev' })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should save search preset', function (done) {
      request(app)
        .post('/api/executive-dashboard/search/save')
        .send({
          name: 'Critical KPIs',
          query: 'status:critical',
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          done();
        });
    });
  });

  describe('Dashboard Export Service', () => {
    it('should export dashboard to PDF', function (done) {
      request(app)
        .get('/api/executive-dashboard/export/pdf')
        .expect(200)
        .expect('Content-Type', /application\/pdf/)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should export dashboard to Excel', function (done) {
      request(app)
        .get('/api/executive-dashboard/export/excel')
        .expect(200)
        .expect('Content-Type', /application\/vnd.openxmlformats/)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should export dashboard to CSV', function (done) {
      request(app)
        .get('/api/executive-dashboard/export/csv')
        .expect(200)
        .expect('Content-Type', /text\/csv/)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should generate email report', function (done) {
      request(app)
        .post('/api/executive-dashboard/export/email')
        .send({
          recipients: ['executive@company.com'],
          format: 'pdf',
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('status');
          done();
        });
    });
  });

  describe('Dashboard Performance Service', () => {
    it('should report cache statistics', function (done) {
      request(app)
        .get('/api/executive-dashboard/performance/cache')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('hits');
          expect(res.body).to.have.property('misses');
          expect(res.body).to.have.property('hitRate');
          done();
        });
    });

    it('should report performance metrics', function (done) {
      request(app)
        .get('/api/executive-dashboard/performance/metrics')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('avgDuration');
          expect(res.body).to.have.property('successRate');
          done();
        });
    });

    it('should get slow queries', function (done) {
      request(app)
        .get('/api/executive-dashboard/performance/slow-queries')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should get dashboard health report', function (done) {
      request(app)
        .get('/api/executive-dashboard/performance/health')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('cache');
          expect(res.body).to.have.property('performance');
          done();
        });
    });
  });

  describe('Dashboard Widget Management', () => {
    it('should create custom dashboard', function (done) {
      request(app)
        .post('/api/executive-dashboard/dashboards')
        .send({
          name: 'Financial Dashboard',
          widgets: ['revenue', 'expenses', 'profit'],
        })
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.have.property('id');
          expect(res.body.name).to.equal('Financial Dashboard');
          done();
        });
    });

    it('should retrieve custom dashboards', function (done) {
      request(app)
        .get('/api/executive-dashboard/dashboards')
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should update dashboard widgets', function (done) {
      request(app)
        .put(`/api/executive-dashboard/dashboards/${validDashboardId}`)
        .send({
          widgets: ['revenue', 'expenses', 'profit', 'forecast'],
        })
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          expect(res.body.widgets).to.include('forecast');
          done();
        });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject request without authentication token', function (done) {
      request(app)
        .get('/api/executive-dashboard')
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should allow request with valid token', function (done) {
      request(app)
        .get('/api/executive-dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid KPI ID', function (done) {
      request(app)
        .get('/api/executive-dashboard/kpis/invalid-id')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });

    it('should return validation error for incomplete data', function (done) {
      request(app)
        .post('/api/executive-dashboard/kpis')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Test' }) // Missing required fields
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          done();
        });
    });
  });
});

module.exports = {
  mockKPI,
  mockAlertRule,
};
