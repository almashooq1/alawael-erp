'use strict';

const {
  RehabilitationMetricsService,
  ScoringEngine,
} = require('../rehabilitation-services/rehabilitation-metrics-service');

describe('RehabilitationMetricsService — behavioral', () => {
  let service;

  beforeEach(() => {
    service = new RehabilitationMetricsService();
  });

  describe('metric lookup and validation', () => {
    it('finds FMS metric by id', () => {
      const metric = service._findMetric('FMS-2024');
      expect(metric).toBeDefined();
      expect(metric.nameEn).toBe('Finley Motor Scale');
    });

    it('finds ADL metric by id', () => {
      const metric = service._findMetric('ADL-2024');
      expect(metric).toBeDefined();
      expect(metric.nameEn).toBe('Activities of Daily Living Scale');
    });

    it('returns null for unknown metric id', () => {
      expect(service._findMetric('UNKNOWN')).toBeNull();
    });

    it('validates age appropriateness', () => {
      const metric = service._findMetric('FMS-2024');
      expect(service._isAgeAppropriate(metric, 10)).toBe(true);
      expect(service._isAgeAppropriate(metric, 25)).toBe(false);
    });

    it('rejects metric when beneficiary age is out of range', async () => {
      await expect(service.administerMetric('FMS-2024', { age: 25 }, {})).rejects.toThrow(
        'المقياس غير مناسب للفئة العمرية'
      );
    });

    it('throws when metric id does not exist', async () => {
      await expect(service.administerMetric('NOPE', { age: 10 }, {})).rejects.toThrow('غير موجود');
    });

    it('lists available metrics', () => {
      const metrics = service.getAvailableMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('lists metrics by category', () => {
      const metrics = service.getAvailableMetrics('dailyLiving');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('raw score calculation', () => {
    it('calculates domain scores from items', () => {
      const metric = service._findMetric('FMS-2024');
      const responses = {
        'التحكم في الرأس': 1,
        الجلوس: 1,
        الحبو: 1,
        الوقوف: 1,
        المشي: 1,
        الجري: 1,
        القفز: 1,
        'صعود الدرج': 1,
      };
      const scores = service._calculateRawScores(metric, responses);
      expect(scores.grossMotor.raw).toBe(8);
    });

    it('calculates domain scores from subdomains', () => {
      const metric = service._findMetric('CS-2024');
      const responses = {
        'فهم التعليمات البسيطة': 5,
        'فهم التعليمات المعقدة': 4,
        'فهم الأسئلة': 4,
        'فهم القصص': 3,
        'فهم المفاهيم المجردة': 2,
      };
      const scores = service._calculateRawScores(metric, responses);
      expect(scores.receptive.raw).toBe(18);
    });

    it('calculates scores from activities in domains', () => {
      const metric = {
        domains: {
          basicADL: {
            activities: [{ name: 'تناول الطعام' }, { name: 'الاستحمام' }],
            maxScore: 20,
          },
        },
      };
      const scores = service._calculateRawScores(metric, { 'تناول الطعام': 5, الاستحمام: 4 });
      expect(scores.basicADL.raw).toBe(9);
    });

    it('calculates scores from competencies', () => {
      const metric = {
        domains: {
          communication: {
            competencies: ['receptive', 'expressive', 'pragmatic'],
            maxScore: 30,
          },
        },
      };
      const scores = service._calculateRawScores(metric, {
        receptive: 8,
        expressive: 7,
        pragmatic: 9,
      });
      expect(scores.communication.raw).toBe(24);
    });

    it('calculates scores from skills map', () => {
      const metric = {
        domains: {
          social: {
            skills: {
              eyeContact: { name: 'eye_contact' },
              sharing: { name: 'sharing' },
            },
            maxScore: 20,
          },
        },
      };
      const scores = service._calculateRawScores(metric, { eye_contact: 4, sharing: 3 });
      expect(scores.social.raw).toBe(7);
    });

    it('returns empty scores when no domains exist', () => {
      const scores = service._calculateRawScores({}, { a: 1 });
      expect(Object.keys(scores)).toHaveLength(0);
    });
  });

  describe('standardization and interpretation', () => {
    it('standardizes raw scores into T-scores and percentages', () => {
      const rawScores = { grossMotor: { raw: 40, maxPossible: 72 } };
      const standardized = service._standardizeScores(rawScores, 8, 'saudi');
      expect(standardized.grossMotor.percentage).toBeCloseTo((40 / 72) * 100, 1);
      expect(standardized.grossMotor.tScore).toBeDefined();
    });

    it('uses international norms for non-saudi region', () => {
      const rawScores = { grossMotor: { raw: 36, maxPossible: 72 } };
      const standardized = service._standardizeScores(rawScores, 8, 'international');
      expect(standardized.grossMotor.zScore).toBeDefined();
    });

    it('interprets scores using metric thresholds', () => {
      const metric = service._findMetric('FMS-2024');
      const standardized = {
        grossMotor: { percentage: 80 },
      };
      const interpretation = service._interpretScores(metric, standardized);
      expect(interpretation.grossMotor.level).toBe('طبيعي');
    });

    it('falls back to default interpretation when metric has none', () => {
      const standardized = {
        custom: { percentage: 45 },
      };
      const interpretation = service._interpretScores({}, standardized);
      expect(interpretation.custom.level).toBe('أقل من المتوسط');
    });
  });

  describe('full administration', () => {
    it('administers FMS and returns raw, standardized, and interpretation', async () => {
      const responses = {
        'التحكم في الرأس': 1,
        الجلوس: 1,
        الحبو: 1,
        الوقوف: 1,
        المشي: 1,
        الجري: 1,
        القفز: 1,
        'صعود الدرج': 1,
      };
      const report = await service.administerMetric('FMS-2024', { age: 10 }, responses);
      expect(report.rawScores).toBeDefined();
      expect(report.standardizedScores).toBeDefined();
      expect(report.interpretation).toBeDefined();
      expect(report.metricId).toBe('FMS-2024');
    });

    it('administers communication scale and returns domain scores', async () => {
      const responses = {
        'فهم التعليمات البسيطة': 5,
        'فهم التعليمات المعقدة': 4,
        'فهم الأسئلة': 4,
        'فهم القصص': 3,
        'فهم المفاهيم المجردة': 2,
      };
      const report = await service.administerMetric('CS-2024', { age: 12 }, responses);
      expect(report.rawScores.receptive).toBeDefined();
    });

    it('returns percentiles map', () => {
      const standardized = { grossMotor: { zScore: 0 } };
      const percentiles = service._calculatePercentile(standardized, 8);
      expect(percentiles.grossMotor).toBe(50);
    });

    it('returns a z-score percentile near 50 for z=0', () => {
      expect(service._zToPercentile(0)).toBe(50);
    });
  });

  describe('profiles and comparisons', () => {
    it('creates an assessment profile for a beneficiary', () => {
      const profile = service.createAssessmentProfile('B-001', [
        {
          id: 'A1',
          metricId: 'FMS-2024',
          date: new Date(),
          standardizedScores: { grossMotor: { percentage: 60, tScore: 50 } },
          recommendations: [],
        },
      ]);
      expect(profile.beneficiaryId).toBe('B-001');
      expect(profile.strengths).toBeDefined();
      expect(profile.needs).toBeDefined();
    });

    it('compares two assessments', () => {
      const comparison = service.compareAssessments(
        {
          id: 'A1',
          date: new Date('2024-01-01'),
          metricId: 'FMS-2024',
          standardizedScores: { grossMotor: { percentage: 30 } },
        },
        {
          id: 'A2',
          date: new Date('2024-02-01'),
          metricId: 'FMS-2024',
          standardizedScores: { grossMotor: { percentage: 50 } },
        }
      );
      expect(comparison.firstAssessment.id).toBe('A1');
      expect(comparison.secondAssessment.id).toBe('A2');
      expect(comparison.domainComparisons.grossMotor.change).toBe(20);
      expect(comparison.overallProgress.direction).toBe('positive');
    });
  });

  describe('scoring engine', () => {
    it('ScoringEngine calculates sum method', () => {
      const engine = new ScoringEngine();
      const result = engine.calculate('sum', { a: 1, b: 2, c: 3 }, ['a', 'b', 'c']);
      expect(result).toBe(6);
    });

    it('ScoringEngine calculates average method', () => {
      const engine = new ScoringEngine();
      const result = engine.calculate('average', { a: 10, b: 20 }, ['a', 'b']);
      expect(result).toBe(15);
    });

    it('ScoringEngine defaults to sum for unknown method', () => {
      const engine = new ScoringEngine();
      const result = engine.calculate('unknown', { a: 1, b: 2 }, ['a', 'b']);
      expect(result).toBe(3);
    });
  });
});
