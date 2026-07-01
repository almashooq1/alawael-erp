/**
 * care-plan-routes-wave42.test.js — Wave 42 (Care Planning Phase 2).
 *
 * HTTP-layer tests for the care-plan routes. Service is mocked
 * (Wave 41 already covers the service-layer behavior).
 *
 * Covers:
 *   • POST /                          — createDraft happy + permission gating + bad plan type
 *   • POST /:id/validate              — runValidation
 *   • POST /:id/transitions           — happy + unknown id + permission mapping
 *   • POST /:id/reject                — happy + missing reason mapping
 *   • POST /:id/scorecard             — happy + self-review block
 *   • POST /:id/versions              — happy + parent fetch
 *   • POST /:id/amendments            — happy + forbidden mapping
 *   • POST /:id/family-version        — length + readability guards
 *   • GET /:id                        — happy + 404
 *   • GET /plan/:planId/versions      — history
 *   • GET /:id/allowed-transitions    — UI helper
 *   • GET /_health                    — ops probe
 *   • REASON_TO_STATUS mapping for every reason
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createCarePlanRouter = require('../routes/care-plan.routes');
const reg = require('../intelligence/care-planning.registry');

function makeService(overrides = {}) {
  return {
    createDraft: jest.fn(async () => ({
      ok: true,
      planVersion: { _id: 'pv-1', planId: 'plan-A', versionNumber: 1, status: 'draft' },
    })),
    runValidation: jest.fn(async () => ({
      ok: true,
      planVersion: { _id: 'pv-1', status: 'ready_for_submission' },
      validation: {
        readinessScore: 92,
        band: 'ready',
        hardFailures: [],
        softWarnings: [],
        verdict: 'ready_for_submission',
      },
    })),
    transition: jest.fn(async () => ({
      ok: true,
      planVersion: { _id: 'pv-1', status: 'submitted_to_supervisor' },
      fromStatus: 'ready_for_submission',
      toStatus: 'submitted_to_supervisor',
    })),
    reject: jest.fn(async () => ({
      ok: true,
      planVersion: {
        _id: 'pv-1',
        status: 'rejected',
        rejection: { primaryReason: 'evidence_gap' },
      },
    })),
    recordReviewScorecard: jest.fn(async () => ({
      ok: true,
      overall: 8.2,
      planVersion: { _id: 'pv-1', reviewScorecard: { overall: 8.2 } },
    })),
    createNewVersion: jest.fn(async () => ({
      ok: true,
      planVersion: { _id: 'pv-2', planId: 'plan-A', versionNumber: 2, status: 'draft' },
      diff: {
        addedGoals: ['g-new'],
        removedGoals: [],
        requiresFamilyRenotification: false,
        requiresSupervisorReReview: true,
        oneLineSummary: '+1 هدف',
      },
    })),
    applyAmendment: jest.fn(async () => ({
      ok: true,
      amendmentId: 'amd_abc',
      planVersion: { _id: 'pv-1' },
    })),
    setFamilyVersion: jest.fn(async () => ({
      ok: true,
      planVersion: { _id: 'pv-1', familyVersion: { body: 'ok', readabilityGrade: 5 } },
    })),
    getPlanVersionById: jest.fn(async id =>
      id === 'pv-1'
        ? { _id: 'pv-1', planId: 'plan-A', versionNumber: 1, status: 'under_review' }
        : null
    ),
    getVersionHistory: jest.fn(async () => [
      { _id: 'pv-2', versionNumber: 2, status: 'draft' },
      { _id: 'pv-1', versionNumber: 1, status: 'superseded' },
    ]),
    ...overrides,
  };
}

function makeGovernance({ allowedPermissions = null } = {}) {
  return {
    hasPermission: jest.fn((role, code) => {
      if (allowedPermissions === null) return true;
      if (allowedPermissions === 'all') return true;
      return allowedPermissions.includes(code);
    }),
  };
}

function makeApp({ service, governance, userId = 'U-1', role = 'clinical_supervisor' } = {}) {
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: userId, role };
    next();
  });
  app.use('/api/v1/care-plans', createCarePlanRouter({ service: svc, governance: gov }));
  return { app, service: svc, governance: gov };
}

// ─── Factory guards ───────────────────────────────────────────────

describe('care-plan.routes — factory guards', () => {
  test('rejects missing service', () => {
    expect(() =>
      createCarePlanRouter({ service: null, governance: { hasPermission: () => true } })
    ).toThrow(/care-plan service is required/);
  });

  test('rejects missing governance', () => {
    expect(() => createCarePlanRouter({ service: makeService(), governance: null })).toThrow(
      /governance service is required/
    );
  });
});

// ─── POST / ───────────────────────────────────────────────────────

describe('POST / — createDraft', () => {
  test('happy path → 200 + planVersion', async () => {
    const { app, service } = makeApp({ role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans')
      .send({
        planId: 'plan-A',
        planType: 'individual_therapy',
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        goals: [{ goalId: 'g1' }],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.planVersion.versionNumber).toBe(1);
    expect(service.createDraft).toHaveBeenCalledTimes(1);
  });

  test('permission denied → 403', async () => {
    const gov = makeGovernance({ allowedPermissions: ['care-plan.read'] });
    const { app } = makeApp({ governance: gov, role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans')
      .send({ planType: 'individual_therapy' });
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('PERMISSION_DENIED');
    expect(res.body.requiredPermission).toBe('care-plan.draft.create');
  });

  test('service returns INVALID_PLAN_TYPE → 400', async () => {
    const svc = makeService({
      createDraft: jest.fn(async () => ({
        ok: false,
        reason: 'INVALID_PLAN_TYPE',
        planType: 'foo',
      })),
    });
    const { app } = makeApp({ service: svc, role: 'therapist' });
    const res = await request(app).post('/api/v1/care-plans').send({ planType: 'foo' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('INVALID_PLAN_TYPE');
    expect(res.body.planType).toBe('foo');
  });

  test('no auth user → 401', async () => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/care-plans',
      createCarePlanRouter({ service: makeService(), governance: makeGovernance() })
    );
    const res = await request(app).post('/api/v1/care-plans').send({});
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── POST /:id/validate ───────────────────────────────────────────

describe('POST /:id/validate — runValidation', () => {
  test('happy path → 200 + validation snapshot', async () => {
    const { app, service } = makeApp({ role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/validate')
      .send({ beneficiaryAge: 7, branchSessionCap: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.validation.readinessScore).toBe(92);
    expect(service.runValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        planVersionId: 'pv-1',
        options: { beneficiaryAge: 7, branchSessionCap: 5 },
      })
    );
  });

  test('service returns PLAN_NOT_FOUND → 404', async () => {
    const svc = makeService({
      runValidation: jest.fn(async () => ({ ok: false, reason: 'PLAN_NOT_FOUND' })),
    });
    const { app } = makeApp({ service: svc, role: 'therapist' });
    const res = await request(app).post('/api/v1/care-plans/missing/validate').send({});
    expect(res.status).toBe(404);
  });
});

// ─── POST /:id/transitions ────────────────────────────────────────

describe('POST /:id/transitions — generic driver', () => {
  test('unknown transitionId → 400', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'not_real' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('UNKNOWN_TRANSITION');
  });

  test('happy approve → 200', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({
        ok: true,
        planVersion: { _id: 'pv-1', status: 'approved' },
        fromStatus: 'under_review',
        toStatus: 'approved',
      })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.data.toStatus).toBe('approved');
  });

  test('permission mapped per transition (approve → care-plan.approve)', async () => {
    const gov = makeGovernance({ allowedPermissions: ['care-plan.reject'] }); // missing approve
    const { app } = makeApp({ governance: gov });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.approve');
  });

  test('INVALID_FROM_STATUS → 409', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({
        ok: false,
        reason: 'INVALID_FROM_STATUS',
        from: 'draft',
        allowed: ['under_review', 'escalated_to_branch_manager'],
      })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(409);
    expect(res.body.fromStatus).toBe('draft');
    expect(res.body.allowed).toContain('under_review');
  });

  test('HARD_FAILURES_PRESENT → 412', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({
        ok: false,
        reason: 'HARD_FAILURES_PRESENT',
        count: 3,
      })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(412);
    expect(res.body.hardFailureCount).toBe(3);
  });

  test('MUST_ESCALATE returns detail → 409', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({
        ok: false,
        reason: 'MUST_ESCALATE',
        detail: 'plan_type_requires_escalation',
      })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(409);
    expect(res.body.detail).toBe('plan_type_requires_escalation');
  });

  test('SELF_APPROVAL_FORBIDDEN → 403', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({ ok: false, reason: 'SELF_APPROVAL_FORBIDDEN' })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(403);
  });

  test('IS_TERMINAL → 409', async () => {
    const svc = makeService({
      transition: jest.fn(async () => ({ ok: false, reason: 'IS_TERMINAL', status: 'archived' })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/transitions')
      .send({ transitionId: 'approve' });
    expect(res.status).toBe(409);
    expect(res.body.currentStatus).toBe('archived');
  });
});

// ─── POST /:id/reject ─────────────────────────────────────────────

describe('POST /:id/reject — structured rejection', () => {
  test('happy path → 200', async () => {
    const { app, service } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reject')
      .send({
        primaryReason: 'evidence_gap',
        requiredFixes: [
          { elementId: 'g1', fix: 'add baseline', priority: 1, severity: 'must_fix' },
        ],
        rewriteGuidance: 'يرجى تحسين الهدف g1',
      });
    expect(res.status).toBe(200);
    expect(service.reject).toHaveBeenCalledTimes(1);
  });

  test('REJECTION_MISSING_REASON → 400', async () => {
    const svc = makeService({
      reject: jest.fn(async () => ({ ok: false, reason: 'REJECTION_MISSING_REASON' })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reject')
      .send({ primaryReason: 'attacker' });
    expect(res.status).toBe(400);
  });

  test('permission denied → 403', async () => {
    const gov = makeGovernance({ allowedPermissions: ['care-plan.read'] });
    const { app } = makeApp({ governance: gov });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reject')
      .send({ primaryReason: 'evidence_gap' });
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.reject');
  });
});

// ─── POST /:id/scorecard ──────────────────────────────────────────

describe('POST /:id/scorecard — record review', () => {
  test('happy path → 200 with overall', async () => {
    const { app, service } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/scorecard')
      .send({
        scorecard: {
          quality: 8,
          compliance: 8,
          clarity: 8,
          measurability: 8,
          safety: 9,
          familyReadiness: 7,
        },
        notes: ['note1'],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.overall).toBeCloseTo(8.2, 1);
    expect(service.recordReviewScorecard).toHaveBeenCalledTimes(1);
  });

  test('SELF_APPROVAL_FORBIDDEN → 403', async () => {
    const svc = makeService({
      recordReviewScorecard: jest.fn(async () => ({
        ok: false,
        reason: 'SELF_APPROVAL_FORBIDDEN',
      })),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/scorecard')
      .send({ scorecard: { quality: 9 } });
    expect(res.status).toBe(403);
  });
});

// ─── POST /:id/versions ───────────────────────────────────────────

describe('POST /:id/versions — createNewVersion', () => {
  test('happy path → 200 + diff', async () => {
    const { app, service } = makeApp({ role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/versions')
      .send({
        reasonForRevision: 'تعديل بعد تقدم الجلسات',
        changes: { goals: [] },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.planVersion.versionNumber).toBe(2);
    expect(res.body.data.diff.addedGoals).toContain('g-new');
    expect(service.createNewVersion).toHaveBeenCalledTimes(1);
  });

  test('parent not found → 404', async () => {
    const svc = makeService({
      getPlanVersionById: jest.fn(async () => null),
    });
    const { app } = makeApp({ service: svc, role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans/missing/versions')
      .send({ reasonForRevision: 'r', changes: {} });
    expect(res.status).toBe(404);
  });

  test('permission denied → 403', async () => {
    const gov = makeGovernance({ allowedPermissions: ['care-plan.read'] });
    const { app } = makeApp({ governance: gov, role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/versions')
      .send({ reasonForRevision: 'r' });
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.version.create');
  });
});

// ─── POST /:id/amendments ─────────────────────────────────────────

describe('POST /:id/amendments — controlled amendment', () => {
  test('happy path (branch_manager) → 200', async () => {
    const { app, service } = makeApp({ role: 'branch_manager' });
    const res = await request(app).post('/api/v1/care-plans/pv-1/amendments').send({
      field: 'specialty',
      before: null,
      after: 'OT',
      reason: 'analytics tagging fix',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.amendmentId).toBe('amd_abc');
    expect(service.applyAmendment).toHaveBeenCalledTimes(1);
  });

  test('AMENDMENT_FORBIDDEN (structural field) → 403', async () => {
    const svc = makeService({
      applyAmendment: jest.fn(async () => ({
        ok: false,
        reason: 'AMENDMENT_FORBIDDEN',
        field: 'goals',
      })),
    });
    const { app } = makeApp({ service: svc, role: 'branch_manager' });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/amendments')
      .send({ field: 'goals', reason: 'attempting to bypass', after: [] });
    expect(res.status).toBe(403);
    expect(res.body.field).toBe('goals');
  });

  test('permission denied for non-branch-manager → 403', async () => {
    const gov = makeGovernance({ allowedPermissions: ['care-plan.read'] });
    const { app } = makeApp({ governance: gov, role: 'therapist' });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/amendments')
      .send({ field: 'specialty', reason: 'tagging' });
    expect(res.status).toBe(403);
  });
});

// ─── POST /:id/family-version ─────────────────────────────────────

describe('POST /:id/family-version — preview/upload', () => {
  test('happy path → 200', async () => {
    const { app, service } = makeApp();
    const longBody = 'مرحبًا، هذه نسخة الأسرة. '.repeat(8);
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version')
      .send({ body: longBody, readabilityGrade: 5 });
    expect(res.status).toBe(200);
    expect(service.setFamilyVersion).toHaveBeenCalledTimes(1);
  });

  test('body too short → 400', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version')
      .send({ body: 'مرحبًا' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('FAMILY_BODY_TOO_SHORT');
  });

  test('body too long → 400', async () => {
    const { app } = makeApp();
    const body = 'كلمة '.repeat(reg.FAMILY_REDACTION.MAX_WORDS + 50);
    const res = await request(app).post('/api/v1/care-plans/pv-1/family-version').send({ body });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('FAMILY_BODY_TOO_LONG');
    expect(res.body.maxWords).toBe(reg.FAMILY_REDACTION.MAX_WORDS);
  });

  test('readability too high → 412', async () => {
    const { app } = makeApp();
    const longBody = 'هذه نسخة الأسرة لها محتوى كافٍ للاختبار. '.repeat(5);
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version')
      .send({ body: longBody, readabilityGrade: 9 });
    expect(res.status).toBe(412);
    expect(res.body.reason).toBe('FAMILY_READABILITY_TOO_HIGH');
    expect(res.body.maxGrade).toBe(reg.FAMILY_REDACTION.MAX_GRADE_LEVEL);
  });
});

// ─── GET endpoints ────────────────────────────────────────────────

describe('GET /:id — fetch single version', () => {
  test('happy path → 200', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/pv-1');
    expect(res.status).toBe(200);
    expect(res.body.data.planVersion._id).toBe('pv-1');
  });

  test('not found → 404', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/ghost');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('PLAN_NOT_FOUND');
  });

  test('permission denied → 403', async () => {
    const gov = makeGovernance({ allowedPermissions: [] });
    const { app } = makeApp({ governance: gov });
    const res = await request(app).get('/api/v1/care-plans/pv-1');
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.read');
  });
});

describe('GET /plan/:planId/versions — history', () => {
  test('happy path → 200', async () => {
    const { app, service } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/plan/plan-A/versions');
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.versions[0].versionNumber).toBe(2);
    // W1551: route now passes the caller's enforced branch scope (null in this
    // unit path — no requireBranchAccess middleware simulated).
    expect(service.getVersionHistory).toHaveBeenCalledWith('plan-A', null);
  });
});

describe('GET /:id/allowed-transitions — UI helper', () => {
  test('happy path with query → 200', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/v1/care-plans/pv-1/allowed-transitions')
      .query({ currentStatus: 'under_review' });
    expect(res.status).toBe(200);
    const ids = res.body.data.transitions.map(t => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['approve', 'reject', 'request_revision', 'escalate'])
    );
  });

  test('auto-derives currentStatus from service when query missing', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/pv-1/allowed-transitions');
    expect(res.status).toBe(200);
    expect(res.body.data.currentStatus).toBe('under_review');
  });

  test('invalid status → 400', async () => {
    const svc = makeService({
      getPlanVersionById: jest.fn(async () => null),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .get('/api/v1/care-plans/pv-1/allowed-transitions')
      .query({ currentStatus: 'invalid_state' });
    expect(res.status).toBe(400);
  });
});

describe('GET /_health — ops probe', () => {
  test('returns wave + registry surface counts', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/_health');
    expect(res.status).toBe(200);
    expect(res.body.data.wave).toBe(42);
    expect(res.body.data.statuses).toBe(13);
    expect(res.body.data.transitions).toBe(13);
    expect(res.body.data.planTypes).toBe(8);
  });
});

// ─── REASON_TO_STATUS coverage ─────────────────────────────────────

describe('REASON_TO_STATUS map — coverage', () => {
  const { REASON_TO_STATUS } = require('../routes/care-plan.routes');

  test('every reason gets a well-formed HTTP status', () => {
    for (const [reason, status] of Object.entries(REASON_TO_STATUS)) {
      expect(typeof reason).toBe('string');
      expect(Number.isInteger(status)).toBe(true);
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(500);
    }
  });

  test('all service-layer REASON keys are mapped', () => {
    const { REASON: SVC_REASON } = require('../intelligence/care-plan.service');
    // Allow service REASON to include keys that are intentionally not exposed
    // to the HTTP layer (e.g. internal-only) — but the common ones MUST be mapped.
    const required = [
      'PLAN_NOT_FOUND',
      'UNKNOWN_TRANSITION',
      'INVALID_FROM_STATUS',
      'ACTOR_REQUIRED',
      'ACTOR_ROLE_NOT_ALLOWED',
      'SELF_APPROVAL_FORBIDDEN',
      'READINESS_TOO_LOW',
      'HARD_FAILURES_PRESENT',
      'MUST_ESCALATE',
      'REVIEW_SCORE_TOO_LOW',
      'IS_TERMINAL',
      'AMENDMENT_FORBIDDEN',
      'VALIDATION_MISSING',
      'REJECTION_MISSING_REASON',
      'FAMILY_VERSION_MISSING',
    ];
    for (const key of required) {
      expect(SVC_REASON[key]).toBeDefined();
      expect(REASON_TO_STATUS[key]).toBeDefined();
    }
  });
});

// ─── TRANSITION_TO_PERMISSION map ──────────────────────────────────

describe('TRANSITION_TO_PERMISSION map', () => {
  const { TRANSITION_TO_PERMISSION } = require('../routes/care-plan.routes');

  test('every registry transition has a permission mapping', () => {
    for (const t of reg.TRANSITIONS) {
      expect(TRANSITION_TO_PERMISSION[t.id]).toBeDefined();
    }
  });

  test('approve / reject / amendment have HIGH-sensitivity permissions', () => {
    expect(TRANSITION_TO_PERMISSION.approve).toBe('care-plan.approve');
    expect(TRANSITION_TO_PERMISSION.reject).toBe('care-plan.reject');
    expect(TRANSITION_TO_PERMISSION.notify_family).toBe('care-plan.notify-family');
  });
});
