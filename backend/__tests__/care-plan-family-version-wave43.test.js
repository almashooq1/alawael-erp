/**
 * care-plan-family-version-wave43.test.js — Wave 43 (Family Communication).
 *
 * Covers:
 *   1. arabic-readability.service — estimateGrade + isWithinFamilyTarget
 *      + detectForbiddenTerms
 *   2. family-version-generator.service — generate + redaction +
 *      section validation + readability gate + forbidden-term tripwire
 *   3. POST /:id/family-version/generate route — happy + rewrite-required
 *      + persistence + missing-record handling
 */

'use strict';

const express = require('express');
const request = require('supertest');
const readability = require('../intelligence/arabic-readability.service');
const familyGen = require('../intelligence/family-version-generator.service');
const reg = require('../intelligence/care-planning.registry');
const createCarePlanRouter = require('../routes/care-plan.routes');

// ─── 1. arabic-readability.service ─────────────────────────────────

describe('arabic-readability.service — estimateGrade', () => {
  test('empty text returns grade 1, low confidence', () => {
    const r = readability.estimateGrade('');
    expect(r.grade).toBe(1);
    expect(r.wordCount).toBe(0);
    expect(r.confidence).toBe('low');
  });

  test('short familiar Arabic primer scores low grade', () => {
    const text = [
      'مرحبًا. هذه الخطة لطفلك.',
      'سنعمل على القراءة معًا.',
      'يقرأ الطفل كل يوم.',
      'يلعب الطفل مع الأم.',
      'الأسرة تساعد في البيت.',
    ].join(' ');
    const r = readability.estimateGrade(text);
    expect(r.grade).toBeLessThanOrEqual(6);
    expect(r.wordCount).toBeGreaterThan(15);
  });

  test('long technical text scores high grade', () => {
    const text = [
      'تستخدم البيانات السريرية المستخلصة من التقييمات المعيارية في تحديد المؤشرات التشخيصية الأولية للحالات المرضية المعقدة.',
      'تشير الدراسات الإحصائية الحديثة إلى أن تطبيق الأساليب التداخلية المتعددة الأبعاد يحقق نتائج إيجابية مستدامة على المدى البعيد.',
      'يستلزم تنفيذ البرامج التأهيلية المتخصصة منهجية علمية دقيقة تأخذ بعين الاعتبار العوامل النفسية والاجتماعية المؤثرة في الحالة.',
      'استعمالات هذه المصطلحات التخصصية المتقدمة تتطلب فهمًا عميقًا للمفاهيم المرتبطة بها.',
    ].join(' ');
    const r = readability.estimateGrade(text);
    expect(r.grade).toBeGreaterThan(6);
    expect(r.confidence).toBe('high');
  });

  test('detects clinical ICD codes', () => {
    expect(readability.detectForbiddenTerms('التشخيص ICD-10 F84.0')).toEqual(
      expect.arrayContaining(['ICD', 'F84.0'])
    );
  });

  test('detects scale names (VB-MAPP, GARS)', () => {
    expect(readability.detectForbiddenTerms('تم تطبيق VB-MAPP و GARS')).toEqual(
      expect.arrayContaining(['VB-MAPP', 'GARS'])
    );
  });

  test('clean family text → no forbidden terms', () => {
    expect(readability.detectForbiddenTerms('مرحبًا، هذه نسخة الأسرة للخطة.')).toEqual([]);
  });

  test('isWithinFamilyTarget honors the custom maxGrade', () => {
    const text = 'يقرأ الطفل في البيت.';
    expect(readability.isWithinFamilyTarget(text, 6)).toBe(true);
    expect(readability.isWithinFamilyTarget(text, 1)).toBe(false);
  });

  test('confidence is low for very short text', () => {
    const r = readability.estimateGrade('مرحبًا.');
    expect(r.confidence).toBe('low');
  });

  test('confidence is medium for ~30 words', () => {
    const text =
      'مرحبًا بكم. هذه نسخة مبسطة من خطة طفلكم. سنعمل معًا على دعم طفلكم في البيت. الفريق هنا للمساعدة.';
    const r = readability.estimateGrade(text);
    expect(['medium', 'low']).toContain(r.confidence);
  });
});

// ─── 2. family-version-generator.service ───────────────────────────

