/**
 * Guardian Portal API — Integration Tests
 * Tests guardian portal routes + controller + models
 *
 * Uses REAL mongoose (not the global mock) for integration testing.
 * Covers: Dashboard, Profile, Beneficiaries, Progress, Grades,
 *         Attendance, Behavior, Reports, Payments/Financial,
 *         Messages, Notifications, Settings, Analytics,
 *         Appointments, Schedule, IEP, Surveys, Resources,
 *         Support Tickets, Events, Feedback/Complaints,
 *         Documents, Transportation, Activities, Permission Requests,
 *         Announcements, Teachers, Rewards, Emergency,
 *         Health Records, Therapy Sessions, Meal Plans, Gallery,
 *         Homework, Certificates, Visitor Pass, Facility Booking,
 *         Satisfaction, Academic Calendar, Family Engagement,
 *         Siblings Comparison, Volunteer Programs, Daily Reports,
 *         Medical Appointments, Suggestion Box, Parent Training,
 *         Child Safety, Learning Paths, Communication Preferences,
 *         Gifted Program, Sleep & Wellbeing, Social Skills,
 *         Budget Planning
 */

jest.unmock('mongoose');

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
let Guardian, Beneficiary, BeneficiaryProgress, PortalPayment, PortalMessage, PortalNotification;

const guardianId = new mongoose.Types.ObjectId();
const guardianIdStr = guardianId.toString();
let testBeneficiaryId;
let testBeneficiary2Id;
let testPaymentId;
let testMessageId;
let testNotificationId;
let _testProgressId;

const TEST_PREFIX = `GUAR-TEST-${Date.now()}`;

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Load models
  Guardian = require('../models/Guardian');
  Beneficiary = require('../models/Beneficiary');
  BeneficiaryProgress = require('../models/BeneficiaryProgress');
  PortalPayment = require('../models/PortalPayment');
  PortalMessage = require('../models/PortalMessage');
  PortalNotification = require('../models/PortalNotification');

  // Drop stale unique indexes on Beneficiary that are no longer in schema
  try {
    const col = mongoose.connection.collection('beneficiaries');
    const indexes = await col.indexes();
    for (const idx of indexes) {
      if (idx.name === 'email_1') {
        await col.dropIndex('email_1');
      }
    }
  } catch (_e) {
    // Index may not exist — ignore
  }

  const guardianRoutes = require('../routes/guardian.portal.routes');

  app = express();
  app.use(express.json());

  // Fake auth middleware — guardian
  app.use((req, _res, next) => {
    req.user = {
      _id: guardianId,
      id: guardianIdStr,
      name: 'ولي أمر اختبار',
      role: 'guardian',
      roles: ['guardian'],
    };
    next();
  });

  app.use('/api/guardian', guardianRoutes);

  // Error handler
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  // ─── Create test data ─────────────────────────────────────────────

  // 1. Test beneficiary (child)
  const beneficiary = await Beneficiary.create({
    firstName: 'مستفيد',
    lastName: TEST_PREFIX,
    mrn: `MRN-${TEST_PREFIX}-1`,
    email: `ben1-${TEST_PREFIX}@test.com`,
    status: 'ACTIVE',
    dob: new Date('2015-03-20'),
  });
  testBeneficiaryId = beneficiary._id.toString();

  // 2. Second beneficiary for comparison tests
  const beneficiary2 = await Beneficiary.create({
    firstName: 'مستفيد',
    lastName: `ثاني ${TEST_PREFIX}`,
    mrn: `MRN-${TEST_PREFIX}-2`,
    email: `ben2-${TEST_PREFIX}@test.com`,
    status: 'ACTIVE',
    dob: new Date('2017-08-10'),
  });
  testBeneficiary2Id = beneficiary2._id.toString();

  // 3. Guardian document linked to both beneficiaries
  await Guardian.create({
    _id: guardianId,
    firstName_ar: 'أحمد',
    firstName_en: 'Ahmed',
    lastName_ar: 'الاختبار',
    lastName_en: 'AlTest',
    email: `guardian-${TEST_PREFIX}@test.com`,
    phone: '+971501234567',
    relationship: 'father',
    idNumber: `ID-${TEST_PREFIX}`,
    userId: new mongoose.Types.ObjectId(),
    beneficiaries: [beneficiary._id, beneficiary2._id],
    accountStatus: 'verified',
    isActive: true,
    isVerified: true,
    language: 'ar',
    totalPaid: 5000,
    totalDue: 2000,
    totalOverdue: 500,
  });

  // 4. Beneficiary progress records
  const progress = await BeneficiaryProgress.create({
    beneficiaryId: beneficiary._id,
    month: '2026-01',
    academicScore: 85,
    previousMonthScore: 80,
    scoreImprovement: 5,
    attendanceRate: 92,
    behaviorRating: 8,
    absenceDays: 2,
    lateDays: 1,
    overallPerformance: 'good',
    reportGenerated: true,
    reportGeneratedAt: new Date(),
    reportSentToGuardian: true,
  });
  _testProgressId = progress._id.toString();

  // Second month progress
  await BeneficiaryProgress.create({
    beneficiaryId: beneficiary._id,
    month: '2026-02',
    academicScore: 88,
    previousMonthScore: 85,
    scoreImprovement: 3,
    attendanceRate: 95,
    behaviorRating: 9,
    absenceDays: 1,
    lateDays: 0,
    overallPerformance: 'excellent',
  });

  // Progress for second beneficiary
  await BeneficiaryProgress.create({
    beneficiaryId: beneficiary2._id,
    month: '2026-01',
    academicScore: 78,
    attendanceRate: 88,
    behaviorRating: 7,
    absenceDays: 3,
    lateDays: 2,
    overallPerformance: 'satisfactory',
  });

  // 5. Portal payment (pending)
  const payment = await PortalPayment.create({
    guardianId,
    beneficiaryId: beneficiary._id,
    amount: 1500,
    description: `دفعة اختبار ${TEST_PREFIX}`,
    invoiceNumber: `INV-${TEST_PREFIX}-1`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'pending',
  });
  testPaymentId = payment._id.toString();

  // Overdue payment
  await PortalPayment.create({
    guardianId,
    beneficiaryId: beneficiary._id,
    amount: 500,
    description: `دفعة متأخرة ${TEST_PREFIX}`,
    invoiceNumber: `INV-${TEST_PREFIX}-2`,
    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    status: 'overdue',
  });

  // Paid payment
  await PortalPayment.create({
    guardianId,
    beneficiaryId: beneficiary._id,
    amount: 1000,
    description: `دفعة مدفوعة ${TEST_PREFIX}`,
    invoiceNumber: `INV-${TEST_PREFIX}-3`,
    dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    status: 'paid',
    amountPaid: 1000,
    paidDate: new Date(),
  });

  // 6. Portal message
  const message = await PortalMessage.create({
    fromId: guardianId,
    fromModel: 'Guardian',
    toId: new mongoose.Types.ObjectId(),
    toModel: 'User',
    subject: `رسالة اختبار ${TEST_PREFIX}`,
    message: 'محتوى الرسالة الاختبارية',
    messageType: 'general',
    priority: 'normal',
  });
  testMessageId = message._id.toString();

  // Received message (to guardian)
  await PortalMessage.create({
    fromId: new mongoose.Types.ObjectId(),
    fromModel: 'User',
    toId: guardianId,
    toModel: 'Guardian',
    subject: `رد على ${TEST_PREFIX}`,
    message: 'رد من الإدارة',
    messageType: 'general',
  });

  // 7. Portal notifications
  const notification = await PortalNotification.create({
    guardianId,
    beneficiaryId: beneficiary._id,
    type: 'attendance',
    title_ar: `تنبيه حضور ${TEST_PREFIX}`,
    title_en: `Attendance Alert ${TEST_PREFIX}`,
    message_ar: 'المستفيد غاب اليوم',
    message_en: 'Beneficiary was absent today',
    priority: 'high',
    isRead: false,
  });
  testNotificationId = notification._id.toString();

  // Read notification
  await PortalNotification.create({
    guardianId,
    beneficiaryId: beneficiary._id,
    type: 'grade',
    title_ar: `تنبيه درجات ${TEST_PREFIX}`,
    title_en: `Grade Alert ${TEST_PREFIX}`,
    message_ar: 'تم نشر الدرجات',
    message_en: 'Grades have been published',
    isRead: true,
    readAt: new Date(),
  });
}, 30000);

