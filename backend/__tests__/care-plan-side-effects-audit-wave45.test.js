/**
 * care-plan-side-effects-audit-wave45.test.js — Wave 45.
 *
 * Covers:
 *   1. care-plan-side-effects.service
 *      - approve / reject / escalate / save_to_record / notify_family / supersede
 *      - dedupe keys + retry schedule + audience resolution + error handling
 *   2. care-plan-audit-trail.service
 *      - buildAuditTrail merges sources + sorts ascending
 *      - role redaction (family / executive / clinical)
 *      - verifySignatureChain catches prevHash + hash mismatches
 *   3. GET /:id/audit-trail route
 *      - happy + 404 + permission + redactFor query
 */

'use strict';

const express = require('express');
const request = require('supertest');
const {
  createCarePlanSideEffectHandlers,
  HANDLER_NAMES,
  RETRY_BACKOFF_MS,
} = require('../intelligence/care-plan-side-effects.service');
const auditTrail = require('../intelligence/care-plan-audit-trail.service');
const createCarePlanRouter = require('../routes/care-plan.routes');

// ─── 1. Side-effect handlers ───────────────────────────────────────

function buildPlan(overrides = {}) {
  return {
    _id: 'pv-1',
    planId: 'plan-A',
    versionNumber: 1,
    planType: 'individual_therapy',
    beneficiaryId: 'b-1',
    branchId: 'br-1',
    authorId: 'U-author',
    reviewerId: 'U-sup',
    approverId: 'U-sup',
    status: 'approved',
    approvedAt: new Date('2026-04-01T10:00:00Z'),
    evidenceHash: 'hash-v1',
    rejectionCount: 0,
    reviewScorecard: { overall: 8.2 },
    rejection: { primaryReason: 'evidence_gap' },
    familyVersion: { body: 'مرحبًا بكم، هذه نسخة الأسرة المبسطة.', readabilityGrade: 5 },
    signatureChain: [],
    amendments: [],
    familyNotifications: [],
    ...overrides,
  };
}

function deps(overrides = {}) {
  return {
    notifier: { send: jest.fn(async () => ({ ok: true })) },
    beneficiaryFileModel: {
      findOneAndUpdate: jest.fn(async () => ({ updated: true })),
    },
    familyChannelClient: { dispatch: jest.fn(async () => ({ ok: true, id: 'msg-1' })) },
    auditLogger: { log: jest.fn(async () => {}) },
    resolveAudienceForRole: jest.fn(async role => [{ userId: `${role}-1`, channel: 'inbox' }]),
    logger: { warn: jest.fn(), info: jest.fn() },
    ...overrides,
  };
}

describe('care-plan-side-effects — onApprove', () => {
  test('audits + notifies therapist audience with dedupeKey', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.APPROVE]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(true);
    expect(d.auditLogger.log).toHaveBeenCalledTimes(1);
    expect(d.notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'care-plan.approved',
        dedupeKey: 'care-plan.approved.pv-1',
      })
    );
  });

  test('survives notifier failure', async () => {
    const d = deps({
      notifier: {
        send: jest.fn(async () => {
          throw new Error('down');
        }),
      },
    });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.APPROVE]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    // The handler treats notifier failures as soft — approval still committed
    expect(r.ok).toBe(true);
  });
});

describe('care-plan-side-effects — onReject', () => {
  test('audits + notifies author with rejection structure', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.REJECT]({
      planVersion: buildPlan({ rejectionCount: 1 }),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(true);
    expect(d.notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'care-plan.rejected',
        audience: [{ userId: 'U-author', channel: 'inbox' }],
      })
    );
    // not yet at repeated threshold (3)
    expect(d.notifier.send).toHaveBeenCalledTimes(1);
  });

  test('after 3 rejections, also notifies branch_manager', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    await handlers[HANDLER_NAMES.REJECT]({
      planVersion: buildPlan({ rejectionCount: 3 }),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(d.notifier.send).toHaveBeenCalledTimes(2);
    expect(d.notifier.send).toHaveBeenLastCalledWith(
      expect.objectContaining({ event: 'care-plan.rejected.repeated' })
    );
  });
});

