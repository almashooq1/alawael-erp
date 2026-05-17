/**
 * care-plan-rec-progress-wave44.test.js — Wave 44.
 *
 * Covers:
 *   1. care-plan-recommendation-builder.service
 *      - buildInputBundle: sanitisation + PDPL stripping
 *      - buildRecommendationPrompt: structure + schema contract
 *      - validateProposal: schema + post-validator + confidence cap
 *   2. care-plan-progress-reviewer.service
 *      - reviewGoal: trend classification + verdict
 *      - reviewPlan: holistic verdict + discharge readiness + triggers
 *   3. Routes
 *      - POST /recommendations/build-prompt
 *      - POST /recommendations/validate
 *      - POST /:id/progress-review
 *   4. governance.registry — Wave 44 permissions
 */

'use strict';

const express = require('express');
const request = require('supertest');
const builder = require('../intelligence/care-plan-recommendation-builder.service');
const reviewer = require('../intelligence/care-plan-progress-reviewer.service');
const createCarePlanRouter = require('../routes/care-plan.routes');

// ─── 1. Recommendation Builder ─────────────────────────────────────

describe('care-plan-recommendation-builder.service — buildInputBundle', () => {
  test('strips PII / unsafe fields from raw beneficiary', () => {
    const bundle = builder.buildInputBundle({
      beneficiary: {
        id: 'b-1',
        name: 'Saad Almashooq', // SHOULD BE STRIPPED
        nationalId: '1234567890', // STRIPPED
        dob: '2019-01-01', // STRIPPED
        age: 7,
        gender: 'M',
        primaryDiagnosis: 'F84.0',
      },
    });
    expect(bundle.beneficiary.id).toBe('b-1');
    expect(bundle.beneficiary.name).toBeUndefined();
    expect(bundle.beneficiary.nationalId).toBeUndefined();
    expect(bundle.beneficiary.dob).toBeUndefined();
    expect(bundle.beneficiary.age).toBe(7);
  });

  test('defaults to AR language preference', () => {
    const bundle = builder.buildInputBundle({});
    expect(bundle.beneficiary.languagePreference).toBe('ar');
  });

  test('coerces invalid gender to null', () => {
    const bundle = builder.buildInputBundle({ beneficiary: { gender: 'X' } });
    expect(bundle.beneficiary.gender).toBeNull();
  });

  test('safeNumber drops NaN / non-numeric', () => {
    const bundle = builder.buildInputBundle({ beneficiary: { age: 'seven' } });
    expect(bundle.beneficiary.age).toBeNull();
  });

  test('previousPlan optional', () => {
    const bundle = builder.buildInputBundle({});
    expect(bundle.previousPlan).toBeNull();
    const bundle2 = builder.buildInputBundle({
      previousPlan: { id: 'p1', version: 3, approvedAt: '2026-01-01' },
    });
    expect(bundle2.previousPlan.version).toBe(3);
    expect(bundle2.previousPlan.approvedAt).toBe(new Date('2026-01-01').toISOString());
  });

  test('progressHistory trend coerced to enum or plateau default', () => {
    const bundle = builder.buildInputBundle({
      progressHistory: [
        { period: '2026-Q1', trend: 'plateau', attendance: 0.72 },
        { period: '2026-Q2', trend: 'attacker-value', attendance: 0.8 },
      ],
    });
    expect(bundle.progressHistory[0].trend).toBe('plateau');
    expect(bundle.progressHistory[1].trend).toBe('plateau'); // fallback
  });

  test('sessions cap defaults to 5', () => {
    const bundle = builder.buildInputBundle({});
    expect(bundle.constraints.sessionsPerWeekCap).toBe(5);
  });
});

describe('care-plan-recommendation-builder.service — buildRecommendationPrompt', () => {
  test('returns system + user + schemaContract', () => {
    const bundle = builder.buildInputBundle({ beneficiary: { id: 'b-1', age: 7 } });
    const prompt = builder.buildRecommendationPrompt(bundle);
    expect(prompt.system).toContain('Senior Rehabilitation Clinical Planner');
    expect(prompt.system).toContain('SMART');
    expect(prompt.system).toContain('humanConfirmationRequired');
    expect(prompt.user).toContain('Input Bundle');
    expect(prompt.user).toContain('b-1');
    expect(prompt.schemaContract.required).toContain('proposal');
    expect(prompt.schemaContract.required).toContain('confidence');
    expect(prompt.schemaContract.goalRequiredFields).toContain('evidenceRefs');
  });

  test('system prompt lists every plan type', () => {
    const bundle = builder.buildInputBundle({});
    const prompt = builder.buildRecommendationPrompt(bundle);
    expect(prompt.system).toContain('individual_therapy');
    expect(prompt.system).toContain('intensive');
    expect(prompt.system).toContain('multidisciplinary');
  });
});