afterAll(async () => {
  try {
    await Guardian.deleteMany({ email: new RegExp(`guardian-GUAR-TEST-`) }).catch(() => {});
    await Beneficiary.deleteMany({ mrn: new RegExp(`^MRN-GUAR-TEST-`) }).catch(() => {});
    await BeneficiaryProgress.deleteMany({
      beneficiaryId: {
        $in: [testBeneficiaryId, testBeneficiary2Id]
          .filter(Boolean)
          .map(id => new mongoose.Types.ObjectId(id)),
      },
    }).catch(() => {});
    await PortalPayment.deleteMany({ guardianId }).catch(() => {});
    await PortalMessage.deleteMany({
      $or: [{ fromId: guardianId }, { toId: guardianId }],
    }).catch(() => {});
    await PortalNotification.deleteMany({ guardianId }).catch(() => {});

    // Cleanup dynamic model data
    const dynamicCollections = [
      'guardianappointments',
      'guardianschedules',
      'guardianexams',
      'guardianieps',
      'guardiansurveys',
      'guardianresources',
      'guardiansupporttickets',
      'guardianevents',
      'guardianfeedbacks',
      'guardiandocuments',
      'guardiantransportations',
      'guardianactivities',
      'guardianpermissionrequests',
      'guardianannouncements',
      'guardianteacherlinks',
      'guardianrewards',
    ];
    for (const col of dynamicCollections) {
      try {
        if (mongoose.connection.collections[col]) {
          await mongoose.connection.collections[col].deleteMany({ guardianId });
        }
      } catch (_e) {
        /* ignore */
      }
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Dashboard', () => {
  test('GET /api/guardian/dashboard — returns dashboard data', async () => {
    const res = await request(app).get('/api/guardian/dashboard').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/dashboard/summary — returns summary', async () => {
    const res = await request(app).get('/api/guardian/dashboard/summary').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/dashboard/overview — returns overview', async () => {
    const res = await request(app).get('/api/guardian/dashboard/overview').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/dashboard/stats — returns statistics', async () => {
    const res = await request(app).get('/api/guardian/dashboard/stats').expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Profile', () => {
  test('GET /api/guardian/profile — returns guardian profile', async () => {
    const res = await request(app).get('/api/guardian/profile').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.firstName_ar).toBe('أحمد');
  });

  test('PUT /api/guardian/profile — updates profile fields', async () => {
    const res = await request(app)
      .put('/api/guardian/profile')
      .send({ phone: '+971509876543' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/guardian/profile/photo — 400 without file upload', async () => {
    const res = await request(app).put('/api/guardian/profile/photo').send({}).expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No file');
  });

  test('GET /api/guardian/profile/download — downloads profile data', async () => {
    const res = await request(app).get('/api/guardian/profile/download').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.guardian).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BENEFICIARIES
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Beneficiaries', () => {
  test('GET /api/guardian/beneficiaries — lists linked beneficiaries', async () => {
    const res = await request(app).get('/api/guardian/beneficiaries').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test('GET /api/guardian/beneficiaries/:beneficiaryId — returns beneficiary detail', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id — 403 for unlinked beneficiary', async () => {
    const unlinkedId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/beneficiaries/${unlinkedId}`).expect(403);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/guardian/beneficiaries/link — links a new beneficiary', async () => {
    const newBen = await Beneficiary.create({
      firstName: 'ربط',
      lastName: `اختبار ${TEST_PREFIX}`,
      mrn: `MRN-${TEST_PREFIX}-LINK`,
      email: `link-${TEST_PREFIX}@test.com`,
      status: 'ACTIVE',
    });
    const res = await request(app)
      .post('/api/guardian/beneficiaries/link')
      .send({ beneficiaryId: newBen._id.toString() })
      .expect(201);
    expect(res.body.success).toBe(true);

    // Cleanup
    await Guardian.findByIdAndUpdate(guardianId, { $pull: { beneficiaries: newBen._id } });
    await Beneficiary.findByIdAndDelete(newBen._id);
  });

  test('POST /api/guardian/beneficiaries/link — 400 when no beneficiaryId', async () => {
    const res = await request(app).post('/api/guardian/beneficiaries/link').send({}).expect(400);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/guardian/beneficiaries/:id/unlink — unlinks beneficiary', async () => {
    // Link a temp beneficiary first
    const tempBen = await Beneficiary.create({
      firstName: 'فك',
      lastName: `ربط ${TEST_PREFIX}`,
      mrn: `MRN-${TEST_PREFIX}-UNLINK`,
      email: `unlink-${TEST_PREFIX}@test.com`,
      status: 'ACTIVE',
    });
    await Guardian.findByIdAndUpdate(guardianId, { $push: { beneficiaries: tempBen._id } });

    const res = await request(app)
      .delete(`/api/guardian/beneficiaries/${tempBen._id}/unlink`)
      .expect(200);
    expect(res.body.success).toBe(true);

    await Beneficiary.findByIdAndDelete(tempBen._id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Progress', () => {
  test('GET /api/guardian/beneficiaries/:id/progress — returns latest progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/progress — 403 for unlinked', async () => {
    const unlinkedId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${unlinkedId}/progress`)
      .expect(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/guardian/beneficiaries/:id/progress/monthly — returns monthly history', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/progress/monthly`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/guardian/beneficiaries/:id/progress/trend — returns trend data', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/progress/trend`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Grades', () => {
  test('GET /api/guardian/beneficiaries/:id/grades — returns grades list', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/grades`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/grades/summary — returns grades summary', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/grades/summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.average).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/grades/comparison — compares grades', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/grades/comparison`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Attendance', () => {
  test('GET /api/guardian/beneficiaries/:id/attendance — returns attendance', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/attendance`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/attendance/summary — returns summary', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/attendance/summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/attendance/report — returns report', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/attendance/report`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Behavior', () => {
  test('GET /api/guardian/beneficiaries/:id/behavior — returns behavior data', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/behavior`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/behavior/summary — returns summary', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/behavior/summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Reports', () => {
  test('GET /api/guardian/reports — returns reports list', async () => {
    const res = await request(app).get('/api/guardian/reports').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/reports/monthly — returns monthly reports', async () => {
    const res = await request(app).get('/api/guardian/reports/monthly').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/reports/generate — generates a report', async () => {
    const res = await request(app)
      .post('/api/guardian/reports/generate')
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/reports/generate — 400 when no beneficiaryId', async () => {
    const res = await request(app).post('/api/guardian/reports/generate').send({}).expect(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/guardian/reports/schedule — schedules report', async () => {
    const res = await request(app)
      .post('/api/guardian/reports/schedule')
      .send({ beneficiaryId: testBeneficiaryId, frequency: 'weekly' })
      .expect(201);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS / FINANCIAL
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Payments', () => {
  test('GET /api/guardian/payments — returns paginated payments', async () => {
    const res = await request(app).get('/api/guardian/payments').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  test('GET /api/guardian/payments/:paymentId — returns payment detail', async () => {
    const res = await request(app).get(`/api/guardian/payments/${testPaymentId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/payments/status/pending — returns pending payments', async () => {
    const res = await request(app).get('/api/guardian/payments/status/pending').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/payments/status/overdue — returns overdue payments', async () => {
    const res = await request(app).get('/api/guardian/payments/status/overdue').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/payments/:paymentId/pay — processes payment', async () => {
    const res = await request(app)
      .post(`/api/guardian/payments/${testPaymentId}/pay`)
      .send({ amount: 500, paymentMethod: 'credit_card' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/payments/:paymentId/pay — 400 missing fields', async () => {
    const res = await request(app)
      .post(`/api/guardian/payments/${testPaymentId}/pay`)
      .send({})
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/guardian/payments/:paymentId/invoice — requests invoice', async () => {
    const res = await request(app)
      .post(`/api/guardian/payments/${testPaymentId}/invoice`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/payments/:paymentId/receipt — gets receipt', async () => {
    const res = await request(app)
      .get(`/api/guardian/payments/${testPaymentId}/receipt`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/payments/:paymentId/refund — requests refund', async () => {
    const res = await request(app)
      .post(`/api/guardian/payments/${testPaymentId}/refund`)
      .send({ reason: 'طلب استرجاع' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Guardian Portal — Financial', () => {
  test('GET /api/guardian/financial/summary — returns financial summary', async () => {
    const res = await request(app).get('/api/guardian/financial/summary').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalPaid).toBeDefined();
  });

  test('GET /api/guardian/financial/balance — returns balance info', async () => {
    const res = await request(app).get('/api/guardian/financial/balance').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/financial/history — returns payment history', async () => {
    const res = await request(app).get('/api/guardian/financial/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/financial/forecast — returns forecast', async () => {
    const res = await request(app).get('/api/guardian/financial/forecast').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Messages', () => {
  test('GET /api/guardian/messages — returns messages', async () => {
    const res = await request(app).get('/api/guardian/messages').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/guardian/messages/:messageId — returns message detail', async () => {
    const res = await request(app).get(`/api/guardian/messages/${testMessageId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/messages — sends a new message', async () => {
    const res = await request(app)
      .post('/api/guardian/messages')
      .send({
        toId: new mongoose.Types.ObjectId().toString(),
        toModel: 'User',
        subject: `رسالة جديدة ${TEST_PREFIX}`,
        message: 'محتوى الرسالة الجديدة',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Cleanup
    if (res.body.data && res.body.data._id) {
      await PortalMessage.findByIdAndDelete(res.body.data._id).catch(() => {});
    }
  });

  test('PUT /api/guardian/messages/:messageId/read — marks message as read', async () => {
    const res = await request(app).put(`/api/guardian/messages/${testMessageId}/read`).expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/guardian/messages/:messageId/archive — archives message', async () => {
    const res = await request(app)
      .put(`/api/guardian/messages/${testMessageId}/archive`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/guardian/messages/:messageId — deletes message', async () => {
    // Create a temp message to delete
    const temp = await PortalMessage.create({
      fromId: guardianId,
      fromModel: 'Guardian',
      toId: new mongoose.Types.ObjectId(),
      toModel: 'User',
      subject: `حذف ${TEST_PREFIX}`,
      message: 'سيتم حذف هذه الرسالة',
    });
    const res = await request(app).delete(`/api/guardian/messages/${temp._id}`).expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Notifications', () => {
  test('GET /api/guardian/notifications — returns notifications', async () => {
    const res = await request(app).get('/api/guardian/notifications').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/guardian/notifications/unread — returns unread notifications', async () => {
    const res = await request(app).get('/api/guardian/notifications/unread').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeDefined();
  });

  test('PUT /api/guardian/notifications/:id/read — marks notification as read', async () => {
    const res = await request(app)
      .put(`/api/guardian/notifications/${testNotificationId}/read`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/guardian/notifications/read-all — marks all as read', async () => {
    const res = await request(app).put('/api/guardian/notifications/read-all').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/notifications/preferences — returns preferences', async () => {
    const res = await request(app).get('/api/guardian/notifications/preferences').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PUT /api/guardian/notifications/preferences — updates preferences', async () => {
    const res = await request(app)
      .put('/api/guardian/notifications/preferences')
      .send({
        notificationPreference: { email: true, sms: false, push: true },
        language: 'en',
      })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Settings', () => {
  test('GET /api/guardian/settings — returns account settings', async () => {
    const res = await request(app).get('/api/guardian/settings').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PATCH /api/guardian/settings — updates settings', async () => {
    const res = await request(app)
      .patch('/api/guardian/settings')
      .send({ language: 'en' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PATCH /api/guardian/settings/language — changes language', async () => {
    const res = await request(app)
      .patch('/api/guardian/settings/language')
      .send({ language: 'ar' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Analytics', () => {
  test('GET /api/guardian/analytics/dashboard — returns analytics dashboard', async () => {
    const res = await request(app).get('/api/guardian/analytics/dashboard').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.beneficiaryCount).toBeDefined();
  });

  test('GET /api/guardian/analytics/performance — returns performance analytics', async () => {
    const res = await request(app).get('/api/guardian/analytics/performance').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/analytics/financial — returns financial analytics', async () => {
    const res = await request(app).get('/api/guardian/analytics/financial').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/analytics/attendance — returns attendance analytics', async () => {
    const res = await request(app).get('/api/guardian/analytics/attendance').expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS (المواعيد)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Appointments', () => {
  let testAppointmentId;

  test('GET /api/guardian/appointments — returns appointments list', async () => {
    const res = await request(app).get('/api/guardian/appointments').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/appointments — books a new appointment', async () => {
    const res = await request(app)
      .post('/api/guardian/appointments')
      .send({
        beneficiaryId: testBeneficiaryId,
        appointmentType: 'teacher_meeting',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '10:00',
        staffId: new mongoose.Types.ObjectId().toString(),
        notes: 'اجتماع اختبار',
      });
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      testAppointmentId = res.body.data._id;
    }
  });

  test('GET /api/guardian/appointments/:id — returns appointment detail', async () => {
    if (!testAppointmentId) return;
    const res = await request(app)
      .get(`/api/guardian/appointments/${testAppointmentId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/appointments/available-slots — returns available slots', async () => {
    const res = await request(app).get('/api/guardian/appointments/available-slots').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/appointments/history — returns past appointments', async () => {
    const res = await request(app).get('/api/guardian/appointments/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/guardian/appointments/:id/cancel — cancels appointment', async () => {
    if (!testAppointmentId) return;
    const res = await request(app)
      .put(`/api/guardian/appointments/${testAppointmentId}/cancel`)
      .send({ reason: 'اختبار الإلغاء' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE (الجدول)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Schedule', () => {
  test('GET /api/guardian/beneficiaries/:id/schedule — returns daily schedule', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/schedule`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/schedule/weekly — returns weekly schedule', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/schedule/weekly`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/schedule/exams — returns exams', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/schedule/exams`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/schedule — 403 for unlinked', async () => {
    const unlinkedId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${unlinkedId}/schedule`)
      .expect(403);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IEP (الخطة التعليمية الفردية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — IEP', () => {
  test('GET /api/guardian/beneficiaries/:id/iep — returns IEP', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/iep`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/iep/goals — returns IEP goals', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/iep/goals`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/iep/progress — returns IEP progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/iep/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/beneficiaries/:id/iep/feedback — submits IEP feedback', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/iep/feedback`)
      .send({
        rating: 4,
        comment: 'الخطة ممتازة',
        goalFeedback: [],
      });
    expect([201, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/iep — 403 for unlinked', async () => {
    const unlinkedId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/beneficiaries/${unlinkedId}/iep`).expect(403);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SURVEYS (الاستبيانات)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Surveys', () => {
  test('GET /api/guardian/surveys — returns surveys list', async () => {
    const res = await request(app).get('/api/guardian/surveys').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/surveys/history — returns survey history', async () => {
    const res = await request(app).get('/api/guardian/surveys/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/surveys/:id — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/surveys/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCES (المكتبة الإلكترونية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Resources', () => {
  test('GET /api/guardian/resources — returns resources list', async () => {
    const res = await request(app).get('/api/guardian/resources').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/resources/categories — returns resource categories', async () => {
    const res = await request(app).get('/api/guardian/resources/categories').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/resources/:id — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/resources/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/guardian/resources/:id/bookmark — bookmarks resource', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/guardian/resources/${fakeId}/bookmark`);
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUPPORT TICKETS (طلبات الدعم)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Support Tickets', () => {
  let testTicketId;

  test('GET /api/guardian/support-tickets — returns tickets list', async () => {
    const res = await request(app).get('/api/guardian/support-tickets').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/support-tickets — creates a new ticket', async () => {
    const res = await request(app)
      .post('/api/guardian/support-tickets')
      .send({
        subject: `تذكرة اختبار ${TEST_PREFIX}`,
        description: 'وصف مشكلة اختبارية',
        category: 'technical',
        priority: 'high',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    testTicketId = res.body.data._id;
  });

  test('GET /api/guardian/support-tickets/:id — returns ticket detail', async () => {
    if (!testTicketId) return;
    const res = await request(app).get(`/api/guardian/support-tickets/${testTicketId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/support-tickets/:id/reply — replies to ticket', async () => {
    if (!testTicketId) return;
    const res = await request(app)
      .post(`/api/guardian/support-tickets/${testTicketId}/reply`)
      .send({ message: 'رد اختبار' })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/guardian/support-tickets/:id/close — closes ticket', async () => {
    if (!testTicketId) return;
    const res = await request(app)
      .put(`/api/guardian/support-tickets/${testTicketId}/close`)
      .send({ satisfactionRating: 5, closingNotes: 'تم الحل' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS (التقويم والأحداث)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Events', () => {
  test('GET /api/guardian/events — returns events list', async () => {
    const res = await request(app).get('/api/guardian/events').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/events/calendar — returns calendar data', async () => {
    const res = await request(app).get('/api/guardian/events/calendar').expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/events/:id — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/events/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/guardian/events/:id/rsvp — RSVPs to event', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/guardian/events/${fakeId}/rsvp`)
      .send({ attending: true, attendeeCount: 2 });
    // May be 200 or 404 depending on whether event exists
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK & COMPLAINTS (الاقتراحات والشكاوى)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Feedback & Complaints', () => {
  let testComplaintId;

  test('GET /api/guardian/feedback — returns feedback list', async () => {
    const res = await request(app).get('/api/guardian/feedback').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/feedback — submits feedback', async () => {
    const res = await request(app)
      .post('/api/guardian/feedback')
      .send({
        type: 'suggestion',
        subject: `اقتراح اختبار ${TEST_PREFIX}`,
        message: 'اقتراح لتحسين الخدمة',
        category: 'service',
        rating: 4,
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/complaints — submits complaint', async () => {
    const res = await request(app)
      .post('/api/guardian/complaints')
      .send({
        subject: `شكوى اختبار ${TEST_PREFIX}`,
        description: 'وصف شكوى اختبارية',
        category: 'service',
        priority: 'high',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    testComplaintId = res.body.data?._id;
  });

  test('GET /api/guardian/complaints — returns complaints list', async () => {
    const res = await request(app).get('/api/guardian/complaints').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/complaints/:id — returns complaint detail', async () => {
    if (!testComplaintId) return;
    const res = await request(app).get(`/api/guardian/complaints/${testComplaintId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS (المستندات)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Documents', () => {
  test('GET /api/guardian/documents — returns documents list', async () => {
    const res = await request(app).get('/api/guardian/documents').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/documents/categories — returns document categories', async () => {
    const res = await request(app).get('/api/guardian/documents/categories').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/documents/:id/download — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/documents/${fakeId}/download`).expect(404);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORTATION (متابعة النقل)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Transportation', () => {
  test('GET /api/guardian/transportation — returns transportation info', async () => {
    const res = await request(app).get('/api/guardian/transportation').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/transportation/tracking — returns tracking data', async () => {
    const res = await request(app).get('/api/guardian/transportation/tracking').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/transportation/schedule — returns bus schedule', async () => {
    const res = await request(app).get('/api/guardian/transportation/schedule').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/transportation/absence — reports absence', async () => {
    const res = await request(app)
      .post('/api/guardian/transportation/absence')
      .send({
        beneficiaryId: testBeneficiaryId,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        direction: 'both',
        reason: 'مرض',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITIES (الأنشطة اللاصفية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Activities', () => {
  test('GET /api/guardian/activities — returns activities list', async () => {
    const res = await request(app).get('/api/guardian/activities').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/activities/enrolled — returns enrolled activities', async () => {
    const res = await request(app).get('/api/guardian/activities/enrolled').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/activities/:id — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/activities/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERMISSION REQUESTS (طلبات الإذن)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Permission Requests', () => {
  let testPermissionId;

  test('GET /api/guardian/permission-requests — returns requests list', async () => {
    const res = await request(app).get('/api/guardian/permission-requests').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/permission-requests — creates permission request', async () => {
    const res = await request(app)
      .post('/api/guardian/permission-requests')
      .send({
        beneficiaryId: testBeneficiaryId,
        type: 'absence',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: 'موعد طبي',
      });
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      testPermissionId = res.body.data._id;
    }
  });

  test('GET /api/guardian/permission-requests/:id — returns request detail', async () => {
    if (!testPermissionId) return;
    const res = await request(app)
      .get(`/api/guardian/permission-requests/${testPermissionId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('DELETE /api/guardian/permission-requests/:id — cancels request', async () => {
    if (!testPermissionId) return;
    const res = await request(app)
      .delete(`/api/guardian/permission-requests/${testPermissionId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS (الإعلانات)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Announcements', () => {
  test('GET /api/guardian/announcements — returns announcements list', async () => {
    const res = await request(app).get('/api/guardian/announcements').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/announcements/:id — returns 404 for non-existent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/announcements/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEACHERS (التواصل مع المعلمين)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Teachers', () => {
  test('GET /api/guardian/teachers — returns teachers list', async () => {
    const res = await request(app).get('/api/guardian/teachers').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/teachers/:id/message — sends message to teacher', async () => {
    const teacherId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/guardian/teachers/${teacherId}/message`)
      .send({
        subject: `رسالة معلم ${TEST_PREFIX}`,
        message: 'استفسار عن التقدم',
        beneficiaryId: testBeneficiaryId,
      });
    expect([201, 500]).toContain(res.status);
  });

  test('GET /api/guardian/teachers/:id/messages — returns teacher messages', async () => {
    const teacherId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/teachers/${teacherId}/messages`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REWARDS (نظام المكافآت)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Rewards', () => {
  test('GET /api/guardian/rewards — returns rewards overview', async () => {
    const res = await request(app).get('/api/guardian/rewards').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/rewards/:beneficiaryId/history — returns reward history', async () => {
    const res = await request(app)
      .get(`/api/guardian/rewards/${testBeneficiaryId}/history`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY (الطوارئ)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Emergency', () => {
  test('GET /api/guardian/emergency-contacts — returns emergency contacts', async () => {
    const res = await request(app).get('/api/guardian/emergency-contacts').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PUT /api/guardian/emergency-contacts — updates emergency contacts', async () => {
    const res = await request(app)
      .put('/api/guardian/emergency-contacts')
      .send({
        contacts: [
          { name: 'محمد', phone: '+971501111111', relationship: 'uncle' },
          { name: 'فاطمة', phone: '+971502222222', relationship: 'aunt' },
        ],
      })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/emergency-alert — sends emergency alert', async () => {
    const res = await request(app).post('/api/guardian/emergency-alert').send({
      beneficiaryId: testBeneficiaryId,
      type: 'medical',
      message: 'حالة طوارئ اختبار',
    });
    expect([201, 400]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH RECORDS (السجل الصحي)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Health Records', () => {
  test('GET /api/guardian/beneficiaries/:id/health — returns health records', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/health`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/health/medications — returns medications', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/health/medications`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/health/allergies — returns allergies', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/health/allergies`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/health/vaccinations — returns vaccinations', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/health/vaccinations`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/health/incident — reports health incident', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/health/incident`)
      .send({
        type: 'allergy_reaction',
        description: 'حساسية من الفول السوداني',
        severity: 'moderate',
      });
    expect([201, 400]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/health/summary — returns health summary', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/health/summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// THERAPY SESSIONS (الجلسات العلاجية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Therapy Sessions', () => {
  test('GET /api/guardian/beneficiaries/:id/therapy — returns therapy sessions', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/therapy`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/therapy/:sid — returns session detail', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/therapy/${sessionId}`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/beneficiaries/:id/therapy/:sid/rate — rates therapy session', async () => {
    const sessionId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/therapy/${sessionId}/rate`)
      .send({ rating: 5, comment: 'جلسة ممتازة' });
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/therapy/upcoming — returns upcoming sessions', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/therapy/upcoming`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/therapy/progress — returns therapy progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/therapy/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MEAL PLANS (خطة التغذية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Meal Plans', () => {
  test('GET /api/guardian/beneficiaries/:id/meals — returns meal plan', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/meals`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/meals/dietary — returns dietary info', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/meals/dietary`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/guardian/beneficiaries/:id/meals/dietary — updates dietary preferences', async () => {
    const res = await request(app)
      .put(`/api/guardian/beneficiaries/${testBeneficiaryId}/meals/dietary`)
      .send({ allergies: ['dairy', 'nuts'], preferences: ['halal'] })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/meals/request — requests special meal', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/meals/request`)
      .send({ date: '2026-04-01', mealType: 'lunch', notes: 'وجبة خاصة بدون مكسرات' });
    expect([201, 400]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/meals/nutrition — returns nutrition report', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/meals/nutrition`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GALLERY (معرض الصور)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Gallery', () => {
  test('GET /api/guardian/gallery — returns gallery items', async () => {
    const res = await request(app).get('/api/guardian/gallery').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/gallery/albums — returns albums', async () => {
    const res = await request(app).get('/api/guardian/gallery/albums').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/gallery/:id — returns gallery item detail', async () => {
    const mediaId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/gallery/${mediaId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/gallery/:id/download — initiates download', async () => {
    const mediaId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/guardian/gallery/${mediaId}/download`);
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HOMEWORK (الواجبات والمهام)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Homework', () => {
  test('GET /api/guardian/beneficiaries/:id/homework — returns homework list', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/homework`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/homework/:hid — returns homework detail', async () => {
    const hwId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/homework/${hwId}`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/homework/pending — returns pending homework', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/homework/pending`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/homework/:hid/acknowledge — acknowledges homework', async () => {
    const hwId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/homework/${hwId}/acknowledge`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/homework/stats — returns homework stats', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/homework/stats`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CERTIFICATES (الشهادات والإنجازات)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Certificates', () => {
  test('GET /api/guardian/beneficiaries/:id/certificates — returns certificates', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/certificates`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/certificates/:cid — returns cert detail', async () => {
    const certId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/certificates/${certId}`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/certificates/:cid/download — downloads cert', async () => {
    const certId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/certificates/${certId}/download`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/achievements — returns achievements', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/achievements`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VISITOR PASS (تصاريح الزيارة)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Visitor Pass', () => {
  test('GET /api/guardian/visitor-passes — returns visitor passes', async () => {
    const res = await request(app).get('/api/guardian/visitor-passes').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/visitor-passes — requests a visitor pass', async () => {
    const res = await request(app)
      .post('/api/guardian/visitor-passes')
      .send({
        visitorName: 'عمر أحمد',
        relationship: 'uncle',
        visitDate: '2026-04-15',
        purpose: 'زيارة المستفيد',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/visitor-passes/:id — returns pass detail', async () => {
    const passId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/visitor-passes/${passId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('DELETE /api/guardian/visitor-passes/:id — cancels visitor pass', async () => {
    const passId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/guardian/visitor-passes/${passId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/visitor-passes/upcoming — returns upcoming visits', async () => {
    const res = await request(app).get('/api/guardian/visitor-passes/upcoming').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FACILITY BOOKING (حجز المرافق)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Facility Booking', () => {
  test('GET /api/guardian/facilities — returns available facilities', async () => {
    const res = await request(app).get('/api/guardian/facilities').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/facilities/book — books a facility', async () => {
    const res = await request(app).post('/api/guardian/facilities/book').send({
      facilityName: 'قاعة الاجتماعات 1',
      date: '2026-04-20',
      startTime: '10:00',
      endTime: '11:00',
      purpose: 'اجتماع مع المعلم',
    });
    expect([201, 409]).toContain(res.status);
  });

  test('GET /api/guardian/facilities/bookings — returns my bookings', async () => {
    const res = await request(app).get('/api/guardian/facilities/bookings').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('DELETE /api/guardian/facilities/bookings/:id — cancels a booking', async () => {
    const bookingId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/guardian/facilities/bookings/${bookingId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/facilities/availability — checks availability', async () => {
    const res = await request(app)
      .get(
        `/api/guardian/facilities/availability?facilityName=${encodeURIComponent('قاعة 1')}&date=2026-04-20`
      )
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SATISFACTION (تقييم الرضا)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Satisfaction', () => {
  test('GET /api/guardian/satisfaction — returns satisfaction ratings', async () => {
    const res = await request(app).get('/api/guardian/satisfaction').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/satisfaction — submits satisfaction rating', async () => {
    const res = await request(app).post('/api/guardian/satisfaction').send({
      category: 'education',
      rating: 4,
      comment: 'خدمة تعليمية جيدة جداً',
    });
    expect([201, 400]).toContain(res.status);
  });

  test('GET /api/guardian/satisfaction/pending — returns pending evaluations', async () => {
    const res = await request(app).get('/api/guardian/satisfaction/pending').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/satisfaction/summary — returns satisfaction summary', async () => {
    const res = await request(app).get('/api/guardian/satisfaction/summary').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIC CALENDAR (التقويم الأكاديمي)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Academic Calendar', () => {
  test('GET /api/guardian/academic-calendar — returns calendar events', async () => {
    const res = await request(app).get('/api/guardian/academic-calendar').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/academic-calendar/holidays — returns holidays', async () => {
    const res = await request(app).get('/api/guardian/academic-calendar/holidays').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/academic-calendar/important-dates — returns important dates', async () => {
    const res = await request(app)
      .get('/api/guardian/academic-calendar/important-dates')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAMILY ENGAGEMENT (مشاركة الأسرة)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Family Engagement', () => {
  test('GET /api/guardian/family-engagement — returns engagement programs', async () => {
    const res = await request(app).get('/api/guardian/family-engagement').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/family-engagement/:id — returns program detail', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/family-engagement/${programId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/family-engagement/:id/enroll — enrolls in program', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/guardian/family-engagement/${programId}/enroll`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/family-engagement/home-activities — returns home activities', async () => {
    const res = await request(app)
      .get('/api/guardian/family-engagement/home-activities')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SIBLINGS COMPARISON (مقارنة الأشقاء)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Siblings Comparison', () => {
  test('GET /api/guardian/siblings/comparison — returns siblings comparison', async () => {
    const res = await request(app).get('/api/guardian/siblings/comparison').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/siblings/attendance-comparison — returns attendance comparison', async () => {
    const res = await request(app).get('/api/guardian/siblings/attendance-comparison').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/siblings/academic-comparison — returns academic comparison', async () => {
    const res = await request(app).get('/api/guardian/siblings/academic-comparison').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VOLUNTEER PROGRAMS (برامج التطوع)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Volunteer Programs', () => {
  test('GET /api/guardian/volunteer-programs — returns volunteer programs', async () => {
    const res = await request(app).get('/api/guardian/volunteer-programs').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/volunteer-programs/:id — returns program detail', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/volunteer-programs/${programId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/volunteer-programs/:id/enroll — enrolls in program', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/guardian/volunteer-programs/${programId}/enroll`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/volunteer-programs/history — returns volunteer history', async () => {
    const res = await request(app).get('/api/guardian/volunteer-programs/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/volunteer-programs/:id/certificate — returns certificate', async () => {
    const programId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/volunteer-programs/${programId}/certificate`);
    expect([200, 404]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DAILY REPORTS (التقارير اليومية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Daily Reports', () => {
  test('GET /api/guardian/beneficiaries/:id/daily-reports — returns daily reports', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/daily-reports`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/daily-reports/:rid — returns report detail', async () => {
    const reportId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/daily-reports/${reportId}`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/daily-reports/by-date — returns by date', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/daily-reports/by-date?date=2026-03-18`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/daily-reports/subscribe — subscribes', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/daily-reports/subscribe`)
      .send({ channels: ['email', 'sms'], frequency: 'daily' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/daily-reports/summary — returns summary', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/daily-reports/summary`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MEDICAL APPOINTMENTS (المواعيد الطبية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Medical Appointments', () => {
  test('GET /api/guardian/medical-appointments — returns medical appointments', async () => {
    const res = await request(app).get('/api/guardian/medical-appointments');
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/guardian/medical-appointments — books appointment', async () => {
    const res = await request(app)
      .post('/api/guardian/medical-appointments')
      .send({
        beneficiaryId: testBeneficiaryId,
        doctorName: 'د. أحمد محمد',
        specialty: 'pediatrics',
        appointmentDate: '2026-04-01',
        appointmentTime: '10:00',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/medical-appointments/:id — returns appointment detail', async () => {
    const aptId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/medical-appointments/${aptId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('DELETE /api/guardian/medical-appointments/:id — cancels appointment', async () => {
    const aptId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/guardian/medical-appointments/${aptId}`)
      .send({ reason: 'تعارض مواعيد' });
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/medical-history — returns medical history', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/medical-history`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTION BOX (صندوق الاقتراحات)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Suggestion Box', () => {
  test('GET /api/guardian/suggestions — returns suggestions', async () => {
    const res = await request(app).get('/api/guardian/suggestions').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/suggestions — submits suggestion', async () => {
    const res = await request(app)
      .post('/api/guardian/suggestions')
      .send({
        title: 'اقتراح تحسين الخدمة',
        description: 'تحسين نظام التواصل مع المعلمين',
        category: 'communication',
        priority: 'high',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/suggestions/:id — returns suggestion detail', async () => {
    const sugId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/suggestions/${sugId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/suggestions/stats — returns suggestion stats', async () => {
    const res = await request(app).get('/api/guardian/suggestions/stats').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PARENT TRAINING (تدريب أولياء الأمور)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Parent Training', () => {
  test('GET /api/guardian/parent-training — returns training courses', async () => {
    const res = await request(app).get('/api/guardian/parent-training').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/parent-training/:id — returns training detail', async () => {
    const tId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/parent-training/${tId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/parent-training/:id/enroll — enrolls in training', async () => {
    const tId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).post(`/api/guardian/parent-training/${tId}/enroll`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/parent-training/history — returns training history', async () => {
    const res = await request(app).get('/api/guardian/parent-training/history').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/parent-training/certificates — returns training certificates', async () => {
    const res = await request(app).get('/api/guardian/parent-training/certificates').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHILD SAFETY (سلامة الطفل)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Child Safety', () => {
  test('GET /api/guardian/safety/alerts — returns safety alerts', async () => {
    const res = await request(app).get('/api/guardian/safety/alerts');
    expect([200, 500]).toContain(res.status);
  });

  test('GET /api/guardian/safety/policies — returns safety policies', async () => {
    const res = await request(app).get('/api/guardian/safety/policies').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/safety/report — reports safety concern', async () => {
    const res = await request(app)
      .post('/api/guardian/safety/report')
      .send({
        beneficiaryId: testBeneficiaryId,
        description: 'ملاحظة بخصوص سلامة المبنى',
        severity: 'medium',
        category: 'facility',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/safety/concerns/:id — returns concern status', async () => {
    const cId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/safety/concerns/${cId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/safety/training — returns safety training', async () => {
    const res = await request(app).get('/api/guardian/safety/training').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING PATHS (المسارات التعليمية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Learning Paths', () => {
  test('GET /api/guardian/beneficiaries/:id/learning-paths — returns learning paths', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/learning-paths`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/learning-paths/:pid — returns path detail', async () => {
    const pathId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(
      `/api/guardian/beneficiaries/${testBeneficiaryId}/learning-paths/${pathId}`
    );
    expect([200, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/learning-paths/progress — returns learning progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/learning-paths/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/beneficiaries/:id/learning-paths/recommended — returns recommended resources', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/learning-paths/recommended`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/learning-paths/assessments — returns skill assessments', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/learning-paths/assessments`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATION PREFERENCES (تفضيلات التواصل)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Communication Preferences', () => {
  test('GET /api/guardian/communication-preferences — returns preferences', async () => {
    const res = await request(app).get('/api/guardian/communication-preferences').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PUT /api/guardian/communication-preferences — updates preferences', async () => {
    const res = await request(app)
      .put('/api/guardian/communication-preferences')
      .send({ emailNotifications: true, smsNotifications: false })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/communication-preferences/channels — returns channels', async () => {
    const res = await request(app)
      .get('/api/guardian/communication-preferences/channels')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PUT /api/guardian/communication-preferences/channels — updates channels', async () => {
    const res = await request(app)
      .put('/api/guardian/communication-preferences/channels')
      .send({ channels: ['email', 'push'] })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GIFTED PROGRAM (برنامج الموهوبين)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Gifted Program', () => {
  test('GET /api/guardian/gifted-programs — returns gifted programs', async () => {
    const res = await request(app).get('/api/guardian/gifted-programs').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/gifted-programs/:id — returns program detail', async () => {
    const pId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/guardian/gifted-programs/${pId}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/guardian/gifted-programs/:id/nominate — nominates beneficiary', async () => {
    const pId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/guardian/gifted-programs/${pId}/nominate`)
      .send({
        beneficiaryId: testBeneficiaryId,
        reason: 'تميز أكاديمي ملحوظ',
        skills: ['mathematics', 'science'],
      });
    expect([201, 404]).toContain(res.status);
  });

  test('GET /api/guardian/beneficiaries/:id/gifted/assessments — returns gifted assessments', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/gifted/assessments`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/gifted/progress — returns gifted progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/gifted/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SLEEP & WELLBEING (النوم والرفاهية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Sleep & Wellbeing', () => {
  test('GET /api/guardian/beneficiaries/:id/sleep-log — returns sleep log', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/sleep-log`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/sleep-log — adds sleep entry', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/sleep-log`)
      .send({ date: '2026-03-18', sleepTime: '21:00', wakeTime: '06:30', quality: 4 })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/wellbeing — returns wellbeing assessment', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/wellbeing`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/guardian/beneficiaries/:id/wellbeing — submits wellbeing assessment', async () => {
    const res = await request(app)
      .post(`/api/guardian/beneficiaries/${testBeneficiaryId}/wellbeing`)
      .send({ mood: 4, energy: 3, appetite: 4, socialInteraction: 5 })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/wellbeing/trend — returns wellbeing trend', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/wellbeing/trend`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL SKILLS (المهارات الاجتماعية)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Social Skills', () => {
  test('GET /api/guardian/beneficiaries/:id/social-skills — returns social skills report', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/social-skills`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/social-skills/goals — returns social skills goals', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/social-skills/goals`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/social-skills/progress — returns progress', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/social-skills/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/guardian/beneficiaries/:id/social-skills/peers — returns peer interactions', async () => {
    const res = await request(app)
      .get(`/api/guardian/beneficiaries/${testBeneficiaryId}/social-skills/peers`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET PLANNING (التخطيط المالي)
// ═══════════════════════════════════════════════════════════════════════════

describe('Guardian Portal — Budget Planning', () => {
  test('GET /api/guardian/budget-plan — returns budget plan', async () => {
    const res = await request(app).get('/api/guardian/budget-plan').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('POST /api/guardian/budget-plan — creates budget plan', async () => {
    const res = await request(app)
      .post('/api/guardian/budget-plan')
      .send({
        title: 'خطة الفصل الثاني',
        totalBudget: 5000,
        categories: [
          { name: 'رسوم', budget: 2000 },
          { name: 'مواصلات', budget: 1000 },
          { name: 'أنشطة', budget: 500 },
        ],
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/guardian/budget-plan/forecast — returns expense forecast', async () => {
    const res = await request(app).get('/api/guardian/budget-plan/forecast').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/guardian/budget-plan/analytics — returns budget analytics', async () => {
    const res = await request(app).get('/api/guardian/budget-plan/analytics').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
