/**
 * Unit tests — beneficiary.service.js
 * Static class with 4 model mocks: Beneficiary, BeneficiaryProgress, PortalNotification, Guardian
 */
'use strict';

/* ── mock declarations ──────────────────────────────────────────── */
const mockProgressFindOne = jest.fn();
const mockProgressFind = jest.fn();
const mockProgressAggregate = jest.fn();
const mockBeneficiaryFindById = jest.fn();
const mockNotificationCreateAndSend = jest.fn();

jest.mock('../../models/Beneficiary', () => ({
  findById: (...a) => mockBeneficiaryFindById(...a),
}));

jest.mock('../../models/BeneficiaryProgress', () => ({
  findOne: (...a) => mockProgressFindOne(...a),
  find: (...a) => mockProgressFind(...a),
  aggregate: (...a) => mockProgressAggregate(...a),
}));

jest.mock('../../models/PortalNotification', () => ({
  createAndSend: (...a) => mockNotificationCreateAndSend(...a),
}));

jest.mock('../../models/Guardian', () => ({}));

const BeneficiaryService = require('../../services/beneficiary.service');

beforeEach(() => jest.clearAllMocks());

/* ── helpers ────────────────────────────────────────────────────── */
const mockSortLean = val => ({
  sort: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(val),
  }),
});