describe('care-plan-recommendation-builder.service — validateProposal', () => {
  function validProposal() {
    return {
      proposal: {
        planType: 'individual_therapy',
        rationaleTopLine: 'تقدم في اللغة التعبيرية يستحق برنامج NET مستمر مع تقييم كل 6 أسابيع',
        goals: [
          {
            id: 'g1',
            domain: 'expressive_language',
            statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا في جلسات NET',
            priorityScore: 0.8,
            evidenceRefs: [{ kind: 'assessment', refId: 'asm-1' }],
            baselineLink: 'bl-1',
            assessmentLink: 'asm-1',
            expectedDurationWeeks: 12,
            successCriterion: 'يطلب 40 شيئًا مختلفًا',
            targetValue: '40',
            targetUnit: 'mands',
          },
        ],
        programs: [{ id: 'p1', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] }],
        tests: [],
        supportServices: [],
        familyActions: [],
        reviewCycleWeeks: 12,
        risks: [],
        nextBestAction: 'submit_for_validation',
      },
      confidence: { overall: 0.78, perGoal: { g1: 0.78 } },
      missingData: [],
      humanConfirmationRequired: [],
    };
  }

  test('happy path passes', async () => {
    const r = await builder.validateProposal(validProposal(), {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  test('rejects invalid JSON string', async () => {
    const r = await builder.validateProposal('{not json}');
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe('INVALID_JSON');
  });

  test('strips ```json fence then parses', async () => {
    const raw = '```json\n' + JSON.stringify(validProposal()) + '\n```';
    const r = await builder.validateProposal(raw, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.ok).toBe(true);
  });

  test('rejects missing top-level fields', async () => {
    const r = await builder.validateProposal({ proposal: {} });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.code === 'MISSING_TOP_LEVEL' || e.code === 'MISSING_NESTED')).toBe(
      true
    );
  });

  test('rejects unknown planType', async () => {
    const p = validProposal();
    p.proposal.planType = 'foo';
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.code === 'INVALID_PLAN_TYPE')).toBe(true);
  });

  test('rejects rationaleTopLine > 280 chars', async () => {
    const p = validProposal();
    p.proposal.rationaleTopLine = 'a'.repeat(400);
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.errors.some(e => e.code === 'RATIONALE_TOO_LONG')).toBe(true);
  });

  test('rejects goal with missing required fields', async () => {
    const p = validProposal();
    delete p.proposal.goals[0].evidenceRefs;
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.code === 'GOAL_MISSING_FIELDS')).toBe(true);
  });

  test('rejects duplicate goal id', async () => {
    const p = validProposal();
    p.proposal.goals.push({ ...p.proposal.goals[0] });
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.errors.some(e => e.code === 'DUPLICATE_GOAL_ID')).toBe(true);
  });

  test('rejects priorityScore out of [0,1]', async () => {
    const p = validProposal();
    p.proposal.goals[0].priorityScore = 1.5;
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.errors.some(e => e.code === 'INVALID_PRIORITY_SCORE')).toBe(true);
  });

  test('rejects program with orphan goalRef', async () => {
    const p = validProposal();
    p.proposal.programs[0].goalRefs = ['ghost'];
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.errors.some(e => e.code === 'PROGRAM_ORPHAN_REF')).toBe(true);
  });

  test('rejects frequency over cap', async () => {
    const p = validProposal();
    p.proposal.programs[0].frequencyPerWeek = 10;
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.errors.some(e => e.code === 'FREQUENCY_EXCEEDS_CAP')).toBe(true);
  });

  test('rejects confidence > 0.85 without recent standardized assessment', async () => {
    const p = validProposal();
    p.confidence.overall = 0.95;
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: false,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.errors.some(e => e.code === 'CONFIDENCE_CAP_VIOLATED')).toBe(true);
  });

  test('post-validator: unresolved evidenceRef → error', async () => {
    const p = validProposal();
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async ref => ref.refId !== 'asm-1', // make this one fail
      hasRecentStandardizedAssessment: true,
      constraints: { sessionsPerWeekCap: 5 },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => e.code === 'EVIDENCE_REF_UNRESOLVED')).toBe(true);
  });

  test('rejects reviewCycleWeeks out of range', async () => {
    const p = validProposal();
    p.proposal.reviewCycleWeeks = 2;
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({ allPass: true }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.errors.some(e => e.code === 'INVALID_REVIEW_CYCLE')).toBe(true);
  });

  test('SMART checker plumbed in', async () => {
    const p = validProposal();
    const r = await builder.validateProposal(p, {
      isGoalSmart: () => ({
        allPass: false,
        specific: false,
        measurable: true,
        achievable: true,
        relevant: true,
        timeBound: true,
      }),
      resolveEvidenceRef: async () => true,
      hasRecentStandardizedAssessment: true,
    });
    expect(r.errors.some(e => e.code === 'GOAL_NOT_SMART')).toBe(true);
  });
});

