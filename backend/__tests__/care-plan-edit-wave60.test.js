/**
 * care-plan-edit-wave60.test.js — Wave 60.
 *
 * Covers:
 *   1. service.updateDraft — state guard / author guard / field whitelist /
 *      validation invalidation / status downgrade from revision_requested
 *   2. PATCH /:id route — permission gating + envelope + 409 for non-editable
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
let ownServer = null;

async function ensureConnection() {
  if (mongoose.connection.readyState === 1) return;
  let uri = null;
  try {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } catch (_) {
    /* file may not exist */
  }
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    ownServer = await MongoMemoryServer.create();
    uri = ownServer.getUri();
  }
  await mongoose.connect(uri);
}

let CarePlanVersion;
let createCarePlanService;
let createCarePlanValidator;
let createCarePlanRouter;

beforeAll(async () => {
  await ensureConnection();
  CarePlanVersion = require('../models/CarePlanVersion');
  ({ createCarePlanService } = require('../intelligence/care-plan.service'));
  ({ createCarePlanValidator } = require('../intelligence/care-plan-validator.service'));
  createCarePlanRouter = require('../routes/care-plan.routes');
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  if (CarePlanVersion && mongoose.connection.readyState === 1) {
    await CarePlanVersion.deleteMany({});
  }
});

const therapist = { userId: new mongoose.Types.ObjectId().toString(), role: 'therapist' };
const otherTherapist = { userId: new mongoose.Types.ObjectId().toString(), role: 'therapist' };
const supervisor = {
  userId: new mongoose.Types.ObjectId().toString(),
  role: 'clinical_supervisor',
};

function makeSvc() {
  return createCarePlanService({
    planVersionModel: CarePlanVersion,
    validator: createCarePlanValidator({}),
    logger: { warn: () => {}, info: () => {} },
  });
}

function draftInput(planIdSuffix = '1') {
  return {
    planId: `plan-edit-${planIdSuffix}`,
    planType: 'individual_therapy',
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    authorId: therapist.userId,
    actor: therapist,
    reasonForPlan: 'initial',
    sessionsPerWeekCap: 5,
    reviewSchedule: { nextReviewAt: new Date(Date.now() + 30 * 86400000), cadenceWeeks: 12 },
    goals: [
      {
        goalId: 'g1',
        domain: 'expressive_language',
        statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا في جلسات NET',
        priorityScore: 0.8,
        targetValue: '40',
        targetUnit: 'mands',
        targetHorizonWeeks: 12,
        baselineLink: 'bl-1',
        assessmentLink: 'asm-1',
        measureLink: 'm-1',
        evidenceRefs: [
          { kind: 'assessment', refId: 'asm-1', capturedAt: new Date(Date.now() - 14 * 86400000) },
        ],
      },
    ],
    programs: [
      { programId: 'p1', name: 'NET', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] },
    ],
    measures: [{ measureId: 'm-1', instrument: 'VB-MAPP', cadenceWeeks: 10, goalRefs: ['g1'] }],
    familyRole: {
      expectedInvolvementMinutesPerWeek: 30,
      coachingPlan: 'تخصيص عشر دقائق يوميًا للعب وتشجيع الطفل',
      homeProgram: [{ activity: 'قراءة قصة', frequency: 'يوميًا', goalRef: 'g1' }],
    },
  };
}

// ─── 1. service.updateDraft ─────────────────────────────────────────

