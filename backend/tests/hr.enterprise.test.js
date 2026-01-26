/**
 * Advanced HR System - Integration Tests
 * اختبارات نظام الموارد البشرية المتقدم
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const {
  PerformanceReview,
  LeaveRequest,
  Attendance,
  Payroll,
  Training,
  EmployeeBenefits,
  DisciplinaryAction,
  HRAnalytics,
} = require('../models/hr.advanced');
const Employee = require('../models/Employee');

let mongoServer;
let authToken;
let testEmployeeId;
let testReviewerId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'hr-enterprise-test' });

  const testEmployee = await Employee.create({
    employeeId: `EMP-${Date.now()}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: 'test.employee@test.com',
    position: 'Therapist',
    department: 'Rehabilitation',
    hireDate: new Date('2025-01-01'),
    salary: { base: 5000 },
    role: 'therapist',
  });
  testEmployeeId = testEmployee._id;

  const testReviewer = await Employee.create({
    employeeId: `REV-${Date.now()}`,
    firstName: 'Test',
    lastName: 'Reviewer',
    email: 'test.reviewer@test.com',
    position: 'Manager',
    department: 'Rehabilitation',
    hireDate: new Date('2024-12-01'),
    salary: { base: 6000 },
    role: 'manager',
  });
  testReviewerId = testReviewer._id;

  authToken = 'test-jwt-token';
});

afterAll(async () => {
  await PerformanceReview.deleteMany({});
  await LeaveRequest.deleteMany({});
  await Attendance.deleteMany({});
  await Payroll.deleteMany({});
  await Training.deleteMany({});
  await Employee.deleteMany({});
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Advanced HR System Tests', () => {
  // ============ PERFORMANCE MANAGEMENT TESTS ============

  describe('Performance Management', () => {
    let reviewId;

    test('POST /api/hr/performance/reviews - Create performance review', async () => {
      const reviewData = {
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewCycle: 'annual',
        ratings: {
          jobKnowledge: 5,
          communication: 4,
          teamwork: 5,
          initiative: 4,
          reliability: 5,
          customerService: 4,
          productivity: 5,
        },
        overallAssessment: 'excellent',
        strengths: 'Strong technical skills',
        areasForImprovement: 'Time management',
        goals: [
          {
            goal: 'Lead new project',
            targetDate: new Date('2026-06-30'),
            status: 'in-progress',
          },
        ],
        recommendedSalaryIncrease: 10,
        promotionRecommended: true,
      };

      const response = await request(app)
        .post('/api/hr/performance/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body).toHaveProperty('review');
      expect(response.body.review.averageRating).toBe('4.57');
      reviewId = response.body.review._id;
    });

    test('GET /api/hr/performance/:employeeId/history - Get performance history', async () => {
      const response = await request(app)
        .get(`/api/hr/performance/${testEmployeeId}/history?months=12`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('reviews');
    });

    test('GET /api/hr/performance/report/:departmentId - Generate department report', async () => {
      const departmentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/hr/performance/report/${departmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('report');
    });
  });

  // ============ LEAVE MANAGEMENT TESTS ============

  describe('Leave Management', () => {
    let leaveRequestId;

    beforeAll(async () => {
      // Create employee benefits for leave balance
      await EmployeeBenefits.create({
        employeeId: testEmployeeId,
        paidTimeOff: {
          annualLeave: 20,
          sickLeave: 10,
          personalDays: 5,
          carryover: 0,
        },
      });
    });

    test('POST /api/hr/leave/request - Submit leave request', async () => {
      const leaveData = {
        leaveType: 'annual',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        reason: 'Family vacation',
      };

      const response = await request(app)
        .post('/api/hr/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send(leaveData)
        .expect(201);

      expect(response.body).toHaveProperty('leaveRequest');
      expect(response.body.leaveRequest.status).toBe('pending');
      expect(response.body.leaveRequest.numberOfDays).toBe(5);
      leaveRequestId = response.body.leaveRequest._id;
    });

    test('GET /api/hr/leave/balance - Get leave balance', async () => {
      const response = await request(app)
        .get('/api/hr/leave/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body.balance.annualLeave).toBe(20);
    });

    test('PUT /api/hr/leave/request/:leaveRequestId - Approve leave', async () => {
      const response = await request(app)
        .put(`/api/hr/leave/request/${leaveRequestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approved: true, comments: 'Approved' })
        .expect(200);

      expect(response.body.leaveRequest.status).toBe('approved');
    });

    test('GET /api/hr/leave/requests/:employeeId - Get employee leaves', async () => {
      const response = await request(app)
        .get(`/api/hr/leave/requests/${testEmployeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('requests');
      expect(Array.isArray(response.body.requests)).toBe(true);
    });
  });

  // ============ ATTENDANCE TESTS ============

  describe('Attendance Tracking', () => {
    test('POST /api/hr/attendance/checkin - Record check-in', async () => {
      const response = await request(app)
        .post('/api/hr/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: { latitude: 25.2048, longitude: 55.2708 },
        })
        .expect(201);

      expect(response.body).toHaveProperty('attendance');
      expect(response.body.attendance.status).toBe('present');
    });

    test('POST /api/hr/attendance/checkout - Record check-out', async () => {
      // Wait a moment to simulate work time
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/hr/attendance/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('attendance');
      expect(response.body.attendance).toHaveProperty('hoursWorked');
    });

    test('GET /api/hr/attendance/report/:month - Get attendance report', async () => {
      const month = '2026-01';

      const response = await request(app)
        .get(`/api/hr/attendance/report/${month}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('report');
      expect(response.body.report.month).toBe(month);
    });

    test('GET /api/hr/attendance/department/:departmentId/:month - Department report', async () => {
      const departmentId = new mongoose.Types.ObjectId();
      const month = '2026-01';

      const response = await request(app)
        .get(`/api/hr/attendance/department/${departmentId}/${month}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stats');
    });
  });

  // ============ PAYROLL TESTS ============

  describe('Payroll System', () => {
    let payrollId;

    test('POST /api/hr/payroll/calculate - Calculate payroll', async () => {
      const payrollData = {
        employeeId: testEmployeeId,
        payPeriod: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      };

      const response = await request(app)
        .post('/api/hr/payroll/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payrollData)
        .expect(201);

      expect(response.body).toHaveProperty('payroll');
      expect(response.body.payroll).toHaveProperty('grossSalary');
      expect(response.body.payroll).toHaveProperty('netSalary');
      payrollId = response.body.payroll._id;
    });

    test('GET /api/hr/payroll/:payrollId/payslip - Generate payslip', async () => {
      const response = await request(app)
        .get(`/api/hr/payroll/${payrollId}/payslip`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('payslip');
      expect(response.body.payslip).toHaveProperty('payslipNumber');
    });

    test('PUT /api/hr/payroll/:payrollId/process - Process payment', async () => {
      const response = await request(app)
        .put(`/api/hr/payroll/${payrollId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.payroll.paymentStatus).toBe('processed');
    });

    test('GET /api/hr/payroll/history/:employeeId - Get payroll history', async () => {
      const response = await request(app)
        .get(`/api/hr/payroll/history/${testEmployeeId}?months=6`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('payrolls');
      expect(Array.isArray(response.body.payrolls)).toBe(true);
    });
  });

  // ============ TRAINING TESTS ============

  describe('Training & Development', () => {
    let trainingId;

    test('POST /api/hr/training - Create training program', async () => {
      const trainingData = {
        trainingName: 'Advanced Leadership',
        description: 'Executive leadership program',
        category: 'management',
        trainer: 'Dr. John Smith',
        venue: 'Training Hall A',
        startDate: '2026-03-15',
        endDate: '2026-03-17',
        objectives: ['Lead teams', 'Strategic planning'],
        budget: 5000,
      };

      const response = await request(app)
        .post('/api/hr/training')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trainingData)
        .expect(201);

      expect(response.body).toHaveProperty('training');
      trainingId = response.body.training._id;
    });

    test('POST /api/hr/training/:trainingId/register - Register employee', async () => {
      const response = await request(app)
        .post(`/api/hr/training/${trainingId}/register`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ employeeId: testEmployeeId })
        .expect(201);

      expect(response.body.training.participants).toHaveLength(1);
    });

    test('PUT /api/hr/training/:trainingId/attendance - Mark attendance', async () => {
      const response = await request(app)
        .put(`/api/hr/training/${trainingId}/attendance`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: testEmployeeId,
          status: 'attended',
          score: 85,
        })
        .expect(200);

      expect(response.body).toHaveProperty('training');
    });

    test('GET /api/hr/training - Get all training programs', async () => {
      const response = await request(app)
        .get('/api/hr/training')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('trainings');
      expect(Array.isArray(response.body.trainings)).toBe(true);
    });

    test('GET /api/hr/training/:trainingId - Get training details', async () => {
      const response = await request(app)
        .get(`/api/hr/training/${trainingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('training');
      expect(response.body.training._id).toBe(trainingId);
    });
  });

  // ============ ANALYTICS TESTS ============

  describe('HR Analytics', () => {
    const departmentId = new mongoose.Types.ObjectId();
    const month = '2026-01';

    test('POST /api/hr/analytics/generate - Generate analytics', async () => {
      const response = await request(app)
        .post('/api/hr/analytics/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ departmentId, month })
        .expect(201);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.month).toBe(month);
    });

    test('GET /api/hr/analytics/:departmentId/:month - Get analytics', async () => {
      const response = await request(app)
        .get(`/api/hr/analytics/${departmentId}/${month}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
    });
  });

  // ============ ERROR HANDLING TESTS ============

  describe('Error Handling', () => {
    test('POST /api/hr/performance/reviews - Missing required fields', async () => {
      const response = await request(app)
        .post('/api/hr/performance/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ employeeId: testEmployeeId })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/hr/leave/balance - Without authentication', async () => {
      await request(app).get('/api/hr/leave/balance').expect(401);
    });

    test('POST /api/hr/attendance/checkin - Duplicate check-in', async () => {
      // First check-in
      await request(app)
        .post('/api/hr/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: { latitude: 25.2048, longitude: 55.2708 } });

      // Duplicate check-in
      const response = await request(app)
        .post('/api/hr/attendance/checkin')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ location: { latitude: 25.2048, longitude: 55.2708 } })
        .expect(400);

      expect(response.body.error).toContain('already checked in');
    });
  });

  // ============ DATA VALIDATION TESTS ============

  describe('Data Validation', () => {
    test('POST /api/hr/leave/request - Invalid leave type', async () => {
      const response = await request(app)
        .post('/api/hr/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leaveType: 'invalid-type',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
          reason: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/hr/performance/reviews - Invalid rating', async () => {
      const response = await request(app)
        .post('/api/hr/performance/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeId: testEmployeeId,
          reviewerId: testReviewerId,
          ratings: {
            jobKnowledge: 10, // Invalid: should be 1-5
            communication: 4,
            teamwork: 5,
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // ============ BUSINESS LOGIC TESTS ============

  describe('Business Logic', () => {
    test('Leave request - Automatic balance deduction on approval', async () => {
      // Get initial balance
      const initialBalance = await EmployeeBenefits.findOne({
        employeeId: testEmployeeId,
      });
      const initialAnnualLeave = initialBalance.paidTimeOff.annualLeave;

      // Submit and approve leave
      const leaveResponse = await request(app)
        .post('/api/hr/leave/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leaveType: 'annual',
          startDate: '2026-04-01',
          endDate: '2026-04-03',
          reason: 'Test',
        });

      await request(app)
        .put(`/api/hr/leave/request/${leaveResponse.body.leaveRequest._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ approved: true });

      // Check updated balance
      const updatedBalance = await EmployeeBenefits.findOne({
        employeeId: testEmployeeId,
      });

      expect(updatedBalance.paidTimeOff.annualLeave).toBe(initialAnnualLeave - 3);
    });

    test('Attendance - Overtime calculation', async () => {
      const today = new Date().setHours(0, 0, 0, 0);

      // Create attendance with overtime
      const attendance = await Attendance.create({
        employeeId: testEmployeeId,
        date: new Date(today),
        checkInTime: new Date(today + 8 * 3600000), // 8 AM
        checkOutTime: new Date(today + 19 * 3600000), // 7 PM
        status: 'present',
      });

      // Hours worked should be 11
      // Overtime should be 3 (11 - 8)
      expect(attendance.hoursWorked).toBeGreaterThan(10);
      expect(attendance.overtime).toBeGreaterThan(2);
    });

    test('Performance review - Average rating calculation', async () => {
      const review = await PerformanceReview.create({
        employeeId: testEmployeeId,
        reviewerId: testReviewerId,
        reviewCycle: 'quarterly',
        ratings: {
          jobKnowledge: 5,
          communication: 4,
          teamwork: 5,
          initiative: 4,
          reliability: 5,
          customerService: 4,
          productivity: 5,
        },
      });

      // Average should be (5+4+5+4+5+4+5)/7 = 4.57
      expect(parseFloat(review.averageRating)).toBeCloseTo(4.57, 2);
    });
  });
});

describe('Performance Tests', () => {
  test('Bulk performance review creation', async () => {
    const startTime = Date.now();

    // Create 100 performance reviews
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        PerformanceReview.create({
          employeeId: new mongoose.Types.ObjectId(),
          reviewerId: new mongoose.Types.ObjectId(),
          reviewCycle: 'annual',
          ratings: {
            jobKnowledge: 4,
            communication: 4,
            teamwork: 4,
            initiative: 4,
            reliability: 4,
            customerService: 4,
            productivity: 4,
          },
        })
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // Should complete in less than 5 seconds
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('Large payroll calculation', async () => {
    // Test payroll calculation for multiple employees
    const employees = await Employee.find().limit(10);

    const startTime = Date.now();

    for (const employee of employees) {
      await Payroll.create({
        employeeId: employee._id,
        payPeriod: {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        },
        baseSalary: 5000,
        grossSalary: 6000,
        netSalary: 4750,
      });
    }

    const endTime = Date.now();

    // Should be fast
    expect(endTime - startTime).toBeLessThan(2000);
  });
});
