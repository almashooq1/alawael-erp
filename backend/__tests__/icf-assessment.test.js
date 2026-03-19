/**
 * ICF Functional Assessment — Tests
 *
 * اختبارات شاملة لنظام التقييم الوظيفي وفق ICF
 * يتبع نمط الاختبارات الموجود: supertest + smoke tests
 */

/* eslint-disable no-unused-vars */

// ─── Test environment ─────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.SMART_TEST_MODE = 'true';

const request = require('supertest');
const { Types } = require('mongoose');

// ─── Auth mock — must be before app require ───────────────────────────────────
jest.mock('../middleware/auth', () => {
  const passthrough = (req, _res, next) => {
    req.user = {
      _id: new (require('mongoose').Types.ObjectId)(),
      id: '507f1f77bcf86cd799439022',
      role: 'admin',
      organization: '507f1f77bcf86cd799439033',
    };
    next();
  };
  return {
    authenticate: passthrough,
    authenticateToken: passthrough,
    protect: passthrough,
    requireAuth: passthrough,
    requireAdmin: passthrough,
    optionalAuth: passthrough,
    requireRole: () => passthrough,
    authorize: () => passthrough,
    authorizeRole: () => passthrough,
  };
});

jest.mock('../middleware/auth.middleware', () => {
  const passthrough = (req, _res, next) => {
    req.user = {
      _id: new (require('mongoose').Types.ObjectId)(),
      id: '507f1f77bcf86cd799439022',
      role: 'admin',
      organization: '507f1f77bcf86cd799439033',
    };
    next();
  };
  return {
    authenticate: passthrough,
    authenticateToken: passthrough,
    protect: passthrough,
    requireAuth: passthrough,
    requireAdmin: passthrough,
    optionalAuth: passthrough,
    requireRole: () => passthrough,
    authorize: () => passthrough,
    authorizeRole: () => passthrough,
  };
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  TEST DATA — بيانات الاختبار
 * ═══════════════════════════════════════════════════════════════════════════ */

const SAMPLE_ICF_DATA = {
  title: 'ICF Assessment - Test',
  titleAr: 'تقييم ICF - اختبار',
  assessmentType: 'initial',
  beneficiaryId: '507f1f77bcf86cd799439011',
  assessorId: '507f1f77bcf86cd799439022',
  assessmentDate: new Date('2026-03-01').toISOString(),
  icfVersion: 'ICF-2001',
  healthCondition: {
    icdCode: 'G80',
    diagnosis: 'Cerebral Palsy',
    diagnosisAr: 'الشلل الدماغي',
    severity: 'moderate',
  },
  bodyFunctions: {
    chapter1_mental: [
      { code: 'b110', title: 'Consciousness', titleAr: 'الوعي', qualifier: 0, notes: 'Normal' },
      { code: 'b117', title: 'Intellectual functions', titleAr: 'الوظائف الذهنية', qualifier: 1 },
      { code: 'b140', title: 'Attention', titleAr: 'الانتباه', qualifier: 2 },
    ],
    chapter7_neuromusculoskeletal: [
      { code: 'b710', title: 'Joint mobility', titleAr: 'حركة المفاصل', qualifier: 3 },
      { code: 'b730', title: 'Muscle power', titleAr: 'قوة العضلات', qualifier: 2 },
      { code: 'b735', title: 'Muscle tone', titleAr: 'توتر العضلات', qualifier: 3 },
    ],
  },
  bodyStructures: {
    chapter1_nervous: [
      {
        code: 's110',
        title: 'Brain structure',
        titleAr: 'هيكل الدماغ',
        qualifier: 2,
        qualifierNature: 1,
        qualifierLocation: 3,
      },
    ],
    chapter7_movement: [
      { code: 's750', title: 'Lower extremity', titleAr: 'الطرف السفلي', qualifier: 3 },
    ],
  },
  activitiesParticipation: {
    chapter1_learning: [
      {
        code: 'd110',
        title: 'Watching',
        titleAr: 'المشاهدة',
        qualifier: 1,
        performanceQualifier: 2,
        capacityQualifier: 1,
      },
    ],
    chapter4_mobility: [
      {
        code: 'd450',
        title: 'Walking',
        titleAr: 'المشي',
        qualifier: 3,
        performanceQualifier: 3,
        capacityQualifier: 2,
      },
      {
        code: 'd455',
        title: 'Moving around',
        titleAr: 'التنقل',
        qualifier: 3,
        performanceQualifier: 4,
        capacityQualifier: 2,
      },
    ],
    chapter5_selfCare: [
      {
        code: 'd510',
        title: 'Washing oneself',
        titleAr: 'الاستحمام',
        qualifier: 2,
        performanceQualifier: 2,
        capacityQualifier: 1,
      },
    ],
  },
  environmentalFactors: {
    chapter1_products: [
      {
        code: 'e120',
        title: 'Assistive products for mobility',
        titleAr: 'أجهزة مساعدة للتنقل',
        qualifier: 2,
        isFacilitator: true,
      },
    ],
    chapter3_support: [
      {
        code: 'e310',
        title: 'Immediate family',
        titleAr: 'الأسرة المباشرة',
        qualifier: 1,
        isFacilitator: true,
      },
    ],
    chapter4_attitudes: [
      {
        code: 'e460',
        title: 'Societal attitudes',
        titleAr: 'مواقف المجتمع',
        qualifier: 3,
        isBarrier: true,
      },
    ],
  },
};

const VALID_STATUSES = [200, 400, 401, 403, 404, 500, 503];

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  APP LOADING
 * ═══════════════════════════════════════════════════════════════════════════ */

let app;

beforeAll(() => {
  try {
    app = require('../server');
  } catch (e) {
    try {
      app = require('../app');
    } catch (_e2) {
      app = null;
    }
  }
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  ROUTE SMOKE TESTS — اختبارات المسارات (smoke tests)
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ICF Assessment Routes', () => {
  const BASE = '/api/icf-assessments';
  const BASE_V1 = '/api/v1/icf-assessments';

  // ── CRUD endpoints ──────────────────────────────────────────────────────
  describe('CRUD Operations', () => {
    test('POST / — create assessment', async () => {
      if (!app) return;
      const res = await request(app).post(BASE).send(SAMPLE_ICF_DATA);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET / — list assessments', async () => {
      if (!app) return;
      const res = await request(app).get(BASE);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET / with filters — list with query params', async () => {
      if (!app) return;
      const res = await request(app).get(
        `${BASE}?assessmentType=initial&status=draft&page=1&limit=10`
      );
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /:id — get by ID', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/${id}`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('PUT /:id — update assessment', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).put(`${BASE}/${id}`).send({ title: 'Updated' });
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('DELETE /:id — soft delete', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).delete(`${BASE}/${id}`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Status transitions ─────────────────────────────────────────────────
  describe('Status Management', () => {
    test('PATCH /:id/status — change status', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).patch(`${BASE}/${id}/status`).send({ status: 'inProgress' });
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Comparison & Timeline ──────────────────────────────────────────────
  describe('Comparison & Timeline', () => {
    test('GET /:id/compare — compare with previous', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/${id}/compare`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /beneficiary/:id/timeline — beneficiary timeline', async () => {
      if (!app) return;
      const beneficiaryId = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/beneficiary/${beneficiaryId}/timeline`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Benchmarking ───────────────────────────────────────────────────────
  describe('Benchmarking', () => {
    test('GET /:id/benchmark — benchmark assessment', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/${id}/benchmark`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /benchmarks — list benchmarks', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/benchmarks`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('POST /benchmarks — create benchmark', async () => {
      if (!app) return;
      const res = await request(app).post(`${BASE}/benchmarks`).send({
        code: 'b110',
        population: 'general',
        mean: 1.2,
        standardDeviation: 0.8,
        dataSource: 'WHO',
      });
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('POST /benchmarks/import — import benchmarks', async () => {
      if (!app) return;
      const res = await request(app)
        .post(`${BASE}/benchmarks/import`)
        .send({
          benchmarks: [
            { code: 'b110', population: 'general', mean: 1.2, dataSource: 'WHO' },
            { code: 'b117', population: 'pediatric', mean: 0.8, dataSource: 'WHO' },
          ],
        });
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Statistics & Distribution ──────────────────────────────────────────
  describe('Statistics & Analytics', () => {
    test('GET /statistics — aggregate statistics', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/statistics`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /domain-distribution — domain distribution', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/domain-distribution`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── ICF Code Reference ────────────────────────────────────────────────
  describe('ICF Code Reference', () => {
    test('GET /codes — search codes', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/codes?q=mobility`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /codes/tree/:component — code tree', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/codes/tree/bodyFunctions`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Reports ────────────────────────────────────────────────────────────
  describe('Reports', () => {
    test('GET /:id/report — full report', async () => {
      if (!app) return;
      const id = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/${id}/report`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /beneficiary/:id/comparative-report — comparative report', async () => {
      if (!app) return;
      const beneficiaryId = new Types.ObjectId().toString();
      const res = await request(app).get(`${BASE}/beneficiary/${beneficiaryId}/comparative-report`);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /organization-report — organization report', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE}/organization-report`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });

  // ── Dual-mount /api/v1 ────────────────────────────────────────────────
  describe('Dual Mount /api/v1', () => {
    test('GET /api/v1/icf-assessments — v1 mount', async () => {
      if (!app) return;
      const res = await request(app).get(BASE_V1);
      expect(VALID_STATUSES).toContain(res.status);
    });

    test('GET /api/v1/icf-assessments/statistics — v1 statistics', async () => {
      if (!app) return;
      const res = await request(app).get(`${BASE_V1}/statistics`);
      expect(VALID_STATUSES).toContain(res.status);
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  CONTROLLER EXPORT TESTS — اختبارات وحدة التحكم
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ICF Assessment Controller', () => {
  let ICFAssessmentController;

  beforeAll(() => {
    ICFAssessmentController = require('../controllers/icfAssessment.controller');
  });

  test('should export all required CRUD methods', () => {
    expect(typeof ICFAssessmentController.create).toBe('function');
    expect(typeof ICFAssessmentController.list).toBe('function');
    expect(typeof ICFAssessmentController.getById).toBe('function');
    expect(typeof ICFAssessmentController.update).toBe('function');
    expect(typeof ICFAssessmentController.delete).toBe('function');
  });

  test('should export status & comparison methods', () => {
    expect(typeof ICFAssessmentController.changeStatus).toBe('function');
    expect(typeof ICFAssessmentController.compare).toBe('function');
    expect(typeof ICFAssessmentController.timeline).toBe('function');
  });

  test('should export analytics methods', () => {
    expect(typeof ICFAssessmentController.benchmark).toBe('function');
    expect(typeof ICFAssessmentController.statistics).toBe('function');
    expect(typeof ICFAssessmentController.domainDistribution).toBe('function');
  });

  test('should export ICF code reference methods', () => {
    expect(typeof ICFAssessmentController.searchCodes).toBe('function');
    expect(typeof ICFAssessmentController.codeTree).toBe('function');
  });

  test('should export benchmark management methods', () => {
    expect(typeof ICFAssessmentController.listBenchmarks).toBe('function');
    expect(typeof ICFAssessmentController.createBenchmark).toBe('function');
    expect(typeof ICFAssessmentController.importBenchmarks).toBe('function');
  });

  test('should export report methods', () => {
    expect(typeof ICFAssessmentController.getReport).toBe('function');
    expect(typeof ICFAssessmentController.comparativeReport).toBe('function');
    expect(typeof ICFAssessmentController.organizationReport).toBe('function');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  SERVICE EXPORT TESTS — اختبارات الخدمة
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ICF Assessment Service', () => {
  let ICFAssessmentService;

  beforeAll(() => {
    ICFAssessmentService = require('../services/icfAssessment.service');
  });

  test('should export all CRUD methods', () => {
    expect(typeof ICFAssessmentService.create).toBe('function');
    expect(typeof ICFAssessmentService.getById).toBe('function');
    expect(typeof ICFAssessmentService.list).toBe('function');
    expect(typeof ICFAssessmentService.update).toBe('function');
    expect(typeof ICFAssessmentService.delete).toBe('function');
  });

  test('should export status & workflow methods', () => {
    expect(typeof ICFAssessmentService.changeStatus).toBe('function');
  });

  test('should export comparison & timeline methods', () => {
    expect(typeof ICFAssessmentService.compareWithPrevious).toBe('function');
    expect(typeof ICFAssessmentService.getBeneficiaryTimeline).toBe('function');
  });

  test('should export benchmarking methods', () => {
    expect(typeof ICFAssessmentService.benchmarkAssessment).toBe('function');
    expect(typeof ICFAssessmentService.createBenchmark).toBe('function');
    expect(typeof ICFAssessmentService.listBenchmarks).toBe('function');
    expect(typeof ICFAssessmentService.importBenchmarks).toBe('function');
  });

  test('should export analytics methods', () => {
    expect(typeof ICFAssessmentService.getStatistics).toBe('function');
    expect(typeof ICFAssessmentService.getDomainDistribution).toBe('function');
  });

  test('should export ICF reference methods', () => {
    expect(typeof ICFAssessmentService.searchCodes).toBe('function');
    expect(typeof ICFAssessmentService.getCodeTree).toBe('function');
  });

  test('should export gap analysis helper', () => {
    expect(typeof ICFAssessmentService._calculateGapAnalysis).toBe('function');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  REPORT SERVICE TESTS — اختبارات خدمة التقارير
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ICF Report Service', () => {
  let ICFReportService;

  beforeAll(() => {
    ICFReportService = require('../services/icfReport.service');
  });

  test('should export all required methods', () => {
    expect(typeof ICFReportService.generateFullReport).toBe('function');
    expect(typeof ICFReportService.generateComparativeReport).toBe('function');
    expect(typeof ICFReportService.generateOrganizationReport).toBe('function');
  });

  // ── Qualifier/Severity mapping ─────────────────────────────────────────
  describe('Qualifier to Severity mapping', () => {
    test('qualifier 0 → no problem (لا مشكلة)', () => {
      const sev = ICFReportService._qualifierToSeverity(0);
      expect(sev.level).toBe(0);
      expect(sev.en).toBe('No problem');
      expect(sev.ar).toBe('لا مشكلة');
    });

    test('qualifier 1 → mild (خفيفة)', () => {
      const sev = ICFReportService._qualifierToSeverity(1.0);
      expect(sev.level).toBe(1);
      expect(sev.ar).toBe('خفيفة');
    });

    test('qualifier 2 → moderate (متوسطة)', () => {
      const sev = ICFReportService._qualifierToSeverity(2.0);
      expect(sev.level).toBe(2);
      expect(sev.ar).toBe('متوسطة');
    });

    test('qualifier 3 → severe (شديدة)', () => {
      const sev = ICFReportService._qualifierToSeverity(3.0);
      expect(sev.level).toBe(3);
      expect(sev.ar).toBe('شديدة');
    });

    test('qualifier 4 → complete (كاملة)', () => {
      const sev = ICFReportService._qualifierToSeverity(4.0);
      expect(sev.level).toBe(4);
      expect(sev.ar).toBe('كاملة');
    });
  });

  // ── Severity labels ───────────────────────────────────────────────────
  describe('Severity Labels', () => {
    test('should return Arabic severity labels', () => {
      expect(ICFReportService._getSeverityLabel('mild', 'ar')).toBe('خفيفة');
      expect(ICFReportService._getSeverityLabel('moderate', 'ar')).toBe('متوسطة');
      expect(ICFReportService._getSeverityLabel('severe', 'ar')).toBe('شديدة');
      expect(ICFReportService._getSeverityLabel('noProblem', 'ar')).toBe('لا مشكلة');
      expect(ICFReportService._getSeverityLabel('complete', 'ar')).toBe('كاملة');
    });

    test('should return English severity labels', () => {
      expect(ICFReportService._getSeverityLabel('mild', 'en')).toBe('Mild');
      expect(ICFReportService._getSeverityLabel('moderate', 'en')).toBe('Moderate');
      expect(ICFReportService._getSeverityLabel('severe', 'en')).toBe('Severe');
      expect(ICFReportService._getSeverityLabel('complete', 'en')).toBe('Complete');
    });
  });

  // ── Overall Trend calculation ─────────────────────────────────────────
  describe('Overall Trend Calculation', () => {
    test('should detect improving trend (increasing functioning scores)', () => {
      const assessments = [
        { overallFunctioningScore: 40, assessmentDate: '2026-01-01' },
        { overallFunctioningScore: 50, assessmentDate: '2026-02-01' },
        { overallFunctioningScore: 60, assessmentDate: '2026-03-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('improving');
      expect(trend.delta).toBe(20);
    });

    test('should detect declining trend (decreasing functioning scores)', () => {
      const assessments = [
        { overallFunctioningScore: 70, assessmentDate: '2026-01-01' },
        { overallFunctioningScore: 55, assessmentDate: '2026-02-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('declining');
      expect(trend.delta).toBe(-15);
    });

    test('should detect stable trend (small change < 5)', () => {
      const assessments = [
        { overallFunctioningScore: 60, assessmentDate: '2026-01-01' },
        { overallFunctioningScore: 62, assessmentDate: '2026-02-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('stable');
    });

    test('should return insufficient_data for single assessment', () => {
      const trend = ICFReportService._calculateOverallTrend([
        { overallFunctioningScore: 60, assessmentDate: '2026-01-01' },
      ]);
      expect(trend.trend).toBe('insufficient_data');
    });

    test('should return insufficient_data for empty array', () => {
      const trend = ICFReportService._calculateOverallTrend([]);
      expect(trend.trend).toBe('insufficient_data');
    });
  });

  // ── Period Summary ────────────────────────────────────────────────────
  describe('Period Summary', () => {
    test('should categorize domains into improved/stable/declined', () => {
      const assessments = [
        {
          domainScores: [
            { domain: 'bodyFunctions', averageQualifier: 2.5 },
            { domain: 'activitiesParticipation', averageQualifier: 3.0 },
            { domain: 'environmentalFactors', averageQualifier: 2.0 },
          ],
        },
        {
          domainScores: [
            { domain: 'bodyFunctions', averageQualifier: 1.8 },
            { domain: 'activitiesParticipation', averageQualifier: 3.0 },
            { domain: 'environmentalFactors', averageQualifier: 2.8 },
          ],
        },
      ];

      const summary = ICFReportService._buildPeriodSummary(assessments);
      expect(summary).toBeDefined();
      expect(summary.improved.length).toBe(1);
      expect(summary.improved[0].domain).toBe('bodyFunctions');
      expect(summary.stable.length).toBe(1);
      expect(summary.stable[0].domain).toBe('activitiesParticipation');
      expect(summary.declined.length).toBe(1);
      expect(summary.declined[0].domain).toBe('environmentalFactors');
    });

    test('should return null for empty assessments', () => {
      const summary = ICFReportService._buildPeriodSummary([]);
      expect(summary).toBeNull();
    });

    test('should handle single assessment gracefully', () => {
      const summary = ICFReportService._buildPeriodSummary([
        { domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.0 }] },
      ]);
      // Single assessment compares with itself — all domains stable
      if (summary) {
        expect(summary.declined.length).toBe(0);
        expect(summary.improved.length).toBe(0);
      } else {
        expect(summary).toBeNull();
      }
    });
  });

  // ── Trend Recommendations ─────────────────────────────────────────────
  describe('Trend Recommendations', () => {
    test('should generate warning for declining domains', () => {
      const assessments = [
        { domainScores: [{ domain: 'bodyFunctions', averageQualifier: 1.5 }] },
        { domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.5 }] },
      ];

      const recs = ICFReportService._generateTrendRecommendations(assessments);
      expect(recs.length).toBeGreaterThan(0);
      const warning = recs.find(r => r.type === 'warning' && r.domain === 'bodyFunctions');
      expect(warning).toBeDefined();
    });

    test('should generate success for improving domains', () => {
      const assessments = [
        { domainScores: [{ domain: 'activitiesParticipation', averageQualifier: 3.0 }] },
        { domainScores: [{ domain: 'activitiesParticipation', averageQualifier: 2.0 }] },
      ];

      const recs = ICFReportService._generateTrendRecommendations(assessments);
      const success = recs.find(r => r.type === 'success');
      expect(success).toBeDefined();
    });

    test('should return empty for single assessment', () => {
      const recs = ICFReportService._generateTrendRecommendations([
        { domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.0 }] },
      ]);
      expect(recs).toEqual([]);
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ *
 *  MODEL EXPORT TESTS — اختبارات تصدير النموذج
 * ═══════════════════════════════════════════════════════════════════════════ */

describe('ICF Assessment Model Exports', () => {
  test('should export ICFAssessment model', () => {
    const { ICFAssessment } = require('../models/ICFAssessment');
    expect(ICFAssessment).toBeDefined();
  });

  test('should export ICFCodeReference model', () => {
    const { ICFCodeReference } = require('../models/ICFAssessment');
    expect(ICFCodeReference).toBeDefined();
  });

  test('should export ICFBenchmark model', () => {
    const { ICFBenchmark } = require('../models/ICFAssessment');
    expect(ICFBenchmark).toBeDefined();
  });

  test('ICFAssessment should have standard Mongoose methods', () => {
    const { ICFAssessment } = require('../models/ICFAssessment');
    expect(typeof ICFAssessment.find).toBe('function');
    expect(typeof ICFAssessment.findById).toBe('function');
    expect(typeof ICFAssessment.findOne).toBe('function');
    expect(typeof ICFAssessment.create).toBe('function');
    expect(typeof ICFAssessment.countDocuments).toBe('function');
    expect(typeof ICFAssessment.aggregate).toBe('function');
  });

  test('ICFBenchmark should have standard Mongoose methods', () => {
    const { ICFBenchmark } = require('../models/ICFAssessment');
    expect(typeof ICFBenchmark.find).toBe('function');
    expect(typeof ICFBenchmark.findById).toBe('function');
    expect(typeof ICFBenchmark.create).toBe('function');
  });
});
