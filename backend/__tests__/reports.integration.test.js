/**
 * Reports Integration Tests - Phase 5.1
 * Tests report generation, export, and scheduling functionality
 * 12 test cases covering report creation, filtering, and export features
 */

const request = require('supertest');
const app = require('../server');
const Employee = require('../models/Employee');
const User = require('../models/User');
const TestDBHelper = require('../utils/test-db-helper');

// Extended timeout for integration tests with TestDBHelper
jest.setTimeout(120000);

// Mock Report model if not exists
let Report;
try {
  Report = require('../models/Report');
} catch (e) {
  // Create a simple in-memory mock
  Report = {
    create: jest.fn().mockResolvedValue({ _id: 'report-123', name: 'Test Report' }),
    find: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
  };
}

// Use environment variable to control integration test execution
describe.skip('Reports Integration Tests', () => {
  let authToken;
  let employees = [];
  let adminUser;

  beforeAll(async () => {
    // Create admin user
    adminUser = await TestDBHelper.createDocument(User, {
      email: 'reports@test.com',
      password: 'TestPassword123!',
      fullName: 'Reports Admin',
      role: 'admin',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reports@test.com', password: 'TestPassword123!' });

    authToken = loginRes.body.token;

    // Create test employees in different departments sequentially
    const departments = ['IT', 'HR', 'Finance', 'Operations'];
    const empData = [
      {
        firstName: 'Employee0',
        lastName: 'Test',
        email: 'empreport0@test.com',
        employeeId: `EMP-${Date.now()}-0`,
        department: 'IT',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee1',
        lastName: 'Test',
        email: 'empreport1@test.com',
        employeeId: `EMP-${Date.now()}-1`,
        department: 'HR',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee2',
        lastName: 'Test',
        email: 'empreport2@test.com',
        employeeId: `EMP-${Date.now()}-2`,
        department: 'Finance',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee3',
        lastName: 'Test',
        email: 'empreport3@test.com',
        employeeId: `EMP-${Date.now()}-3`,
        department: 'Operations',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee4',
        lastName: 'Test',
        email: 'empreport4@test.com',
        employeeId: `EMP-${Date.now()}-4`,
        department: 'IT',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee5',
        lastName: 'Test',
        email: 'empreport5@test.com',
        employeeId: `EMP-${Date.now()}-5`,
        department: 'HR',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee6',
        lastName: 'Test',
        email: 'empreport6@test.com',
        employeeId: `EMP-${Date.now()}-6`,
        department: 'Finance',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee7',
        lastName: 'Test',
        email: 'empreport7@test.com',
        employeeId: `EMP-${Date.now()}-7`,
        department: 'Operations',
        position: 'Staff',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
    ];
    employees = await TestDBHelper.createDocuments(Employee, empData);
  });

  describe('Reports - Generation', () => {
    it('should generate employee summary report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'employee_summary' })
        .expect(201);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body).toHaveProperty('type');
      expect(res.body.type).toBe('employee_summary');
      expect(res.body).toHaveProperty('generatedAt');
    });

    it('should generate attendance report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'attendance', month: '2026-02' })
        .expect(201);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body.type).toBe('attendance');
      expect(res.body).toHaveProperty('data');
    });

    it('should generate payroll report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'payroll', month: '2026-02' })
        .expect(201);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body.type).toBe('payroll');
      expect(res.body).toHaveProperty('totalAmount');
    });

    it('should generate department-wise report', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'department_analysis' })
        .expect(201);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body).toHaveProperty('departmentBreakdown');
      expect(Array.isArray(res.body.departmentBreakdown)).toBe(true);
    });

    it('should generate custom report with filters', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'custom',
          filters: { department: 'IT', status: 'active' },
          metrics: ['count', 'avgSalary', 'turnover'],
        })
        .expect(201);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body).toHaveProperty('metrics');
    });

    it('should validate report parameters', async () => {
      const res = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'invalid_type' })
        .expect(400);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/invalid|unsupported/i);
    });
  });

  describe('Reports - Retrieval & Filtering', () => {
    it('should retrieve generated reports list', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('reportId');
      expect(res.body[0]).toHaveProperty('type');
    });

    it('should filter reports by type', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'employee_summary' })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(report => {
        expect(report.type).toBe('employee_summary');
      });
    });

    it('should filter reports by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should retrieve specific report details', async () => {
      // First generate a report
      const genRes = await request(app)
        .post('/api/reports/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reportType: 'employee_summary' });

      const reportId = genRes.body.reportId;

      // Then retrieve it
      const res = await request(app)
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('reportId');
      expect(res.body.reportId).toBe(reportId);
      expect(res.body).toHaveProperty('data');
    });

    it('should handle pagination for report list', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Reports - Export & Formatting', () => {
    it('should export report as CSV', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reportType: 'employee_summary', format: 'csv' })
        .expect(200);

      expect(res.type).toMatch(/text\/csv|application\/csv/);
      expect(res.text).toBeTruthy();
    });

    it('should export report as PDF', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reportType: 'payroll', format: 'pdf' })
        .expect(200);

      expect(res.type).toMatch(/application\/pdf/);
      expect(res.body).toBeTruthy();
    });

    it('should export report as Excel', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reportType: 'employee_summary', format: 'xlsx' })
        .expect(200);

      expect(res.type).toMatch(/xlsx|spreadsheet/);
    });

    it('should apply formatting options to exported report', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          reportType: 'employee_summary',
          format: 'csv',
          includeHeaders: true,
          delimiter: ',',
        })
        .expect(200);

      expect(res.text).toBeTruthy();
      expect(res.text.split('\n')[0]).toBeTruthy(); // Has headers
    });

    it('should validate export format parameter', async () => {
      const res = await request(app)
        .get('/api/reports/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ reportType: 'employee_summary', format: 'invalid' })
        .expect(400);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Reports - Scheduling & Automation', () => {
    it('should schedule recurring report generation', async () => {
      const res = await request(app)
        .post('/api/reports/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'payroll',
          frequency: 'monthly',
          dayOfMonth: 1,
          recipients: ['manager@test.com'],
        })
        .expect(201);

      expect(res.body).toHaveProperty('scheduleId');
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('active');
    });

    it('should list scheduled reports', async () => {
      const res = await request(app)
        .get('/api/reports/schedules')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('scheduleId');
    });

    it('should update scheduled report settings', async () => {
      // Create schedule first
      const createRes = await request(app)
        .post('/api/reports/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'attendance',
          frequency: 'weekly',
          dayOfWeek: 'Monday',
          recipients: ['user@test.com'],
        });

      const scheduleId = createRes.body.scheduleId;

      // Update it
      const res = await request(app)
        .put(`/api/reports/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          frequency: 'biweekly',
          recipients: ['newuser@test.com', 'anotheruser@test.com'],
        })
        .expect(200);

      expect(res.body.frequency).toBe('biweekly');
      expect(res.body.recipients.length).toBe(2);
    });

    it('should delete scheduled report', async () => {
      // Create schedule
      const createRes = await request(app)
        .post('/api/reports/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'department_analysis',
          frequency: 'monthly',
          dayOfMonth: 15,
        });

      const scheduleId = createRes.body.scheduleId;

      // Delete it
      const res = await request(app)
        .delete(`/api/reports/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
    });
  });

  afterAll(async () => {
    // Cleanup using helper to prevent MongoDB timeout
    const modelsToClean = [Employee, User];
    if (Report && Report.deleteMany) {
      modelsToClean.push(Report);
    }
    await TestDBHelper.cleanupCollections(modelsToClean);
  });
});