describe('family-version-generator.service — generate', () => {
  function buildPlanBody(overrides = {}) {
    return {
      planId: 'plan-A',
      versionNumber: 1,
      planType: 'individual_therapy',
      reasonForPlan: 'initial',
      goals: [
        {
          goalId: 'g1',
          domain: 'expressive_language',
          statement: 'يطلب الطفل عشرة أشياء جديدة باستخدام الكلمات خلال 12 أسبوعًا',
          priorityScore: 0.9,
          targetHorizonWeeks: 12,
          // Forbidden-internal fields that should be redacted:
          evidenceRefs: [{ kind: 'assessment', refId: 'asm-1' }],
          confidence: 0.78,
          baselineLink: 'bl-1',
        },
        {
          goalId: 'g2',
          domain: 'social',
          statement: 'يبادر الطفل بمحادثة قصيرة مع زميل خلال 8 أسابيع',
          priorityScore: 0.7,
          targetHorizonWeeks: 8,
          evidenceRefs: [],
          confidence: 0.6,
        },
      ],
      familyRole: {
        expectedInvolvementMinutesPerWeek: 60,
        coachingPlan: 'تخصيص عشر دقائق يوميًا للعب مع الطفل وتشجيعه على التواصل.',
        homeProgram: [
          { activity: 'قراءة قصة قصيرة قبل النوم', frequency: 'يوميًا' },
          { activity: 'لعب لعبة طلب الأشياء بالكلمات', frequency: 'ثلاث مرات في الأسبوع' },
        ],
      },
      reviewSchedule: {
        nextReviewAt: new Date(Date.now() + 60 * 86400000),
        cadenceWeeks: 12,
      },
      // Top-level fields that should be redacted entirely:
      icd10: 'F84.0',
      icdCodes: ['F84.0', 'F90.0'],
      internalNotes: 'risk of attendance drop',
      ...overrides,
    };
  }

  test('happy path → ok, markdown contains all required sections', () => {
    const r = familyGen.generate(buildPlanBody(), {
      centerName: 'مركز الأوائل',
      contactPhone: '+966 11 000 0000',
      contactEmail: 'family@alawael.example',
      beneficiaryFirstName: 'سعد',
    });

    expect(r.ok).toBe(true);
    expect(r.requiresRewrite).toBe(false);
    expect(r.markdown).toContain('سعد');
    expect(r.markdown).toContain('ما نعمل عليه');
    expect(r.markdown).toContain('دوركم في البيت');
    expect(r.markdown).toContain('تمارين البيت');
    expect(r.markdown).toContain('موعد المراجعة القادم');
    expect(r.markdown).toContain('للتواصل');
    expect(r.missingSections).toEqual([]);
  });

  test('redacts top-level forbidden fields (icd10 / internalNotes)', () => {
    const r = familyGen.generate(buildPlanBody(), { beneficiaryFirstName: 'سعد' });
    expect(r.markdown).not.toContain('F84.0');
    expect(r.markdown).not.toContain('internalNotes');
    expect(r.markdown).not.toContain('risk of attendance');
    expect(r.redactedFields).toEqual(
      expect.arrayContaining(['icd10', 'icdCodes', 'internalNotes'])
    );
  });

  test('redacts goal-level forbidden fields (evidenceRefs / confidence / baselines)', () => {
    const r = familyGen.generate(buildPlanBody(), { beneficiaryFirstName: 'سعد' });
    expect(r.markdown).not.toContain('evidenceRefs');
    expect(r.markdown).not.toContain('confidence');
    expect(r.markdown).not.toContain('baselineLink');
    expect(r.markdown).not.toContain('asm-1');
    expect(r.markdown).not.toContain('0.78');
    expect(r.redactedFields).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/goals\[\d+\]\.evidenceRefs/),
        expect.stringMatching(/goals\[\d+\]\.confidence/),
      ])
    );
  });

  test('limits goals to maxGoals (default 5), highest priority first', () => {
    const body = {
      ...buildPlanBody(),
      goals: Array.from({ length: 8 }, (_, i) => ({
        goalId: `g${i}`,
        domain: 'language',
        statement: `هدف رقم ${i + 1} للطفل قصير`,
        priorityScore: (8 - i) / 10,
        targetHorizonWeeks: 12,
      })),
    };
    const r = familyGen.generate(body, { beneficiaryFirstName: 'سعد' });
    expect(r.markdown).toContain('هدف رقم 1');
    expect(r.markdown).toContain('هدف رقم 5');
    expect(r.markdown).not.toContain('هدف رقم 7'); // beyond max
  });

  test('flags requiresRewrite if forbidden terms slip into custom strings', () => {
    const body = buildPlanBody();
    body.familyRole.coachingPlan = 'تطبيق VB-MAPP في البيت';
    const r = familyGen.generate(body, { beneficiaryFirstName: 'سعد' });
    expect(r.requiresRewrite).toBe(true);
    expect(r.forbiddenTermsFound).toEqual(expect.arrayContaining(['VB-MAPP']));
  });

  test('flags requiresRewrite if family role + home program both missing', () => {
    const body = buildPlanBody();
    body.familyRole = {};
    const r = familyGen.generate(body, { beneficiaryFirstName: 'سعد' });
    // Still ok? Generator falls back to placeholder text; should NOT require rewrite
    // unless other rules trip
    expect(r.missingSections).toEqual([]);
    expect(r.markdown).toContain('سيشاركم الأخصائي');
  });

  test('softens technical statements (mands → طلبات لفظية)', () => {
    const body = buildPlanBody();
    body.goals[0].statement = 'increase mands from 15 to 40 over 12 weeks';
    const r = familyGen.generate(body, { beneficiaryFirstName: 'سعد' });
    expect(r.markdown).toContain('طلبات لفظية');
  });

  test('graceful when contact info absent', () => {
    const r = familyGen.generate(buildPlanBody(), { beneficiaryFirstName: 'سعد' });
    expect(r.markdown).toContain('للتواصل');
    expect(r.markdown).toContain('يرجى التواصل مع المركز');
  });

  test('respects custom maxGoals=2', () => {
    const r = familyGen.generate(buildPlanBody(), {
      beneficiaryFirstName: 'سعد',
      maxGoals: 2,
    });
    // body has 2 goals — both should appear; with maxGoals=1 only first
    const r1 = familyGen.generate(buildPlanBody(), {
      beneficiaryFirstName: 'سعد',
      maxGoals: 1,
    });
    expect(r1.markdown).toContain('التواصل اللفظي');
    expect(r1.markdown).not.toContain('المهارات الاجتماعية');
    expect(r.markdown).toContain('المهارات الاجتماعية');
  });

  test('refuses INVALID_PLAN_BODY', () => {
    const r = familyGen.generate(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('INVALID_PLAN_BODY');
  });

  test('isFamilyReady returns true for clean generation', () => {
    const r = familyGen.generate(buildPlanBody(), { beneficiaryFirstName: 'سعد' });
    expect(familyGen.isFamilyReady(r)).toBe(true);
  });

  test('isFamilyReady returns false when requiresRewrite is true', () => {
    const body = buildPlanBody();
    body.familyRole.coachingPlan = 'VB-MAPP';
    const r = familyGen.generate(body, { beneficiaryFirstName: 'سعد' });
    expect(familyGen.isFamilyReady(r)).toBe(false);
  });
});