describe('care-plan-side-effects — onEscalate', () => {
  test('notifies branch_manager audience', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.ESCALATE]({
      planVersion: buildPlan({ planType: 'intensive', rejectionCount: 2 }),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(true);
    expect(d.notifier.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'care-plan.escalated',
        payload: expect.objectContaining({ planType: 'intensive', rejectionCount: 2 }),
      })
    );
  });
});

describe('care-plan-side-effects — onSaveToRecord', () => {
  test('appends to BeneficiaryFile.plans[] with lockState=locked', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.SAVE_TO_RECORD]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(true);
    expect(d.beneficiaryFileModel.findOneAndUpdate).toHaveBeenCalledWith(
      { beneficiaryId: 'b-1' },
      expect.objectContaining({
        $push: expect.objectContaining({
          plans: expect.objectContaining({ lockState: 'locked', evidenceHash: 'hash-v1' }),
        }),
      }),
      expect.objectContaining({ upsert: true })
    );
  });

  test('skips when beneficiaryFileModel not wired', async () => {
    const d = deps({ beneficiaryFileModel: null });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.SAVE_TO_RECORD]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_file_model');
  });

  test('captures write failures', async () => {
    const d = deps({
      beneficiaryFileModel: {
        findOneAndUpdate: jest.fn(async () => {
          throw new Error('dup-key');
        }),
      },
    });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.SAVE_TO_RECORD]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('write_failed');
  });
});

describe('care-plan-side-effects — onNotifyFamily', () => {
  test('happy dispatch → ok', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan(),
      actor: { userId: 'U-sup', role: 'clinical_supervisor' },
      metadata: { channel: 'whatsapp', recipient: '+966...', attempt: 0 },
    });
    expect(r.ok).toBe(true);
    expect(d.familyChannelClient.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'whatsapp' })
    );
  });

  test('no familyVersion.body → skipped', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan({ familyVersion: null }),
      actor: {},
      metadata: {},
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_family_body');
  });

  test('no channel client → manual_dispatch_required', async () => {
    const d = deps({ familyChannelClient: null });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan(),
      actor: {},
      metadata: {},
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('manual_dispatch_required');
    expect(r.recommendedNextAction).toBeDefined();
  });

  test('dispatch failure returns retry schedule for attempt 0', async () => {
    const d = deps({
      familyChannelClient: {
        dispatch: jest.fn(async () => ({ ok: false, reason: 'sms_rejected' })),
      },
    });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan(),
      actor: {},
      metadata: { channel: 'sms', attempt: 0 },
    });
    expect(r.ok).toBe(false);
    expect(r.retry).toBeTruthy();
    expect(r.retry.nextAttemptAtOffsetMs).toBe(RETRY_BACKOFF_MS[0]);
  });

  test('dispatch threw returns retry for attempt 1', async () => {
    const d = deps({
      familyChannelClient: {
        dispatch: jest.fn(async () => {
          throw new Error('timeout');
        }),
      },
    });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan(),
      actor: {},
      metadata: { channel: 'whatsapp', attempt: 1 },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('dispatch_threw');
    expect(r.retry.nextAttemptAtOffsetMs).toBe(RETRY_BACKOFF_MS[1]);
  });

  test('attempt 3+ exhausts retries (no schedule)', async () => {
    const d = deps({
      familyChannelClient: { dispatch: jest.fn(async () => ({ ok: false, reason: 'no_route' })) },
    });
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: buildPlan(),
      actor: {},
      metadata: { channel: 'sms', attempt: 3 },
    });
    expect(r.ok).toBe(false);
    expect(r.retry).toBeNull();
  });
});

