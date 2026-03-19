/**
 * Employee Affairs API — Integration Tests
 * Tests all main endpoints exposed by employeeAffairs.routes.js
 *
 * Uses REAL mongoose (not the global mock) for integration testing.
 */

jest.unmock('mongoose');

// Override mock MONGODB_URI with .env value
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const m1 = envContent.match(/^MONGO_URI\s*=\s*(.+)$/m);
  if (m1) process.env.MONGO_URI = m1[1].trim();
  const m2 = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (m2) process.env.MONGODB_URI = m2[1].trim();
}

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// ─── Setup ──────────────────────────────────────────────────────────
let app;
let Employee;
let LeaveRequest;
let createdEmployeeId;
const testEmployeeId = `EMP-TEST-${Date.now()}`;

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  Employee = require('../models/employee.model');
  LeaveRequest = require('../models/LeaveRequest');
  const routes = require('../routes/employeeAffairs.routes');

  app = express();
  app.use(express.json());
  // Fake auth middleware
  app.use((req, _res, next) => {
    req.user = {
      _id: new mongoose.Types.ObjectId(),
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Test Admin',
      role: 'admin',
      roles: ['admin'],
    };
    next();
  });
  app.use('/api/employee-affairs', routes);
});

afterAll(async () => {
  try {
    if (createdEmployeeId) {
      await Employee.findByIdAndDelete(createdEmployeeId).catch(() => {});
    }
    // Clean test leave requests
    if (LeaveRequest) {
      await LeaveRequest.deleteMany({ employeeId: testEmployeeId }).catch(() => {});
    }
    // Clean test employees
    await Employee.deleteMany({ employeeId: new RegExp('^EMP-TEST-') }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('Employee Affairs — Employees', () => {
  test('POST /api/employee-affairs — creates an employee', async () => {
    const res = await request(app)
      .post('/api/employee-affairs')
      .send({
        employeeId: testEmployeeId,
        firstName: 'اختبار',
        lastName: 'شؤون',
        email: `test-${Date.now()}@alawael.test`,
        phone: '0500000000',
        department: 'HR',
        position: 'محلل موارد بشرية',
        salary: { base: 8000 },
        hireDate: '2024-01-01',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.employeeId).toBe(testEmployeeId);
    expect(res.body.data.firstName).toBe('اختبار');
    expect(res.body.data.department).toBe('HR');
    createdEmployeeId = res.body.data._id;
  });

  test('GET /api/employee-affairs — lists employees', async () => {
    const res = await request(app).get('/api/employee-affairs').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employees).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/employee-affairs/:id — gets employee by id', async () => {
    const res = await request(app).get(`/api/employee-affairs/${createdEmployeeId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe(testEmployeeId);
  });

  test('GET /api/employee-affairs/:id/profile — gets full profile', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/${createdEmployeeId}/profile`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('اختبار شؤون');
    expect(res.body.data.leaveBalance).toBeDefined();
    expect(res.body.data.yearsOfService).toBeDefined();
  });

  test('PUT /api/employee-affairs/:id — updates employee', async () => {
    const res = await request(app)
      .put(`/api/employee-affairs/${createdEmployeeId}`)
      .send({ position: 'مدير موارد بشرية' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.position).toBe('مدير موارد بشرية');
  });

  test('GET /api/employee-affairs?search=اختبار — search works', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs?search=${encodeURIComponent('اختبار')}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.employees.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Employee Affairs — Leaves', () => {
  let leaveId;

  test('POST /api/employee-affairs/leaves — creates leave request', async () => {
    const res = await request(app)
      .post('/api/employee-affairs/leaves')
      .send({
        employeeId: createdEmployeeId,
        leaveType: 'annual',
        startDate: '2026-07-01',
        endDate: '2026-07-05',
        reason: 'إجازة اختبارية',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.leaveType).toBe('annual');
    expect(res.body.data.totalDays).toBeGreaterThanOrEqual(1);
    expect(res.body.data.status).toBe('pending');
    leaveId = res.body.data._id;
  });

  test('GET /api/employee-affairs/leaves — lists leaves', async () => {
    const res = await request(app).get('/api/employee-affairs/leaves').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaves).toBeDefined();
  });

  test('GET /api/employee-affairs/leaves/balance/:id — gets balance', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/leaves/balance/${createdEmployeeId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.annual).toBeDefined();
    expect(res.body.data.sick).toBeDefined();
    expect(res.body.data.annual.total).toBe(30);
  });

  test('POST /leaves/:id/approve-manager — manager approves', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/leaves/${leaveId}/approve-manager`)
      .send({ comments: 'مقبول' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('manager_approved');
  });

  test('POST /leaves/:id/approve-hr — HR approves', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/leaves/${leaveId}/approve-hr`)
      .send({ comments: 'مقبول من HR' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
  });

  test('POST /leaves/:id/cancel — cancels approved leave', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/leaves/${leaveId}/cancel`)
      .send({ reason: 'تغيير الخطط' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('POST /leaves — rejects duplicate overlapping leave', async () => {
    // Create first leave
    const r1 = await request(app)
      .post('/api/employee-affairs/leaves')
      .send({
        employeeId: createdEmployeeId,
        leaveType: 'annual',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        reason: 'إجازة أولى',
      })
      .expect(201);

    // Try overlapping
    const r2 = await request(app)
      .post('/api/employee-affairs/leaves')
      .send({
        employeeId: createdEmployeeId,
        leaveType: 'annual',
        startDate: '2026-08-03',
        endDate: '2026-08-07',
        reason: 'إجازة متعارضة',
      })
      .expect(400);

    expect(r2.body.success).toBe(false);
    expect(r2.body.message).toMatch(/تعارض/);

    // Clean up
    await LeaveRequest.findByIdAndDelete(r1.body.data._id).catch(() => {});
  });
});

describe('Employee Affairs — Attendance', () => {
  test('POST /attendance/check-in — records check-in', async () => {
    const res = await request(app)
      .post('/api/employee-affairs/attendance/check-in')
      .send({ employeeId: createdEmployeeId, method: 'manual' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checkIn).toBeDefined();
  });

  test('POST /attendance/check-out — records check-out', async () => {
    const res = await request(app)
      .post('/api/employee-affairs/attendance/check-out')
      .send({ employeeId: createdEmployeeId, method: 'manual' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.checkOut).toBeDefined();
    expect(res.body.data.totalHours).toBeDefined();
  });

  test('GET /attendance/report/:id — gets monthly report', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/attendance/report/${createdEmployeeId}?month=7&year=2026`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.attendanceRate).toBeDefined();
  });
});

describe('Employee Affairs — Performance', () => {
  test('POST /performance/:id — creates performance review', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/performance/${createdEmployeeId}`)
      .send({ rating: 4, comments: 'أداء ممتاز' })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.review.rating).toBe(4);
  });

  test('GET /performance/:id — gets performance history', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/performance/${createdEmployeeId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ratingHistory.length).toBeGreaterThanOrEqual(1);
  });

  test('PUT /performance/:id/goals — sets goals', async () => {
    const res = await request(app)
      .put(`/api/employee-affairs/performance/${createdEmployeeId}/goals`)
      .send({
        goals: [
          { title: 'رفع كفاءة القسم', targetDate: '2026-12-31', status: 'in-progress' },
          { title: 'تحسين الإنتاجية', targetDate: '2026-06-30', status: 'pending' },
        ],
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });
});

describe('Employee Affairs — Contracts & Career', () => {
  test('GET /contracts/expiring — lists expiring contracts', async () => {
    const res = await request(app)
      .get('/api/employee-affairs/contracts/expiring?days=365')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /career/:id/certification — adds certification', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/career/${createdEmployeeId}/certification`)
      .send({
        name: 'شهادة PHR',
        issuer: 'HRCI',
        date: '2026-01-15',
        expiryDate: '2029-01-15',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /career/:id/training — adds training', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/career/${createdEmployeeId}/training`)
      .send({
        name: 'إدارة الموارد البشرية المتقدمة',
        provider: 'SHRM',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        status: 'completed',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /career/:id/skill — adds skill', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/career/${createdEmployeeId}/skill`)
      .send({ name: 'قيادة الفرق', level: 'advanced', category: 'إدارية' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Employee Affairs — Dashboard', () => {
  test('GET /dashboard — returns comprehensive stats', async () => {
    const res = await request(app).get('/api/employee-affairs/dashboard').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overview).toBeDefined();
    expect(res.body.data.overview.totalEmployees).toBeDefined();
    expect(res.body.data.kpis).toBeDefined();
  });

  test('GET /stats/department/:dept — returns department stats', async () => {
    const res = await request(app).get('/api/employee-affairs/stats/department/HR').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.department).toBe('HR');
    expect(res.body.data.employeeCount).toBeDefined();
  });
});

describe('Employee Affairs — Documents', () => {
  test('POST /documents/:id — adds document', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/documents/${createdEmployeeId}`)
      .send({
        name: 'هوية وطنية',
        url: '/uploads/id-card.pdf',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /documents/:id — gets employee documents', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/documents/${createdEmployeeId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Employee Affairs — Termination', () => {
  test('POST /:id/terminate — terminates employee', async () => {
    const res = await request(app)
      .post(`/api/employee-affairs/${createdEmployeeId}/terminate`)
      .send({ reason: 'اختبار إنهاء الخدمات', terminationDate: '2026-12-31' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('terminated');
  });
});