/* ================================================================ */
describe('BeneficiaryService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('getPerformanceStatus', () => {
    it('returns pending when no progress', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean(null));
      expect(await BeneficiaryService.getPerformanceStatus('B1')).toBe('pending');
    });

    it('returns excellent for ≥80', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ academicScore: 85 }));
      expect(await BeneficiaryService.getPerformanceStatus('B1')).toBe('excellent');
    });

    it('returns good for 70-79', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ academicScore: 75 }));
      expect(await BeneficiaryService.getPerformanceStatus('B1')).toBe('good');
    });

    it('returns satisfactory for 60-69', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ academicScore: 65 }));
      expect(await BeneficiaryService.getPerformanceStatus('B1')).toBe('satisfactory');
    });

    it('returns needs_improvement for <60', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ academicScore: 50 }));
      expect(await BeneficiaryService.getPerformanceStatus('B1')).toBe('needs_improvement');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateAcademicTrend', () => {
    it('returns insufficient_data with <2 records', async () => {
      mockProgressFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ academicScore: 70 }]),
          }),
        }),
      });
      const res = await BeneficiaryService.calculateAcademicTrend('B1');
      expect(res.trend).toBe('insufficient_data');
    });

    it('returns improving when scores rise', async () => {
      mockProgressFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { academicScore: 60, month: '2025-01' },
              { academicScore: 80, month: '2025-06' },
            ]),
          }),
        }),
      });
      const res = await BeneficiaryService.calculateAcademicTrend('B1');
      expect(res.trend).toBe('improving');
      expect(res.improvement).toBe(20);
      expect(res.firstScore).toBe(60);
      expect(res.lastScore).toBe(80);
    });

    it('returns declining when scores drop', async () => {
      mockProgressFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { academicScore: 90, month: '2025-01' },
              { academicScore: 70, month: '2025-06' },
            ]),
          }),
        }),
      });
      const res = await BeneficiaryService.calculateAcademicTrend('B1');
      expect(res.trend).toBe('declining');
    });

    it('returns stable when scores equal', async () => {
      mockProgressFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { academicScore: 80, month: '2025-01' },
              { academicScore: 80, month: '2025-06' },
            ]),
          }),
        }),
      });
      const res = await BeneficiaryService.calculateAcademicTrend('B1');
      expect(res.trend).toBe('stable');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAttendanceAlerts', () => {
    it('returns empty when no progress', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean(null));
      expect(await BeneficiaryService.getAttendanceAlerts('B1')).toEqual([]);
    });

    it('returns low_attendance alert below 80%', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({ attendanceRate: 70, absenceDays: 3, lateDays: 2 })
      );
      const alerts = await BeneficiaryService.getAttendanceAlerts('B1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('low_attendance');
      expect(alerts[0].severity).toBe('high');
    });

    it('returns excessive_absences alert when >5 days', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ attendanceRate: 90, absenceDays: 7 }));
      const alerts = await BeneficiaryService.getAttendanceAlerts('B1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('excessive_absences');
      expect(alerts[0].severity).toBe('critical');
    });

    it('returns both alerts simultaneously', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({ attendanceRate: 60, absenceDays: 10, lateDays: 5 })
      );
      const alerts = await BeneficiaryService.getAttendanceAlerts('B1');
      expect(alerts).toHaveLength(2);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAcademicAlerts', () => {
    it('low_grades below 60', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          academicScore: 50,
          scoreImprovement: 0,
          activityCompletionRate: 80,
        })
      );
      const alerts = await BeneficiaryService.getAcademicAlerts('B1');
      expect(alerts.some(a => a.type === 'low_grades')).toBe(true);
    });

    it('declining_performance with negative improvement', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          academicScore: 70,
          scoreImprovement: -5,
          activityCompletionRate: 80,
        })
      );
      const alerts = await BeneficiaryService.getAcademicAlerts('B1');
      expect(alerts.some(a => a.type === 'declining_performance')).toBe(true);
    });

    it('low_activity_completion below 70%', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          academicScore: 80,
          scoreImprovement: 5,
          activityCompletionRate: 60,
        })
      );
      const alerts = await BeneficiaryService.getAcademicAlerts('B1');
      expect(alerts.some(a => a.type === 'low_activity_completion')).toBe(true);
    });

    it('returns empty when all good', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          academicScore: 90,
          scoreImprovement: 10,
          activityCompletionRate: 95,
        })
      );
      expect(await BeneficiaryService.getAcademicAlerts('B1')).toHaveLength(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getBehaviorAlerts', () => {
    it('returns poor_behavior when <5', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ behaviorRating: 3 }));
      const alerts = await BeneficiaryService.getBehaviorAlerts('B1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('poor_behavior');
    });

    it('returns empty when ≥5', async () => {
      mockProgressFindOne.mockReturnValue(mockSortLean({ behaviorRating: 8 }));
      expect(await BeneficiaryService.getBehaviorAlerts('B1')).toHaveLength(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getAllAlerts', () => {
    it('returns combined alerts with total', async () => {
      // Setup: low attendance + low grades + poor behavior
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          attendanceRate: 50,
          absenceDays: 8,
          lateDays: 5,
          academicScore: 40,
          scoreImprovement: -10,
          activityCompletionRate: 50,
          behaviorRating: 2,
        })
      );
      const all = await BeneficiaryService.getAllAlerts('B1');
      expect(all.attendance.length).toBeGreaterThan(0);
      expect(all.academic.length).toBeGreaterThan(0);
      expect(all.behavior.length).toBeGreaterThan(0);
      expect(all.total).toBeGreaterThan(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateGradeDistribution', () => {
    it('returns zero counts for no records', async () => {
      mockProgressFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });
      const dist = await BeneficiaryService.calculateGradeDistribution('B1');
      expect(dist.total).toBe(0);
      expect(dist.excellent).toBe(0);
    });

    it('categorizes scores correctly', async () => {
      mockProgressFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([
              { academicScore: 90 },
              { academicScore: 75 },
              { academicScore: 65 },
              { academicScore: 50 },
            ]),
        }),
      });
      const dist = await BeneficiaryService.calculateGradeDistribution('B1');
      expect(dist.excellent).toBe(1);
      expect(dist.good).toBe(1);
      expect(dist.satisfactory).toBe(1);
      expect(dist.needsImprovement).toBe(1);
      expect(dist.total).toBe(4);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getComparativePerformance', () => {
    it('returns null when no progress', async () => {
      mockBeneficiaryFindById.mockResolvedValue({ _id: 'B1' });
      mockProgressFindOne.mockReturnValue(mockSortLean(null));
      expect(await BeneficiaryService.getComparativePerformance('B1')).toBeNull();
    });

    it('returns comparison with class average', async () => {
      mockBeneficiaryFindById.mockResolvedValue({ _id: 'B1' });
      mockProgressFindOne.mockReturnValue(mockSortLean({ academicScore: 85 }));
      mockProgressAggregate.mockResolvedValue([{ avgScore: 70 }]);
      const res = await BeneficiaryService.getComparativePerformance('B1');
      expect(res.beneficiaryScore).toBe(85);
      expect(res.classAverage).toBe(70);
      expect(res.aboveAverage).toBe(true);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getYearSummary', () => {
    it('returns null for no records', async () => {
      mockProgressFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      expect(await BeneficiaryService.getYearSummary('B1', 2025)).toBeNull();
    });

    it('returns aggregated summary', async () => {
      mockProgressFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { academicScore: 60, attendanceRate: 90, absenceDays: 2 },
          { academicScore: 80, attendanceRate: 95, absenceDays: 1 },
        ]),
      });
      const s = await BeneficiaryService.getYearSummary('B1', 2025);
      expect(s.year).toBe(2025);
      expect(s.totalMonths).toBe(2);
      expect(Number(s.averageScore)).toBe(70);
      expect(s.highestScore).toBe(80);
      expect(s.lowestScore).toBe(60);
      expect(s.totalAbsences).toBe(3);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('isStudentAtRisk', () => {
    it('returns atRisk=true when ≥2 risk factors', async () => {
      // low attendance + low grades + poor behavior
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          attendanceRate: 50,
          absenceDays: 10,
          lateDays: 5,
          academicScore: 40,
          scoreImprovement: -10,
          activityCompletionRate: 50,
          behaviorRating: 2,
        })
      );
      const res = await BeneficiaryService.isStudentAtRisk('B1');
      expect(res.atRisk).toBe(true);
      expect(res.riskScore).toBeGreaterThanOrEqual(2);
      expect(res.recommendation).toContain('Immediate');
    });

    it('returns atRisk=false when healthy', async () => {
      mockProgressFindOne.mockReturnValue(
        mockSortLean({
          attendanceRate: 95,
          absenceDays: 1,
          lateDays: 0,
          academicScore: 90,
          scoreImprovement: 5,
          activityCompletionRate: 95,
          behaviorRating: 9,
        })
      );
      const res = await BeneficiaryService.isStudentAtRisk('B1');
      expect(res.atRisk).toBe(false);
      expect(res.riskScore).toBe(0);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('exportProgressData', () => {
    it('returns formatted data', async () => {
      mockBeneficiaryFindById.mockResolvedValue({
        firstName_ar: 'أحمد',
        lastName_ar: 'علي',
        enrollmentDate: '2024-01-01',
        currentLevel: 3,
      });
      mockProgressFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockResolvedValue([
              {
                month: '2025-06',
                academicScore: 85,
                attendanceRate: 95,
                behaviorRating: 8,
                activityCompletionRate: 90,
              },
            ]),
        }),
      });
      const data = await BeneficiaryService.exportProgressData('B1');
      expect(data.beneficiary.name).toBe('أحمد علي');
      expect(data.progressData).toHaveLength(1);
      expect(data.progressData[0].academicScore).toBe(85);
    });
  });
});