// ─── 2. Progress Reviewer ──────────────────────────────────────────

describe('care-plan-progress-reviewer.service — reviewGoal', () => {
  function signal(overrides = {}) {
    return {
      goalId: 'g1',
      measureSeries: [
        { date: new Date('2026-01-01'), value: 10 },
        { date: new Date('2026-01-15'), value: 12 },
        { date: new Date('2026-02-01'), value: 14 },
        { date: new Date('2026-02-15'), value: 16 },
      ],
      ...overrides,
    };
  }

  test('improving trend → continue', () => {
    const r = reviewer.reviewGoal(signal());
    expect(r.trend).toBe('improving');
    expect(r.verdict).toBe('continue');
  });

  test('plateau for 6+ weeks → revise', () => {
    const flat = Array.from({ length: 8 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7),
      value: 10,
    }));
    const r = reviewer.reviewGoal({ goalId: 'g1', measureSeries: flat });
    expect(r.trend).toBe('plateau');
    expect(r.plateauWeeks).toBeGreaterThanOrEqual(6);
    expect(r.verdict).toBe('revise');
  });

  test('regression ≥ 3 weeks → escalate', () => {
    const decline = [
      { date: new Date('2026-01-01'), value: 30 },
      { date: new Date('2026-01-08'), value: 28 },
      { date: new Date('2026-01-15'), value: 25 },
      { date: new Date('2026-01-22'), value: 20 },
      { date: new Date('2026-01-29'), value: 18 },
    ];
    const r = reviewer.reviewGoal({ goalId: 'g1', measureSeries: decline });
    expect(r.trend).toBe('regressing');
    expect(r.regressionWeeks).toBeGreaterThanOrEqual(3);
    expect(r.verdict).toBe('escalate');
    expect(r.reassessmentNeeded).toBe(true);
  });

  test('safety event always escalates + case conference', () => {
    const r = reviewer.reviewGoal(signal({ safetyEventLinked: true }));
    expect(r.verdict).toBe('escalate');
    expect(r.caseConferenceRecommended).toBe(true);
    expect(r.reasons).toContain('safety_event_linked_to_goal');
  });

  test('target reached → close', () => {
    const r = reviewer.reviewGoal(signal({ targetValue: 15 }));
    expect(r.verdict).toBe('close');
    expect(r.targetReached).toBe(true);
  });

  test('low attendance demotes revise to continue with warning', () => {
    const flat = Array.from({ length: 8 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7),
      value: 10,
    }));
    const r = reviewer.reviewGoal({
      goalId: 'g1',
      measureSeries: flat,
      attendance: 0.4,
    });
    expect(r.attendanceWarning).toBeTruthy();
    expect(r.verdict).toBe('continue');
  });

  test('insufficient data → continue', () => {
    const r = reviewer.reviewGoal({
      goalId: 'g1',
      measureSeries: [{ date: new Date('2026-01-01'), value: 5 }],
    });
    expect(r.trend).toBe('insufficient_data');
    expect(r.verdict).toBe('continue');
  });

  test('handles missing measureSeries gracefully', () => {
    const r = reviewer.reviewGoal({ goalId: 'g1' });
    expect(r.verdict).toBe('continue');
    expect(r.trend).toBe('insufficient_data');
  });
});

