'use strict';

const { RehabKpiService } = require('../rehabilitation-services/RehabKpiService');

describe('RehabKpiService', () => {
  let service;

  beforeEach(() => {
    service = new RehabKpiService();
  });

  describe('constructor', () => {
    it('accepts optional dependencies', () => {
      const planService = { name: 'plan' };
      const sessionService = { name: 'session' };
      const enrollmentService = { name: 'enrollment' };
      const s = new RehabKpiService({ planService, sessionService, enrollmentService });
      expect(s.planService).toBe(planService);
      expect(s.sessionService).toBe(sessionService);
      expect(s.enrollmentService).toBe(enrollmentService);
    });

    it('defaults dependencies to null', () => {
      expect(service.planService).toBeNull();
      expect(service.sessionService).toBeNull();
      expect(service.enrollmentService).toBeNull();
    });
  });

  describe('computeDashboard', () => {
    it('returns expected dashboard shape for empty input', () => {
      const result = service.computeDashboard();
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('attendance');
      expect(result).toHaveProperty('goals');
      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('plans');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('computedAt');
    });

    it('computes overview counts correctly', () => {
      const data = {
        plans: [{ status: 'active' }, { status: 'completed' }, { status: 'active' }],
        sessions: [{ status: 'attended' }, { status: 'attended' }, { status: 'cancelled' }],
        enrollments: [{}, {}],
        goals: [{ status: 'achieved' }, { status: 'in_progress' }, { status: 'pending' }],
        qualityScores: [80, 90, 85],
      };
      const result = service.computeDashboard(data);
      expect(result.overview.totalPlans).toBe(3);
      expect(result.overview.activePlans).toBe(2);
      expect(result.overview.completedPlans).toBe(1);
      expect(result.overview.totalEnrollments).toBe(2);
      expect(result.overview.attendanceRate).toBe(67);
      expect(result.overview.goalAchievementRate).toBe(33);
      expect(result.overview.qualityScore).toBe(85);
    });

    it('returns zero rates when no sessions or goals exist', () => {
      const result = service.computeDashboard({ plans: [], sessions: [], goals: [] });
      expect(result.overview.attendanceRate).toBe(0);
      expect(result.overview.goalAchievementRate).toBe(0);
      expect(result.overview.qualityScore).toBe(0);
    });

    it('returns 100 attendance rate when all sessions attended', () => {
      const result = service.computeDashboard({
        sessions: [{ status: 'attended' }, { status: 'attended' }],
      });
      expect(result.attendance.rate).toBe(100);
    });

    it('groups sessions by status', () => {
      const result = service.computeDashboard({
        sessions: [
          { status: 'attended' },
          { status: 'attended' },
          { status: 'cancelled' },
          { status: 'no_show' },
        ],
      });
      expect(result.sessions.byStatus).toEqual({
        attended: 2,
        cancelled: 1,
        no_show: 1,
      });
    });

    it('groups plans by status', () => {
      const result = service.computeDashboard({
        plans: [
          { status: 'draft' },
          { status: 'active' },
          { status: 'active' },
          { status: 'completed' },
        ],
      });
      expect(result.plans.byStatus).toEqual({ draft: 1, active: 2, completed: 1 });
    });

    it('groups goals by status', () => {
      const result = service.computeDashboard({
        goals: [
          { status: 'achieved' },
          { status: 'achieved' },
          { status: 'in_progress' },
          { status: 'pending' },
        ],
      });
      expect(result.goals.achieved).toBe(2);
      expect(result.goals.inProgress).toBe(1);
      expect(result.goals.pending).toBe(1);
    });

    it('carries through period and computedAt', () => {
      const period = { start: '2024-01-01', end: '2024-01-31' };
      const result = service.computeDashboard({ period });
      expect(result.period).toEqual(period);
      expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
    });

    it('handles string quality scores safely', () => {
      const result = service.computeDashboard({ qualityScores: ['80', '90'] });
      expect(result.quality.average).toBe(85);
    });

    it('preserves qualityScores array in quality section', () => {
      const result = service.computeDashboard({ qualityScores: [70, 80, 90] });
      expect(result.quality.scores).toEqual([70, 80, 90]);
      expect(result.quality.count).toBe(3);
    });
  });

  describe('computeTrend', () => {
    it('returns flat trend for empty history', () => {
      expect(service.computeTrend([])).toEqual({
        direction: 'flat',
        changePercent: 0,
        first: null,
        last: null,
        count: 0,
      });
    });

    it('computes upward trend', () => {
      const result = service.computeTrend([10, 15, 20]);
      expect(result.direction).toBe('up');
      expect(result.changePercent).toBe(100);
      expect(result.first).toBe(10);
      expect(result.last).toBe(20);
      expect(result.count).toBe(3);
    });

    it('computes downward trend', () => {
      const result = service.computeTrend([50, 40, 30]);
      expect(result.direction).toBe('down');
      expect(result.changePercent).toBe(-40);
    });

    it('returns flat trend when values unchanged', () => {
      const result = service.computeTrend([5, 5, 5]);
      expect(result.direction).toBe('flat');
      expect(result.changePercent).toBe(0);
    });

    it('computes trend from objects with value property', () => {
      const result = service.computeTrend([{ value: 100 }, { value: 120 }]);
      expect(result.direction).toBe('up');
      expect(result.changePercent).toBe(20);
    });

    it('handles single-point history', () => {
      const result = service.computeTrend([42]);
      expect(result.direction).toBe('flat');
      expect(result.changePercent).toBe(0);
      expect(result.count).toBe(1);
    });

    it('treats zero-to-nonzero as 100% improvement', () => {
      const result = service.computeTrend([0, 15]);
      expect(result.changePercent).toBe(100);
    });
  });

  describe('benchmark', () => {
    it('returns overall 0 when no targets provided', () => {
      const result = service.benchmark([{ name: 'attendance', value: 80 }]);
      expect(result.overall).toBe(0);
      expect(result.belowTargetCount).toBe(0);
    });

    it('flags metrics below target', () => {
      const result = service.benchmark(
        [
          { name: 'attendance', value: 75 },
          { name: 'goals', value: 90 },
        ],
        { attendance: 80, goals: 85 }
      );
      expect(result.metrics[0].belowTarget).toBe(true);
      expect(result.metrics[0].gap).toBe(5);
      expect(result.metrics[1].belowTarget).toBe(false);
      expect(result.metrics[1].gap).toBe(-5);
      expect(result.belowTargetCount).toBe(1);
      expect(result.overall).toBe(50);
    });

    it('achieves 100 overall when all targets met', () => {
      const result = service.benchmark(
        [
          { name: 'a', value: 100 },
          { name: 'b', value: 90 },
        ],
        { a: 100, b: 80 }
      );
      expect(result.belowTargetCount).toBe(0);
      expect(result.overall).toBe(100);
    });

    it('ignores metrics without targets', () => {
      const result = service.benchmark(
        [
          { name: 'tracked', value: 70 },
          { name: 'untracked', value: 30 },
        ],
        { tracked: 80 }
      );
      expect(result.metrics[1].target).toBeUndefined();
      expect(result.metrics[1].belowTarget).toBe(false);
      expect(result.overall).toBe(0);
    });

    it('handles null targets', () => {
      const result = service.benchmark([{ name: 'x', value: 50 }], { x: null });
      expect(result.metrics[0].target).toBeNull();
      expect(result.metrics[0].belowTarget).toBe(false);
      expect(result.overall).toBe(0);
    });
  });
});
