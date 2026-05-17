/**
 * care-plan-explain-views-llm-wave48.test.js — Wave 48.
 *
 * Covers:
 *   1. care-plan-explanation-generator.service — explainGoal + explainProposal
 *   2. care-plan-role-views.service — 4 view profiles
 *   3. care-plan-llm-caller.service — Anthropic wrapper (mock client)
 *   4. care-plan-bootstrap.js — composition root
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const explanation = require('../intelligence/care-plan-explanation-generator.service');
const roleViews = require('../intelligence/care-plan-role-views.service');
const {
  createCarePlanLLMCaller,
  REASON: LLM_REASON,
} = require('../intelligence/care-plan-llm-caller.service');
const { bootstrapCarePlanning } = require('../intelligence/care-plan-bootstrap');

// ─── 1. Explanation Generator ──────────────────────────────────────

describe('care-plan-explanation-generator — explainGoal', () => {
  function inputBundle() {
    return {
      assessments: [
        { id: 'asm-1', type: 'VB-MAPP', date: '2026-04-01', summary: 'baseline 15 mands' },
      ],
      baselines: [
        { goalDomain: 'expressive_language', value: '15', unit: 'mands', measuredAt: '2026-04-01' },
      ],
      progressHistory: [{ period: '2026-Q1', trend: 'plateau', attendance: 0.85 }],
    };
  }

  function goal() {
    return {
      id: 'g1',
      domain: 'expressive_language',
      statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا',
      priorityScore: 0.8,
      targetHorizonWeeks: 12,
      baselineLink: 'bl-1',
      assessmentLink: 'asm-1',
      evidenceRefs: [
        { kind: 'assessment', refId: 'asm-1' },
        { kind: 'baseline', refId: 'bl-1' },
      ],
      confidence: 0.78,
    };
  }

  test('returns whyProposed + dataPoints + alternatives + humanCheck', () => {
    const r = explanation.explainGoal(goal(), { inputBundle: inputBundle() });
    expect(r.ok).toBe(true);
    expect(r.whyProposed).toMatch(/expressive_language/);
    expect(Array.isArray(r.dataPoints)).toBe(true);
    expect(r.dataPoints.length).toBeGreaterThan(0);
    expect(r.confidenceLabel).toBe('present'); // 0.78 >= 0.75
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(Array.isArray(r.risksIfRejected)).toBe(true);
    expect(r.risksIfRejected.length).toBeGreaterThan(0);
  });

  test('classifies low confidence as human_confirm', () => {
    const g = goal();
    g.confidence = 0.6;
    const r = explanation.explainGoal(g, { inputBundle: inputBundle() });
    expect(r.confidenceLabel).toBe('human_confirm');
  });

  test('detects missing baseline as human-check item', () => {
    const g = goal();
    g.baselineLink = null;
    const r = explanation.explainGoal(g, { inputBundle: inputBundle() });
    expect(r.humanCheckRequired.some(s => /baseline/i.test(s))).toBe(true);
  });

  test('detects unresolvable evidenceRef in dataPoints', () => {
    const g = goal();
    g.evidenceRefs = [{ kind: 'assessment', refId: 'ghost' }];
    const r = explanation.explainGoal(g, { inputBundle: inputBundle() });
    expect(r.dataPoints.some(p => /NEEDS VERIFICATION/.test(p.relevance))).toBe(true);
  });

  test('low attendance becomes a confidence detractor', () => {
    const g = goal();
    const bundle = inputBundle();
    bundle.progressHistory[0].attendance = 0.5;
    const r = explanation.explainGoal(g, { inputBundle: bundle });
    expect(r.confidenceDetractors.some(s => /attendance/.test(s))).toBe(true);
  });

  test('invalid goal returns ok=false', () => {
    const r = explanation.explainGoal({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_GOAL');
  });
});

describe('care-plan-explanation-generator — explainProposal', () => {
  function proposal() {
    return {
      proposal: {
        rationaleTopLine: 'برنامج NET مستمر مع تقييم كل 6 أسابيع',
        goals: [
          {
            id: 'g1',
            domain: 'expressive_language',
            statement: 'يطلب 40 شيئًا',
            priorityScore: 0.8,
            targetHorizonWeeks: 12,
            baselineLink: 'bl-1',
            assessmentLink: 'asm-1',
            evidenceRefs: [{ kind: 'assessment', refId: 'asm-1' }],
          },
        ],
      },
      confidence: { overall: 0.8, perGoal: { g1: 0.8 } },
      missingData: [],
      humanConfirmationRequired: [],
    };
  }

  test('produces planRationale + perGoal + summary', () => {
    const r = explanation.explainProposal(proposal());
    expect(r.ok).toBe(true);
    expect(r.planRationale.overallConfidenceLabel).toBe('present');
    expect(r.perGoal.length).toBe(1);
    expect(r.summary.goalCount).toBe(1);
    expect(r.summary.presentConfidenceGoals).toBe(1);
  });

  test('returns ok=false on invalid proposal', () => {
    expect(explanation.explainProposal(null).ok).toBe(false);
  });
});

// ─── 2. Role Views ─────────────────────────────────────────────────

describe('care-plan-role-views — listViewProfiles', () => {
  test('exports 4 profiles', () => {
    const list = roleViews.listViewProfiles();
    expect(list).toEqual([
      'clinician_working',
      'supervisor_review',
      'branch_escalation',
      'family_friendly',
    ]);
  });
});

describe('care-plan-role-views — clinician_working view', () => {
  test('renders full body + redactionHash', () => {
    const plan = {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'individual_therapy',
      versionNumber: 1,
      status: 'approved',
      goals: [{ goalId: 'g1', domain: 'language', confidence: 0.8 }],
    };
    const v = roleViews.renderView('clinician_working', plan);
    expect(v.viewProfile).toBe('clinician_working');
    expect(v.body.goals[0].confidence).toBe(0.8); // not redacted for clinician
    expect(v.redactionHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('strips raw PII fields', () => {
    const plan = {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'individual_therapy',
      versionNumber: 1,
      status: 'draft',
      goals: [],
      nationalId: '1234567890',
    };
    const v = roleViews.renderView('clinician_working', plan);
    expect(v.body.nationalId).toBeUndefined();
  });
});

describe('care-plan-role-views — supervisor_review view', () => {
  function plan(overrides = {}) {
    return {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'individual_therapy',
      versionNumber: 2,
      status: 'under_review',
      rejectionCount: 1,
      validation: { readinessScore: 88, hardFailures: [], softWarnings: [] },
      reviewScorecard: { overall: 8.0 },
      safetyFlags: [],
      goals: [
        {
          goalId: 'g1',
          domain: 'language',
          statement: 'يطلب',
          priorityScore: 0.8,
          confidence: 0.8,
          baselineLink: 'bl',
          measureLink: 'm',
          assessmentLink: 'asm',
        },
      ],
      ...overrides,
    };
  }

  test('renders scorecard + actions for under_review', () => {
    const v = roleViews.renderSupervisorReview(plan());
    expect(v.viewProfile).toBe('supervisor_review');
    expect(v.scorecard.overall).toBe(8.0);
    expect(v.actionsAvailable).toEqual(
      expect.arrayContaining(['approve', 'reject', 'request_revision', 'escalate'])
    );
    expect(v.goals[0].hasBaseline).toBe(true);
  });

  test('compliance flags catch missing review date', () => {
    const v = roleViews.renderSupervisorReview(plan({ reviewSchedule: null }));
    expect(v.complianceFlags).toContain('NO_REVIEW_DATE');
  });

  test('intensive plan triggers branch-escalation flag', () => {
    const v = roleViews.renderSupervisorReview(plan({ planType: 'intensive' }));
    expect(v.complianceFlags).toContain('REQUIRES_BRANCH_MANAGER_ESCALATION');
  });

  test('diff-vs-previous when prev provided', () => {
    const prev = plan({ goals: [{ goalId: 'g0' }, { goalId: 'g1' }] });
    const cur = plan({ goals: [{ goalId: 'g1' }, { goalId: 'g2' }] });
    const v = roleViews.renderSupervisorReview(cur, { previousPlan: prev });
    expect(v.diffVsPrevious.addedGoals).toContain('g2');
    expect(v.diffVsPrevious.removedGoals).toContain('g0');
  });
});

describe('care-plan-role-views — branch_escalation view', () => {
  test('renders financial + resource + risk', () => {
    const plan = {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'intensive',
      versionNumber: 1,
      status: 'escalated_to_branch_manager',
      branchId: 'br1',
      rejectionCount: 2,
      goals: [{ goalId: 'g1' }, { goalId: 'g2' }],
      programs: [{ frequencyPerWeek: 3 }, { frequencyPerWeek: 2 }],
      safetyFlags: [{ flag: 'elopement', severity: 'high', mitigation: 'door alarm' }],
      validation: { readinessScore: 90 },
    };
    const v = roleViews.renderView('branch_escalation', plan, {
      financialContext: { budgetTier: 'premium', approxMonthlyCost: 4500 },
      resourceContext: { currentLoad: 0.85 },
    });
    expect(v.viewProfile).toBe('branch_escalation');
    expect(v.summary.goalCount).toBe(2);
    expect(v.impact.sessionsPerWeekRequired).toBe(5);
    expect(v.financialImpact.budgetTier).toBe('premium');
    expect(v.riskProfile.escalationReason).toBe('plan_type_requires_escalation');
    expect(v.alternatives.length).toBeGreaterThan(0);
  });

  test('escalation reason for repeated rejection', () => {
    const plan = {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'individual_therapy',
      versionNumber: 1,
      status: 'escalated_to_branch_manager',
      rejectionCount: 3,
      goals: [],
      programs: [],
      safetyFlags: [],
    };
    const v = roleViews.renderBranchEscalation(plan);
    expect(v.riskProfile.escalationReason).toBe('rejection_count_threshold');
  });
});

describe('care-plan-role-views — family_friendly view', () => {
  test('delegates to family generator + returns markdown', () => {
    const plan = {
      _id: 'pv-1',
      planId: 'p1',
      planType: 'individual_therapy',
      versionNumber: 1,
      status: 'approved',
      goals: [
        {
          goalId: 'g1',
          domain: 'expressive_language',
          statement: 'يطلب الطفل عشرة أشياء جديدة خلال 12 أسبوعًا',
          priorityScore: 0.8,
          targetHorizonWeeks: 12,
        },
      ],
      familyRole: {
        coachingPlan: 'عشر دقائق يوميًا للعب',
        homeProgram: [{ activity: 'قراءة قصة', frequency: 'يوميًا' }],
      },
      reviewSchedule: { nextReviewAt: new Date(Date.now() + 30 * 86400000) },
    };
    const v = roleViews.renderView('family_friendly', plan, { beneficiaryFirstName: 'سعد' });
    expect(v.viewProfile).toBe('family_friendly');
    expect(v.markdown).toContain('سعد');
    expect(v.requiresRewrite).toBe(false);
  });
});

describe('care-plan-role-views — unknown profile', () => {
  test('returns ok=false', () => {
    const r = roleViews.renderView('ghost', {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('UNKNOWN_VIEW_PROFILE');
  });
});

// ─── 3. LLM Caller ─────────────────────────────────────────────────

describe('care-plan-llm-caller — recommend', () => {
  function validRawJson() {
    return JSON.stringify({
      proposal: {
        planType: 'individual_therapy',
        rationaleTopLine: 'برنامج NET مستمر مع تقييم كل 6 أسابيع لتعزيز الطلبات اللفظية',
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
      missingData: [],
      humanConfirmationRequired: [],
    });
  }

  function mockClient({ response = null, throws = null } = {}) {
    return {
      messages: {
        create: jest.fn(async () => {
          if (throws) throw throws;
          return (
            response || {
              id: 'msg_1',
              content: [{ type: 'text', text: validRawJson() }],
              usage: { input_tokens: 1000, output_tokens: 300 },
            }
          );
        }),
      },
    };
  }

  test('CLIENT_MISSING when no client provided', async () => {
    const caller = createCarePlanLLMCaller({});
    const r = await caller.recommend({ beneficiary: { id: 'b1' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(LLM_REASON.CLIENT_MISSING);
  });

  test('happy path returns proposal + confidence + requestId', async () => {
    const caller = createCarePlanLLMCaller({
      client: mockClient(),
      validator: {
        isGoalSmart: () => ({ allPass: true }),
        resolveEvidenceRef: async () => true,
      },
    });
    const r = await caller.recommend(
      { beneficiary: { id: 'b1', age: 7 }, constraints: { sessionsPerWeekCap: 5 } },
      { hasRecentStandardizedAssessment: true, constraints: { sessionsPerWeekCap: 5 } }
    );
    expect(r.ok).toBe(true);
    expect(r.proposal.planType).toBe('individual_therapy');
    expect(r.confidence.overall).toBeCloseTo(0.78, 2);
    expect(r.requestId).toBe('msg_1');
    expect(r.usage).toBeTruthy();
  });

  test('EMPTY_RESPONSE when content is empty', async () => {
    const client = mockClient({
      response: { id: 'msg_2', content: [], usage: {} },
    });
    const caller = createCarePlanLLMCaller({ client });
    const r = await caller.recommend({ beneficiary: { id: 'b1' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(LLM_REASON.EMPTY_RESPONSE);
  });

  test('PROPOSAL_REJECTED when validator fails (includes rawText)', async () => {
    const client = mockClient({
      response: { id: 'msg_3', content: [{ type: 'text', text: '{}' }], usage: {} },
    });
    const caller = createCarePlanLLMCaller({ client });
    const r = await caller.recommend({ beneficiary: { id: 'b1' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(LLM_REASON.PROPOSAL_REJECTED);
    expect(r.rawText).toBe('{}');
    expect(Array.isArray(r.errors)).toBe(true);
  });

  test('CLIENT_THREW on non-retriable 4xx', async () => {
    const err = new Error('bad request');
    err.status = 400;
    const client = mockClient({ throws: err });
    const caller = createCarePlanLLMCaller({ client, maxRetries: 2 });
    const r = await caller.recommend({ beneficiary: { id: 'b1' } });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(LLM_REASON.CLIENT_THREW);
    expect(r.attempts).toBe(1); // no retry on 4xx
  });

  test('retries on 5xx then succeeds', async () => {
    let calls = 0;
    const client = {
      messages: {
        create: jest.fn(async () => {
          calls += 1;
          if (calls < 2) {
            const e = new Error('server-down');
            e.status = 503;
            throw e;
          }
          return {
            id: 'msg_retry',
            content: [{ type: 'text', text: validRawJson() }],
            usage: {},
          };
        }),
      },
    };
    const caller = createCarePlanLLMCaller({
      client,
      maxRetries: 2,
      validator: { isGoalSmart: () => ({ allPass: true }), resolveEvidenceRef: async () => true },
    });
    const r = await caller.recommend(
      { beneficiary: { id: 'b1' }, constraints: { sessionsPerWeekCap: 5 } },
      { hasRecentStandardizedAssessment: true, constraints: { sessionsPerWeekCap: 5 } }
    );
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(2);
  });
});

// ─── 4. Bootstrap ──────────────────────────────────────────────────

describe('care-plan-bootstrap', () => {
  function fakeModel() {
    const Ctor = function (doc) {
      return {
        ...doc,
        save: async function () {
          return this;
        },
      };
    };
    Ctor.findById = async () => null;
    Ctor.findOne = () => ({ sort: () => ({ lean: async () => null }) });
    Ctor.find = () => ({ sort: () => ({ lean: async () => [] }) });
    Ctor.computeEvidenceHash = () => 'fake-hash';
    Ctor.computeSignatureHash = () => 'fake-sig';
    return Ctor;
  }

  test('throws when CarePlanVersion missing', () => {
    expect(() => bootstrapCarePlanning({ governance: { hasPermission: () => true } })).toThrow(
      /CarePlanVersion/
    );
  });

  test('throws when governance missing', () => {
    expect(() => bootstrapCarePlanning({ CarePlanVersion: fakeModel() })).toThrow(/governance/);
  });

  test('returns full composition root with router + service', () => {
    const out = bootstrapCarePlanning({
      CarePlanVersion: fakeModel(),
      governance: { hasPermission: () => true },
    });
    expect(out.router).toBeTruthy();
    expect(typeof out.service.createDraft).toBe('function');
    expect(out.programsLibrary.PROGRAMS.length).toBeGreaterThan(0);
    expect(out.reportGenerator.listReportKinds().length).toBe(6);
    expect(out.roleViews.listViewProfiles().length).toBe(4);
    expect(out.llmCaller).toBeNull(); // no anthropicClient passed
  });

  test('exposes service.computeSignatureHash so audit-trail can verify', () => {
    const out = bootstrapCarePlanning({
      CarePlanVersion: fakeModel(),
      governance: { hasPermission: () => true },
    });
    expect(typeof out.service.computeSignatureHash).toBe('function');
  });

  test('wires LLM caller when anthropicClient provided', () => {
    const out = bootstrapCarePlanning({
      CarePlanVersion: fakeModel(),
      governance: { hasPermission: () => true },
      anthropicClient: { messages: { create: async () => ({}) } },
    });
    expect(out.llmCaller).not.toBeNull();
    expect(typeof out.llmCaller.recommend).toBe('function');
  });

  test('side-effect handler override is honored', () => {
    const customHandlers = { 'care-plan.approve': async () => ({ ok: true, custom: true }) };
    const out = bootstrapCarePlanning({
      CarePlanVersion: fakeModel(),
      governance: { hasPermission: () => true },
      sideEffectHandlersOverride: customHandlers,
    });
    expect(out.sideEffectHandlers).toBe(customHandlers);
  });
});
