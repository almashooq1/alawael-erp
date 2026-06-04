'use strict';

/**
 * safeguarding-routes-behavioral-wave857.test.js — W857.
 *
 * ROUTE behavioral coverage for the W357 safeguarding surface. Complements:
 *   - safeguarding-wave357.test.js          (static route drift guard)
 *   - safeguarding-behavioral-wave357.test.js (MODEL invariant behavioral)
 * by booting a REAL Express app + REAL branchScope (W444) + MongoMemoryServer,
 * mocking ONLY auth. Safeguarding is the highest-stakes surface in the system
 * (child-protection allegations + alleged-perpetrator names) — this verifies
 * the full intake→triage→investigate→substantiate→authority→close state
 * machine, the 3-tier role gating (read / intake / investigate), and genuine
 * cross-branch isolation end-to-end.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'الدور غير مصرّح' });
  },
}));

let mongod;
let Concern;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const LEAD_A = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();
const REPORTER_B = new mongoose.Types.ObjectId();

const leadA = {
  id: String(LEAD_A),
  _id: LEAD_A,
  role: 'safeguarding_lead',
  name: 'مسؤول الحماية',
  branchId: String(BRANCH_A),
};
const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/safeguarding', require('../routes/safeguarding.routes'));
  return app;
}

let app;

function intakePayload(overrides = {}) {
  return {
    subjectKind: 'beneficiary',
    subjectBeneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    category: 'neglect',
    severity: 'medium',
    description: 'ملاحظة إهمال في النظافة الشخصية تتكرر يومياً',
    ...overrides,
  };
}

async function intake(overrides = {}) {
  return request(app).post('/api/v1/safeguarding').send(intakePayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w857-safeguarding' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Concern = require('../models/SafeguardingConcern');
  require('../models/Beneficiary');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = leadA;
});

afterEach(async () => {
  await Concern.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W857 — intake + validation', () => {
  it('accepts a valid intake (201, status=reported)', async () => {
    const res = await intake();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('reported');
    expect(res.body.data.category).toBe('neglect');
  });

  it('rejects missing description (400)', async () => {
    const res = await intake({ description: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid category (400)', async () => {
    const res = await intake({ category: 'not_a_category' });
    expect(res.status).toBe(400);
  });

  it('requires subjectBeneficiaryId when subjectKind=beneficiary (400)', async () => {
    const res = await intake({ subjectBeneficiaryId: undefined });
    expect(res.status).toBe(400);
  });

  it('blocks a critical concern with no supervisor notification (model 1h-SLA invariant)', async () => {
    const res = await intake({ severity: 'critical' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await Concern.countDocuments({})).toBe(0);
  });

  it('accepts a critical concern when supervisor was notified', async () => {
    const res = await intake({
      severity: 'critical',
      supervisorNotifiedAt: new Date().toISOString(),
    });
    expect(res.status).toBe(201);
  });
});

describe('W857 — role gating', () => {
  it('lets a therapist file an intake (permissive reporting)', async () => {
    mockAuthState.user = therapistA;
    const res = await intake();
    expect(res.status).toBe(201);
  });

  it('forbids a therapist from reading the concern list (403)', async () => {
    mockAuthState.user = therapistA;
    const res = await request(app).get('/api/v1/safeguarding');
    expect(res.status).toBe(403);
  });

  it('forbids a therapist from starting an investigation (403)', async () => {
    const id = (await intake()).body.data._id;
    mockAuthState.user = therapistA;
    const res = await request(app).post(`/api/v1/safeguarding/${id}/investigate`).send({});
    expect(res.status).toBe(403);
  });
});

describe('W857 — intake→closure state machine', () => {
  it('walks the full lifecycle to closed', async () => {
    const id = (await intake()).body.data._id;

    const triaged = await request(app)
      .post(`/api/v1/safeguarding/${id}/triage`)
      .send({ triageNotes: 'فرز أولي' });
    expect(triaged.status).toBe(200);
    expect(triaged.body.data.status).toBe('triaged');

    const investigating = await request(app)
      .post(`/api/v1/safeguarding/${id}/investigate`)
      .send({ investigationNotes: 'بدء التحقيق' });
    expect(investigating.status).toBe(200);
    expect(investigating.body.data.status).toBe('investigating');

    const substantiated = await request(app)
      .post(`/api/v1/safeguarding/${id}/substantiate`)
      .send({ outcome: 'substantiated', actionPlan: 'خطة حماية وإحالة' });
    expect(substantiated.status).toBe(200);
    expect(substantiated.body.data.status).toBe('substantiated');

    const closed = await request(app)
      .post(`/api/v1/safeguarding/${id}/close`)
      .send({ outcomeSummary: 'تم تنفيذ خطة الحماية وإغلاق البلاغ' });
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe('closed');
  });

  it('blocks substantiate before an investigation is started (409)', async () => {
    const id = (await intake()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/safeguarding/${id}/substantiate`)
      .send({ outcome: 'substantiated', actionPlan: 'خطة' });
    expect(res.status).toBe(409);
  });

  it('requires an actionPlan when substantiating (400)', async () => {
    const id = (await intake()).body.data._id;
    await request(app).post(`/api/v1/safeguarding/${id}/investigate`).send({});
    const res = await request(app)
      .post(`/api/v1/safeguarding/${id}/substantiate`)
      .send({ outcome: 'substantiated' });
    expect(res.status).toBe(400);
  });

  it('records an external authority referral → escalated_to_authority', async () => {
    const id = (await intake()).body.data._id;
    await request(app).post(`/api/v1/safeguarding/${id}/investigate`).send({});
    const res = await request(app)
      .post(`/api/v1/safeguarding/${id}/notify-authority`)
      .send({ authorityName: 'هيئة حقوق الإنسان', authorityReferenceNumber: 'HRC-2026-001' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('escalated_to_authority');
    expect(res.body.data.authorityReported).toBe(true);
  });

  it('requires authorityName for an authority referral (400)', async () => {
    const id = (await intake()).body.data._id;
    const res = await request(app).post(`/api/v1/safeguarding/${id}/notify-authority`).send({});
    expect(res.status).toBe(400);
  });

  it('blocks editing a closed concern (409)', async () => {
    const id = (await intake()).body.data._id;
    await request(app).post(`/api/v1/safeguarding/${id}/investigate`).send({});
    await request(app)
      .post(`/api/v1/safeguarding/${id}/substantiate`)
      .send({ outcome: 'unsubstantiated' });
    await request(app)
      .post(`/api/v1/safeguarding/${id}/close`)
      .send({ outcomeSummary: 'لم يثبت البلاغ' });
    const res = await request(app)
      .patch(`/api/v1/safeguarding/${id}`)
      .send({ notes: 'محاولة تعديل بعد الإغلاق' });
    expect(res.status).toBe(409);
  });
});

describe('W857 — cross-branch isolation (W444)', () => {
  async function seedBranchB() {
    return Concern.create({
      subjectKind: 'beneficiary',
      subjectBeneficiaryId: new mongoose.Types.ObjectId(),
      branchId: BRANCH_B,
      category: 'physical',
      severity: 'high',
      description: 'بلاغ في فرع آخر',
      reportedBy: REPORTER_B,
      status: 'reported',
    });
  }

  it('hides a foreign-branch concern from GET /:id (404)', async () => {
    const other = await seedBranchB();
    const res = await request(app).get(`/api/v1/safeguarding/${other._id}`);
    expect(res.status).toBe(404);
  });

  it('GET / only lists caller-branch concerns', async () => {
    await intake();
    await seedBranchB();
    const res = await request(app).get('/api/v1/safeguarding');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });

  it('blocks transitioning a foreign-branch concern (404 not 200)', async () => {
    const other = await seedBranchB();
    const res = await request(app).post(`/api/v1/safeguarding/${other._id}/triage`).send({});
    expect(res.status).toBe(404);
    const reloaded = await Concern.findById(other._id).lean();
    expect(reloaded.status).toBe('reported');
  });
});

describe('W857 — DELETE role gating', () => {
  it('forbids a safeguarding_lead from deleting (403)', async () => {
    const id = (await intake()).body.data._id;
    const res = await request(app).delete(`/api/v1/safeguarding/${id}`);
    expect(res.status).toBe(403);
    expect(await Concern.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await intake()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/safeguarding/${id}`);
    expect(res.status).toBe(200);
    expect(await Concern.countDocuments({})).toBe(0);
  });
});
