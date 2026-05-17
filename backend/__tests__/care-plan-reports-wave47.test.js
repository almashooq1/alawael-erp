/**
 * care-plan-reports-wave47.test.js — Wave 47.
 *
 * Covers:
 *   1. care-plan-report-generator.service — 6 report kinds
 *   2. POST /:id/reports/:kind route — per-kind permission + 404 + 400
 *   3. governance.registry — Wave 47 permissions
 */

'use strict';

const express = require('express');
const request = require('supertest');
const generator = require('../intelligence/care-plan-report-generator.service');
const createCarePlanRouter = require('../routes/care-plan.routes');

// ─── 1. Generator ──────────────────────────────────────────────────

function buildPlan(overrides = {}) {
  return {
    _id: 'pv-1',
    planId: 'plan-A',
    versionNumber: 1,
    planType: 'individual_therapy',
    specialty: 'SLP',
    status: 'approved',
    reasonForPlan: 'initial',
    createdAt: new Date('2026-04-01T08:00:00Z'),
    approvedAt: new Date('2026-04-01T10:00:00Z'),
    rejectedAt: null,
    rejectionCount: 0,
    evidenceHash: 'hash-v1',
    reviewerId: 'U-sup',
    approverId: 'U-sup',
    goals: [
      {
        goalId: 'g1',
        domain: 'expressive_language',
        statement: 'يطلب 40 شيئًا باستخدام النطق خلال 12 أسبوعًا',
        priorityScore: 0.8,
        targetHorizonWeeks: 12,
        baselineLink: 'bl-1',
        assessmentLink: 'asm-1',
        measureLink: 'm-1',
        evidenceRefs: [{ kind: 'assessment', refId: 'asm-1' }],
        confidence: 0.78,
      },
      {
        goalId: 'g2',
        domain: 'social',
        statement: 'يبادر بمحادثة قصيرة مع زميل خلال 8 أسابيع',
        priorityScore: 0.6,
        targetHorizonWeeks: 8,
        baselineLink: 'bl-2',
        assessmentLink: 'asm-2',
        measureLink: 'm-2',
        evidenceRefs: [{ kind: 'note', refId: 'n-1' }],
        confidence: 0.7,
      },
    ],
    programs: [
      { programId: 'p1', name: 'NET', frequencyPerWeek: 3, durationMin: 45, goalRefs: ['g1'] },
    ],
    measures: [{ measureId: 'm1', instrument: 'VB-MAPP', cadenceWeeks: 12, goalRefs: ['g1'] }],
    safetyFlags: [],
    familyRole: {
      expectedInvolvementMinutesPerWeek: 30,
      coachingPlan: 'تخصيص عشر دقائق يوميًا',
      homeProgram: [{ activity: 'قراءة قصة', frequency: 'يوميًا' }],
    },
    reviewSchedule: {
      nextReviewAt: new Date(Date.now() + 60 * 86400000),
      cadenceWeeks: 12,
    },
    validation: {
      readinessScore: 92,
      band: 'ready',
      hardFailures: [],
      softWarnings: [],
    },
    reviewScorecard: {
      quality: 8,
      compliance: 8,
      clarity: 8,
      measurability: 9,
      safety: 9,
      familyReadiness: 8,
      overall: 8.3,
    },
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
    ...overrides,
  };
}

describe('care-plan-report-generator — listReportKinds', () => {
  test('returns exactly 6 report kinds', () => {
    const kinds = generator.listReportKinds();
    expect(kinds.length).toBe(6);
    expect(kinds).toEqual(
      expect.arrayContaining([
        'clinician_draft',
        'supervisor_review',
        'final_approved_plan',
        'rejection',
        'monthly_progress',
        'end_of_cycle_closure',
      ])
    );
  });
});

