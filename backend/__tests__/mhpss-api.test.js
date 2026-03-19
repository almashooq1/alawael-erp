/**
 * Mental Health & Psychosocial Support (MHPSS) — Integration Tests
 * اختبارات تكاملية لنظام الدعم النفسي والصحة النفسية
 *
 * Uses mongodb-memory-server for an isolated in-memory database.
 */

/* eslint-disable no-undef */
jest.unmock('mongoose');

// Mock auth middleware to bypass JWT verification
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => next(),
  authorize: () => (req, _res, next) => next(),
  authorizeRole: () => (req, _res, next) => next(),
  authenticateToken: (req, _res, next) => next(),
  protect: (req, _res, next) => next(),
}));

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;
let CounselingSession,
  MentalHealthProgram,
  PsychologicalAssessment,
  CrisisIntervention,
  SupportGroup;
const createdIds = { sessions: [], programs: [], assessments: [], crises: [], groups: [] };
let testBeneficiaryId;
let testUserId;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  // Register stub models that populate() references
  if (!mongoose.models.Beneficiary) {
    mongoose.model('Beneficiary', new mongoose.Schema({ name: String, nameAr: String }));
  }
  if (!mongoose.models.User) {
    mongoose.model('User', new mongoose.Schema({ name: String, email: String }));
  }

  const models = require('../models/MentalHealth');
  CounselingSession = models.CounselingSession;
  MentalHealthProgram = models.MentalHealthProgram;
  PsychologicalAssessment = models.PsychologicalAssessment;
  CrisisIntervention = models.CrisisIntervention;
  SupportGroup = models.SupportGroup;

  const mhpssRoutes = require('../routes/mhpss.routes');

  testBeneficiaryId = new mongoose.Types.ObjectId();
  testUserId = new mongoose.Types.ObjectId();

  app = express();
  app.use(express.json());
  // Inject fake authenticated user
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    next();
  });
  app.use('/api/mhpss', mhpssRoutes);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}, 15000);

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Counseling Sessions — جلسات الإرشاد النفسي
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Counseling Sessions', () => {
  test('POST /api/mhpss/sessions — creates individual session', async () => {
    const res = await request(app)
      .post('/api/mhpss/sessions')
      .send({
        type: 'فردي',
        beneficiary: testBeneficiaryId,
        counselor: testUserId,
        scheduledDate: new Date(),
        startTime: '09:00',
        endTime: '10:00',
        chiefComplaint: 'test-mhpss-anxiety',
        sessionGoals: ['تقليل القلق'],
        riskLevel: 'منخفض',
        consentObtained: true,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('فردي');
    expect(res.body.data.sessionNumber).toMatch(/^CS-/);
    createdIds.sessions.push(res.body.data._id);
  });

  test('POST /api/mhpss/sessions — creates group session', async () => {
    const res = await request(app)
      .post('/api/mhpss/sessions')
      .send({
        type: 'جماعي',
        beneficiary: testBeneficiaryId,
        counselor: testUserId,
        scheduledDate: new Date(),
        chiefComplaint: 'test-mhpss-group-session',
        groupSize: 5,
        groupTopic: 'إدارة الضغوط',
        participants: [testBeneficiaryId],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('جماعي');
    expect(res.body.data.groupSize).toBe(5);
    createdIds.sessions.push(res.body.data._id);
  });

  test('GET /api/mhpss/sessions — lists sessions with pagination', async () => {
    const res = await request(app)
      .get('/api/mhpss/sessions')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  test('GET /api/mhpss/sessions — filters by type', async () => {
    const res = await request(app).get('/api/mhpss/sessions').query({ type: 'فردي' }).expect(200);

    expect(res.body.success).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0].type).toBe('فردي');
    }
  });

  test('GET /api/mhpss/sessions/:id — retrieves session by ID', async () => {
    const id = createdIds.sessions[0];
    if (!id) return;
    const res = await request(app).get(`/api/mhpss/sessions/${id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(id.toString());
  });

  test('PUT /api/mhpss/sessions/:id — updates session', async () => {
    const id = createdIds.sessions[0];
    if (!id) return;
    const res = await request(app)
      .put(`/api/mhpss/sessions/${id}`)
      .send({ status: 'مكتملة', moodRating: 7, progressRating: 8 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('مكتملة');
    expect(res.body.data.moodRating).toBe(7);
  });

  test('GET /api/mhpss/sessions/stats — returns session statistics', async () => {
    const res = await request(app).get('/api/mhpss/sessions/stats').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalSessions');
    expect(res.body.data).toHaveProperty('byType');
    expect(res.body.data).toHaveProperty('byStatus');
  });

  test('GET /api/mhpss/sessions/:id — returns 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/mhpss/sessions/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/mhpss/sessions/:id — deletes session', async () => {
    const session = await CounselingSession.create({
      type: 'individual',
      beneficiary: testBeneficiaryId,
      counselor: testUserId,
      scheduledDate: new Date(),
      chiefComplaint: 'test-mhpss-delete-session',
    });
    await request(app).delete(`/api/mhpss/sessions/${session._id}`).expect(200);
    const found = await CounselingSession.findById(session._id);
    expect(found).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Mental Health Programs — برامج الصحة النفسية
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Mental Health Programs', () => {
  test('POST /api/mhpss/programs — creates program', async () => {
    const res = await request(app)
      .post('/api/mhpss/programs')
      .send({
        name: 'test-mhpss-anxiety-program',
        nameAr: 'برنامج إدارة القلق التجريبي',
        description: 'برنامج تجريبي لإدارة القلق',
        category: 'إدارة القلق',
        targetAudience: 'مستفيدين',
        durationWeeks: 8,
        sessionsPerWeek: 2,
        maxParticipants: 15,
        goals: [{ description: 'تقليل أعراض القلق', measurable: true, targetMetric: 'GAD-7 < 10' }],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.programCode).toMatch(/^MHP-/);
    expect(res.body.data.category).toBe('إدارة القلق');
    createdIds.programs.push(res.body.data._id);
  });

  test('GET /api/mhpss/programs — lists programs', async () => {
    const res = await request(app)
      .get('/api/mhpss/programs')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/mhpss/programs/:id — retrieves program', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app).get(`/api/mhpss/programs/${id}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/mhpss/programs/:id — updates program', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app)
      .put(`/api/mhpss/programs/${id}`)
      .send({ status: 'فعّال', startDate: new Date() })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('فعّال');
  });

  test('POST /api/mhpss/programs/:id/enroll — enrolls beneficiary', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/programs/${id}/enroll`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/mhpss/programs/:id/enroll — prevents duplicate enrollment', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/programs/${id}/enroll`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('مسجّل مسبقاً');
  });

  test('POST /api/mhpss/programs/:id/unenroll — unenrolls beneficiary', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/programs/${id}/unenroll`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/mhpss/programs/:id/enroll — validates beneficiaryId required', async () => {
    const id = createdIds.programs[0];
    if (!id) return;
    const res = await request(app).post(`/api/mhpss/programs/${id}/enroll`).send({}).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/mhpss/programs/:id — deletes program', async () => {
    const program = await MentalHealthProgram.create({
      name: 'test-mhpss-delete-program',
      category: 'stress-management',
    });
    await request(app).delete(`/api/mhpss/programs/${program._id}`).expect(200);
    const found = await MentalHealthProgram.findById(program._id);
    expect(found).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Psychological Assessments — التقييمات النفسية
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Psychological Assessments', () => {
  test('POST /api/mhpss/assessments — creates assessment with auto-scoring', async () => {
    const res = await request(app)
      .post('/api/mhpss/assessments')
      .send({
        beneficiary: testBeneficiaryId,
        assessor: testUserId,
        assessmentDate: new Date(),
        type: 'قلق',
        toolUsed: 'GAD-7',
        items: [
          { question: 'الشعور بالعصبية', score: 2, maxScore: 3 },
          { question: 'عدم القدرة على التوقف عن القلق', score: 1, maxScore: 3 },
          { question: 'القلق المفرط', score: 2, maxScore: 3 },
        ],
        severityLevel: 'متوسط',
        clinicalInterpretation: 'قلق معتدل يستجيب للتدخل',
        recommendations: ['العلاج المعرفي السلوكي', 'تمارين الاسترخاء'],
        notes: 'test-mhpss-assessment',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.assessmentCode).toMatch(/^PA-/);
    expect(res.body.data.totalScore).toBe(5);
    expect(res.body.data.maxPossibleScore).toBe(9);
    expect(res.body.data.percentageScore).toBe(56);
    createdIds.assessments.push(res.body.data._id);
  });

  test('GET /api/mhpss/assessments — lists assessments', async () => {
    const res = await request(app)
      .get('/api/mhpss/assessments')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/mhpss/assessments/:id — retrieves assessment', async () => {
    const id = createdIds.assessments[0];
    if (!id) return;
    const res = await request(app).get(`/api/mhpss/assessments/${id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.toolUsed).toBe('GAD-7');
  });

  test('PUT /api/mhpss/assessments/:id — updates assessment', async () => {
    const id = createdIds.assessments[0];
    if (!id) return;
    const res = await request(app)
      .put(`/api/mhpss/assessments/${id}`)
      .send({ status: 'مكتمل', followUpRequired: true, followUpDate: new Date() })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('مكتمل');
    expect(res.body.data.followUpRequired).toBe(true);
  });

  test('GET /api/mhpss/assessments/beneficiary/:beneficiaryId — returns history', async () => {
    const res = await request(app)
      .get(`/api/mhpss/assessments/beneficiary/${testBeneficiaryId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/mhpss/assessments/stats — returns assessment statistics', async () => {
    const res = await request(app).get('/api/mhpss/assessments/stats').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('bySeverity');
    expect(res.body.data).toHaveProperty('byType');
  });

  test('DELETE /api/mhpss/assessments/:id — deletes assessment', async () => {
    const assessment = await PsychologicalAssessment.create({
      beneficiary: testBeneficiaryId,
      assessor: testUserId,
      assessmentDate: new Date(),
      type: 'depression',
      notes: 'test-mhpss-delete-assessment',
    });
    await request(app).delete(`/api/mhpss/assessments/${assessment._id}`).expect(200);
    const found = await PsychologicalAssessment.findById(assessment._id);
    expect(found).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Crisis Interventions — التدخل في الأزمات
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Crisis Interventions', () => {
  test('POST /api/mhpss/crises — creates crisis case', async () => {
    const res = await request(app)
      .post('/api/mhpss/crises')
      .send({
        beneficiary: testBeneficiaryId,
        reportedBy: testUserId,
        assignedTo: testUserId,
        crisisType: 'إيذاء ذاتي',
        severity: 'مرتفع',
        description: 'test-mhpss-crisis-intervention',
        riskAssessment: {
          immediateDanger: false,
          accessToMeans: false,
          previousAttempts: false,
          supportSystemAvailable: true,
          protectiveFactors: ['دعم أسري', 'علاقة علاجية جيدة'],
          riskFactors: ['عزلة اجتماعية'],
          overallRiskScore: 6,
        },
        interventionPlan: {
          immediateActions: [
            { action: 'تقييم السلامة', responsible: 'أخصائي نفسي', completed: false },
          ],
          safetyPlan: {
            warningSignals: ['الانسحاب الاجتماعي', 'تغير المزاج الحاد'],
            copingStrategies: ['التنفس العميق', 'الاتصال بشخص موثوق'],
            supportContacts: [{ name: 'أحمد', phone: '0512345678', relationship: 'أخ' }],
          },
        },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.caseNumber).toMatch(/^CI-/);
    expect(res.body.data.severity).toBe('مرتفع');
    createdIds.crises.push(res.body.data._id);
  });

  test('GET /api/mhpss/crises — lists crises', async () => {
    const res = await request(app)
      .get('/api/mhpss/crises')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/mhpss/crises — filters by severity', async () => {
    const res = await request(app)
      .get('/api/mhpss/crises')
      .query({ severity: 'مرتفع' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('GET /api/mhpss/crises/:id — retrieves crisis', async () => {
    const id = createdIds.crises[0];
    if (!id) return;
    const res = await request(app).get(`/api/mhpss/crises/${id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.riskAssessment).toBeDefined();
    expect(res.body.data.interventionPlan).toBeDefined();
  });

  test('PUT /api/mhpss/crises/:id — updates crisis status', async () => {
    const id = createdIds.crises[0];
    if (!id) return;
    const res = await request(app)
      .put(`/api/mhpss/crises/${id}`)
      .send({ status: 'قيد التدخل' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('قيد التدخل');
  });

  test('POST /api/mhpss/crises/:id/timeline — adds timeline event', async () => {
    const id = createdIds.crises[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/crises/${id}/timeline`)
      .send({ action: 'إجراء تقييم أولي', notes: 'تم التقييم بنجاح' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThan(0);
  });

  test('POST /api/mhpss/crises/:id/follow-up — adds follow-up', async () => {
    const id = createdIds.crises[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/crises/${id}/follow-up`)
      .send({ date: new Date(), notes: 'المستفيد مستقر', beneficiaryStable: true })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.followUps.length).toBeGreaterThan(0);
  });

  test('GET /api/mhpss/crises/stats — returns crisis statistics', async () => {
    const res = await request(app).get('/api/mhpss/crises/stats').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('bySeverity');
    expect(res.body.data).toHaveProperty('activeCritical');
  });

  test('DELETE /api/mhpss/crises/:id — deletes crisis', async () => {
    const crisis = await CrisisIntervention.create({
      beneficiary: testBeneficiaryId,
      reportedBy: testUserId,
      crisisType: 'trauma',
      severity: 'low',
      description: 'test-mhpss-delete-crisis',
    });
    await request(app).delete(`/api/mhpss/crises/${crisis._id}`).expect(200);
    const found = await CrisisIntervention.findById(crisis._id);
    expect(found).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Support Groups — مجموعات الدعم النفسي الاجتماعي
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Support Groups', () => {
  test('POST /api/mhpss/groups — creates support group', async () => {
    const res = await request(app)
      .post('/api/mhpss/groups')
      .send({
        name: 'test-mhpss-peer-support-group',
        nameAr: 'مجموعة دعم الأقران التجريبية',
        description: 'مجموعة دعم تجريبية',
        category: 'دعم الأقران',
        facilitator: testUserId,
        maxMembers: 10,
        meetingSchedule: {
          dayOfWeek: 'الأحد',
          time: '16:00',
          frequency: 'أسبوعي',
          location: 'قاعة الإرشاد',
          durationMinutes: 90,
        },
        rules: ['السرية التامة', 'احترام الآخرين', 'عدم المقاطعة'],
        goals: ['تبادل الخبرات', 'بناء شبكة دعم'],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.groupCode).toMatch(/^SG-/);
    expect(res.body.data.category).toBe('دعم الأقران');
    createdIds.groups.push(res.body.data._id);
  });

  test('GET /api/mhpss/groups — lists groups', async () => {
    const res = await request(app)
      .get('/api/mhpss/groups')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/mhpss/groups/:id — retrieves group', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app).get(`/api/mhpss/groups/${id}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meetingSchedule).toBeDefined();
  });

  test('PUT /api/mhpss/groups/:id — updates group', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app)
      .put(`/api/mhpss/groups/${id}`)
      .send({ startDate: new Date(), status: 'فعّالة' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/mhpss/groups/:id/members — adds member', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/groups/${id}/members`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(200);

    expect(res.body.success).toBe(true);
    const members = res.body.data.members;
    expect(members.length).toBeGreaterThan(0);
  });

  test('POST /api/mhpss/groups/:id/members — prevents duplicate member', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/groups/${id}/members`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('POST /api/mhpss/groups/:id/sessions — adds group session', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app)
      .post(`/api/mhpss/groups/${id}/sessions`)
      .send({
        date: new Date(),
        topic: 'مشاركة تجارب التكيف',
        attendees: [testBeneficiaryId],
        facilitatorNotes: 'جلسة إيجابية',
        groupDynamicsRating: 8,
        keyThemes: ['التكيف', 'الدعم المتبادل'],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions.length).toBeGreaterThan(0);
    expect(res.body.data.sessions[0].sessionNumber).toBe(1);
  });

  test('DELETE /api/mhpss/groups/:id/members — removes member', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app)
      .delete(`/api/mhpss/groups/${id}/members`)
      .send({ beneficiaryId: testBeneficiaryId })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('POST /api/mhpss/groups/:id/members — validates beneficiaryId required', async () => {
    const id = createdIds.groups[0];
    if (!id) return;
    const res = await request(app).post(`/api/mhpss/groups/${id}/members`).send({}).expect(400);

    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/mhpss/groups/:id — deletes group', async () => {
    const group = await SupportGroup.create({
      name: 'test-mhpss-delete-group',
      category: 'peer-support',
      facilitator: testUserId,
    });
    await request(app).delete(`/api/mhpss/groups/${group._id}`).expect(200);
    const found = await SupportGroup.findById(group._id);
    expect(found).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Dashboard — لوحة المعلومات الشاملة
// ═══════════════════════════════════════════════════════════════════════════════

describe('MHPSS — Dashboard', () => {
  test('GET /api/mhpss/dashboard — returns comprehensive stats', async () => {
    const res = await request(app).get('/api/mhpss/dashboard').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('sessions');
    expect(res.body.data).toHaveProperty('programs');
    expect(res.body.data).toHaveProperty('assessments');
    expect(res.body.data).toHaveProperty('crises');
    expect(res.body.data).toHaveProperty('groups');
  });
});
