'use strict';

/**
 * voice-log-routes-behavioral-wave853.test.js — W853.
 *
 * Behavioral coverage for the W513 voice-log REST surface. Complements the
 * static drift guard (voice-log-routes-wave513.test.js) by booting a REAL
 * Express app + REAL branchScope middleware + MongoMemoryServer, mocking ONLY
 * the auth layer (per the CLAUDE.md Phase-B harness pattern). This is the
 * "wired but never delivered" class of bug the static guard cannot catch:
 * genuine cross-branch isolation, model pre-save invariants, and the
 * active→superseded state machine are exercised end-to-end.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Auth is the ONLY mock — branchScope + bodyScopedBeneficiaryGuard run REAL.
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
let BeneficiaryVoiceLog;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminA = {
  id: String(ADMIN_A),
  _id: ADMIN_A,
  role: 'admin',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/voice-log', require('../routes/voice-log.routes'));
  return app;
}

let app;

function validEntry(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    entryKind: 'preference',
    captureModality: 'verbal',
    capacityGrade: 'full',
    capturedByRole: 'beneficiary',
    content: { text: 'أحب جلسات النطق في الصباح' },
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w853-voice-log' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  BeneficiaryVoiceLog = require('../models/BeneficiaryVoiceLog');
  Beneficiary = require('../models/Beneficiary');

  // Minimal beneficiary fixtures inserted raw to dodge schema required-fields.
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });

  app = buildApp();
});

afterEach(async () => {
  await BeneficiaryVoiceLog.deleteMany({});
  mockAuthState.user = therapistA;
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W853 — voice-log POST / create', () => {
  it('creates a verbal voice entry (201) and persists it', async () => {
    const res = await request(app).post('/api/v1/voice-log').send(validEntry());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entryKind).toBe('preference');
    const count = await BeneficiaryVoiceLog.countDocuments({});
    expect(count).toBe(1);
  });

  it('rejects an invalid entryKind (400) without persisting', async () => {
    const res = await request(app)
      .post('/api/v1/voice-log')
      .send(validEntry({ entryKind: 'not_a_kind' }));
    expect(res.status).toBe(400);
    expect(await BeneficiaryVoiceLog.countDocuments({})).toBe(0);
  });

  it('enforces the anti-substitution invariant: proxy + non-absent capacity needs supportArrangement', async () => {
    const res = await request(app)
      .post('/api/v1/voice-log')
      .send(
        validEntry({
          captureModality: 'proxy',
          capacityGrade: 'supported',
          capturedByRole: 'family',
        })
      );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await BeneficiaryVoiceLog.countDocuments({})).toBe(0);
  });

  it('accepts proxy when a support arrangement is documented (201)', async () => {
    const res = await request(app)
      .post('/api/v1/voice-log')
      .send(
        validEntry({
          captureModality: 'proxy',
          capacityGrade: 'supported',
          capturedByRole: 'family',
          supportArrangement: 'الأم تترجم إشارات الطفل بعد تدريب من أخصائي النطق',
        })
      );
    expect(res.status).toBe(201);
  });
});

describe('W853 — cross-branch isolation', () => {
  it('blocks recording a voice entry for a foreign-branch beneficiary (403)', async () => {
    const res = await request(app)
      .post('/api/v1/voice-log')
      .send(validEntry({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) }));
    expect(res.status).toBe(403);
    expect(await BeneficiaryVoiceLog.countDocuments({})).toBe(0);
  });

  it('GET / only returns the caller-branch entries', async () => {
    await BeneficiaryVoiceLog.create({
      beneficiaryId: BENE_A,
      branchId: BRANCH_A,
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: THERAPIST_A,
      capturedByRole: 'beneficiary',
      content: { text: 'a' },
    });
    await BeneficiaryVoiceLog.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      entryKind: 'preference',
      captureModality: 'verbal',
      capacityGrade: 'full',
      capturedBy: THERAPIST_A,
      capturedByRole: 'beneficiary',
      content: { text: 'b' },
    });
    const res = await request(app).get('/api/v1/voice-log');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W853 — by-beneficiary CRPD compliance summary', () => {
  it('computes directPct from capture modalities', async () => {
    const base = {
      beneficiaryId: BENE_A,
      branchId: BRANCH_A,
      entryKind: 'preference',
      capacityGrade: 'full',
      capturedBy: THERAPIST_A,
      capturedByRole: 'beneficiary',
      content: { text: 'x' },
    };
    await BeneficiaryVoiceLog.create({ ...base, captureModality: 'verbal' });
    await BeneficiaryVoiceLog.create({ ...base, captureModality: 'gesture' });
    await BeneficiaryVoiceLog.create({
      ...base,
      captureModality: 'proxy',
      capacityGrade: 'supported',
      capturedByRole: 'family',
      supportArrangement: 'الأخصائي يفسّر استجابات المستفيد الحركية أثناء الجلسة',
    });
    const res = await request(app).get(`/api/v1/voice-log/by-beneficiary/${BENE_A}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    // 2 direct (verbal+gesture) of 3 → 67%
    expect(res.body.crpdCompliance.directCount).toBe(2);
    expect(res.body.crpdCompliance.proxyCount).toBe(1);
    expect(res.body.crpdCompliance.directPct).toBe(67);
  });
});

describe('W853 — action + supersede state machine', () => {
  async function seed() {
    const res = await request(app).post('/api/v1/voice-log').send(validEntry());
    return res.body.data._id;
  }

  it('logs a follow-up action on an active entry (200)', async () => {
    const id = await seed();
    const res = await request(app)
      .post(`/api/v1/voice-log/${id}/action`)
      .send({ action: 'plan_adjusted', details: 'تعديل توقيت الجلسات للصباح' });
    expect(res.status).toBe(200);
    expect(res.body.data.actionTaken).toBe('plan_adjusted');
  });

  it('supersede marks the entry superseded; further action returns 409', async () => {
    const oldId = await seed();
    const newerRes = await request(app).post('/api/v1/voice-log').send(validEntry());
    const newerId = newerRes.body.data._id;

    const sup = await request(app)
      .post(`/api/v1/voice-log/${oldId}/supersede`)
      .send({ supersededBy: newerId });
    expect(sup.status).toBe(200);
    expect(sup.body.data.status).toBe('superseded');

    const act = await request(app)
      .post(`/api/v1/voice-log/${oldId}/action`)
      .send({ action: 'plan_adjusted' });
    expect(act.status).toBe(409);
  });
});

describe('W853 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const id = (await request(app).post('/api/v1/voice-log').send(validEntry())).body.data._id;
    const res = await request(app).delete(`/api/v1/voice-log/${id}`);
    expect(res.status).toBe(403);
    expect(await BeneficiaryVoiceLog.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await request(app).post('/api/v1/voice-log').send(validEntry())).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/voice-log/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
    expect(await BeneficiaryVoiceLog.countDocuments({})).toBe(0);
  });
});