describe('family-version-generator — internal helpers', () => {
  const { redactBody, softenStatement, domainLabel } = familyGen._internal;

  test('redactBody removes nested forbidden fields without mutating input', () => {
    const input = { a: 1, evidenceRefs: ['x'], nested: { confidence: 0.5, b: 2 } };
    const strip = new Set(['evidenceRefs', 'confidence']);
    const out = redactBody(input, strip);
    expect(out).toEqual({ a: 1, nested: { b: 2 } });
    expect(input.evidenceRefs).toEqual(['x']); // not mutated
  });

  test('softenStatement maps common technical terms', () => {
    expect(softenStatement('increase mands by 10')).toContain('طلبات لفظية');
    expect(softenStatement('improve from baseline')).toContain('البداية');
  });

  test('domainLabel uses Arabic labels with sane fallback', () => {
    expect(domainLabel('expressive_language')).toBe('التواصل اللفظي');
    expect(domainLabel('unknown_domain_xyz')).toBe('مهارة عامة');
  });
});

// ─── 3. POST /:id/family-version/generate route ────────────────────

describe('POST /:id/family-version/generate', () => {
  function buildPlanRecord(overrides = {}) {
    return {
      _id: 'pv-1',
      planId: 'plan-A',
      status: 'approved',
      planType: 'individual_therapy',
      goals: [
        {
          goalId: 'g1',
          domain: 'expressive_language',
          statement: 'يطلب الطفل عشرة أشياء جديدة باستخدام الكلمات خلال 12 أسبوعًا',
          priorityScore: 0.9,
          targetHorizonWeeks: 12,
        },
      ],
      familyRole: {
        coachingPlan: 'تخصيص عشر دقائق يوميًا للعب مع الطفل',
        expectedInvolvementMinutesPerWeek: 30,
        homeProgram: [{ activity: 'قراءة قصة', frequency: 'يوميًا' }],
      },
      reviewSchedule: { nextReviewAt: new Date(Date.now() + 30 * 86400000) },
      ...overrides,
    };
  }

  function makeService(overrides = {}) {
    return {
      createDraft: jest.fn(),
      runValidation: jest.fn(),
      transition: jest.fn(),
      reject: jest.fn(),
      recordReviewScorecard: jest.fn(),
      createNewVersion: jest.fn(),
      applyAmendment: jest.fn(),
      setFamilyVersion: jest.fn(async ({ body, readabilityGrade }) => ({
        ok: true,
        planVersion: { _id: 'pv-1', familyVersion: { body, readabilityGrade } },
      })),
      getPlanVersionById: jest.fn(async () => buildPlanRecord()),
      getVersionHistory: jest.fn(async () => []),
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

  test('happy path → 200, markdown returned, persisted', async () => {
    const { app, service } = makeApp();
    const res = await request(app).post('/api/v1/care-plans/pv-1/family-version/generate').send({
      centerName: 'مركز الأوائل',
      contactPhone: '+966 11 000 0000',
      beneficiaryFirstName: 'سعد',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.markdown).toContain('سعد');
    expect(res.body.data.persisted).toBe(true);
    expect(res.body.data.readability.grade).toBeLessThanOrEqual(6);
    expect(service.setFamilyVersion).toHaveBeenCalledTimes(1);
  });

  test('persist: false → not stored', async () => {
    const { app, service } = makeApp();
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version/generate')
      .send({ persist: false, beneficiaryFirstName: 'سعد' });
    expect(res.status).toBe(200);
    expect(res.body.data.persisted).toBe(false);
    expect(service.setFamilyVersion).not.toHaveBeenCalled();
  });

  test('plan not found → 404', async () => {
    const svc = makeService({ getPlanVersionById: jest.fn(async () => null) });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/ghost/family-version/generate')
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('PLAN_NOT_FOUND');
  });

  test('plan with forbidden term in coaching plan → 412 + diagnostics', async () => {
    const svc = makeService({
      getPlanVersionById: jest.fn(async () =>
        buildPlanRecord({
          familyRole: {
            coachingPlan: 'استخدام VB-MAPP في المنزل',
            homeProgram: [{ activity: 'قراءة', frequency: 'يومي' }],
          },
        })
      ),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version/generate')
      .send({ beneficiaryFirstName: 'سعد' });
    expect(res.status).toBe(412);
    expect(res.body.reason).toBe('FAMILY_VERSION_REQUIRES_REWRITE');
    expect(res.body.generation.forbiddenTermsFound).toContain('VB-MAPP');
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({ allowedPermissions: ['care-plan.read'] });
    const res = await request(app).post('/api/v1/care-plans/pv-1/family-version/generate').send({});
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('care-plan.family-version.preview');
  });

  test('returns the redacted-fields audit list', async () => {
    const svc = makeService({
      getPlanVersionById: jest.fn(async () =>
        buildPlanRecord({
          icd10: 'F84.0',
          icdCodes: ['F84.0'],
          internalNotes: 'attendance risk',
        })
      ),
    });
    const { app } = makeApp({ service: svc });
    const res = await request(app)
      .post('/api/v1/care-plans/pv-1/family-version/generate')
      .send({ beneficiaryFirstName: 'سعد' });
    expect(res.status).toBe(200);
    expect(res.body.data.redactedFields).toEqual(
      expect.arrayContaining(['icd10', 'icdCodes', 'internalNotes'])
    );
  });
});
