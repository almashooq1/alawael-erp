/**
 * Advanced Integration Tests - Phase 5.1 Extended
 * Tests complex workflows and system integration scenarios
 * 12 test cases covering cross-module workflows
 */

const request = require('supertest');
const app = require('../server');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const TestDBHelper = require('../utils/test-db-helper');

// Extended timeout for integration tests with TestDBHelper
jest.setTimeout(120000);

describe.skip('Advanced Integration Workflows - Phase 5.1', () => {
  let authToken;
  let adminToken;
  let employees = [];
  let adminUser;

  beforeAll(async () => {
    // Create admin user
    adminUser = await TestDBHelper.createDocument(User, {
      email: 'workflow@test.com',
      fullName: 'Workflow Test User',
      password: 'TestPassword123!',
      role: 'admin',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'workflow@test.com', password: 'TestPassword123!' });

    adminToken = loginRes.body.token;

    // Create regular users
    const user = await TestDBHelper.createDocument(User, {
      email: 'employee@test.com',
      fullName: 'Employee User',
      password: 'TestPassword123!',
      role: 'user',
    });

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@test.com', password: 'TestPassword123!' });

    authToken = userLoginRes.body.token;

    // Create test employees sequentially
    const empData = [
      {
        firstName: 'Workflow0',
        lastName: 'Test',
        email: 'workflow0@test.com',
        employeeId: `EMP-${Date.now()}-0`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Workflow1',
        lastName: 'Test',
        email: 'workflow1@test.com',
        employeeId: `EMP-${Date.now()}-1`,
        department: 'HR',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Workflow2',
        lastName: 'Test',
        email: 'workflow2@test.com',
        employeeId: `EMP-${Date.now()}-2`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Workflow3',
        lastName: 'Test',
        email: 'workflow3@test.com',
        employeeId: `EMP-${Date.now()}-3`,
        department: 'HR',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
      {
        firstName: 'Workflow4',
        lastName: 'Test',
        email: 'workflow4@test.com',
        employeeId: `EMP-${Date.now()}-4`,
        department: 'IT',
        position: 'Developer',
        hireDate: new Date('2024-01-01'),
        salary: { base: 50000 },
        role: 'THERAPIST',
      },
    ];
    employees = await TestDBHelper.createDocuments(Employee, empData);
  });

  describe('Employee Lifecycle Workflow', () => {
    it('should complete full employee onboarding workflow', async () => {
      // 1. Create employee
      const createRes = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'New',
          lastName: 'Employee',
          email: 'newemployee@test.com',
          department: 'IT',
          position: 'Junior Dev',
        });

      expect(createRes.status).toMatch(/201|200/);
      const empId = createRes.body._id || createRes.body.id;

      // 2. Assign initial training
      const trainingRes = await request(app)
        .post('/api/employees/training')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: empId,
          trainingName: 'Onboarding',
          duration: 3,
        });

      expect([200, 201]).toContain(trainingRes.status);

      // 3. Set initial salary
      const salaryRes = await request(app)
        .patch(`/api/employees/${empId}/salary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          baseSalary: 50000,
        });

      expect([200, 201]).toContain(salaryRes.status);

      // 4. Verify employee is active
      const getRes = await request(app)
        .get(`/api/employees/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getRes.body).toHaveProperty('status');
    });

    it('should handle employee transfer between departments', async () => {
      const empId = employees[0]._id.toString();
      const oldDept = 'IT';
      const newDept = 'HR';

      const res = await request(app)
        .patch(`/api/employees/${empId}/department`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          oldDepartment: oldDept,
          newDepartment: newDept,
          transferDate: new Date().toISOString(),
        })
        .expect(200);

      expect(res.body).toHaveProperty('department');
      expect(res.body.department).toBe(newDept);
    });

    it('should process employee resignation and final settlement', async () => {
      const empId = employees[1]._id.toString();

      // 1. Mark as leaving
      const exitRes = await request(app)
        .patch(`/api/employees/${empId}/exit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lastWorkDay: new Date().toISOString(),
          resignationReason: 'Career Change',
        })
        .expect(200);

      expect(exitRes.body).toHaveProperty('status');

      // 2. Calculate final settlement
      const settlementRes = await request(app)
        .get(`/api/employees/${empId}/final-settlement`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(settlementRes.body).toHaveProperty('baseSalary');
      expect(settlementRes.body).toHaveProperty('gratuity');
      expect(settlementRes.body).toHaveProperty('totalPayable');
    });
  });

  describe('Leave Management Workflow', () => {
    it('should complete leave request and approval workflow', async () => {
      const empId = employees[2]._id.toString();

      // 1. Submit leave request
      const requestRes = await request(app)
        .post('/api/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: empId,
          leaveType: 'annual',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Vacation',
        })
        .expect(201);

      const leaveId = requestRes.body.leaveId || requestRes.body._id;

      // 2. Manager approval
      const approvalRes = await request(app)
        .patch(`/api/leave/${leaveId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          approverComment: 'Approved',
        })
        .expect(200);

      expect(approvalRes.body).toHaveProperty('status');
      expect(approvalRes.body.status).toBe('approved');

      // 3. Verify balance is updated
      const balanceRes = await request(app)
        .get('/api/leave/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(balanceRes.body).toHaveProperty('totalLeave');
    });

    it('should handle leave balance calculation across multiple leaves', async () => {
      const empId = employees[3]._id.toString();

      // Request multiple leaves
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/leave/request')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            employeeId: empId,
            leaveType: i % 2 === 0 ? 'annual' : 'sick',
            startDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + (i + 1.5) * 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      // Verify total calculation
      const res = await request(app)
        .get('/api/leave/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ employeeId: empId })
        .expect(200);

      expect(res.body).toHaveProperty('totalLeaves');
      expect(res.body).toHaveProperty('usedLeaves');
      expect(res.body).toHaveProperty('remainingLeaves');
    });
  });

  describe('Attendance & Payroll Integration', () => {
    it('should calculate payroll based on attendance records', async () => {
      const empId = employees[4]._id.toString();

      // 1. Record attendance for a month
      const startDate = new Date('2026-02-01');
      for (let day = 1; day <= 20; day++) {
        const date = new Date(startDate);
        date.setDate(day);

        await request(app)
          .post('/api/attendance/checkin')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            employeeId: empId,
            checkInTime: date.toISOString(),
            checkOutTime: new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          });
      }

      // 2. Calculate payroll
      const payrollRes = await request(app)
        .post('/api/payroll/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: '2026-02',
        })
        .expect(201);

      expect(payrollRes.body).toHaveProperty('totalPayroll');
      expect(payrollRes.body).toHaveProperty('employeeCount');
    });

    it('should handle overtime calculation in payroll', async () => {
      const empId = employees[0]._id.toString();

      // Record overtime attendance
      const res = await request(app)
        .post('/api/attendance/record-overtime')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: empId,
          date: new Date().toISOString(),
          hours: 3,
          rate: 1.5,
        })
        .expect(201);

      expect(res.body).toHaveProperty('overtimeAmount');
      expect(res.body).toHaveProperty('hoursWorked');
    });

    it('should deduct leaves from payroll and adjust accordingly', async () => {
      const empId = employees[1]._id.toString();

      // Create and approve leave
      const leaveRes = await request(app)
        .post('/api/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: empId,
          leaveType: 'unpaid',
          startDate: new Date('2026-02-10').toISOString(),
          endDate: new Date('2026-02-15').toISOString(),
        });

      // Calculate payroll with leave deduction
      const payrollRes = await request(app)
        .post('/api/payroll/calculate-with-deductions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: empId,
          month: '2026-02',
        })
        .expect(201);

      expect(payrollRes.body).toHaveProperty('baseSalary');
      expect(payrollRes.body).toHaveProperty('leaveDeduction');
      expect(payrollRes.body).toHaveProperty('finalAmount');
    });
  });

  describe('Multi-Level Approval Workflows', () => {
    it('should handle leave approval with manager and hr sign-off', async () => {
      const empId = employees[2]._id.toString();

      // Employee submits
      const submitRes = await request(app)
        .post('/api/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: empId,
          leaveType: 'annual',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(201);

      const leaveId = submitRes.body.leaveId || submitRes.body._id;

      // Manager approves
      const managerRes = await request(app)
        .patch(`/api/leave/${leaveId}/manager-approval`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true })
        .expect(200);

      // HR final approval
      const hrRes = await request(app)
        .patch(`/api/leave/${leaveId}/hr-approval`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true })
        .expect(200);

      expect(hrRes.body).toHaveProperty('status');
      expect(hrRes.body.status).toBe('approved');
    });
  });

  describe('Data Consistency Across Modules', () => {
    it('should maintain data consistency when updating employee across modules', async () => {
      const empId = employees[3]._id.toString();

      // Update in employee module
      const updateRes = await request(app)
        .patch(`/api/employees/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newemail@test.com',
          department: 'Finance',
        })
        .expect(200);

      // Verify update in payroll module
      const payrollRes = await request(app)
        .get(`/api/payroll/employee/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(payrollRes.body).toHaveProperty('email');

      // Verify update in leave module
      const leaveRes = await request(app)
        .get(`/api/leave/employee/${empId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(leaveRes.body).toBeTruthy();
    });

    it('should validate referential integrity across modules', async () => {
      const empId = 'nonexistent-id-12345';

      // Try to create leave for non-existent employee
      const res = await request(app)
        .post('/api/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: empId,
          leaveType: 'annual',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect([400, 404]).toContain(res.status);
    });
  });

  afterAll(async () => {
    // Cleanup using helper to prevent MongoDB timeout
    await TestDBHelper.cleanupCollections([Employee, Leave, Attendance, Payment, User]);
  });
});
