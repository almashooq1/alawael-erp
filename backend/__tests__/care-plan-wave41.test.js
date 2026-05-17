/**
 * care-plan-wave41.test.js — Wave 41 (Care Planning Phase 1).
 *
 * Covers:
 *   1. care-planning.registry — constants + helpers
 *   2. CarePlanVersion model — cross-field invariants + signature chain
 *   3. care-plan-validator.service — rule engine + readiness score + confidence
 *   4. care-plan.service — state machine + transitions + amendments + diff
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const reg = require('../intelligence/care-planning.registry');
const { createCarePlanValidator } = require('../intelligence/care-plan-validator.service');
const { createCarePlanService, REASON: SVC_REASON } = require('../intelligence/care-plan.service');

// ─── 1. Registry surface ────────────────────────────────────────────

describe('care-planning.registry — constants', () => {
  test('exports the 8 plan types', () => {
    expect(reg.PLAN_TYPE_LIST).toEqual([
      'individual_therapy',
      'individual_education',
      'behavioral',
      'family_support',
      'group',
      'multidisciplinary',
      'review',
      'intensive',
    ]);
  });

  test('exports the 13 plan statuses', () => {
    expect(reg.STATUS_LIST).toEqual(
      expect.arrayContaining([
        'draft',
        'validation_pending',
        'ready_for_submission',
        'submitted_to_supervisor',
        'under_review',
        'revision_requested',
        'escalated_to_branch_manager',
        'approved',
        'rejected',
        'archived',
        'superseded',
        'saved_to_record',
        'family_notification_sent',
      ])
    );
    expect(reg.STATUS_LIST.length).toBe(13);
  });

  test('exports the 13 state-machine transitions', () => {
    expect(reg.TRANSITIONS.length).toBe(13);
    const ids = reg.TRANSITIONS.map(t => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'submit_for_validation',
        'mark_ready',
        'submit_to_supervisor',
        'begin_review',
        'request_revision',
        'resubmit_after_revision',
        'escalate',
        'approve',
        'reject',
        'archive_rejected',
        'save_to_record',
        'notify_family',
        'supersede',
      ])
    );
  });

  test('every transition has required shape', () => {
    for (const t of reg.TRANSITIONS) {
      expect(t.id).toBeTruthy();
      expect(t.descriptionAr).toBeTruthy();
      expect(t.descriptionEn).toBeTruthy();
      expect(Array.isArray(t.from)).toBe(true);
      expect(reg.STATUS_LIST).toContain(t.to);
      expect(Array.isArray(t.actorRoles)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(t.severity);
      expect(typeof t.requiresHardFailuresClear).toBe('boolean');
    }
  });

  test('exports 12 hard rules + 5 soft rules', () => {
    const hard = reg.VALIDATION_RULES.filter(r => r.type === 'hard');
    const soft = reg.VALIDATION_RULES.filter(r => r.type === 'soft');
    expect(hard.length).toBe(12);
    expect(soft.length).toBe(5);
  });

  test('exports SMART criteria (5 items)', () => {
    expect(reg.SMART_CRITERIA).toEqual([
      'specific',
      'measurable',
      'achievable',
      'relevant',
      'time_bound',
    ]);
  });

  test('exports 8 rejection reason codes', () => {
    expect(reg.REJECTION_REASON_LIST.length).toBe(8);
  });

  test('TERMINAL_STATUSES contains archived/superseded/family_notification_sent', () => {
    expect(reg.TERMINAL_STATUSES.has('archived')).toBe(true);
    expect(reg.TERMINAL_STATUSES.has('superseded')).toBe(true);
    expect(reg.TERMINAL_STATUSES.has('family_notification_sent')).toBe(true);
    expect(reg.TERMINAL_STATUSES.has('approved')).toBe(false);
  });
});

describe('care-planning.registry — helpers', () => {
  test('findTransition returns transition by id', () => {
    const t = reg.findTransition('approve');
    expect(t).toBeTruthy();
    expect(t.to).toBe('approved');
  });

  test('findTransition returns null for unknown id', () => {
    expect(reg.findTransition('not_a_thing')).toBeNull();
  });

  test('getAllowedTransitionsFrom("draft") only allows submit_for_validation', () => {
    const ids = reg.getAllowedTransitionsFrom('draft').map(t => t.id);
    expect(ids).toEqual(['submit_for_validation']);
  });

  test('getAllowedTransitionsFrom("under_review") includes approve + reject + escalate + request_revision', () => {
    const ids = reg.getAllowedTransitionsFrom('under_review').map(t => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['approve', 'reject', 'request_revision', 'escalate'])
    );
  });

  test('validateTransitionRequest accepts valid pair', () => {
    const r = reg.validateTransitionRequest({
      fromStatus: 'under_review',
      transitionId: 'approve',
    });
    expect(r.valid).toBe(true);
  });

  test('validateTransitionRequest rejects bad fromStatus', () => {
    const r = reg.validateTransitionRequest({
      fromStatus: 'draft',
      transitionId: 'approve',
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('INVALID_FROM_STATUS');
  });

  test('isHighSensitivity captures critical + high transitions', () => {
    expect(reg.isHighSensitivity('approve')).toBe(true);
    expect(reg.isHighSensitivity('reject')).toBe(true);
    expect(reg.isHighSensitivity('escalate')).toBe(true);
    expect(reg.isHighSensitivity('supersede')).toBe(true);
    expect(reg.isHighSensitivity('begin_review')).toBe(false);
  });

  test('isPlanTypeAlwaysEscalated handles intensive + multidisciplinary', () => {
    expect(reg.isPlanTypeAlwaysEscalated('intensive')).toBe(true);
    expect(reg.isPlanTypeAlwaysEscalated('multidisciplinary')).toBe(true);
    expect(reg.isPlanTypeAlwaysEscalated('individual_therapy')).toBe(false);
  });

  test('classifyReadiness bands', () => {
    expect(reg.classifyReadiness(90, 0)).toBe('ready');
    expect(reg.classifyReadiness(75, 0)).toBe('pending');
    expect(reg.classifyReadiness(50, 0)).toBe('draft_only');
    expect(reg.classifyReadiness(99, 1)).toBe('draft_only'); // any hard failure forces draft
  });

  test('classifyConfidence buckets', () => {
    expect(reg.classifyConfidence(0.9)).toBe('present');
    expect(reg.classifyConfidence(0.6)).toBe('human_confirm');
    expect(reg.classifyConfidence(0.3)).toBe('hidden');
  });
});

// ─── 2. CarePlanVersion model — Wave-18 invariants ──────────────────

describe('CarePlanVersion model — invariants', () => {
  const Model = require('../models/CarePlanVersion');

  function baseDoc(overrides = {}) {
    return new Model({
      planId: 'plan-1',
      versionNumber: 1,
      planType: 'individual_therapy',
      status: 'draft',
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      reasonForPlan: 'initial',
      ...overrides,
    });
  }

  test('valid draft passes validation', () => {
    expect(baseDoc().validateSync()).toBeUndefined();
  });

  test('approved without reviewer + approver → invalid', () => {
    const doc = baseDoc({ status: 'approved' });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reviewerId).toBeDefined();
    expect(err.errors.approverId).toBeDefined();
  });

  test('approved with reviewer === author → invalid', () => {
    const authorId = new mongoose.Types.ObjectId();
    const doc = baseDoc({
      status: 'approved',
      authorId,
      reviewerId: authorId,
      approverId: new mongoose.Types.ObjectId(),
      validation: { readinessScore: 90, hardFailures: [], softWarnings: [], band: 'ready' },
      signatureChain: [
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date(),
          hash: 'abc',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reviewerId).toBeDefined();
  });

  test('approved with empty signatureChain → invalid', () => {
    const doc = baseDoc({
      status: 'approved',
      reviewerId: new mongoose.Types.ObjectId(),
      approverId: new mongoose.Types.ObjectId(),
      validation: { readinessScore: 90, hardFailures: [], softWarnings: [], band: 'ready' },
      signatureChain: [],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.signatureChain).toBeDefined();
  });

  test('approved with readinessScore < 85 → invalid', () => {
    const doc = baseDoc({
      status: 'approved',
      reviewerId: new mongoose.Types.ObjectId(),
      approverId: new mongoose.Types.ObjectId(),
      validation: { readinessScore: 70, hardFailures: [], softWarnings: [], band: 'pending' },
      signatureChain: [
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date(),
          hash: 'abc',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.validation).toBeDefined();
  });

  test('superseded without supersededBy → invalid', () => {
    const doc = baseDoc({
      status: 'superseded',
      reviewerId: new mongoose.Types.ObjectId(),
      approverId: new mongoose.Types.ObjectId(),
      signatureChain: [
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date(),
          hash: 'abc',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.supersededBy).toBeDefined();
  });

  test('family_notification_sent requires familyVersion.body', () => {
    const doc = baseDoc({
      status: 'family_notification_sent',
      reviewerId: new mongoose.Types.ObjectId(),
      approverId: new mongoose.Types.ObjectId(),
      validation: { readinessScore: 90, hardFailures: [], softWarnings: [], band: 'ready' },
      signatureChain: [
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date(),
          hash: 'abc',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.familyVersion).toBeDefined();
  });

  test('signatureChain integrity — broken prevHash → invalid', () => {
    const doc = baseDoc({
      status: 'approved',
      reviewerId: new mongoose.Types.ObjectId(),
      approverId: new mongoose.Types.ObjectId(),
      validation: { readinessScore: 90, hardFailures: [], softWarnings: [], band: 'ready' },
      signatureChain: [
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'begin_review',
          signedAt: new Date(),
          hash: 'h1',
        },
        {
          userId: new mongoose.Types.ObjectId(),
          role: 'clinical_supervisor',
          action: 'approve',
          signedAt: new Date(),
          prevHash: 'WRONG',
          hash: 'h2',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.signatureChain).toBeDefined();
  });

  test('computeEvidenceHash is deterministic', () => {
    const body = { planId: 'p1', versionNumber: 1, goals: [{ goalId: 'g1' }] };
    const h1 = Model.computeEvidenceHash(body);
    const h2 = Model.computeEvidenceHash({ ...body });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── 3. Validator service ──────────────────────────────────────────

describe('care-plan-validator.service', () => {
  function buildPlan(overrides = {}) {
    return {
      planId: 'plan-1',
      versionNumber: 1,
      planType: 'individual_therapy',
      reviewSchedule: {
        nextReviewAt: new Date(Date.now() + 7 * 86400000),
        cadenceWeeks: 12,
      },
      sessionsPerWeekCap: 5,
      safetyFlags: [],
      goals: [
        {
          goalId: 'g1',
          domain: 'expressive_language',
          statement: 'يطلب 40 شيئًا مختلفًا باستخدام النطق خلال 12 أسبوعًا',
          priorityScore: 0.8,
          targetValue: '40',
          targetUnit: 'mands',
          targetHorizonWeeks: 12,
          baselineLink: 'bl-1',
          assessmentLink: 'asm-1',
          measureLink: 'm-1',
          evidenceRefs: [
            {
              kind: 'assessment',
              refId: 'asm-1',
              capturedAt: new Date(Date.now() - 30 * 86400000),
            },
          ],
          confidence: 0.78,
        },
      ],
      programs: [
        { programId: 'p1', name: 'NET', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] },
      ],
      familyRole: {
        homeProgram: [{ activity: 'قراءة 10 دقائق', frequency: 'يومي', goalRef: 'g1' }],
      },
      ...overrides,
    };
  }

  test('a complete plan scores ≥ 85 and is ready', async () => {
    const v = createCarePlanValidator();
    const snap = await v.validate(buildPlan());
    expect(snap.readinessScore).toBeGreaterThanOrEqual(85);
    expect(snap.blocking).toBe(false);
    expect(snap.band).toBe('ready');
    expect(snap.verdict).toBe('ready_for_submission');
  });

  test('missing baseline produces a hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.goals[0].baselineLink = null;
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'goal_has_baseline')).toBe(true);
    expect(snap.blocking).toBe(true);
    expect(snap.verdict).toBe('draft_only');
  });

  test('missing review date produces a hard failure + score penalty', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan({ reviewSchedule: {} });
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'has_review_date')).toBe(true);
    expect(snap.readinessScore).toBeLessThan(85);
  });

  test('non-SMART goal produces a hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.goals[0].targetValue = null;
    plan.goals[0].targetUnit = null;
    plan.goals[0].targetHorizonWeeks = null;
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'goal_is_smart')).toBe(true);
  });

  test('orphan program (goalRef not in goals) → hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.programs[0].goalRefs = ['ghost'];
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'no_orphan_program')).toBe(true);
  });

  test('frequency over cap → hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.programs[0].frequencyPerWeek = 10; // cap=5
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'frequency_within_cap')).toBe(true);
  });

  test('safety flag without mitigation → hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan({
      safetyFlags: [{ flag: 'elopement', severity: 'high', mitigation: null }],
    });
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'safety_has_mitigation')).toBe(true);
  });

  test('duplicate goals in same domain → contradiction hard failure', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.goals.push({ ...plan.goals[0], goalId: 'g2' });
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'no_goal_contradictions')).toBe(true);
  });

  test('low-confidence goal triggers soft warning + score penalty', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.goals[0].confidence = 0.3;
    const snap = await v.validate(plan);
    expect(snap.softWarnings.some(w => w.ruleId === 'low_confidence_goal')).toBe(true);
  });

  test('old evidence (> 90d) triggers soft warning', async () => {
    const v = createCarePlanValidator();
    const plan = buildPlan();
    plan.goals[0].evidenceRefs[0].capturedAt = new Date(Date.now() - 120 * 86400000);
    const snap = await v.validate(plan);
    expect(snap.softWarnings.some(w => w.ruleId === 'evidence_recency')).toBe(true);
  });

  test('resolveEvidenceRef integration — unresolved ref → hard failure', async () => {
    const v = createCarePlanValidator({
      resolveEvidenceRef: async ref => ref.refId === 'asm-1', // only this one resolves
    });
    const plan = buildPlan();
    plan.goals[0].evidenceRefs.push({ kind: 'note', refId: 'ghost' });
    const snap = await v.validate(plan);
    expect(snap.hardFailures.some(f => f.ruleId === 'evidence_refs_resolvable')).toBe(true);
  });

  test('computeConfidence formula caps + recency decay', () => {
    const v = createCarePlanValidator();
    const c = v.computeConfidence({
      daysSinceLatestEvidence: 0,
      agreementRatioAcrossSources: 1,
      hasNumericBaselineWithUnit: true,
      assessmentValidityScore: 1,
      missingRequiredFields: 0,
      totalRequiredFields: 5,
      hasRecentStandardizedAssessment: true,
    });
    expect(c).toBeGreaterThan(0.9);

    const cCapped = v.computeConfidence({
      daysSinceLatestEvidence: 0,
      agreementRatioAcrossSources: 1,
      hasNumericBaselineWithUnit: true,
      assessmentValidityScore: 1,
      missingRequiredFields: 0,
      totalRequiredFields: 5,
      hasRecentStandardizedAssessment: false,
    });
    expect(cCapped).toBeLessThanOrEqual(0.85);

    const cDecayed = v.computeConfidence({
      daysSinceLatestEvidence: 180,
      agreementRatioAcrossSources: 0.3,
      hasNumericBaselineWithUnit: false,
      assessmentValidityScore: 0.3,
      missingRequiredFields: 3,
      totalRequiredFields: 5,
      hasRecentStandardizedAssessment: false,
    });
    expect(cDecayed).toBeLessThan(0.6);
  });

  test('isGoalSmart returns per-criterion pass/fail', () => {
    const v = createCarePlanValidator();
    const fully = v.isGoalSmart({
      statement: 'هدف واضح ومحدد ومفصل بشكل كافٍ للاختبار',
      targetValue: '40',
      targetUnit: 'mands',
      priorityScore: 0.5,
      domain: 'language',
      targetHorizonWeeks: 12,
    });
    expect(fully.allPass).toBe(true);
    const partial = v.isGoalSmart({ statement: 'short' });
    expect(partial.allPass).toBe(false);
    expect(partial.specific).toBe(false);
  });
});

// ─── 4. care-plan.service — workflow ────────────────────────────────

describe('care-plan.service — workflow', () => {
  // Lightweight mock that mimics the slice of Mongoose the service uses.
  function buildMockModel() {
    const store = new Map();
    let counter = 0;
    function genId() {
      counter += 1;
      return `pv-${counter}`;
    }

    // The "constructor" mock — `new planVersionModel(doc)` returns an object
    // with `save()` that persists into store.
    function Ctor(doc) {
      const id = genId();
      const record = {
        _id: id,
        ...doc,
        signatureChain: doc.signatureChain || [],
        amendments: doc.amendments || [],
        familyNotifications: doc.familyNotifications || [],
        metadata: doc.metadata || {},
        rejectionCount: doc.rejectionCount || 0,
        toObject() {
          const { save, toObject, ...rest } = this;
          return rest;
        },
        async save() {
          store.set(id, this);
          return this;
        },
      };
      return record;
    }

    Ctor._store = store;

    Ctor.findById = async id => store.get(id) || null;
    Ctor.findOne = filter => ({
      sort: () => ({
        lean: async () => {
          const matches = [...store.values()].filter(r =>
            Object.entries(filter).every(([k, v]) => String(r[k]) === String(v))
          );
          matches.sort((a, b) => b.versionNumber - a.versionNumber);
          return matches[0] || null;
        },
      }),
    });
    Ctor.computeEvidenceHash = body => 'fake-hash-' + JSON.stringify(body).length;
    Ctor.computeSignatureHash = ({ userId, action, prevHash }) =>
      `sig-${userId}-${action}-${prevHash || 'root'}`;

    return Ctor;
  }

  function makeService(opts = {}) {
    const planVersionModel = opts.planVersionModel || buildMockModel();
    const validator = opts.validator || createCarePlanValidator();
    return {
      svc: createCarePlanService({
        planVersionModel,
        validator,
        sideEffectHandlers: opts.sideEffectHandlers || {},
        auditLogger: { log: jest.fn(async () => {}) },
        notifier: jest.fn(async () => {}),
        logger: { warn: () => {}, info: () => {} },
        ...opts,
      }),
      planVersionModel,
    };
  }

  const author = { userId: 'user-author', role: 'therapist' };
  const supervisor = { userId: 'user-sup', role: 'clinical_supervisor' };
  const branchManager = { userId: 'user-bm', role: 'branch_manager' };
  const beneficiaryId = 'b-1';
  const branchId = 'branch-1';

  function readyPlanInput() {
    return {
      planId: 'plan-A',
      planType: 'individual_therapy',
      beneficiaryId,
      branchId,
      authorId: author.userId,
      actor: author,
      reasonForPlan: 'initial',
      reviewSchedule: { nextReviewAt: new Date(Date.now() + 30 * 86400000), cadenceWeeks: 12 },
      sessionsPerWeekCap: 5,
      goals: [
        {
          goalId: 'g1',
          domain: 'language',
          statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا واضحًا',
          priorityScore: 0.8,
          targetValue: '40',
          targetUnit: 'mands',
          targetHorizonWeeks: 12,
          baselineLink: 'bl-1',
          assessmentLink: 'asm-1',
          measureLink: 'm-1',
          evidenceRefs: [
            {
              kind: 'assessment',
              refId: 'asm-1',
              capturedAt: new Date(Date.now() - 10 * 86400000),
            },
          ],
          confidence: 0.8,
        },
      ],
      programs: [
        { programId: 'p1', name: 'NET', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] },
      ],
      familyRole: {
        homeProgram: [{ activity: 'قراءة 10 دقائق', frequency: 'يومي', goalRef: 'g1' }],
      },
    };
  }

  test('createDraft creates a v1 draft', async () => {
    const { svc } = makeService();
    const r = await svc.createDraft(readyPlanInput());
    expect(r.ok).toBe(true);
    expect(r.planVersion.versionNumber).toBe(1);
    expect(r.planVersion.status).toBe('draft');
  });

  test('createDraft rejects unknown plan type', async () => {
    const { svc } = makeService();
    const r = await svc.createDraft({ ...readyPlanInput(), planType: 'foo' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_PLAN_TYPE');
  });

  test('createDraft rejects missing actor', async () => {
    const { svc } = makeService();
    const r = await svc.createDraft({ ...readyPlanInput(), actor: null });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.ACTOR_REQUIRED);
  });

  test('runValidation auto-advances draft → validation_pending', async () => {
    const { svc } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const r = await svc.runValidation({ planVersionId: c.planVersion._id, actor: author });
    expect(r.ok).toBe(true);
    expect(['validation_pending', 'ready_for_submission']).toContain(r.planVersion.status);
    expect(r.validation.readinessScore).toBeGreaterThanOrEqual(85);
  });

  test('runValidation advances to ready_for_submission when band=ready', async () => {
    const { svc } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const r = await svc.runValidation({ planVersionId: c.planVersion._id, actor: author });
    expect(r.planVersion.status).toBe('ready_for_submission');
  });

  test('transition rejects unknown id', async () => {
    const { svc } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'not_real',
      actor: author,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.UNKNOWN_TRANSITION);
  });

  test('transition blocks approve from draft (invalid from)', async () => {
    const { svc } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.INVALID_FROM_STATUS);
  });

  test('full happy path: draft → validation → submit → review → approve → save → notify', async () => {
    const { svc } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    await svc.runValidation({ planVersionId: c.planVersion._id, actor: author });

    // submit to supervisor
    let r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'submit_to_supervisor',
      actor: author,
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('submitted_to_supervisor');

    // begin review (supervisor)
    r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'begin_review',
      actor: supervisor,
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('under_review');
    expect(String(r.planVersion.reviewerId)).toBe(supervisor.userId);

    // record scorecard
    await svc.recordReviewScorecard({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 9,
        compliance: 8,
        clarity: 8,
        measurability: 9,
        safety: 9,
        familyReadiness: 8,
      },
    });

    // approve
    r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('approved');
    expect(r.planVersion.evidenceHash).toBeTruthy();
    expect(r.planVersion.signatureChain.length).toBe(1);

    // save to record
    r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'save_to_record',
      actor: supervisor,
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('saved_to_record');
    expect(r.planVersion.signatureChain.length).toBe(2);

    // notify family (requires familyVersion.body)
    r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'notify_family',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.FAMILY_VERSION_MISSING);

    // Set family version then retry
    const pv = c.planVersion;
    pv.familyVersion = {
      body: 'مرحبًا، هذه نسخة الأسرة',
      readabilityGrade: 5,
      generatedAt: new Date(),
    };
    await pv.save();

    r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'notify_family',
      actor: supervisor,
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('family_notification_sent');
  });

  test('approve blocked when validation has hard failures', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    // Move to under_review by mutating directly (mock-only)
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    pv.reviewerId = supervisor.userId;
    pv.validation = {
      readinessScore: 70,
      hardFailures: [{ ruleId: 'goal_has_baseline', elementId: 'g1', message: 'missing' }],
      softWarnings: [],
      band: 'pending',
      validatedAt: new Date(),
    };
    pv.reviewScorecard = { overall: 8 };
    await pv.save();

    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.HARD_FAILURES_PRESENT);
  });

  test('approve forbidden when actor === author (self-approval)', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    pv.reviewerId = supervisor.userId;
    pv.validation = {
      readinessScore: 95,
      hardFailures: [],
      softWarnings: [],
      band: 'ready',
      validatedAt: new Date(),
    };
    pv.reviewScorecard = { overall: 8 };
    await pv.save();

    // Actor is the author (therapist)
    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: { userId: author.userId, role: 'clinical_supervisor' }, // role lifted but same userId
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.SELF_APPROVAL_FORBIDDEN);
  });

  test('approve forces escalation for intensive plan type', async () => {
    const { svc, planVersionModel } = makeService();
    const input = readyPlanInput();
    input.planType = 'intensive';
    const c = await svc.createDraft(input);
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    pv.reviewerId = supervisor.userId;
    pv.validation = {
      readinessScore: 95,
      hardFailures: [],
      softWarnings: [],
      band: 'ready',
      validatedAt: new Date(),
    };
    pv.reviewScorecard = { overall: 8 };
    await pv.save();

    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.MUST_ESCALATE);
  });

  test('approve forced to escalate after 2 rejections', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    pv.reviewerId = supervisor.userId;
    pv.validation = {
      readinessScore: 95,
      hardFailures: [],
      softWarnings: [],
      band: 'ready',
      validatedAt: new Date(),
    };
    pv.reviewScorecard = { overall: 8 };
    pv.rejectionCount = 2;
    await pv.save();

    const r = await svc.transition({
      planVersionId: c.planVersion._id,
      transitionId: 'approve',
      actor: supervisor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.MUST_ESCALATE);
  });

  test('reject sets rejection details + increments rejectionCount', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    pv.reviewerId = supervisor.userId;
    await pv.save();

    const r = await svc.reject({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      primaryReason: 'evidence_gap',
      requiredFixes: [
        { elementId: 'g1', fix: 'أضف baseline رقمي', priority: 1, severity: 'must_fix' },
      ],
      rewriteGuidance: 'يرجى إعادة كتابة الهدف g1 برقم وحدة قياس',
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.status).toBe('rejected');
    expect(r.planVersion.rejection.primaryReason).toBe('evidence_gap');
    expect(r.planVersion.rejectionCount).toBe(1);
  });

  test('reject blocked when primaryReason invalid', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'under_review';
    await pv.save();

    const r = await svc.reject({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      primaryReason: 'attacker_value',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.REJECTION_MISSING_REASON);
  });

  test('recordReviewScorecard computes weighted overall + blocks self-review', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());

    // Self-review attempt
    const selfR = await svc.recordReviewScorecard({
      planVersionId: c.planVersion._id,
      actor: { userId: author.userId, role: 'clinical_supervisor' },
      scorecard: { quality: 9 },
    });
    expect(selfR.ok).toBe(false);
    expect(selfR.reason).toBe(SVC_REASON.SELF_APPROVAL_FORBIDDEN);

    // Valid review by supervisor
    const ok = await svc.recordReviewScorecard({
      planVersionId: c.planVersion._id,
      actor: supervisor,
      scorecard: {
        quality: 8,
        compliance: 8,
        clarity: 8,
        measurability: 8,
        safety: 8,
        familyReadiness: 8,
      },
    });
    expect(ok.ok).toBe(true);
    expect(ok.overall).toBeCloseTo(8, 1);
  });

  test('createNewVersion supersedes the approved parent', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'approved';
    pv.reviewerId = supervisor.userId;
    pv.approverId = supervisor.userId;
    pv.approvedAt = new Date();
    pv.signatureChain = [
      {
        userId: supervisor.userId,
        role: 'clinical_supervisor',
        action: 'approve',
        signedAt: new Date(),
        hash: 'h1',
      },
    ];
    pv.evidenceHash = 'hash-v1';
    await pv.save();

    const r = await svc.createNewVersion({
      planId: pv.planId,
      basedOnVersionId: pv._id,
      author,
      reasonForRevision: 'تحديث الأهداف بناءً على تقدم الجلسات',
      changes: {
        goals: [
          ...pv.goals,
          {
            goalId: 'g-new',
            domain: 'social',
            statement: 'هدف جديد للتفاعل الاجتماعي ضمن مجموعة',
            priorityScore: 0.6,
            targetValue: '5',
            targetUnit: 'interactions',
            targetHorizonWeeks: 8,
            baselineLink: 'bl-2',
            assessmentLink: 'asm-2',
            measureLink: 'm-2',
            evidenceRefs: [{ kind: 'note', refId: 'n-1', capturedAt: new Date() }],
            confidence: 0.7,
          },
        ],
      },
    });
    expect(r.ok).toBe(true);
    expect(r.planVersion.versionNumber).toBe(2);
    expect(r.planVersion.status).toBe('draft');
    expect(r.diff.addedGoals).toContain('g-new');
    expect(r.diff.requiresSupervisorReReview).toBe(true);

    const refreshed = await planVersionModel.findById(pv._id);
    expect(refreshed.status).toBe('superseded');
    expect(String(refreshed.supersededBy)).toBe(String(r.planVersion._id));
  });

  test('applyAmendment blocks structural fields + non-bm actor + draft status', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);

    // 1. structural field
    let r = await svc.applyAmendment({
      planVersionId: pv._id,
      actor: branchManager,
      field: 'goals',
      before: [],
      after: [{ goalId: 'x' }],
      reason: 'cleanup',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.AMENDMENT_FORBIDDEN);

    // 2. non-branch-manager
    r = await svc.applyAmendment({
      planVersionId: pv._id,
      actor: supervisor,
      field: 'specialty',
      before: null,
      after: 'OT',
      reason: 'tagging fix for analytics',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.AMENDMENT_FORBIDDEN);

    // 3. on draft (not yet approved)
    r = await svc.applyAmendment({
      planVersionId: pv._id,
      actor: branchManager,
      field: 'specialty',
      before: null,
      after: 'OT',
      reason: 'tagging fix for analytics',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(SVC_REASON.AMENDMENT_FORBIDDEN);
  });

  test('applyAmendment succeeds on approved plan with branch_manager + valid reason', async () => {
    const { svc, planVersionModel } = makeService();
    const c = await svc.createDraft(readyPlanInput());
    const pv = await planVersionModel.findById(c.planVersion._id);
    pv.status = 'approved';
    pv.reviewerId = supervisor.userId;
    pv.approverId = supervisor.userId;
    pv.approvedAt = new Date(Date.now() - 1000);
    pv.evidenceHash = 'h1';
    pv.signatureChain = [
      {
        userId: supervisor.userId,
        role: 'clinical_supervisor',
        action: 'approve',
        signedAt: new Date(),
        hash: 'h',
      },
    ];
    await pv.save();

    const r = await svc.applyAmendment({
      planVersionId: pv._id,
      actor: branchManager,
      field: 'specialty',
      before: null,
      after: 'OT',
      reason: 'correcting analytics tagging only',
    });
    expect(r.ok).toBe(true);
    expect(pv.amendments.length).toBe(1);
    expect(pv.amendments[0].field).toBe('specialty');
  });

  test('computeDiff captures added/removed goals + family role change', () => {
    const { svc } = makeService();
    const prev = {
      goals: [{ goalId: 'a' }, { goalId: 'b' }],
      familyRole: { homeProgram: [] },
      planType: 'individual_therapy',
      safetyFlags: [],
      measures: [],
      programs: [],
      reviewSchedule: {},
    };
    const next = {
      goals: [{ goalId: 'b' }, { goalId: 'c' }],
      familyRole: { homeProgram: [{ activity: 'x', frequency: 'd' }] },
      planType: 'individual_therapy',
      safetyFlags: [],
      measures: [],
      programs: [],
      reviewSchedule: {},
    };
    const diff = svc.computeDiff(prev, next);
    expect(diff.addedGoals).toEqual(['c']);
    expect(diff.removedGoals).toEqual(['a']);
    expect(diff.familyRoleChanged).toBe(true);
    expect(diff.requiresFamilyRenotification).toBe(true);
  });
});

// ─── 5. governance.registry — care-plan codes wired ─────────────────

describe('governance.registry — Wave 41 permissions', () => {
  const gov = require('../intelligence/governance.registry');

  test('exports the care-plan permission codes', () => {
    const codes = gov.listPermissionCodes();
    expect(codes).toEqual(
      expect.arrayContaining([
        'care-plan.read',
        'care-plan.draft.create',
        'care-plan.validation.run',
        'care-plan.approve',
        'care-plan.reject',
        'care-plan.notify-family',
        'care-plan.amendment.apply',
      ])
    );
  });

  test('care-plan.amendment.apply held by branch_manager only', () => {
    expect(gov.getHoldersOf('care-plan.amendment.apply')).toEqual(['branch_manager']);
  });

  test('care-plan.approve held by supervisor + branch_manager', () => {
    expect(gov.getHoldersOf('care-plan.approve')).toEqual(
      expect.arrayContaining(['clinical_supervisor', 'branch_manager'])
    );
  });
});