describe('care-plan-report-generator — clinician_draft', () => {
  test('renders core sections', () => {
    const r = generator.generateReport('clinician_draft', buildPlan());
    expect(r.ok).toBe(true);
    expect(r.markdown).toContain('مسودة العامل السريري');
    expect(r.markdown).toContain('الأهداف SMART');
    expect(r.markdown).toContain('البرامج');
    expect(r.markdown).toContain('المقاييس');
    expect(r.markdown).toContain('دور الأسرة');
    expect(r.markdown).toContain('g1');
    expect(r.markdown).toContain('NET');
  });

  test('plainText strips markdown markers', () => {
    const r = generator.generateReport('clinician_draft', buildPlan());
    expect(r.plainText).not.toContain('**');
    expect(r.plainText).not.toContain('##');
  });

  test('warns on empty goals', () => {
    const r = generator.generateReport('clinician_draft', buildPlan({ goals: [] }));
    expect(r.warnings.some(w => w.code === 'NO_GOALS')).toBe(true);
  });

  test('warns on empty programs', () => {
    const r = generator.generateReport('clinician_draft', buildPlan({ programs: [] }));
    expect(r.warnings.some(w => w.code === 'NO_PROGRAMS')).toBe(true);
  });

  test('shows readiness score', () => {
    const r = generator.generateReport('clinician_draft', buildPlan());
    expect(r.markdown).toContain('92/100');
  });
});

describe('care-plan-report-generator — supervisor_review', () => {
  test('renders scorecard table', () => {
    const r = generator.generateReport('supervisor_review', buildPlan());
    expect(r.markdown).toContain('بطاقة الدرجات');
    expect(r.markdown).toContain('| البُعد | الدرجة |');
    expect(r.markdown).toContain('الجودة');
    expect(r.markdown).toContain('8.0 / 10');
    expect(r.markdown).toContain('**8.3 / 10**');
  });

  test('recommends approve when score ≥ 7 and no hard failures', () => {
    const r = generator.generateReport('supervisor_review', buildPlan());
    expect(r.markdown).toContain('✅ اعتماد');
  });

  test('recommends escalate for intensive plan type', () => {
    const r = generator.generateReport('supervisor_review', buildPlan({ planType: 'intensive' }));
    expect(r.markdown).toContain('تصعيد');
  });

  test('recommends request_revision when hard failures present', () => {
    const plan = buildPlan({
      validation: {
        readinessScore: 60,
        band: 'pending',
        hardFailures: [
          { ruleId: 'goal_has_baseline', elementId: 'g1', message: 'missing baseline' },
        ],
        softWarnings: [],
      },
    });
    const r = generator.generateReport('supervisor_review', plan);
    expect(r.markdown).toContain('إعادة للتعديل');
    expect(r.markdown).toContain('goal_has_baseline');
  });

  test('warns when scorecard missing', () => {
    const r = generator.generateReport('supervisor_review', buildPlan({ reviewScorecard: null }));
    expect(r.warnings.some(w => w.code === 'NO_SCORECARD')).toBe(true);
  });
});

describe('care-plan-report-generator — final_approved_plan', () => {
  test('renders signature chain', () => {
    const r = generator.generateReport('final_approved_plan', buildPlan());
    expect(r.markdown).toContain('سلسلة التوقيعات');
    expect(r.markdown).toContain('clinical_supervisor');
    expect(r.markdown).toContain('hash-v1');
  });

  test('warns when not actually approved', () => {
    const r = generator.generateReport('final_approved_plan', buildPlan({ status: 'draft' }));
    expect(r.warnings.some(w => w.code === 'NOT_APPROVED')).toBe(true);
  });

  test('warns when evidenceHash absent', () => {
    const r = generator.generateReport('final_approved_plan', buildPlan({ evidenceHash: null }));
    expect(r.warnings.some(w => w.code === 'NO_EVIDENCE_HASH')).toBe(true);
  });

  test('includes full clinician draft body', () => {
    const r = generator.generateReport('final_approved_plan', buildPlan());
    expect(r.markdown).toContain('الأهداف SMART');
    expect(r.markdown).toContain('g1');
  });
});