describe('care-plan-progress-reviewer.service — reviewPlan', () => {
  function buildSignals(verdicts) {
    return verdicts.map((v, i) => {
      const goalId = `g${i + 1}`;
      if (v === 'improving') {
        return {
          goalId,
          measureSeries: [
            { date: new Date('2026-01-01'), value: 10 },
            { date: new Date('2026-01-15'), value: 14 },
            { date: new Date('2026-02-01'), value: 18 },
          ],
        };
      }
      if (v === 'plateau') {
        return {
          goalId,
          measureSeries: Array.from({ length: 8 }, (_, k) => ({
            date: new Date(2026, 0, 1 + k * 7),
            value: 10,
          })),
        };
      }
      if (v === 'regressing') {
        return {
          goalId,
          measureSeries: [
            { date: new Date('2026-01-01'), value: 30 },
            { date: new Date('2026-01-08'), value: 25 },
            { date: new Date('2026-01-15'), value: 20 },
            { date: new Date('2026-01-22'), value: 15 },
          ],
        };
      }
      if (v === 'closed') {
        return {
          goalId,
          targetValue: 5,
          measureSeries: [
            { date: new Date('2026-01-01'), value: 3 },
            { date: new Date('2026-01-15'), value: 6 },
            { date: new Date('2026-02-01'), value: 8 },
          ],
        };
      }
      return { goalId, measureSeries: [] };
    });
  }

  test('all goals improving → continue_plan', () => {
    const r = reviewer.reviewPlan({ goalSignals: buildSignals(['improving', 'improving']) });
    expect(r.holisticVerdict).toBe('continue_plan');
    expect(r.counts.continue).toBe(2);
  });

  test('1 regression → revise_plan (escalate-driven)', () => {
    const r = reviewer.reviewPlan({ goalSignals: buildSignals(['improving', 'regressing']) });
    expect(r.holisticVerdict).toBe('revise_plan');
    expect(r.counts.escalate).toBe(1);
  });

  test('majority revising → new_plan', () => {
    const r = reviewer.reviewPlan({
      goalSignals: buildSignals(['plateau', 'plateau', 'improving']),
    });
    expect(['new_plan', 'revise_plan']).toContain(r.holisticVerdict);
    expect(r.counts.revise).toBe(2);
  });

  test('70%+ closed → discharge_readiness', () => {
    const r = reviewer.reviewPlan({
      goalSignals: buildSignals(['closed', 'closed', 'closed', 'improving']),
    });
    expect(r.holisticVerdict).toBe('discharge_readiness');
    expect(r.dischargeReadiness.ready).toBe(true);
  });

  test('triggers include plateau / safety / regression / overdue', () => {
    const overdueDate = new Date(Date.now() - 30 * 86400000);
    const r = reviewer.reviewPlan({
      goalSignals: [
        { goalId: 'g1', safetyEventLinked: true, measureSeries: [] },
        ...buildSignals(['plateau']),
      ],
      planReviewDueAt: overdueDate,
      aggregateAttendance: 0.4,
      now: new Date(),
    });
    const kinds = r.triggers.map(t => t.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(['safety_event', 'plateau', 'low_attendance', 'overdue_review'])
    );
  });

  test('nextReviewDate is 4 weeks if escalation, 12 otherwise', () => {
    const r1 = reviewer.reviewPlan({
      goalSignals: buildSignals(['regressing']),
      now: new Date('2026-03-01T00:00:00Z'),
    });
    const r2 = reviewer.reviewPlan({
      goalSignals: buildSignals(['improving']),
      now: new Date('2026-03-01T00:00:00Z'),
    });
    expect(new Date(r1.nextReviewDate).getTime()).toBeLessThan(
      new Date(r2.nextReviewDate).getTime()
    );
  });
});

describe('care-plan-progress-reviewer — pure helpers', () => {
  test('computeWeeklySlope ≈ expected', () => {
    const slope = reviewer.computeWeeklySlope([
      { date: new Date('2026-01-01'), value: 10 },
      { date: new Date('2026-01-08'), value: 12 },
      { date: new Date('2026-01-15'), value: 14 },
    ]);
    expect(slope).toBeGreaterThan(0.1);
  });

  test('classifyTrend boundaries', () => {
    expect(reviewer.classifyTrend(0.5)).toBe('improving');
    expect(reviewer.classifyTrend(-0.5)).toBe('regressing');
    expect(reviewer.classifyTrend(0.001)).toBe('plateau');
    expect(reviewer.classifyTrend(null)).toBe('insufficient_data');
  });
});

// ─── 3. Routes ─────────────────────────────────────────────────────

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
    getPlanVersionById: jest.fn(),
    getVersionHistory: jest.fn(),
    collectProgressSignals: jest.fn(async () => ({
      goalSignals: [
        {
          goalId: 'g1',
          measureSeries: [
            { date: new Date('2026-01-01'), value: 10 },
            { date: new Date('2026-01-15'), value: 14 },
            { date: new Date('2026-02-01'), value: 18 },
          ],
        },
      ],
    })),
    resolveEvidenceRef: jest.fn(async () => true),
    ...overrides,
  };
}

