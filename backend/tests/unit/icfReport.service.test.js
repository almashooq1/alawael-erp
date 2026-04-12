/**
 * Unit tests for icfReport.service.js — ICF Report Service
 * Class export, all static methods. Uses ICFAssessment model.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__icfQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

jest.mock('../../models/ICFAssessment', () => ({
  ICFAssessment: {
    find: jest.fn(() => global.__icfQ([])),
    findById: jest.fn(() => global.__icfQ(null)),
    aggregate: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockResolvedValue(0),
  },
  ICFBenchmark: {},
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const ICFReportService = require('../../services/icfReport.service');
const { ICFAssessment } = require('../../models/ICFAssessment');
const Q = global.__icfQ;

beforeEach(() => {
  jest.clearAllMocks();
  ICFAssessment.find.mockImplementation(() => Q([]));
  ICFAssessment.findById.mockImplementation(() => Q(null));
  ICFAssessment.aggregate.mockResolvedValue([]);
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('ICFReportService', () => {
  /* ── generateFullReport ──────────────────────────────────────────── */
  describe('generateFullReport', () => {
    test('returns full report when assessment found', async () => {
      const assessment = {
        _id: 'a1',
        icfVersion: '2.0',
        assessmentNumber: 'ICF-001',
        title: 'Test',
        titleAr: 'تقييم',
        assessmentType: 'initial',
        assessmentDate: new Date('2024-01-01'),
        status: 'completed',
        duration: 60,
        beneficiaryId: { name: 'Ben', nameAr: 'مستفيد' },
        assessorId: { name: 'Dr X' },
        reviewerId: null,
        programId: null,
        healthCondition: {},
        personalFactors: {},
        overallFunctioningScore: 72,
        overallSeverity: 'mild',
        domainScores: [
          {
            domain: 'bodyFunctions',
            averageQualifier: 1.2,
            assessedItems: 5,
            severityDistribution: {},
          },
        ],
        gapAnalysis: {},
        benchmarking: {},
        comparison: {},
        goals: [],
        recommendations: [],
        clinicalSummary: 'OK',
        bodyFunctions: {},
      };
      ICFAssessment.findById.mockImplementation(() => Q(assessment));

      const report = await ICFReportService.generateFullReport('a1');
      expect(report.meta.reportType).toBe('ICF Full Assessment Report');
      expect(report.scores.overallFunctioningScore).toBe(72);
      expect(report.domains).toBeDefined();
    });

    test('throws when assessment not found', async () => {
      ICFAssessment.findById.mockImplementation(() => Q(null));
      await expect(ICFReportService.generateFullReport('nope')).rejects.toThrow(
        'التقييم غير موجود'
      );
    });
  });

  /* ── generateComparativeReport ───────────────────────────────────── */
  describe('generateComparativeReport', () => {
    test('returns comparative report', async () => {
      const assessments = [
        {
          assessmentNumber: 'ICF-001',
          assessmentType: 'initial',
          assessmentDate: new Date('2024-01-01'),
          overallFunctioningScore: 60,
          overallSeverity: 'moderate',
          beneficiaryId: { name: 'Ben' },
          assessorId: { nameAr: 'م. أحمد' },
          domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.0, assessedItems: 5 }],
        },
        {
          assessmentNumber: 'ICF-002',
          assessmentType: 'follow_up',
          assessmentDate: new Date('2024-06-01'),
          overallFunctioningScore: 75,
          overallSeverity: 'mild',
          beneficiaryId: { name: 'Ben' },
          assessorId: { nameAr: 'م. أحمد' },
          domainScores: [{ domain: 'bodyFunctions', averageQualifier: 1.2, assessedItems: 6 }],
        },
      ];
      ICFAssessment.find.mockImplementation(() => Q(assessments));

      const report = await ICFReportService.generateComparativeReport('ben1');
      expect(report.meta.reportType).toBe('ICF Comparative Report');
      expect(report.totalAssessments).toBe(2);
      expect(report.overallTrend.trend).toBe('improving');
      expect(report.timeline).toHaveLength(2);
    });

    test('returns message when no assessments', async () => {
      ICFAssessment.find.mockImplementation(() => Q([]));
      const report = await ICFReportService.generateComparativeReport('ben1');
      expect(report.data).toBeNull();
    });

    test('handles date range options', async () => {
      ICFAssessment.find.mockImplementation(() => Q([]));
      const report = await ICFReportService.generateComparativeReport('ben1', {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });
      expect(report.data).toBeNull();
    });
  });

  /* ── generateOrganizationReport ──────────────────────────────────── */
  describe('generateOrganizationReport', () => {
    test('returns organization report', async () => {
      ICFAssessment.aggregate
        .mockResolvedValueOnce([
          {
            totalAssessments: 50,
            avgScore: 65.3,
            minScore: 20,
            maxScore: 95,
            uniqueBeneficiaries: ['b1', 'b2'],
            uniqueAssessors: ['a1'],
            totalBeneficiaries: 2,
            totalAssessors: 1,
          },
        ])
        .mockResolvedValueOnce([{ _id: 'mild', count: 30 }]) // severity dist
        .mockResolvedValueOnce([
          {
            _id: 'bodyFunctions',
            avgQualifier: 1.8,
            minQualifier: 0.5,
            maxQualifier: 3.0,
            count: 40,
          },
        ]) // domain avgs
        .mockResolvedValueOnce([{ _id: { year: 2024, month: 1 }, count: 10, avgScore: 65 }]) // monthly
        .mockResolvedValueOnce([{ _id: 'initial', count: 30 }]); // type dist

      const report = await ICFReportService.generateOrganizationReport({});
      expect(report.meta.reportType).toBe('ICF Organization Report');
      expect(report.overview.totalAssessments).toBe(50);
    });

    test('handles empty results', async () => {
      ICFAssessment.aggregate
        .mockResolvedValueOnce([]) // overview empty
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const report = await ICFReportService.generateOrganizationReport({});
      expect(report.overview.totalAssessments).toBe(0);
    });
  });

  /* ── Private helpers ─────────────────────────────────────────────── */
  describe('Private helpers', () => {
    test('_qualifierToSeverity — all levels', () => {
      expect(ICFReportService._qualifierToSeverity(0.2).level).toBe(0);
      expect(ICFReportService._qualifierToSeverity(1.0).level).toBe(1);
      expect(ICFReportService._qualifierToSeverity(2.0).level).toBe(2);
      expect(ICFReportService._qualifierToSeverity(3.0).level).toBe(3);
      expect(ICFReportService._qualifierToSeverity(3.8).level).toBe(4);
    });

    test('_getSeverityLabel — known & unknown', () => {
      expect(ICFReportService._getSeverityLabel('mild', 'ar')).toBe('خفيفة');
      expect(ICFReportService._getSeverityLabel('severe', 'en')).toBe('Severe');
      expect(ICFReportService._getSeverityLabel('unknown_value', 'ar')).toBe('unknown_value');
    });

    test('_calculateOverallTrend — improving', () => {
      const assessments = [
        { overallFunctioningScore: 40, assessmentDate: '2024-01-01' },
        { overallFunctioningScore: 80, assessmentDate: '2024-06-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('improving');
      expect(trend.delta).toBe(40);
    });

    test('_calculateOverallTrend — declining', () => {
      const assessments = [
        { overallFunctioningScore: 80, assessmentDate: '2024-01-01' },
        { overallFunctioningScore: 30, assessmentDate: '2024-06-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('declining');
    });

    test('_calculateOverallTrend — stable', () => {
      const assessments = [
        { overallFunctioningScore: 50, assessmentDate: '2024-01-01' },
        { overallFunctioningScore: 52, assessmentDate: '2024-06-01' },
      ];
      const trend = ICFReportService._calculateOverallTrend(assessments);
      expect(trend.trend).toBe('stable');
    });

    test('_calculateOverallTrend — insufficient data', () => {
      const trend = ICFReportService._calculateOverallTrend([{ overallFunctioningScore: 50 }]);
      expect(trend.trend).toBe('insufficient_data');
    });

    test('_buildPeriodSummary — categorizes domains', () => {
      const assessments = [
        {
          domainScores: [
            { domain: 'bodyFunctions', averageQualifier: 2.5 },
            { domain: 'bodyStructures', averageQualifier: 1.0 },
          ],
        },
        {
          domainScores: [
            { domain: 'bodyFunctions', averageQualifier: 1.8 }, // improved (decreased)
            { domain: 'bodyStructures', averageQualifier: 1.1 }, // stable
          ],
        },
      ];
      const summary = ICFReportService._buildPeriodSummary(assessments);
      expect(summary.improved.length).toBeGreaterThanOrEqual(1);
    });

    test('_buildPeriodSummary — empty assessments', () => {
      expect(ICFReportService._buildPeriodSummary([])).toBeNull();
    });

    test('_calculateDomainTrends — with data', () => {
      const assessments = [
        {
          assessmentDate: '2024-01-01',
          assessmentNumber: '001',
          domainScores: [{ domain: 'bodyFunctions', averageQualifier: 2.5 }],
        },
        {
          assessmentDate: '2024-06-01',
          assessmentNumber: '002',
          domainScores: [{ domain: 'bodyFunctions', averageQualifier: 1.5 }],
        },
      ];
      const trends = ICFReportService._calculateDomainTrends(assessments);
      expect(trends.bodyFunctions.trend).toBe('improving'); // decreased qualifier
    });

    test('_generateTrendRecommendations — decline warning', () => {
      const assessments = [
        {
          domainScores: [{ domain: 'bodyFunctions', averageQualifier: 1.0 }],
        },
        {
          domainScores: [
            { domain: 'bodyFunctions', averageQualifier: 2.0 }, // increased = declined
          ],
        },
      ];
      const recs = ICFReportService._generateTrendRecommendations(assessments);
      expect(recs.some(r => r.type === 'warning')).toBe(true);
    });

    test('_generateTrendRecommendations — insufficient data', () => {
      const recs = ICFReportService._generateTrendRecommendations([{}]);
      expect(recs).toEqual([]);
    });

    test('_buildDomainReports — builds chapters', () => {
      const assessment = {
        bodyFunctions: {
          chapter1_mental: [
            { code: 'b110', title: 'Consciousness', qualifier: 1, notes: '' },
            { code: 'b114', title: 'Orientation', qualifier: 2, notes: '' },
          ],
        },
        domainScores: [{ domain: 'bodyFunctions', averageQualifier: 1.5 }],
      };
      const reports = ICFReportService._buildDomainReports(assessment);
      expect(reports.bodyFunctions).toBeDefined();
      expect(reports.bodyFunctions.chapters).toHaveLength(1);
      expect(reports.bodyFunctions.chapters[0].totalItems).toBe(2);
    });

    test('_buildICFProfile — maps domain scores', () => {
      const assessment = {
        domainScores: [
          {
            domain: 'bodyFunctions',
            averageQualifier: 1.5,
            assessedItems: 10,
            severityDistribution: {},
          },
        ],
      };
      const profile = ICFReportService._buildICFProfile(assessment);
      expect(profile.domains).toHaveLength(1);
      expect(profile.domains[0].barLevel).toBe(2);
    });
  });
});
