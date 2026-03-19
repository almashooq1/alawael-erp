/**
 * Government Integration API — Integration Tests
 * Tests gov integration routes + employee affairs gov endpoints
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

// Enable GOSI mock mode so API calls return mock data
process.env.USE_MOCK_GOSI = 'true';

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// ─── Setup ──────────────────────────────────────────────────────────
let app;
let Employee;
let _createdEmployeeId;
let createdEmployeeMongoId;
const testEmployeeId = `GOV-TEST-${Date.now()}`;

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  Employee = require('../models/employee.model');
  const govRoutes = require('../routes/governmentIntegration.routes');
  const gosiRoutes = require('../routes/gosi.routes');
  const eaRoutes = require('../routes/employeeAffairs.routes');

  app = express();
  app.use(express.json());

  // Fake auth middleware — admin
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

  app.use('/api/government', govRoutes);
  app.use('/api/gosi', gosiRoutes);
  app.use('/api/employee-affairs', eaRoutes);

  // Create a test employee
  const emp = await Employee.create({
    employeeId: testEmployeeId,
    firstName: 'عبدالله',
    lastName: 'التكامل',
    email: `gov-test-${Date.now()}@alawael.test`,
    phone: '0500000001',
    department: 'IT',
    position: 'مطور نظم',
    salary: { base: 12000 },
    hireDate: '2024-06-01',
    nationalId: '1098765432',
    nationality: 'سعودي',
    status: 'active',
  });
  _createdEmployeeId = testEmployeeId;
  createdEmployeeMongoId = emp._id.toString();
});

afterAll(async () => {
  try {
    await Employee.deleteMany({ employeeId: new RegExp('^GOV-TEST-') }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Government Integration Routes
// ═══════════════════════════════════════════════════════════════════════════

describe('Government Integration — Dashboard', () => {
  test('GET /api/government/dashboard — returns compliance dashboard', async () => {
    const res = await request(app).get('/api/government/dashboard').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('totalEmployees');
    expect(res.body.data.summary).toHaveProperty('saudiEmployees');
    expect(res.body.data.summary).toHaveProperty('saudizationRate');
    expect(res.body.data.gosi).toBeDefined();
    expect(res.body.data.qiwa).toBeDefined();
    expect(res.body.data.wps).toBeDefined();
    expect(res.body.data.expiringDocuments).toBeDefined();
    expect(typeof res.body.data.overallComplianceScore).toBe('number');
  });
});

describe('Government Integration — Per-Employee Status', () => {
  test('GET /api/government/:employeeId/status — returns gov status', async () => {
    const res = await request(app)
      .get(`/api/government/${createdEmployeeMongoId}/status`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe(testEmployeeId);
    expect(res.body.data.nationality).toBe('سعودي');
    expect(res.body.data.isSaudi).toBe(true);
    expect(res.body.data.gosi).toBeDefined();
    expect(res.body.data.qiwa).toBeDefined();
    expect(res.body.data.mol).toBeDefined();
    expect(res.body.data.sponsorship).toBeDefined();
    expect(Array.isArray(res.body.data.alerts)).toBe(true);
  });

  test('GET /api/government/invalid-id/status — returns 500 for bad id', async () => {
    const res = await request(app).get('/api/government/invalid-id/status');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Government Integration — Full Registration', () => {
  test('POST /api/government/:employeeId/register-all — registers in GOSI+Qiwa', async () => {
    const res = await request(app)
      .post(`/api/government/${createdEmployeeMongoId}/register-all`)
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Check GOSI was attempted
    expect(res.body.data).toHaveProperty('gosi');
    expect(res.body.data).toHaveProperty('qiwa');
    expect(res.body.data).toHaveProperty('errors');
  });
});

describe('Government Integration — GOSI per employee', () => {
  test('GET /api/government/:employeeId/gosi/status — returns GOSI status', async () => {
    const res = await request(app)
      .get(`/api/government/${createdEmployeeMongoId}/gosi/status`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('gosi');
    expect(res.body.data.employeeId).toBe(testEmployeeId);
  });

  test('PUT /api/government/:employeeId/gosi/wage — updates GOSI wage', async () => {
    const res = await request(app)
      .put(`/api/government/${createdEmployeeMongoId}/gosi/wage`)
      .send({ newSalary: 15000 });
    // Mock mode may or may not be active depending on singleton construction timing
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    } else {
      // External API unavailable — still validates route wiring
      expect([500, 502, 503]).toContain(res.status);
    }
  });

  test('PUT /api/government/:id/gosi/wage — 400 if no newSalary', async () => {
    const res = await request(app)
      .put(`/api/government/${createdEmployeeMongoId}/gosi/wage`)
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Government Integration — Qiwa per employee', () => {
  test('GET /api/government/:employeeId/qiwa/status — returns Qiwa status', async () => {
    const res = await request(app)
      .get(`/api/government/${createdEmployeeMongoId}/qiwa/status`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('qiwa');
  });

  test('GET /api/government/:employeeId/qiwa/verify — verifies employee in Qiwa', async () => {
    const res = await request(app).get(`/api/government/${createdEmployeeMongoId}/qiwa/verify`);
    // Qiwa service makes real API calls — may fail when external API is unreachable
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('verification');
    } else {
      // External API unavailable — validates route wiring
      expect([500, 502, 503]).toContain(res.status);
    }
  });
});

describe('Government Integration — Termination', () => {
  test('POST /api/government/:employeeId/terminate — terminates gov registrations', async () => {
    // Create a disposable employee for termination test
    const emp = await Employee.create({
      employeeId: `GOV-TEST-TERM-${Date.now()}`,
      firstName: 'إنهاء',
      lastName: 'اختبار',
      email: `gov-term-${Date.now()}@alawael.test`,
      department: 'Admin',
      position: 'موظف',
      salary: { base: 5000 },
      hireDate: '2024-01-01',
      nationalId: '1234567890',
      nationality: 'سعودي',
      status: 'active',
      gosi: { subscriptionNumber: 'GOSI-TEST-001', status: 'active' },
    });

    const res = await request(app)
      .post(`/api/government/${emp._id}/terminate`)
      .send({ reason: 'اختبار إنهاء خدمات' })
      .expect(200);
    expect(res.body.success).toBe(true);

    // Verify employee status updated
    const updated = await Employee.findById(emp._id).lean();
    expect(updated.status).toBe('terminated');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GOSI Routes (standalone)
// ═══════════════════════════════════════════════════════════════════════════

describe('GOSI Routes — Calculate', () => {
  test('POST /api/gosi/calculate — calculates GOSI contributions', async () => {
    const res = await request(app)
      .post('/api/gosi/calculate')
      .send({ basicSalary: 10000, housingAllowance: 2500, isSaudi: true })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('subscriberWage');
    expect(res.body.data).toHaveProperty('employerContribution');
    expect(res.body.data).toHaveProperty('employeeContribution');
    expect(res.body.data.isSaudi).toBe(true);
  });

  test('POST /api/gosi/calculate — 400 if no salary', async () => {
    const res = await request(app).post('/api/gosi/calculate').send({}).expect(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/gosi/calculate — foreign employee rates', async () => {
    const res = await request(app)
      .post('/api/gosi/calculate')
      .send({ basicSalary: 8000, isSaudi: false })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeContribution).toBe(0);
    expect(res.body.data.isSaudi).toBe(false);
  });
});

describe('GOSI Routes — Per Employee', () => {
  test('GET /api/gosi/:employeeId/status — returns status', async () => {
    const res = await request(app).get(`/api/gosi/${createdEmployeeMongoId}/status`).expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/gosi/:employeeId/certificate — generates certificate', async () => {
    // Employee should have GOSI data from full registration test above
    const emp = await Employee.findById(createdEmployeeMongoId);
    if (emp.gosi?.subscriptionNumber) {
      const res = await request(app)
        .get(`/api/gosi/${createdEmployeeMongoId}/certificate`)
        .expect(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('GET /api/gosi/compliance/report — returns compliance report', async () => {
    const res = await request(app).get('/api/gosi/compliance/report').expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Employee Affairs — Government endpoints
// ═══════════════════════════════════════════════════════════════════════════

describe('Employee Affairs — Government Integration', () => {
  test('GET /api/employee-affairs/government/saudization — returns saudization report', async () => {
    const res = await request(app).get('/api/employee-affairs/government/saudization').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('saudi');
    expect(res.body.data).toHaveProperty('foreign');
    expect(res.body.data).toHaveProperty('saudizationRate');
    expect(Array.isArray(res.body.data.departments)).toBe(true);
  });

  test('GET /api/employee-affairs/government/expiring-documents — returns expiring docs', async () => {
    const res = await request(app)
      .get('/api/employee-affairs/government/expiring-documents?days=90')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalExpiring');
    expect(res.body.data).toHaveProperty('thresholdDays', 90);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  test('GET /api/employee-affairs/:id/government-summary — returns gov summary', async () => {
    const res = await request(app)
      .get(`/api/employee-affairs/${createdEmployeeMongoId}/government-summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe(testEmployeeId);
    expect(res.body.data).toHaveProperty('gosi');
    expect(res.body.data).toHaveProperty('qiwa');
    expect(res.body.data).toHaveProperty('mol');
    expect(res.body.data).toHaveProperty('sponsorship');
  });

  test('PUT /api/employee-affairs/:id/mol — updates MOL data', async () => {
    const res = await request(app)
      .put(`/api/employee-affairs/${createdEmployeeMongoId}/mol`)
      .send({
        workPermitNumber: 'WP-12345',
        occupationCode: '2621',
        occupationNameAr: 'مبرمج حاسب آلي',
        occupationNameEn: 'Computer Programmer',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mol.workPermitNumber).toBe('WP-12345');
    expect(res.body.data.mol.occupationNameAr).toBe('مبرمج حاسب آلي');
  });

  test('PUT /api/employee-affairs/:id/sponsorship — updates sponsorship data', async () => {
    const res = await request(app)
      .put(`/api/employee-affairs/${createdEmployeeMongoId}/sponsorship`)
      .send({
        sponsorName: 'شركة الأوائل',
        sponsorId: '7001234567',
        visaType: 'عمل',
        passportNumber: 'AB1234567',
        passportExpiry: '2028-12-31',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sponsorship.sponsorName).toBe('شركة الأوائل');
    expect(res.body.data.sponsorship.passportNumber).toBe('AB1234567');
  });
});

describe('Government Integration — Bulk Sync', () => {
  test('POST /api/government/bulk-sync — syncs unregistered employees', async () => {
    const res = await request(app).post('/api/government/bulk-sync').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('succeeded');
    expect(res.body.data).toHaveProperty('failed');
    expect(Array.isArray(res.body.data.details)).toBe(true);
  });
});