describe('care-plan-report-generator — rejection', () => {
  function rejectedPlan() {
    return buildPlan({
      status: 'rejected',
      rejectedAt: new Date('2026-04-02T10:00:00Z'),
      rejectionCount: 1,
      rejection: {
        primaryReason: 'evidence_gap',
        requiredFixes: [
          { elementId: 'g1', fix: 'أضف baseline رقمي', priority: 1, severity: 'must_fix' },
          { elementId: 'g2', fix: 'اربط بمقياس', priority: 2, severity: 'nice_to_fix' },
        ],
        rewriteGuidance: 'يرجى إعادة كتابة الهدف g1',
        urgency: 'within_3_days',
      },
    });
  }

  test('renders rejection details', () => {
    const r = generator.generateReport('rejection', rejectedPlan());
    expect(r.markdown).toContain('السبب الرئيسي');
    expect(r.markdown).toContain('evidence_gap');
    expect(r.markdown).toContain('🛑 إلزامي');
    expect(r.markdown).toContain('🟡 مُستحسن');
    expect(r.markdown).toContain('within_3_days');
  });

  test('warns when no rejection record', () => {
    const r = generator.generateReport('rejection', buildPlan({ rejection: null }));
    expect(r.warnings.some(w => w.code === 'NO_REJECTION')).toBe(true);
  });

  test('flags escalation after repeated rejections', () => {
    const plan = rejectedPlan();
    plan.rejectionCount = 3;
    const r = generator.generateReport('rejection', plan);
    expect(r.markdown).toContain('تصعيدًا');
  });
});

describe('care-plan-report-generator — monthly_progress', () => {
  test('renders trend per goal + holistic verdict', () => {
    const signals = [
      {
        goalId: 'g1',
        measureSeries: [
          { date: new Date('2026-01-01'), value: 10 },
          { date: new Date('2026-01-15'), value: 14 },
          { date: new Date('2026-02-01'), value: 18 },
        ],
      },
    ];
    const r = generator.generateReport('monthly_progress', buildPlan(), { goalSignals: signals });
    expect(r.ok).toBe(true);
    expect(r.markdown).toContain('تقرير التقدم الشهري');
    expect(r.markdown).toContain('g1');
    expect(r.markdown).toMatch(/مستمر|بحاجة مراجعة|مُحقَّق|تصعيد/);
  });

  test('warns when no signals provided', () => {
    const r = generator.generateReport('monthly_progress', buildPlan(), { goalSignals: [] });
    expect(r.warnings.some(w => w.code === 'NO_SIGNALS')).toBe(true);
  });
});

describe('care-plan-report-generator — end_of_cycle_closure', () => {
  test('discharge readiness when most goals closed', () => {
    const signals = [
      {
        goalId: 'g1',
        targetValue: 5,
        measureSeries: [
          { date: new Date('2026-01-01'), value: 3 },
          { date: new Date('2026-01-15'), value: 6 },
          { date: new Date('2026-02-01'), value: 8 },
        ],
      },
      {
        goalId: 'g2',
        targetValue: 5,
        measureSeries: [
          { date: new Date('2026-01-01'), value: 4 },
          { date: new Date('2026-01-15'), value: 7 },
          { date: new Date('2026-02-01'), value: 9 },
        ],
      },
      {
        goalId: 'g3',
        targetValue: 5,
        measureSeries: [
          { date: new Date('2026-01-01'), value: 2 },
          { date: new Date('2026-01-15'), value: 5 },
          { date: new Date('2026-02-01'), value: 8 },
        ],
      },
    ];
    const r = generator.generateReport('end_of_cycle_closure', buildPlan(), {
      goalSignals: signals,
    });
    expect(r.ok).toBe(true);
    expect(r.markdown).toContain('discharge_readiness');
    expect(r.markdown).toContain('جاهزة للإغلاق');
  });

  test('warns on low completion', () => {
    const signals = [
      {
        goalId: 'g1',
        measureSeries: [
          { date: new Date('2026-01-01'), value: 10 },
          { date: new Date('2026-01-15'), value: 10 },
          { date: new Date('2026-02-01'), value: 10 },
        ],
      },
    ];
    const r = generator.generateReport('end_of_cycle_closure', buildPlan(), {
      goalSignals: signals,
    });
    expect(r.warnings.some(w => w.code === 'LOW_COMPLETION')).toBe(true);
  });
});

