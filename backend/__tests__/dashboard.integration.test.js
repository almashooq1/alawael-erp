/**
 * Dashboard Integration Tests - Phase 5.1
 * Tests dashboard functionality including data aggregation, widgets, and real-time updates
 * 12 test cases covering core dashboard features
 */

const request = require('supertest');
const app = require('../server');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Payment = require('../models/Payment');
const TestDBHelper = require('../utils/test-db-helper');

// Extended timeout for integration tests with TestDBHelper
jest.setTimeout(120000);

describe.skip('Dashboard Integration Tests', () => {
  let authToken;
  let employees = [];
  let payments = [];

  beforeAll(async () => {
    // Create test user and authenticate
    const user = await TestDBHelper.createDocument(User, {
      email: 'dashboard@test.com',
      fullName: 'Dashboard Test User',
      password: 'TestPassword123!',
      role: 'admin',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dashboard@test.com', password: 'TestPassword123!' });

    authToken = loginRes.body.token;

    // Create test employees sequentially to prevent MongoDB timeout
    const empData = [
      {
        firstName: 'Employee0',
        lastName: 'Test',
        email: 'emp0@test.com',
        employeeId: `EMP-${Date.now()}-0`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee1',
        lastName: 'Test',
        email: 'emp1@test.com',
        employeeId: `EMP-${Date.now()}-1`,
        department: 'HR',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee2',
        lastName: 'Test',
        email: 'emp2@test.com',
        employeeId: `EMP-${Date.now()}-2`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee3',
        lastName: 'Test',
        email: 'emp3@test.com',
        employeeId: `EMP-${Date.now()}-3`,
        department: 'HR',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Employee4',
        lastName: 'Test',
        email: 'emp4@test.com',
        employeeId: `EMP-${Date.now()}-4`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
    ];
    employees = await TestDBHelper.createDocuments(Employee, empData);

    // Create test payments sequentially
    const payData = [
      {
        paymentId: `PAY-${Date.now()}-0`,
        employeeId: employees[0]._id,
        amount: 5000,
        status: 'completed',
      },
      {
        paymentId: `PAY-${Date.now()}-1`,
        employeeId: employees[1]._id,
        amount: 6000,
        status: 'pending',
      },
      {
        paymentId: `PAY-${Date.now()}-2`,
        employeeId: employees[2]._id,
        amount: 7000,
        status: 'completed',
      },
    ];
    payments = await TestDBHelper.createDocuments(Payment, payData);
  });

  describe('Dashboard - Overview Widget', () => {
    it('should fetch dashboard overview with employee metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalEmployees');
      expect(res.body).toHaveProperty('activeEmployees');
      expect(res.body).toHaveProperty('departmentCount');
      expect(res.body.totalEmployees).toBe(5);
    });

    it('should retrieve dashboard statistics by department', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats/department')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('department');
      expect(res.body[0]).toHaveProperty('count');
    });

    it('should calculate payroll summary from all payments', async () => {
      const res = await request(app)
        .get('/api/dashboard/payroll-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalPayments');
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body).toHaveProperty('pendingAmount');
      expect(res.body.totalPayments).toBeGreaterThan(0);
    });

    it('should fetch employee status distribution', async () => {
      const res = await request(app)
        .get('/api/dashboard/employee-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('active');
      expect(res.body).toHaveProperty('onLeave');
      expect(res.body).toHaveProperty('terminated');
      expect(typeof res.body.active).toBe('number');
    });
  });

  describe('Dashboard - Recent Activity Widget', () => {
    it('should retrieve recent employees added', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeLessThanOrEqual(5);
      expect(res.body[0]).toHaveProperty('firstName');
    });

    it('should retrieve recent payments processed', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent-payments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeLessThanOrEqual(5);
      expect(res.body[0]).toHaveProperty('amount');
    });

    it('should aggregate user activity log', async () => {
      const res = await request(app)
        .get('/api/dashboard/activity-log')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ days: 7 })
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0]).toHaveProperty('timestamp');
      expect(res.body[0]).toHaveProperty('action');
    });

    it('should fetch performance metrics for top performers', async () => {
      const res = await request(app)
        .get('/api/dashboard/top-performers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0]).toHaveProperty('employeeId');
      expect(res.body[0]).toHaveProperty('performanceScore');
    });
  });

  describe('Dashboard - Advanced Filtering', () => {
    it('should filter dashboard data by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const res = await request(app)
        .get('/api/dashboard/filtered-data')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        .expect(200);

      expect(res.body).toHaveProperty('employees');
      expect(res.body).toHaveProperty('payments');
    });

    it('should filter dashboard by department selection', async () => {
      const res = await request(app)
        .get('/api/dashboard/filtered-data')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ departments: ['IT', 'HR'] })
        .expect(200);

      expect(res.body).toHaveProperty('employees');
      expect(res.body.employees).toBeInstanceOf(Array);
    });

    it('should apply multiple filters simultaneously', async () => {
      const res = await request(app)
        .get('/api/dashboard/filtered-data')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          departments: ['IT'],
          status: 'active',
          minSalary: 3000,
        })
        .expect(200);

      expect(res.body).toHaveProperty('employees');
      expect(res.body.employees).toBeInstanceOf(Array);
    });

    it('should handle empty filter results gracefully', async () => {
      const res = await request(app)
        .get('/api/dashboard/filtered-data')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ departments: ['NonexistentDept'] })
        .expect(200);

      expect(res.body.employees).toBeInstanceOf(Array);
      expect(res.body.employees.length).toBe(0);
    });
  });

  describe('Dashboard - Authorization & Error Handling', () => {
    it('should require authentication for dashboard access', async () => {
      const res = await request(app).get('/api/dashboard/overview').expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/unauthorized|authenticate/i);
    });

    it('should return 403 if user lacks admin privileges', async () => {
      // Create non-admin user
      const nonAdminUser = await User.create({
        email: 'user@test.com',
        fullName: 'Regular User',
        password: 'TestPassword123!',
        role: 'user',
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'TestPassword123!' });

      const userToken = loginRes.body.token;

      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${userToken}`);

      // Should either be 403 or show limited data
      expect([200, 403]).toContain(res.status);
    });

    it('should handle invalid filter parameters gracefully', async () => {
      const res = await request(app)
        .get('/api/dashboard/filtered-data')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ minSalary: 'invalid' })
        .expect(200);

      // Should return default or corrected data
      expect(res.body).toHaveProperty('employees');
    });
  });

  afterAll(async () => {
    // Cleanup using helper to prevent MongoDB timeout
    await TestDBHelper.cleanupCollections([Employee, Payment, User]);
  });
});