describe('care-plan-side-effects — onSupersede', () => {
  test('audits with supersededBy', async () => {
    const d = deps();
    const handlers = createCarePlanSideEffectHandlers(d);
    const r = await handlers[HANDLER_NAMES.SUPERSEDE]({
      planVersion: buildPlan({ supersededBy: 'pv-2' }),
      actor: {},
    });
    expect(r.ok).toBe(true);
    expect(d.auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'care-plan.supersede.side-effect',
        metadata: expect.objectContaining({ supersededBy: 'pv-2' }),
      })
    );
  });
});

describe('care-plan-side-effects — helpers', () => {
  test('_dedupeKey shape', () => {
    const handlers = createCarePlanSideEffectHandlers(deps());
    expect(handlers._dedupeKey('e1', 'pv-1')).toBe('e1.pv-1');
  });

  test('_computeRetrySchedule out of range returns null', () => {
    const handlers = createCarePlanSideEffectHandlers(deps());
    expect(handlers._computeRetrySchedule(-1)).toBeNull();
    expect(handlers._computeRetrySchedule(99)).toBeNull();
    expect(handlers._computeRetrySchedule(0)).toEqual({
      attempt: 0,
      nextAttemptAtOffsetMs: RETRY_BACKOFF_MS[0],
    });
  });
});

// ─── 2. Audit trail aggregator ─────────────────────────────────────