describe('care-plan-report-generator — error paths', () => {
  test('unknown report kind → ok=false', () => {
    const r = generator.generateReport('foo', buildPlan());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('UNKNOWN_REPORT_KIND');
  });

  test('invalid plan body → ok=false', () => {
    const r = generator.generateReport('clinician_draft', null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_PLAN');
  });
});

describe('care-plan-report-generator — plainTextFromMarkdown', () => {
  const { plainTextFromMarkdown } = generator._internal;

  test('strips headers', () => {
    expect(plainTextFromMarkdown('# Title\n## Sub')).not.toContain('#');
  });

  test('strips bold markers', () => {
    expect(plainTextFromMarkdown('**bold** text')).toBe('bold text');
  });

  test('converts dash list to bullet', () => {
    expect(plainTextFromMarkdown('- one\n- two')).toContain('• one');
  });

  test('handles non-string', () => {
    expect(plainTextFromMarkdown(null)).toBe('');
  });
});

// ─── 2. Route ──────────────────────────────────────────────────────

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
    getPlanVersionById: jest.fn(async id => (id === 'pv-1' ? buildPlan() : null)),
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
  return { app, service: svc };
}

describe('POST /:id/reports/:kind', () => {
  test('clinician_draft happy path', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/care-plans/pv-1/reports/clinician_draft').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.kind).toBe('clinician_draft');
    expect(res.body.data.markdown).toContain('الأهداف SMART');
  });

  test('supervisor_review happy path', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reports/supervisor_review')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.markdown).toContain('بطاقة الدرجات');
  });

  test('monthly_progress with signals', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reports/monthly_progress')
      .send({
        goalSignals: [
          {
            goalId: 'g1',
            measureSeries: [
              { date: new Date('2026-01-01'), value: 10 },
              { date: new Date('2026-01-15'), value: 14 },
            ],
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.markdown).toContain('تقرير التقدم الشهري');
  });

  test('unknown kind → 400', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/api/v1/care-plans/pv-1/reports/totally_invalid').send({});
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('UNKNOWN_REPORT_KIND');
    expect(res.body.allowed.length).toBe(6);
  });

  test('plan not found → 404', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/ghost/reports/clinician_draft')
      .send({});
    expect(res.status).toBe(404);
  });

  test('permission denied for supervisor_review when role lacks it → 403', async () => {
    // therapist cannot generate supervisor_review (governance check)
    const { app } = makeApp({
      role: 'therapist',
      allowedPermissions: ['care-plan.report.clinician_draft'],
    });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/reports/supervisor_review')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.report.supervisor_review');
  });

  test('therapist can generate clinician_draft', async () => {
    const { app } = makeApp({
      role: 'therapist',
      allowedPermissions: ['care-plan.report.clinician_draft'],
    });
    const res = await request(app).post('/api/v1/care-plans/pv-1/reports/clinician_draft').send({});
    expect(res.status).toBe(200);
  });
});

// ─── 3. Governance ────────────────────────────────────────────────

describe('governance.registry — Wave 47 permissions', () => {
  const gov = require('../intelligence/governance.registry');

  test('exposes 6 per-report codes', () => {
    const codes = gov.listPermissionCodes();
    expect(codes).toEqual(
      expect.arrayContaining([
        'care-plan.report.clinician_draft',
        'care-plan.report.supervisor_review',
        'care-plan.report.final_approved_plan',
        'care-plan.report.rejection',
        'care-plan.report.monthly_progress',
        'care-plan.report.end_of_cycle_closure',
      ])
    );
  });

  test('supervisor_review restricted to clinical_supervisor/branch_manager', () => {
    expect(gov.getHoldersOf('care-plan.report.supervisor_review')).toEqual(
      expect.arrayContaining(['clinical_supervisor', 'branch_manager'])
    );
    expect(gov.getHoldersOf('care-plan.report.supervisor_review')).not.toContain('therapist');
  });

  test('final_approved_plan readable by quality_compliance + executive', () => {
    expect(gov.getHoldersOf('care-plan.report.final_approved_plan')).toEqual(
      expect.arrayContaining(['quality_compliance', 'executive_leadership'])
    );
  });
});
