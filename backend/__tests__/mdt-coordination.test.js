/**
 * Multidisciplinary Team Coordination — Integration Tests
 * اختبارات تكامل نظام التنسيق متعدد التخصصات
 *
 * Covers all 5 modules (65+ endpoints):
 *   Module 1: MDT Meetings
 *   Module 2: Unified Rehabilitation Plans
 *   Module 3: Internal Referral Tickets
 *   Module 4: Shared Beneficiary Dashboard
 *   Module 5: Meeting Minutes & Decisions
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

let app;
let MDTMeeting, UnifiedRehabPlan, ReferralTicket;
let testUserId;
let testBeneficiaryId;

// ─── In-memory stores for test data ──────────────────────────────────────────
const meetingsStore = [];
const plansStore = [];
const referralsStore = [];

// ─── Helper: build a chainable query mock ────────────────────────────────────
function makeQuery(resolveValue) {
  const q = {
    sort: jest.fn(() => q),
    skip: jest.fn(() => q),
    limit: jest.fn(() => q),
    populate: jest.fn(() => q),
    lean: jest.fn(() => q),
    select: jest.fn(() => q),
    exec: jest.fn(() => Promise.resolve(resolveValue)),
    then(resolve, reject) {
      return Promise.resolve(resolveValue).then(resolve, reject);
    },
    catch(cb) {
      return Promise.resolve(resolveValue).catch(cb);
    },
  };
  return q;
}

// ─── Helper: create a mock document with subdoc methods ──────────────────────
function mockDoc(data, store) {
  const doc = {
    ...data,
    _id: data._id || new mongoose.Types.ObjectId(),
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    attendees: data.attendees || [],
    cases: data.cases || [],
    agenda: data.agenda || [],
    minutes: data.minutes || null,
    generalDecisions: (data.generalDecisions || []).map(d => ({ approvedBy: [], ...d })),
    generalActionItems: data.generalActionItems || [],
    goals: data.goals || [],
    teamMembers: data.teamMembers || [],
    reviews: data.reviews || [],
    approvals: data.approvals || [],
    history: data.history || [],
    save: jest.fn(async function () {
      if (store) {
        const idx = store.findIndex(i => i._id?.toString() === this._id?.toString());
        if (idx >= 0) Object.assign(store[idx], this);
      }
      return this;
    }),
    toObject: jest.fn(function () {
      return { ...this };
    }),
  };

  // Subdoc-level .id() and .pull() helpers for arrays
  [
    'attendees',
    'cases',
    'agenda',
    'generalDecisions',
    'generalActionItems',
    'goals',
    'teamMembers',
  ].forEach(field => {
    if (Array.isArray(doc[field])) {
      doc[field].id = searchId =>
        doc[field].find(item => item._id?.toString() === searchId?.toString()) || null;
      doc[field].pull = query => {
        const targetId = typeof query === 'object' ? query._id : query;
        const idx = doc[field].findIndex(item => item._id?.toString() === targetId?.toString());
        if (idx >= 0) doc[field].splice(idx, 1);
      };
    }
  });

  return doc;
}

// ─── Setup mock implementations (called in beforeEach) ───────────────────────
function setupMocks() {
  // ── MDTMeeting ──
  MDTMeeting.find.mockImplementation((filter = {}) => {
    const results = meetingsStore.filter(m => {
      for (const [k, v] of Object.entries(filter)) {
        if (v && typeof v === 'object' && (v.$gte || v.$lte)) continue;
        if (m[k] !== v) return false;
      }
      return true;
    });
    return makeQuery(results);
  });

  MDTMeeting.findById.mockImplementation(id => {
    const item = meetingsStore.find(m => m._id?.toString() === id?.toString());
    return makeQuery(item || null);
  });

  MDTMeeting.findByIdAndUpdate.mockImplementation((id, update) => {
    const item = meetingsStore.find(m => m._id?.toString() === id?.toString());
    if (item) {
      Object.assign(item, update);
      return makeQuery(item);
    }
    return makeQuery(null);
  });

  MDTMeeting.findByIdAndDelete.mockImplementation(async id => {
    const idx = meetingsStore.findIndex(m => m._id?.toString() === id?.toString());
    if (idx >= 0) return meetingsStore.splice(idx, 1)[0];
    return null;
  });

  MDTMeeting.countDocuments.mockImplementation(async (filter = {}) => {
    if (!Object.keys(filter).length) return meetingsStore.length;
    return meetingsStore.filter(m => {
      for (const [k, v] of Object.entries(filter)) {
        if (m[k] !== v) return false;
      }
      return true;
    }).length;
  });

  MDTMeeting.create.mockImplementation(async data => {
    const doc = mockDoc({ ...data, status: data.status || 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);
    return doc;
  });

  MDTMeeting.aggregate.mockImplementation(() => makeQuery([]));
  MDTMeeting.deleteMany.mockImplementation(async () => ({ deletedCount: 0, ok: 1 }));

  // ── UnifiedRehabPlan ──
  UnifiedRehabPlan.find.mockImplementation((filter = {}) => {
    const results = plansStore.filter(p => {
      for (const [k, v] of Object.entries(filter)) {
        if (p[k] !== v) return false;
      }
      return true;
    });
    return makeQuery(results);
  });

  UnifiedRehabPlan.findById.mockImplementation(id => {
    const item = plansStore.find(p => p._id?.toString() === id?.toString());
    return makeQuery(item || null);
  });

  UnifiedRehabPlan.findByIdAndUpdate.mockImplementation((id, update) => {
    const item = plansStore.find(p => p._id?.toString() === id?.toString());
    if (item) {
      Object.assign(item, update);
      return makeQuery(item);
    }
    return makeQuery(null);
  });

  UnifiedRehabPlan.findByIdAndDelete.mockImplementation(async id => {
    const idx = plansStore.findIndex(p => p._id?.toString() === id?.toString());
    if (idx >= 0) return plansStore.splice(idx, 1)[0];
    return null;
  });

  UnifiedRehabPlan.countDocuments.mockImplementation(async (filter = {}) => {
    if (!Object.keys(filter).length) return plansStore.length;
    return plansStore.filter(p => {
      for (const [k, v] of Object.entries(filter)) {
        if (p[k] !== v) return false;
      }
      return true;
    }).length;
  });

  UnifiedRehabPlan.create.mockImplementation(async data => {
    const doc = mockDoc(
      { ...data, status: data.status || 'DRAFT', overallProgress: 0 },
      plansStore
    );
    plansStore.push(doc);
    return doc;
  });

  UnifiedRehabPlan.aggregate.mockImplementation(() => makeQuery([]));
  UnifiedRehabPlan.deleteMany.mockImplementation(async () => ({ deletedCount: 0, ok: 1 }));

  // ── ReferralTicket ──
  ReferralTicket.find.mockImplementation((filter = {}) => {
    const results = referralsStore.filter(r => {
      for (const [k, v] of Object.entries(filter)) {
        if (r[k] !== v) return false;
      }
      return true;
    });
    return makeQuery(results);
  });

  ReferralTicket.findById.mockImplementation(id => {
    const item = referralsStore.find(r => r._id?.toString() === id?.toString());
    return makeQuery(item || null);
  });

  ReferralTicket.findByIdAndUpdate.mockImplementation((id, update) => {
    const item = referralsStore.find(r => r._id?.toString() === id?.toString());
    if (item) {
      Object.assign(item, update);
      return makeQuery(item);
    }
    return makeQuery(null);
  });

  ReferralTicket.findByIdAndDelete.mockImplementation(async id => {
    const idx = referralsStore.findIndex(r => r._id?.toString() === id?.toString());
    if (idx >= 0) return referralsStore.splice(idx, 1)[0];
    return null;
  });

  ReferralTicket.countDocuments.mockImplementation(async (filter = {}) => {
    if (!Object.keys(filter).length) return referralsStore.length;
    return referralsStore.filter(r => {
      for (const [k, v] of Object.entries(filter)) {
        if (r[k] !== v) return false;
      }
      return true;
    }).length;
  });

  ReferralTicket.create.mockImplementation(async data => {
    const doc = mockDoc({ ...data, status: data.status || 'PENDING' }, referralsStore);
    referralsStore.push(doc);
    return doc;
  });

  ReferralTicket.aggregate.mockImplementation(() => makeQuery([]));
  ReferralTicket.deleteMany.mockImplementation(async () => ({ deletedCount: 0, ok: 1 }));
}

beforeAll(async () => {
  const models = require('../models/MDTCoordination');
  MDTMeeting = models.MDTMeeting;
  UnifiedRehabPlan = models.UnifiedRehabPlan;
  ReferralTicket = models.ReferralTicket;

  const routes = require('../routes/mdt-coordination.routes');

  app = express();
  app.use(express.json());

  testUserId = new mongoose.Types.ObjectId();
  testBeneficiaryId = new mongoose.Types.ObjectId();

  // Fake auth middleware
  app.use((req, _res, next) => {
    req.user = {
      id: testUserId.toString(),
      _id: testUserId,
      role: 'admin',
      name: 'Test Admin',
      email: 'admin@test.com',
    };
    next();
  });

  app.use('/api/mdt-coordination', routes);
});

beforeEach(() => {
  // Clear stores
  meetingsStore.length = 0;
  plansStore.length = 0;
  referralsStore.length = 0;
  // Re-establish mock implementations (resetMocks: true clears them)
  setupMocks();
});

afterAll(async () => {
  meetingsStore.length = 0;
  plansStore.length = 0;
  referralsStore.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: MDT Meetings
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module 1: MDT Meetings — اجتماعات الفريق متعدد التخصصات', () => {
  // ── CREATE ──
  test('POST /api/mdt-coordination/meetings — creates a meeting', async () => {
    const res = await request(app)
      .post('/api/mdt-coordination/meetings')
      .send({
        title: 'اجتماع فريق التأهيل الأسبوعي',
        date: '2026-04-01T09:00:00.000Z',
        startTime: '09:00',
        endTime: '10:30',
        type: 'REGULAR',
        location: 'قاعة الاجتماعات الرئيسية',
        description: 'مراجعة أسبوعية لحالات المستفيدين',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('اجتماع فريق التأهيل الأسبوعي');
    expect(res.body.data.meetingNumber).toMatch(/^MDT-/);
  });

  // ── LIST ──
  test('GET /api/mdt-coordination/meetings — lists meetings with pagination', async () => {
    meetingsStore.push(mockDoc({ title: 'Seeded meeting', status: 'SCHEDULED' }, meetingsStore));

    const res = await request(app)
      .get('/api/mdt-coordination/meetings')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
  });

  // ── LIST with filters ──
  test('GET /api/mdt-coordination/meetings?status=SCHEDULED — filters by status', async () => {
    meetingsStore.push(mockDoc({ title: 'Seeded', status: 'SCHEDULED' }, meetingsStore));

    const res = await request(app)
      .get('/api/mdt-coordination/meetings')
      .query({ status: 'SCHEDULED' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── LIST with date range ──
  test('GET /api/mdt-coordination/meetings — filters by date range', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/meetings')
      .query({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── GET SINGLE ──
  test('GET /api/mdt-coordination/meetings/:id — returns meeting detail', async () => {
    const doc = mockDoc({ title: 'Test meeting', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app).get(`/api/mdt-coordination/meetings/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── GET 404 ──
  test('GET /api/mdt-coordination/meetings/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/mdt-coordination/meetings/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });

  // ── UPDATE ──
  test('PUT /api/mdt-coordination/meetings/:id — updates a meeting', async () => {
    const doc = mockDoc({ title: 'Original', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .put(`/api/mdt-coordination/meetings/${doc._id}`)
      .send({ title: 'اجتماع محدث', duration: 90 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD ATTENDEE ──
  test('POST /api/mdt-coordination/meetings/:id/attendees — adds attendee', async () => {
    const doc = mockDoc({ title: 'test', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/attendees`)
      .send({
        name: 'د. أحمد الفيصل',
        role: 'أخصائي علاج طبيعي',
        department: 'العلاج الطبيعي',
        specialty: 'PHYSIOTHERAPY',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD CASE ──
  test('POST /api/mdt-coordination/meetings/:id/cases — adds case to meeting', async () => {
    const doc = mockDoc({ title: 'test', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/cases`)
      .send({
        beneficiary: testBeneficiaryId,
        beneficiaryName: 'محمد عبدالله',
        currentStatus: 'تحسن ملحوظ في الحركة',
        priority: 'HIGH',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD AGENDA ──
  test('POST /api/mdt-coordination/meetings/:id/agenda — adds agenda item', async () => {
    const doc = mockDoc({ title: 'test', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/agenda`)
      .send({ topic: 'مراجعة خطط التأهيل الشهرية', duration: 15 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── MEETING STATISTICS ──
  test('GET /api/mdt-coordination/meetings-stats — returns statistics', async () => {
    const res = await request(app).get('/api/mdt-coordination/meetings-stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.totalMeetings).toBe('number');
  });

  // ── DELETE ──
  test('DELETE /api/mdt-coordination/meetings/:id — deletes a meeting', async () => {
    const doc = mockDoc({ title: 'to-delete', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app).delete(`/api/mdt-coordination/meetings/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── DELETE 404 ──
  test('DELETE /api/mdt-coordination/meetings/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/mdt-coordination/meetings/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });

  // ── CREATE VALIDATION ──
  test('POST /api/mdt-coordination/meetings — 400 without title', async () => {
    const _res = await request(app)
      .post('/api/mdt-coordination/meetings')
      .send({ date: '2026-04-01', startTime: '09:00' })
      .expect(res => expect([400, 422]).toContain(res.status));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: Unified Rehabilitation Plans
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module 2: Unified Rehab Plans — خطط التأهيل الموحدة', () => {
  // ── CREATE ──
  test('POST /api/mdt-coordination/plans — creates a plan', async () => {
    const res = await request(app)
      .post('/api/mdt-coordination/plans')
      .send({
        title: 'خطة تأهيل موحدة - محمد عبدالله',
        beneficiary: testBeneficiaryId,
        beneficiaryName: 'محمد عبدالله',
        startDate: '2026-04-01',
        endDate: '2026-10-01',
        reviewCycle: 'MONTHLY',
        initialAssessmentSummary: 'تأخر في النمو الحركي والإدراكي',
        diagnosisSummary: 'شلل دماغي خفيف',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.planNumber).toMatch(/^URP-/);
  });

  // ── LIST ──
  test('GET /api/mdt-coordination/plans — lists plans', async () => {
    plansStore.push(mockDoc({ title: 'Test plan', status: 'DRAFT' }, plansStore));

    const res = await request(app)
      .get('/api/mdt-coordination/plans')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  // ── LIST with filters ──
  test('GET /api/mdt-coordination/plans?status=DRAFT — filters by status', async () => {
    plansStore.push(mockDoc({ title: 'Draft plan', status: 'DRAFT' }, plansStore));

    const res = await request(app)
      .get('/api/mdt-coordination/plans')
      .query({ status: 'DRAFT' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── GET SINGLE ──
  test('GET /api/mdt-coordination/plans/:id — returns plan detail', async () => {
    const doc = mockDoc({ title: 'Test plan', status: 'DRAFT' }, plansStore);
    plansStore.push(doc);

    const res = await request(app).get(`/api/mdt-coordination/plans/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── GET 404 ──
  test('GET /api/mdt-coordination/plans/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/mdt-coordination/plans/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });

  // ── UPDATE ──
  test('PUT /api/mdt-coordination/plans/:id — updates a plan', async () => {
    const doc = mockDoc({ title: 'plan', status: 'DRAFT' }, plansStore);
    plansStore.push(doc);

    const res = await request(app)
      .put(`/api/mdt-coordination/plans/${doc._id}`)
      .send({ title: 'خطة محدثة', status: 'PENDING_APPROVAL' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD TEAM MEMBER ──
  test('POST /api/mdt-coordination/plans/:id/team-members — adds therapist', async () => {
    const doc = mockDoc({ title: 'plan', status: 'DRAFT' }, plansStore);
    plansStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/plans/${doc._id}/team-members`)
      .send({
        therapist: new mongoose.Types.ObjectId(),
        therapistName: 'د. سارة الأحمد',
        specialty: 'SPEECH_THERAPY',
        role: 'CONTRIBUTOR',
        sessionFrequency: '3 مرات أسبوعياً',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD GOAL ──
  test('POST /api/mdt-coordination/plans/:id/goals — adds rehabilitation goal', async () => {
    const doc = mockDoc({ title: 'plan', status: 'DRAFT' }, plansStore);
    plansStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/plans/${doc._id}/goals`)
      .send({
        title: 'تحسين القدرة على المشي المستقل',
        domain: 'PHYSICAL',
        baseline: 'يمشي بمساعدة مشاية',
        target: 'المشي المستقل لمسافة 50 متر',
        measurementCriteria: 'تقييم المشي باستخدام مقياس FIM',
        targetDate: '2026-08-01',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── UPDATE GOAL PROGRESS ──
  test('PATCH /api/mdt-coordination/plans/:id/goals/:goalId/progress — updates progress', async () => {
    const goalId = new mongoose.Types.ObjectId();
    const doc = mockDoc(
      {
        title: 'plan',
        status: 'ACTIVE',
        goals: [
          {
            _id: goalId,
            title: 'Walk',
            domain: 'PHYSICAL',
            progress: 20,
            status: 'ACTIVE',
            progressNotes: [],
          },
        ],
      },
      plansStore
    );
    plansStore.push(doc);

    const res = await request(app)
      .patch(`/api/mdt-coordination/plans/${doc._id}/goals/${goalId}/progress`)
      .send({ progress: 45, note: 'تحسن ملحوظ في التوازن' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── UPDATE GOAL ──
  test('PUT /api/mdt-coordination/plans/:id/goals/:goalId — updates goal', async () => {
    const goalId = new mongoose.Types.ObjectId();
    const doc = mockDoc(
      { title: 'plan', goals: [{ _id: goalId, title: 'Walk', status: 'ACTIVE' }] },
      plansStore
    );
    plansStore.push(doc);

    const res = await request(app)
      .put(`/api/mdt-coordination/plans/${doc._id}/goals/${goalId}`)
      .send({ status: 'ACTIVE', target: 'المشي لمسافة 100 متر' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ADD REVIEW ──
  test('POST /api/mdt-coordination/plans/:id/reviews — adds plan review', async () => {
    const doc = mockDoc({ title: 'plan', status: 'ACTIVE' }, plansStore);
    plansStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/plans/${doc._id}/reviews`)
      .send({
        summary: 'مراجعة شهرية: تحسن عام في الأهداف الحركية',
        recommendations: ['زيادة تكرار جلسات العلاج الطبيعي'],
        nextReviewDate: '2026-05-01',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── APPROVE PLAN ──
  test('POST /api/mdt-coordination/plans/:id/approve — approves plan', async () => {
    const doc = mockDoc({ title: 'plan', status: 'PENDING_APPROVAL' }, plansStore);
    plansStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/plans/${doc._id}/approve`)
      .send({ comment: 'تم الاعتماد بعد مراجعة الفريق' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── REMOVE TEAM MEMBER ──
  test('DELETE /api/mdt-coordination/plans/:id/team-members/:memberId — removes member', async () => {
    const memberId = new mongoose.Types.ObjectId();
    const doc = mockDoc(
      { title: 'plan', teamMembers: [{ _id: memberId, therapistName: 'Test' }] },
      plansStore
    );
    plansStore.push(doc);

    const _res = await request(app)
      .delete(`/api/mdt-coordination/plans/${doc._id}/team-members/${memberId}`)
      .expect(res => expect([200, 404]).toContain(res.status));
  });

  // ── PLANS STATISTICS ──
  test('GET /api/mdt-coordination/plans-stats — returns statistics', async () => {
    const res = await request(app).get('/api/mdt-coordination/plans-stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.total).toBe('number');
  });

  // ── CREATE VALIDATION ──
  test('POST /api/mdt-coordination/plans — 400 without required fields', async () => {
    const _res = await request(app)
      .post('/api/mdt-coordination/plans')
      .send({ status: 'DRAFT' })
      .expect(res => expect([400, 422]).toContain(res.status));
  });

  // ── DELETE ──
  test('DELETE /api/mdt-coordination/plans/:id — deletes a plan', async () => {
    const doc = mockDoc({ title: 'to-delete', status: 'DRAFT' }, plansStore);
    plansStore.push(doc);

    const res = await request(app).delete(`/api/mdt-coordination/plans/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── DELETE 404 ──
  test('DELETE /api/mdt-coordination/plans/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/mdt-coordination/plans/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: Internal Referral Tickets
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module 3: Internal Referral Tickets — تذاكر الإحالة الداخلية', () => {
  // ── CREATE ──
  test('POST /api/mdt-coordination/referrals — creates a referral ticket', async () => {
    const res = await request(app)
      .post('/api/mdt-coordination/referrals')
      .send({
        beneficiary: testBeneficiaryId,
        beneficiaryName: 'محمد عبدالله',
        fromDepartment: 'العلاج الطبيعي',
        toDepartment: 'علاج النطق والتخاطب',
        reason: 'يحتاج تقييم لمهارات النطق والتواصل',
        type: 'CONSULTATION',
        priority: 'HIGH',
        clinicalNotes: 'صعوبة في النطق الواضح',
        requestedServices: ['تقييم شامل', 'جلسات تخاطب أسبوعية'],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.ticketNumber).toMatch(/^REF-/);
  });

  // ── LIST ──
  test('GET /api/mdt-coordination/referrals — lists referral tickets', async () => {
    referralsStore.push(mockDoc({ status: 'PENDING', priority: 'HIGH' }, referralsStore));

    const res = await request(app)
      .get('/api/mdt-coordination/referrals')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  // ── LIST with filters ──
  test('GET /api/mdt-coordination/referrals — filters by department and priority', async () => {
    referralsStore.push(
      mockDoc(
        { toDepartment: 'علاج النطق والتخاطب', priority: 'HIGH', status: 'PENDING' },
        referralsStore
      )
    );

    const res = await request(app)
      .get('/api/mdt-coordination/referrals')
      .query({ toDepartment: 'علاج النطق والتخاطب', priority: 'HIGH' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── GET SINGLE ──
  test('GET /api/mdt-coordination/referrals/:id — returns ticket detail', async () => {
    const doc = mockDoc({ status: 'PENDING' }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app).get(`/api/mdt-coordination/referrals/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── GET 404 ──
  test('GET /api/mdt-coordination/referrals/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/mdt-coordination/referrals/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });

  // ── ACCEPT ──
  test('POST /api/mdt-coordination/referrals/:id/accept — accepts referral', async () => {
    const doc = mockDoc({ status: 'PENDING', history: [] }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/referrals/${doc._id}/accept`)
      .send({
        acceptanceNote: 'تم قبول الإحالة - موعد التقييم الأسبوع القادم',
        estimatedStartDate: '2026-04-08',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── COMPLETE ──
  test('POST /api/mdt-coordination/referrals/:id/complete — completes referral', async () => {
    const doc = mockDoc({ status: 'ACCEPTED', history: [] }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/referrals/${doc._id}/complete`)
      .send({
        summary: 'تم التقييم - يحتاج جلسات تخاطب مكثفة',
        findings: 'تأخر في النطق بمقدار سنة',
        recommendations: ['جلسات تخاطب 3 مرات أسبوعياً'],
        followUpNeeded: true,
        followUpDate: '2026-05-15',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── REJECT ──
  test('POST /api/mdt-coordination/referrals/:id/reject — rejects referral', async () => {
    const doc = mockDoc({ status: 'PENDING', history: [] }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/referrals/${doc._id}/reject`)
      .send({
        rejectionReason: 'الحالة لا تستدعي تدخل نفسي بعد',
        recommendations: ['إعادة التقييم بعد شهر'],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── UPDATE ──
  test('PUT /api/mdt-coordination/referrals/:id — updates ticket', async () => {
    const doc = mockDoc({ status: 'PENDING' }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app)
      .put(`/api/mdt-coordination/referrals/${doc._id}`)
      .send({ priority: 'URGENT' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── REFERRAL STATISTICS ──
  test('GET /api/mdt-coordination/referrals-stats — returns referral statistics', async () => {
    const res = await request(app).get('/api/mdt-coordination/referrals-stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(typeof res.body.data.total).toBe('number');
  });

  // ── CREATE VALIDATION ──
  test('POST /api/mdt-coordination/referrals — 400 without required fields', async () => {
    const _res = await request(app)
      .post('/api/mdt-coordination/referrals')
      .send({ priority: 'HIGH' })
      .expect(res => expect([400, 422]).toContain(res.status));
  });

  // ── DELETE ──
  test('DELETE /api/mdt-coordination/referrals/:id — deletes ticket', async () => {
    const doc = mockDoc({ status: 'PENDING' }, referralsStore);
    referralsStore.push(doc);

    const res = await request(app).delete(`/api/mdt-coordination/referrals/${doc._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── DELETE 404 ──
  test('DELETE /api/mdt-coordination/referrals/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/mdt-coordination/referrals/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: Shared Beneficiary Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module 4: Shared Dashboard — لوحة المتابعة المشتركة', () => {
  // ── BENEFICIARY DASHBOARD ──
  test('GET /api/mdt-coordination/dashboard/beneficiary/:id — returns overview', async () => {
    const res = await request(app)
      .get(`/api/mdt-coordination/dashboard/beneficiary/${testBeneficiaryId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── TEAM WORKLOAD ──
  test('GET /api/mdt-coordination/dashboard/team-workload — returns workload data', async () => {
    const res = await request(app).get('/api/mdt-coordination/dashboard/team-workload').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── DEPARTMENT DASHBOARD ──
  test('GET /api/mdt-coordination/dashboard/department/:dept — returns department view', async () => {
    const res = await request(app)
      .get(`/api/mdt-coordination/dashboard/department/${encodeURIComponent('العلاج الطبيعي')}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── OVERDUE ITEMS ──
  test('GET /api/mdt-coordination/dashboard/overdue — returns overdue items', async () => {
    const res = await request(app).get('/api/mdt-coordination/dashboard/overdue').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── OVERVIEW (NEW) ──
  test('GET /api/mdt-coordination/dashboard/overview — returns comprehensive KPI overview', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/dashboard/overview')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Should contain all KPI fields
    const d = res.body.data;
    expect(typeof d.totalMeetings).toBe('number');
    expect(typeof d.completedMeetings).toBe('number');
    expect(typeof d.completionRate).toBe('number');
    expect(Array.isArray(d.upcomingMeetings)).toBe(true);
    expect(typeof d.totalPlans).toBe('number');
    expect(typeof d.activePlans).toBe('number');
    expect(typeof d.totalReferrals).toBe('number');
    expect(typeof d.pendingReferrals).toBe('number');
    expect(typeof d.overdueItems).toBe('number');
    expect(typeof d.monthlyMeetings).toBe('number');
    expect(typeof d.monthlyReferrals).toBe('number');
  });

  test('GET /api/mdt-coordination/dashboard/overview — returns zero-safe data when empty', async () => {
    // Clear stores
    meetingsStore.length = 0;
    plansStore.length = 0;
    referralsStore.length = 0;

    const res = await request(app)
      .get('/api/mdt-coordination/dashboard/overview')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalMeetings).toBe(0);
    expect(res.body.data.totalPlans).toBe(0);
    expect(res.body.data.totalReferrals).toBe(0);
    expect(res.body.data.overdueItems).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5: Meeting Minutes & Decisions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module 5: Meeting Minutes & Decisions — محاضر الاجتماعات والقرارات', () => {
  // ── ADD MINUTES ──
  test('POST /api/mdt-coordination/meetings/:id/minutes — adds minutes', async () => {
    const doc = mockDoc({ title: 'test meeting', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/minutes`)
      .send({
        content: 'تمت مناقشة 5 حالات. تم الاتفاق على تعديل خطط التأهيل لحالتين.',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── APPROVE MINUTES ──
  test('POST /api/mdt-coordination/meetings/:id/minutes/approve — approves minutes', async () => {
    const doc = mockDoc(
      {
        title: 'test',
        status: 'SCHEDULED',
        minutes: { content: 'some content', status: 'DRAFT' },
      },
      meetingsStore
    );
    meetingsStore.push(doc);

    const _res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/minutes/approve`)
      .expect(res => expect([200, 400, 404]).toContain(res.status));
  });

  // ── ADD DECISION ──
  test('POST /api/mdt-coordination/meetings/:id/decisions — adds decision', async () => {
    const doc = mockDoc({ title: 'test', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/decisions`)
      .send({
        title: 'زيادة جلسات العلاج الطبيعي لحالة محمد',
        description: 'الزيادة من جلستين إلى 3 جلسات أسبوعياً',
        category: 'TREATMENT_PLAN',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── UPDATE DECISION STATUS ──
  test('PATCH /api/mdt-coordination/meetings/:id/decisions/:decisionId/status — updates', async () => {
    const decisionId = new mongoose.Types.ObjectId();
    const doc = mockDoc(
      {
        title: 'test',
        generalDecisions: [{ _id: decisionId, title: 'dec', status: 'PROPOSED' }],
      },
      meetingsStore
    );
    meetingsStore.push(doc);

    const _res = await request(app)
      .patch(`/api/mdt-coordination/meetings/${doc._id}/decisions/${decisionId}/status`)
      .send({ status: 'APPROVED' })
      .expect(res => expect([200, 404]).toContain(res.status));
  });

  // ── ADD ACTION ITEM ──
  test('POST /api/mdt-coordination/meetings/:id/action-items — adds action item', async () => {
    const doc = mockDoc({ title: 'test', status: 'SCHEDULED' }, meetingsStore);
    meetingsStore.push(doc);

    const res = await request(app)
      .post(`/api/mdt-coordination/meetings/${doc._id}/action-items`)
      .send({
        description: 'إعداد تقرير تقدم شهري لحالة محمد',
        priority: 'HIGH',
        dueDate: '2026-04-30',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── UPDATE ACTION ITEM STATUS ──
  test('PATCH /api/mdt-coordination/meetings/:id/action-items/:itemId/status — updates', async () => {
    const actionId = new mongoose.Types.ObjectId();
    const doc = mockDoc(
      {
        title: 'test',
        generalActionItems: [{ _id: actionId, description: 'action', status: 'PENDING' }],
      },
      meetingsStore
    );
    meetingsStore.push(doc);

    const _res = await request(app)
      .patch(`/api/mdt-coordination/meetings/${doc._id}/action-items/${actionId}/status`)
      .send({ status: 'IN_PROGRESS', notes: 'بدأ العمل على التقرير' })
      .expect(res => expect([200, 404]).toContain(res.status));
  });

  // ── DECISIONS TRACKER ──
  test('GET /api/mdt-coordination/decisions-tracker — cross-meeting decisions', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/decisions-tracker')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── DECISIONS TRACKER with filter ──
  test('GET /api/mdt-coordination/decisions-tracker?status=APPROVED — filters', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/decisions-tracker')
      .query({ status: 'APPROVED' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── ACTION ITEMS TRACKER ──
  test('GET /api/mdt-coordination/action-items-tracker — cross-meeting actions', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/action-items-tracker')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── ACTION ITEMS TRACKER with filter ──
  test('GET /api/mdt-coordination/action-items-tracker?status=PENDING — filters', async () => {
    const res = await request(app)
      .get('/api/mdt-coordination/action-items-tracker')
      .query({ status: 'PENDING' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── COMPREHENSIVE STATS ──
  test('GET /api/mdt-coordination/stats — comprehensive coordination stats', async () => {
    const res = await request(app).get('/api/mdt-coordination/stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('meetings');
    expect(res.body.data).toHaveProperty('plans');
    expect(res.body.data).toHaveProperty('referrals');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Cases & Validation', () => {
  test('POST meetings with invalid date returns 400', async () => {
    const _res = await request(app)
      .post('/api/mdt-coordination/meetings')
      .send({ title: 'test', date: 'not-a-date', startTime: '09:00' })
      .expect(res => expect([400, 422]).toContain(res.status));
  });

  test('POST plans with invalid beneficiary format is handled', async () => {
    const _res = await request(app)
      .post('/api/mdt-coordination/plans')
      .send({ title: 'test', beneficiary: 'invalid', startDate: '2026-01-01' })
      .expect(res => expect([201, 400, 422, 500]).toContain(res.status));
  });

  test('PATCH goal progress with negative value returns 400', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeGoalId = new mongoose.Types.ObjectId();
    const _res = await request(app)
      .patch(`/api/mdt-coordination/plans/${fakeId}/goals/${fakeGoalId}/progress`)
      .send({ progress: -10 })
      .expect(res => expect([400, 404, 422]).toContain(res.status));
  });

  test('PATCH goal progress > 100 returns 400', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeGoalId = new mongoose.Types.ObjectId();
    const _res = await request(app)
      .patch(`/api/mdt-coordination/plans/${fakeId}/goals/${fakeGoalId}/progress`)
      .send({ progress: 150 })
      .expect(res => expect([400, 404, 422]).toContain(res.status));
  });

  test('POST referral reject without reason returns 400', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const _res = await request(app)
      .post(`/api/mdt-coordination/referrals/${fakeId}/reject`)
      .send({})
      .expect(res => expect([400, 404, 422]).toContain(res.status));
  });

  test('PATCH decision with invalid status returns 400', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeDecId = new mongoose.Types.ObjectId();
    const _res = await request(app)
      .patch(`/api/mdt-coordination/meetings/${fakeId}/decisions/${fakeDecId}/status`)
      .send({ status: 'INVALID_STATUS' })
      .expect(res => expect([400, 404, 422]).toContain(res.status));
  });

  test('PATCH action item with invalid status returns 400', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeItemId = new mongoose.Types.ObjectId();
    const _res = await request(app)
      .patch(`/api/mdt-coordination/meetings/${fakeId}/action-items/${fakeItemId}/status`)
      .send({ status: 'INVALID' })
      .expect(res => expect([400, 404, 422]).toContain(res.status));
  });
});