describe('care-plan-audit-trail — buildAuditTrail', () => {
  function fullPlan() {
    return {
      _id: 'pv-1',
      planId: 'plan-A',
      versionNumber: 2,
      planType: 'individual_therapy',
      status: 'family_notification_sent',
      authorId: 'U-author',
      reviewerId: 'U-sup',
      approverId: 'U-sup',
      createdAt: new Date('2026-04-01T08:00:00Z'),
      validation: {
        validatedAt: new Date('2026-04-01T08:30:00Z'),
        readinessScore: 92,
        hardFailures: [],
        softWarnings: [],
        band: 'ready',
      },
      submittedAt: new Date('2026-04-01T09:00:00Z'),
      reviewStartedAt: new Date('2026-04-01T09:30:00Z'),
      approvedAt: new Date('2026-04-01T10:00:00Z'),
      savedToRecordAt: new Date('2026-04-01T10:05:00Z'),
      familyNotifiedAt: new Date('2026-04-01T10:10:00Z'),
      evidenceHash: 'hash-v2',
      reviewScorecard: { overall: 8.5 },
      signatureChain: [
        {
          userId: 'U-sup',
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date('2026-04-01T10:00:00Z'),
          prevHash: null,
          hash: 'h1',
        },
        {
          userId: 'U-sup',
          role: 'clinical_supervisor',
          action: 'save_to_record',
          signedAt: new Date('2026-04-01T10:05:00Z'),
          prevHash: 'h1',
          hash: 'h2',
        },
        {
          userId: 'U-sup',
          role: 'clinical_supervisor',
          action: 'notify_family',
          signedAt: new Date('2026-04-01T10:10:00Z'),
          prevHash: 'h2',
          hash: 'h3',
        },
      ],
      amendments: [
        {
          amendmentId: 'amd_1',
          appliedAt: new Date('2026-04-02T09:00:00Z'),
          appliedBy: 'U-bm',
          field: 'specialty',
          reason: 'tagging fix',
        },
      ],
      familyNotifications: [
        {
          attemptId: 'att_1',
          attemptedAt: new Date('2026-04-01T10:10:00Z'),
          channel: 'whatsapp',
          status: 'delivered',
          retries: 0,
        },
      ],
      familyVersion: { readabilityGrade: 5 },
    };
  }

  test('merges sources + sorts ascending', () => {
    const r = auditTrail.buildAuditTrail(fullPlan());
    expect(r.ok).toBe(true);
    expect(r.events.length).toBeGreaterThan(5);
    // ascending order
    for (let i = 1; i < r.events.length; i++) {
      expect(r.events[i].at >= r.events[i - 1].at).toBe(true);
    }
  });

  test('counts each kind', () => {
    const r = auditTrail.buildAuditTrail(fullPlan());
    expect(r.counts.signatures).toBe(3);
    expect(r.counts.amendments).toBe(1);
    expect(r.counts.familySends).toBe(1);
    expect(r.counts.rejections).toBe(0);
    expect(r.counts.transitions).toBeGreaterThanOrEqual(6);
  });

  test('integrity check signals chain intact when hash helper provided', () => {
    const computeSignatureHash = ({ userId, action, prevHash }) => {
      if (action === 'approve' && prevHash === null) return 'h1';
      if (action === 'save_to_record' && prevHash === 'h1') return 'h2';
      if (action === 'notify_family' && prevHash === 'h2') return 'h3';
      return 'unexpected';
    };
    const r = auditTrail.buildAuditTrail(fullPlan(), { computeSignatureHash });
    expect(r.integrity.signatureChainOk).toBe(true);
    expect(r.integrity.brokenAt).toBeNull();
  });

  test('catches signature-chain prevHash break', () => {
    const plan = fullPlan();
    plan.signatureChain[1].prevHash = 'wrong';
    const r = auditTrail.buildAuditTrail(plan);
    expect(r.integrity.signatureChainOk).toBe(false);
    expect(r.integrity.brokenAt).toBe(1);
    expect(r.integrity.reason).toBe('PREV_HASH_MISMATCH');
  });

  test('catches signature-chain hash mismatch via injected helper', () => {
    const plan = fullPlan();
    const computeSignatureHash = () => 'always-different';
    const r = auditTrail.buildAuditTrail(plan, { computeSignatureHash });
    expect(r.integrity.signatureChainOk).toBe(false);
    expect(r.integrity.reason).toBe('HASH_MISMATCH');
  });

  test('redactFor=family hides internal events + actor ids', () => {
    const r = auditTrail.buildAuditTrail(fullPlan(), { redactFor: 'family' });
    const kinds = new Set(r.events.map(e => e.kind));
    expect(kinds.has('plan.signature')).toBe(false);
    expect(kinds.has('plan.amendment')).toBe(false);
    expect(kinds.has('plan.review_started')).toBe(false);
    expect(kinds.has('plan.approved')).toBe(true);
    for (const ev of r.events) {
      expect(ev.actorUserId).toBeNull();
    }
  });

  test('redactFor=executive masks actor ids', () => {
    const r = auditTrail.buildAuditTrail(fullPlan(), { redactFor: 'executive' });
    const masked = r.events.find(ev => ev.actorUserId);
    expect(masked.actorUserId).toMatch(/\*\*\*/);
  });

  test('REJECTED event includes primaryReason in detail', () => {
    const plan = fullPlan();
    plan.rejectedAt = new Date('2026-04-01T11:00:00Z');
    plan.rejection = {
      primaryReason: 'evidence_gap',
      urgency: 'within_3_days',
      requiredFixes: [{}, {}],
    };
    plan.rejectionCount = 1;
    const r = auditTrail.buildAuditTrail(plan);
    const rejection = r.events.find(e => e.kind === 'plan.rejected');
    expect(rejection.detail.primaryReason).toBe('evidence_gap');
    expect(rejection.detail.requiredFixesCount).toBe(2);
  });

  test('rejects invalid planVersion', () => {
    const r = auditTrail.buildAuditTrail(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_PLAN_VERSION');
  });

  test('includeAmendments=false hides amendments', () => {
    const r = auditTrail.buildAuditTrail(fullPlan(), { includeAmendments: false });
    const kinds = new Set(r.events.map(e => e.kind));
    expect(kinds.has('plan.amendment')).toBe(false);
  });

  test('plan.toObject() is honored if present', () => {
    const plan = fullPlan();
    const wrapped = {
      toObject: () => plan,
    };
    const r = auditTrail.buildAuditTrail(wrapped);
    expect(r.ok).toBe(true);
    expect(r.events.length).toBeGreaterThan(0);
  });
});

describe('care-plan-audit-trail — verifySignatureChain', () => {
  test('intact chain → ok', () => {
    const chain = [
      { userId: 'u1', action: 'a', prevHash: null, hash: 'h1', signedAt: new Date() },
      { userId: 'u2', action: 'b', prevHash: 'h1', hash: 'h2', signedAt: new Date() },
    ];
    expect(auditTrail.verifySignatureChain(chain)).toEqual({ ok: true, brokenAt: null });
  });

  test('empty chain → ok', () => {
    expect(auditTrail.verifySignatureChain([])).toEqual({ ok: true, brokenAt: null });
  });

  test('broken prevHash → brokenAt index', () => {
    const chain = [
      { userId: 'u1', action: 'a', prevHash: null, hash: 'h1', signedAt: new Date() },
      { userId: 'u2', action: 'b', prevHash: 'WRONG', hash: 'h2', signedAt: new Date() },
    ];
    const v = auditTrail.verifySignatureChain(chain);
    expect(v.ok).toBe(false);
    expect(v.brokenAt).toBe(1);
  });
});

// ─── 3. GET /:id/audit-trail route ─────────────────────────────────

function makeService(overrides = {}) {
  return {
    createDraft: jest.fn(),
    runValidation: jest.fn(),
    transition: jest.fn(),
    reject: jest.fn(),
    recordReviewScorecard: jest.fn(),
    createNewVersion: jest.fn(),
    applyAmendment: jest.fn(),
    setFamilyVersion: jest.fn(),
    getPlanVersionById: jest.fn(async id =>
      id === 'pv-1'
        ? {
            _id: 'pv-1',
            planId: 'plan-A',
            versionNumber: 1,
            status: 'approved',
            createdAt: new Date('2026-04-01T08:00:00Z'),
            approvedAt: new Date('2026-04-01T10:00:00Z'),
            evidenceHash: 'hash-v1',
            authorId: 'U-author',
            reviewerId: 'U-sup',
            approverId: 'U-sup',
            signatureChain: [
              {
                userId: 'U-sup',
                role: 'clinical_supervisor',
                action: 'approve',
                signedAt: new Date('2026-04-01T10:00:00Z'),
                prevHash: null,
                hash: 'h1',
              },
            ],
            amendments: [],
            familyNotifications: [],
          }
        : null
    ),
    getVersionHistory: jest.fn(),
    ...overrides,
  };
}

function makeApp({ service, allowedPermissions = null, role = 'clinical_supervisor' } = {}) {
  const svc = service || makeService();
  const gov = {
    hasPermission: jest.fn((_role, code) => {
      if (allowedPermissions === null) return true;
      return allowedPermissions.includes(code);
    }),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 'U-1', role };
    next();
  });
  app.use('/api/v1/care-plans', createCarePlanRouter({ service: svc, governance: gov }));
  return { app, service: svc, governance: gov };
}

describe('GET /:id/audit-trail', () => {
  test('happy path → 200 with chronological events', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/pv-1/audit-trail');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(Array.isArray(res.body.data.events)).toBe(true);
    expect(res.body.data.integrity.signatureChainOk).toBe(true);
  });

  test('not found → 404', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/care-plans/ghost/audit-trail');
    expect(res.status).toBe(404);
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const res = await request(app).get('/api/v1/care-plans/pv-1/audit-trail');
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.audit-trail.read');
  });

  test('redactFor=family hides internal events', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/v1/care-plans/pv-1/audit-trail')
      .query({ redactFor: 'family' });
    expect(res.status).toBe(200);
    const kinds = res.body.data.events.map(e => e.kind);
    expect(kinds).not.toContain('plan.signature');
  });

  test('invalid redactFor falls back to clinical', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .get('/api/v1/care-plans/pv-1/audit-trail')
      .query({ redactFor: 'attacker_value' });
    expect(res.status).toBe(200);
    expect(res.body.data.redactFor).toBe('clinical');
  });
});