describe('service.updateDraft — state + author guards', () => {
  test('rejects unknown plan', async () => {
    const svc = makeSvc();
    const r = await svc.updateDraft({
      planVersionId: new mongoose.Types.ObjectId().toString(),
      actor: therapist,
      changes: { goals: [] },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('PLAN_NOT_FOUND');
  });

  test('rejects when status is not editable (submitted_to_supervisor)', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s1'));
    await svc.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: { goals: [] },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOT_EDITABLE');
    expect(r.status).toBe('submitted_to_supervisor');
  });

  test('rejects when actor is not the author', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s2'));
    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: otherTherapist,
      changes: { sessionsPerWeekCap: 4 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  test('updates allowed fields and silently ignores immutable ones', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s3'));
    const originalAuthor = c.planVersion.authorId;

    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: {
        sessionsPerWeekCap: 7,
        specialty: 'SLP',
        // Immutable fields — should be silently ignored
        status: 'approved',
        evidenceHash: 'attacker-hash',
        authorId: otherTherapist.userId,
      },
    });
    expect(r.ok).toBe(true);
    expect(r.fieldsApplied).toEqual(expect.arrayContaining(['sessionsPerWeekCap', 'specialty']));
    expect(r.fieldsApplied).not.toContain('status');
    expect(r.fieldsApplied).not.toContain('evidenceHash');

    const refreshed = await CarePlanVersion.findById(c.planVersion._id);
    expect(refreshed.sessionsPerWeekCap).toBe(7);
    expect(refreshed.specialty).toBe('SLP');
    expect(refreshed.status).toBe('draft'); // not 'approved'
    expect(refreshed.evidenceHash).toBeFalsy();
    expect(String(refreshed.authorId)).toBe(String(originalAuthor));
  });

  test('replaces goals array atomically (not partial merge)', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s4'));
    const newGoals = [
      {
        goalId: 'g-new-1',
        domain: 'social',
        statement: 'هدف اجتماعي بديل',
        priorityScore: 0.7,
        targetHorizonWeeks: 8,
        baselineLink: 'bl-x',
        assessmentLink: 'asm-x',
        measureLink: 'm-x',
        evidenceRefs: [{ kind: 'note', refId: 'note-1' }],
      },
      {
        goalId: 'g-new-2',
        domain: 'cognitive',
        statement: 'هدف معرفي',
        priorityScore: 0.6,
        targetHorizonWeeks: 12,
        baselineLink: 'bl-y',
        assessmentLink: 'asm-y',
        measureLink: 'm-y',
        evidenceRefs: [],
      },
    ];
    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: { goals: newGoals },
    });
    expect(r.ok).toBe(true);
    const refreshed = await CarePlanVersion.findById(c.planVersion._id);
    expect(refreshed.goals.length).toBe(2);
    expect(refreshed.goals[0].goalId).toBe('g-new-1');
    // Old g1 is gone
    expect(refreshed.goals.find(g => g.goalId === 'g1')).toBeUndefined();
  });

  test('invalidates validation snapshot after edit', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s5'));
    await svc.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    const beforeEdit = await CarePlanVersion.findById(c.planVersion._id);
    const initialScore = beforeEdit.validation?.readinessScore;
    expect(initialScore).toBeGreaterThan(0);

    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: { sessionsPerWeekCap: 3 },
    });
    expect(r.ok).toBe(true);

    const after = await CarePlanVersion.findById(c.planVersion._id);
    expect(after.validation.readinessScore).toBe(0);
    expect(after.validation.band).toBe('draft_only');
    expect(after.validation.validatedAt).toBeNull();
  });

  test('downgrades status from revision_requested to draft on edit', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s6'));
    const v = await svc.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    expect(v.ok).toBe(true);
    const s = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    expect(s.ok).toBe(true);
    const b = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    expect(b.ok).toBe(true);
    const rr = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'request_revision',
      actor: supervisor,
    });
    expect(rr.ok).toBe(true);

    const beforeEdit = await CarePlanVersion.findById(c.planVersion._id);
    expect(beforeEdit.status).toBe('revision_requested');

    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: { sessionsPerWeekCap: 4 },
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('draft');
  });

  test('returns NO_MUTABLE_CHANGES when payload has only immutable fields', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s7'));
    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: therapist,
      changes: {
        status: 'approved',
        evidenceHash: 'x',
        signatureChain: [{}],
      },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NO_MUTABLE_CHANGES');
    expect(r.editable).toEqual(expect.arrayContaining(['goals', 'programs', 'measures']));
  });

  test('rejects when actor is missing', async () => {
    const svc = makeSvc();
    const c = await svc.createDraft(draftInput('s8'));
    const r = await svc.updateDraft({
      planVersionId: c.planVersion._id,
      actor: null,
      changes: { sessionsPerWeekCap: 3 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── 2. PATCH /:id route ────────────────────────────────────────────

describe('PATCH /:id — care-plan draft update', () => {
  function makeApp({
    allowedPermissions = null,
    asUserId = therapist.userId,
    role = 'therapist',
  } = {}) {
    const svc = makeSvc();
    const gov = {
      hasPermission: jest.fn((_role, code) => {
        if (allowedPermissions === null) return true;
        return allowedPermissions.includes(code);
      }),
    };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: asUserId, role };
      next();
    });
    app.use('/api/v1/care-plans', createCarePlanRouter({ service: svc, governance: gov }));
    return { app, svc };
  }

  test('happy path → 200 + planVersion + fieldsApplied', async () => {
    const { app, svc } = makeApp();
    const c = await svc.createDraft(draftInput('r1'));
    const res = await request(app)
      .patch(`/api/v1/care-plans/${c.planVersion._id}`)
      .send({ sessionsPerWeekCap: 4, specialty: 'OT' });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(res.body.data.fieldsApplied).toEqual(
      expect.arrayContaining(['sessionsPerWeekCap', 'specialty'])
    );
  });

  test('permission denied for non-author roles → 403', async () => {
    const { app, svc } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const c = await svc.createDraft(draftInput('r2'));
    const res = await request(app)
      .patch(`/api/v1/care-plans/${c.planVersion._id}`)
      .send({ sessionsPerWeekCap: 4 });
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.draft.edit-own');
  });

  test('PATCH on non-editable status → 409', async () => {
    const { app, svc } = makeApp();
    const c = await svc.createDraft(draftInput('r3'));
    await svc.runValidation({ planVersionId: c.planVersion._id, actor: therapist });
    await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: therapist,
    });
    const res = await request(app)
      .patch(`/api/v1/care-plans/${c.planVersion._id}`)
      .send({ sessionsPerWeekCap: 4 });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('NOT_EDITABLE');
  });

  test('different author → 403 (self-approval guard)', async () => {
    const { app, svc } = makeApp({ asUserId: otherTherapist.userId });
    const c = await svc.createDraft(draftInput('r4'));
    const res = await request(app)
      .patch(`/api/v1/care-plans/${c.planVersion._id}`)
      .send({ sessionsPerWeekCap: 4 });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('SELF_APPROVAL_FORBIDDEN');
  });

  test('PLAN_NOT_FOUND → 404', async () => {
    const { app } = makeApp();
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/v1/care-plans/${fakeId}`)
      .send({ sessionsPerWeekCap: 4 });
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('PLAN_NOT_FOUND');
  });

  test('NO_MUTABLE_CHANGES → 400', async () => {
    const { app, svc } = makeApp();
    const c = await svc.createDraft(draftInput('r5'));
    const res = await request(app)
      .patch(`/api/v1/care-plans/${c.planVersion._id}`)
      .send({ status: 'approved', evidenceHash: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('NO_MUTABLE_CHANGES');
  });

  test('501 when service.updateDraft is missing (old service version)', async () => {
    const svcStub = {
      createDraft: () => {},
      runValidation: () => {},
      transition: () => {},
      // updateDraft missing
    };
    const gov = { hasPermission: () => true };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: 'U-1', role: 'therapist' };
      next();
    });
    app.use('/api/v1/care-plans', createCarePlanRouter({ service: svcStub, governance: gov }));
    const res = await request(app)
      .patch(`/api/v1/care-plans/some-id`)
      .send({ sessionsPerWeekCap: 4 });
    expect(res.status).toBe(501);
    expect(res.body.reason).toBe('UPDATE_NOT_WIRED');
  });
});