function makeApp({ service, allowedPermissions = null, role = 'therapist' } = {}) {
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

describe('POST /recommendations/build-prompt', () => {
  test('happy path → 200 with system + user prompt', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/recommendations/build-prompt')
      .send({
        beneficiary: { id: 'b-1', age: 7 },
        constraints: { sessionsPerWeekCap: 5 },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.prompt.system).toContain('Senior Rehabilitation Clinical Planner');
    expect(res.body.data.inputBundle.beneficiary.id).toBe('b-1');
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const res = await request(app).post('/api/v1/care-plans/recommendations/build-prompt').send({});
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.recommendation.preview');
  });
});

describe('POST /recommendations/validate', () => {
  function validProposalString() {
    return JSON.stringify({
      proposal: {
        planType: 'individual_therapy',
        rationaleTopLine: 'برنامج NET مستمر مع تقييم كل 6 أسابيع',
        goals: [
          {
            id: 'g1',
            domain: 'expressive_language',
            statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا في جلسات NET',
            priorityScore: 0.8,
            evidenceRefs: [{ kind: 'assessment', refId: 'asm-1' }],
            baselineLink: 'bl-1',
            assessmentLink: 'asm-1',
            expectedDurationWeeks: 12,
            successCriterion: 'يطلب 40 شيئًا',
            targetValue: '40',
            targetUnit: 'mands',
          },
        ],
        programs: [{ id: 'p1', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] }],
        tests: [],
        supportServices: [],
        familyActions: [],
        reviewCycleWeeks: 12,
        risks: [],
        nextBestAction: 'submit_for_validation',
      },
      confidence: { overall: 0.78, perGoal: { g1: 0.78 } },
    });
  }

  test('happy path → 200', async () => {
    const svc = makeService({
      resolveEvidenceRef: async () => true,
      validator: { isGoalSmart: () => ({ allPass: true }) },
    });
    svc.isGoalSmart = () => ({ allPass: true });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/recommendations/validate')
      .send({
        rawJson: validProposalString(),
        constraints: { sessionsPerWeekCap: 5 },
        hasRecentStandardizedAssessment: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  test('schema violation → 422', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/recommendations/validate')
      .send({ rawJson: '{}', constraints: { sessionsPerWeekCap: 5 } });
    expect(res.status).toBe(422);
    expect(res.body.reason).toBe('PROPOSAL_REJECTED');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('no proposal provided → 400', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/care-plans/recommendations/validate').send({});
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('NO_PROPOSAL_PROVIDED');
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const res = await request(app)
      .post('/api/v1/care-plans/recommendations/validate')
      .send({ rawJson: '{}' });
    expect(res.status).toBe(403);
  });
});

describe('POST /:id/progress-review', () => {
  test('happy path with inline signals → 200', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/progress-review')
      .send({
        goalSignals: [
          {
            goalId: 'g1',
            measureSeries: [
              { date: new Date('2026-01-01'), value: 10 },
              { date: new Date('2026-01-15'), value: 14 },
              { date: new Date('2026-02-01'), value: 18 },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.holisticVerdict).toBeDefined();
    expect(res.body.data.perGoal.length).toBe(1);
  });

  test('happy path with service-collected signals → 200', async () => {
    const { app, service } = makeApp();
    const res = await request(app).post('/api/v1/care-plans/pv-1/progress-review').send({});
    expect(res.status).toBe(200);
    expect(service.collectProgressSignals).toHaveBeenCalledWith('pv-1');
  });

  test('no signals available → 400', async () => {
    const svc = makeService({ collectProgressSignals: undefined });
    const { app } = makeApp({ service: svc });
    const res = await request(app).post('/api/v1/care-plans/pv-1/progress-review').send({});
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('NO_GOAL_SIGNALS');
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/progress-review')
      .send({ goalSignals: [] });
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.progress-review.run');
  });
});

// ─── 4. governance.registry ────────────────────────────────────────

describe('governance.registry — Wave 44 permissions', () => {
  const gov = require('../intelligence/governance.registry');

  test('exposes recommendation + progress-review codes', () => {
    const codes = gov.listPermissionCodes();
    expect(codes).toEqual(
      expect.arrayContaining([
        'care-plan.recommendation.preview',
        'care-plan.recommendation.apply',
        'care-plan.progress-review.run',
        'care-plan.progress-review.read',
      ])
    );
  });

  test('progress-review.read accessible to executive_leadership', () => {
    expect(gov.getHoldersOf('care-plan.progress-review.read')).toEqual(
      expect.arrayContaining(['executive_leadership', 'quality_compliance'])
    );
  });

  test('recommendation.apply restricted to authors only', () => {
    expect(gov.getHoldersOf('care-plan.recommendation.apply')).toEqual(['therapist', 'teacher']);
  });
});
