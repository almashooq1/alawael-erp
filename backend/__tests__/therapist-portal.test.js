/**
 * Therapist Portal API — Integration Tests
 * Tests therapist portal routes + service layer
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
let TherapySession, Beneficiary, TherapistAvailability, SessionDocumentation;
let CaseManagement, TherapeuticPlan, TherapyProgram, Document, Message;

const therapistId = new mongoose.Types.ObjectId();
const therapistIdStr = therapistId.toString();
let testBeneficiaryId;
let testSessionId;
let testCaseId;
let _testDocumentId;
let testPlanId;
let _testAvailabilityId;
let _testDocumentationId;

const TEST_PREFIX = `THER-TEST-${Date.now()}`;

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Load models
  TherapySession = require('../models/TherapySession');
  Beneficiary = require('../models/Beneficiary');
  TherapistAvailability = require('../models/TherapistAvailability');
  SessionDocumentation = require('../models/SessionDocumentation');
  CaseManagement = require('../models/CaseManagement');
  TherapeuticPlan = require('../models/TherapeuticPlan');
  TherapyProgram = require('../models/TherapyProgram');
  Document = require('../models/Document');
  Message = require('../models/message.model');

  // Register model aliases for refs that use different names
  if (!mongoose.models.BeneficiaryFile) {
    mongoose.model('BeneficiaryFile', Beneficiary.schema);
  }

  const therapistRoutes = require('../routes/therapist');

  app = express();
  app.use(express.json());

  // Fake auth middleware — therapist
  app.use((req, _res, next) => {
    req.user = {
      _id: therapistId,
      id: therapistIdStr,
      name: 'معالج اختبار',
      fullName: 'معالج اختبار بوابة',
      role: 'therapist',
      roles: ['therapist'],
    };
    next();
  });

  app.use('/api/therapist', therapistRoutes);

  // ─── Create test data ─────────────────────────────────────────────

  // 1. Test beneficiary (patient)
  const beneficiary = await Beneficiary.create({
    firstName: 'مستفيد',
    lastName: TEST_PREFIX,
    mrn: `MRN-${TEST_PREFIX}`,
    status: 'active',
    dob: new Date('2010-05-15'),
    gender: 'male',
  });
  testBeneficiaryId = beneficiary._id.toString();

  // 2. Test therapy session (SCHEDULED — for today)
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const session = await TherapySession.create({
    therapist: therapistId,
    beneficiary: beneficiary._id,
    date: today,
    startTime: '10:00',
    endTime: '11:00',
    title: `جلسة ${TEST_PREFIX}`,
    sessionType: 'علاج طبيعي',
    status: 'SCHEDULED',
  });
  testSessionId = session._id.toString();

  // 3. A completed session (for reports/dashboard stats)
  await TherapySession.create({
    therapist: therapistId,
    beneficiary: beneficiary._id,
    date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    startTime: '09:00',
    endTime: '10:00',
    title: `جلسة مكتملة ${TEST_PREFIX}`,
    sessionType: 'علاج طبيعي',
    status: 'COMPLETED',
    rating: 4,
    notes: {
      subjective: 'يشعر بتحسن',
      objective: 'حركة جيدة',
      assessment: 'تقدم ملحوظ',
      plan: 'متابعة الأسبوع القادم',
    },
  });

  // 4. Therapist availability
  const avail = await TherapistAvailability.create({
    therapist: therapistId,
    recurringSchedule: [
      {
        dayOfWeek: 'SUNDAY',
        startTime: '08:00',
        endTime: '16:00',
        isActive: true,
      },
      {
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '16:00',
        isActive: true,
      },
    ],
    preferences: {
      maxSessionsPerDay: 6,
      minBreakBetweenSessions: 15,
      preferredSessionDuration: 45,
      specializations: ['علاج طبيعي'],
      languages: ['العربية', 'English'],
    },
  });
  _testAvailabilityId = avail._id.toString();

  // 5. Case management
  const cs = await CaseManagement.create({
    caseNumber: `CASE-${TEST_PREFIX}`,
    beneficiary: { name: `حالة ${TEST_PREFIX}` },
    status: 'نشطة',
    priority: 'عالية',
    description: `حالة اختبار بوابة المعالج ${TEST_PREFIX}`,
    team: [
      {
        member: therapistId,
        role: 'معالج',
        assignedDate: new Date(),
        active: true,
      },
    ],
  });
  testCaseId = cs._id.toString();

  // 6. Therapy program (needed by TherapeuticPlan)
  const program = await TherapyProgram.create({
    name: `برنامج تأهيلي ${TEST_PREFIX}`,
    code: `PRG-${TEST_PREFIX}`,
  });

  // 7. Therapeutic plan
  const plan = await TherapeuticPlan.create({
    beneficiary: beneficiary._id,
    program: program._id,
    assignedTherapists: [therapistId],
    status: 'ACTIVE',
    goals: [
      {
        description: 'تحسين المشي',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        progress: 40,
      },
      {
        description: 'تقوية العضلات',
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'PENDING',
        progress: 0,
      },
    ],
  });
  testPlanId = plan._id.toString();

  // 8. Session documentation (SOAP)
  const doc = await SessionDocumentation.create({
    session: session._id,
    beneficiary: beneficiary._id,
    therapist: therapistId,
    soapNote: {
      subjective: { patientReports: 'يشعر بألم خفيف' },
      objective: { observations: 'حركة محدودة' },
      assessment: { progressSummary: 'تحسن بطيء' },
      plan: { homeProgram: 'تمارين يومية' },
    },
    documentedBy: therapistId,
    documentedAt: new Date(),
    quality: { isComplete: true },
  });
  _testDocumentationId = doc._id.toString();
}, 30000);

afterAll(async () => {
  try {
    // Cleanup test data
    await TherapySession.deleteMany({ therapist: therapistId }).catch(() => {});
    await Beneficiary.deleteMany({ mrn: new RegExp(`^MRN-THER-TEST-`) }).catch(() => {});
    await TherapistAvailability.deleteMany({ therapist: therapistId }).catch(() => {});
    await SessionDocumentation.deleteMany({ therapist: therapistId }).catch(() => {});
    await CaseManagement.deleteMany({ description: new RegExp(`THER-TEST-`) }).catch(() => {});
    await TherapeuticPlan.deleteMany({ assignedTherapists: therapistId }).catch(() => {});
    await TherapyProgram.deleteMany({ name: new RegExp(`${TEST_PREFIX}`) }).catch(() => {});
    await Document.deleteMany({ uploadedBy: therapistId }).catch(() => {});
    await Message.deleteMany({ sender: therapistId }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Dashboard', () => {
  test('GET /api/therapist/dashboard — returns dashboard data', async () => {
    const res = await request(app).get('/api/therapist/dashboard').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.therapist).toBeDefined();
    expect(res.body.data.therapist.id).toBe(therapistIdStr);
    expect(res.body.data.stats).toBeDefined();
    expect(res.body.data.stats).toHaveProperty('totalPatients');
    expect(res.body.data.stats).toHaveProperty('completedSessions');
    expect(res.body.data.stats).toHaveProperty('completionRate');
    expect(res.body.data.stats).toHaveProperty('averageRating');
    expect(res.body.data.stats).toHaveProperty('pendingReports');
    expect(res.body.data.monthlyStats).toBeDefined();
    expect(typeof res.body.data.stats.totalPatients).toBe('number');
    expect(res.body.data.stats.totalPatients).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Patients
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Patients', () => {
  test('GET /api/therapist/patients — returns patient list', async () => {
    const res = await request(app).get('/api/therapist/patients').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const patient = res.body.data.find(p => p._id === testBeneficiaryId);
    expect(patient).toBeDefined();
    expect(patient).toHaveProperty('sessionCount');
    expect(patient.sessionCount).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/therapist/patients/:patientId — returns single patient', async () => {
    const res = await request(app).get(`/api/therapist/patients/${testBeneficiaryId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toContain(TEST_PREFIX);
    expect(res.body.data).toHaveProperty('recentSessions');
    expect(res.body.data).toHaveProperty('activePlans');
    expect(res.body.data).toHaveProperty('stats');
    expect(res.body.data.stats.totalSessions).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/therapist/patients/invalid — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/therapist/patients/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/therapist/patients/:patientId/progress — returns progress data', async () => {
    const res = await request(app)
      .get(`/api/therapist/patients/${testBeneficiaryId}/progress`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('totalSessions');
    expect(res.body.data).toHaveProperty('goals');
    expect(res.body.data.goals).toHaveProperty('total');
    expect(res.body.data.goals).toHaveProperty('achieved');
    expect(res.body.data.goals).toHaveProperty('inProgress');
    expect(res.body.data).toHaveProperty('ratingTrend');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Schedule
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Schedule', () => {
  test('GET /api/therapist/schedule — returns schedule', async () => {
    const res = await request(app).get('/api/therapist/schedule').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/therapist/schedule — creates new scheduled session', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await request(app)
      .post('/api/therapist/schedule')
      .send({
        beneficiary: testBeneficiaryId,
        date: tomorrow.toISOString(),
        startTime: '14:00',
        endTime: '15:00',
        title: `موعد جديد ${TEST_PREFIX}`,
        sessionType: 'علاج طبيعي',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.startTime).toBe('14:00');
    expect(res.body.data.status).toBe('SCHEDULED');
  });

  test('POST /api/therapist/schedule — 400 for missing required fields', async () => {
    const res = await request(app).post('/api/therapist/schedule').send({ title: 'بدون تاريخ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/therapist/schedule/:sessionId — updates session', async () => {
    const res = await request(app)
      .put(`/api/therapist/schedule/${testSessionId}`)
      .send({ title: `موعد محدّث ${TEST_PREFIX}` })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toContain('محدّث');
  });

  test('PUT /api/therapist/schedule/:fakeId — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).put(`/api/therapist/schedule/${fakeId}`).send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/therapist/schedule/:sessionId — deletes session', async () => {
    // Create a disposable session to delete
    const sess = await TherapySession.create({
      therapist: therapistId,
      beneficiary: testBeneficiaryId,
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      startTime: '16:00',
      endTime: '17:00',
      status: 'SCHEDULED',
    });
    const res = await request(app).delete(`/api/therapist/schedule/${sess._id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('تم الحذف');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Availability
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Availability', () => {
  test('GET /api/therapist/availability — returns availability', async () => {
    const res = await request(app).get('/api/therapist/availability').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('recurringSchedule');
    expect(res.body.data).toHaveProperty('preferences');
    expect(res.body.data.recurringSchedule.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.preferences.maxSessionsPerDay).toBe(6);
  });

  test('PUT /api/therapist/availability — updates availability', async () => {
    const res = await request(app)
      .put('/api/therapist/availability')
      .send({
        preferences: {
          maxSessionsPerDay: 7,
          minBreakBetweenSessions: 20,
          specializations: ['علاج طبيعي', 'علاج وظيفي'],
          languages: ['العربية'],
        },
      })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.preferences.maxSessionsPerDay).toBe(7);
  });

  test('POST /api/therapist/availability/exceptions — adds exception', async () => {
    const res = await request(app)
      .post('/api/therapist/availability/exceptions')
      .send({
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'إجازة رسمية',
        isAvailable: false,
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.exceptions.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Sessions
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Sessions', () => {
  test('GET /api/therapist/sessions — returns paginated sessions', async () => {
    const res = await request(app).get('/api/therapist/sessions').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(typeof res.body.page).toBe('number');
    expect(typeof res.body.limit).toBe('number');
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/therapist/sessions?status=COMPLETED — filters by status', async () => {
    const res = await request(app).get('/api/therapist/sessions?status=COMPLETED').expect(200);
    expect(res.body.success).toBe(true);
    for (const s of res.body.data) {
      expect(s.status).toBe('COMPLETED');
    }
  });

  test('GET /api/therapist/sessions/:sessionId — returns single session with documentation', async () => {
    const res = await request(app).get(`/api/therapist/sessions/${testSessionId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(testSessionId);
    // Should include documentation from the SessionDocumentation we created
    expect(res.body.data).toHaveProperty('documentation');
  });

  test('GET /api/therapist/sessions/:fakeId — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/therapist/sessions/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('POST /api/therapist/sessions — saves session report (SOAP)', async () => {
    // Create a new session to report on
    const sess = await TherapySession.create({
      therapist: therapistId,
      beneficiary: testBeneficiaryId,
      date: new Date(),
      startTime: '11:00',
      endTime: '12:00',
      status: 'SCHEDULED',
    });
    const res = await request(app)
      .post('/api/therapist/sessions')
      .send({
        sessionId: sess._id.toString(),
        subjective: 'يشعر المريض بتحسن',
        objective: 'نطاق الحركة تحسن 10 درجات',
        assessment: 'استجابة جيدة للعلاج',
        plan: 'استمرار التمارين المنزلية',
        rating: 5,
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.rating).toBe(5);
  });

  test('POST /api/therapist/sessions — 400 without sessionId', async () => {
    const res = await request(app).post('/api/therapist/sessions').send({ subjective: 'test' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/therapist/sessions/:sessionId — updates session', async () => {
    const res = await request(app)
      .put(`/api/therapist/sessions/${testSessionId}`)
      .send({ title: `جلسة محدثة ${TEST_PREFIX}`, sessionType: 'علاج وظيفي' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionType).toBe('علاج وظيفي');
  });

  test('DELETE /api/therapist/sessions/:sessionId — deletes session', async () => {
    const sess = await TherapySession.create({
      therapist: therapistId,
      beneficiary: testBeneficiaryId,
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      startTime: '15:00',
      endTime: '16:00',
      status: 'SCHEDULED',
    });
    const res = await request(app).delete(`/api/therapist/sessions/${sess._id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('تم الحذف');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Session Documentation (SOAP)
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Documentation (SOAP)', () => {
  test('GET /api/therapist/sessions/:sessionId/documentation — returns SOAP data', async () => {
    const res = await request(app)
      .get(`/api/therapist/sessions/${testSessionId}/documentation`)
      .expect(200);
    expect(res.body.success).toBe(true);
    // We created documentation for testSessionId in beforeAll
    if (res.body.data) {
      expect(res.body.data.soapNote).toBeDefined();
    }
  });

  test('POST /api/therapist/sessions/:sessionId/documentation — creates SOAP doc', async () => {
    // Create a fresh session
    const sess = await TherapySession.create({
      therapist: therapistId,
      beneficiary: testBeneficiaryId,
      date: new Date(),
      startTime: '13:00',
      endTime: '14:00',
      status: 'COMPLETED',
    });
    const res = await request(app)
      .post(`/api/therapist/sessions/${sess._id}/documentation`)
      .send({
        soapNote: {
          subjective: { patientReports: 'ألم في الركبة' },
          objective: { observations: 'تورم خفيف' },
          assessment: { progressSummary: 'تحسن تدريجي' },
          plan: { homeProgram: 'كمادات باردة وتمارين' },
        },
        goalsAddressed: ['تحسين المشي'],
        isComplete: true,
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.soapNote).toBeDefined();
    expect(res.body.data.quality.isComplete).toBe(true);
  });

  test('POST /api/therapist/sessions/:fakeId/documentation — 404 for invalid session', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/therapist/sessions/${fakeId}/documentation`)
      .send({ soapNote: {} });
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Therapeutic Plans
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Therapeutic Plans', () => {
  test('GET /api/therapist/plans — returns plans assigned to therapist', async () => {
    const res = await request(app).get('/api/therapist/plans').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Should find our test plan
    const plan = res.body.data.find(p => p._id === testPlanId);
    expect(plan).toBeDefined();
  });

  test('GET /api/therapist/plans/:planId — returns single plan', async () => {
    const res = await request(app).get(`/api/therapist/plans/${testPlanId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.goals.length).toBe(2);
  });

  test('GET /api/therapist/plans/:fakeId — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/therapist/plans/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('PATCH /api/therapist/plans/:planId/goals/:goalId — updates goal progress', async () => {
    // Get the plan to find a goal ID
    const plan = await TherapeuticPlan.findById(testPlanId);
    const goalId = plan.goals[0]._id.toString();

    const res = await request(app)
      .patch(`/api/therapist/plans/${testPlanId}/goals/${goalId}`)
      .send({ status: 'IN_PROGRESS', progress: 60 })
      .expect(200);
    expect(res.body.success).toBe(true);
    const updatedGoal = res.body.data.goals.find(g => g._id === goalId);
    expect(updatedGoal.progress).toBe(60);
    expect(updatedGoal.status).toBe('IN_PROGRESS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Cases', () => {
  test('GET /api/therapist/cases — returns cases for therapist', async () => {
    const res = await request(app).get('/api/therapist/cases').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/therapist/cases/:caseId — returns single case', async () => {
    const res = await request(app).get(`/api/therapist/cases/${testCaseId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBe(testCaseId);
  });

  test('GET /api/therapist/cases/:fakeId — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/therapist/cases/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('PUT /api/therapist/cases/:caseId — updates case', async () => {
    const res = await request(app)
      .put(`/api/therapist/cases/${testCaseId}`)
      .send({ priority: 'عاجلة' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('عاجلة');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Documents
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Documents', () => {
  test('GET /api/therapist/documents — returns document list', async () => {
    const res = await request(app).get('/api/therapist/documents').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/therapist/documents — uploads document', async () => {
    const res = await request(app)
      .post('/api/therapist/documents')
      .send({
        title: `تقرير اختبار ${TEST_PREFIX}`,
        fileName: `report-${TEST_PREFIX}.pdf`,
        originalFileName: 'report.pdf',
        fileSize: 2048,
        filePath: `/uploads/therapist/report-${TEST_PREFIX}.pdf`,
        category: 'تقارير',
        description: 'تقرير اختبار بوابة المعالج',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    _testDocumentId = res.body.data._id;
  });

  test('DELETE /api/therapist/documents/:docId — deletes document', async () => {
    // First upload a doc to delete
    const doc = await Document.create({
      title: `حذف ${TEST_PREFIX}`,
      fileName: `del-${TEST_PREFIX}.pdf`,
      originalFileName: 'del.pdf',
      fileSize: 512,
      filePath: `/uploads/del-${TEST_PREFIX}.pdf`,
      uploadedBy: therapistId,
    });
    const res = await request(app).delete(`/api/therapist/documents/${doc._id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('تم الحذف');
  });

  test('DELETE /api/therapist/documents/:fakeId — returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/therapist/documents/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reports & Performance
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Reports & Performance', () => {
  test('GET /api/therapist/reports — returns reports data', async () => {
    const res = await request(app).get('/api/therapist/reports').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary).toHaveProperty('totalSessions');
    expect(res.body.data.summary).toHaveProperty('completedSessions');
    expect(res.body.data.summary).toHaveProperty('attendanceRate');
    expect(res.body.data).toHaveProperty('bySessionType');
    expect(res.body.data).toHaveProperty('byWeekday');
    expect(res.body.data).toHaveProperty('period');
  });

  test('GET /api/therapist/performance — returns KPIs', async () => {
    const res = await request(app).get('/api/therapist/performance').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('last30Days');
    expect(res.body.data).toHaveProperty('last90Days');
    expect(res.body.data).toHaveProperty('documentation');
    expect(res.body.data).toHaveProperty('rating');
    expect(res.body.data.last30Days).toHaveProperty('completionRate');
    expect(res.body.data.last30Days).toHaveProperty('cancellationRate');
  });

  test('GET /api/therapist/workload — returns workload analytics', async () => {
    const res = await request(app).get('/api/therapist/workload').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('currentWeekSessions');
    expect(res.body.data).toHaveProperty('nextWeekSessions');
    expect(res.body.data).toHaveProperty('activePatients');
    expect(res.body.data).toHaveProperty('peakHours');
    expect(typeof res.body.data.currentWeekSessions).toBe('number');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Communications & Messages
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Communications & Messages', () => {
  test('GET /api/therapist/communications — returns communications', async () => {
    const res = await request(app).get('/api/therapist/communications').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('messages');
    expect(Array.isArray(res.body.data.messages)).toBe(true);
  });

  test('GET /api/therapist/messages — returns messages', async () => {
    const res = await request(app).get('/api/therapist/messages').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/therapist/messages — sends message', async () => {
    const convId = new mongoose.Types.ObjectId();
    const recipientId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/therapist/messages')
      .send({
        conversationId: convId.toString(),
        text: `رسالة اختبار ${TEST_PREFIX}`,
        recipient: recipientId.toString(),
        messageType: 'text',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
  });

  test('POST /api/therapist/messages — 400 without text', async () => {
    const res = await request(app)
      .post('/api/therapist/messages')
      .send({ recipient: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });

  test('POST /api/therapist/communications — sends communication', async () => {
    const convId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/therapist/communications')
      .send({
        conversationId: convId.toString(),
        text: `تواصل اختبار ${TEST_PREFIX}`,
        messageType: 'text',
      })
      .expect(201);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════

describe('Therapist Portal — Error Handling', () => {
  test('Invalid route returns 404 (Express default)', async () => {
    const res = await request(app).get('/api/therapist/nonexistent-route-xyz');
    // Express returns 404 for unmatched routes
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
