'use strict';

/* ─── Model mocks ──────────────────────────────────────────────────────────── */
const mockGetRecentLogs = jest.fn();
const mockGetRankingsForDate = jest.fn();
const mockGetNetworkAggregates = jest.fn();
const mockPerfLogFind = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('../../models/BranchPerformanceLog', () => ({
  getRecentLogs: (...a) => mockGetRecentLogs(...a),
  getRankingsForDate: (...a) => mockGetRankingsForDate(...a),
  getNetworkAggregates: (...a) => mockGetNetworkAggregates(...a),
  find: (...a) => mockPerfLogFind(...a),
  findOneAndUpdate: (...a) => mockFindOneAndUpdate(...a),
}));

const mockGetMonthlyTargets = jest.fn();
jest.mock('../../models/BranchTarget', () => ({
  getMonthlyTargets: (...a) => mockGetMonthlyTargets(...a),
}));

jest.mock('../../models/BranchAuditLog', () => ({}));

const svc = require('../../services/branchAnalytics.service');

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('branchAnalytics.service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ─── linearRegression ─────────────────────────────────────────────────── */
  describe('linearRegression', () => {
    test('single point returns slope=0 and intercept=y', () => {
      const r = svc.linearRegression([{ x: 0, y: 5 }]);
      expect(r.slope).toBe(0);
      expect(r.intercept).toBe(5);
      expect(r.r2).toBe(0);
    });

    test('perfect linear fit y=2x', () => {
      const pts = [
        { x: 0, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ];
      const r = svc.linearRegression(pts);
      expect(r.slope).toBe(2);
      expect(r.intercept).toBe(0);
      expect(r.r2).toBeCloseTo(1, 5);
    });

    test('empty array returns zeros', () => {
      const r = svc.linearRegression([]);
      expect(r.slope).toBe(0);
      expect(r.intercept).toBe(0);
    });

    test('two points returns exact line y=2x+1', () => {
      const r = svc.linearRegression([
        { x: 0, y: 1 },
        { x: 2, y: 5 },
      ]);
      expect(r.slope).toBe(2);
      expect(r.intercept).toBe(1);
      expect(r.r2).toBeCloseTo(1, 5);
    });

    test('constant y gives slope=0 r2=1', () => {
      const pts = [
        { x: 0, y: 3 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
      ];
      const r = svc.linearRegression(pts);
      expect(r.slope).toBe(0);
      expect(r.r2).toBe(1);
    });
  });

  /* ─── getGrade ─────────────────────────────────────────────────────────── */
  describe('getGrade', () => {
    test('A+ for score >= 95', () => expect(svc.getGrade(100)).toBe('A+'));
    test('A  for 88-94', () => expect(svc.getGrade(90)).toBe('A'));
    test('B+ for 80-87', () => expect(svc.getGrade(80)).toBe('B+'));
    test('B  for 70-79', () => expect(svc.getGrade(70)).toBe('B'));
    test('C  for 60-69', () => expect(svc.getGrade(65)).toBe('C'));
    test('D  for 50-59', () => expect(svc.getGrade(55)).toBe('D'));
    test('F  for < 50', () => expect(svc.getGrade(30)).toBe('F'));
  });

  /* ─── computePerformanceScore ──────────────────────────────────────────── */
  describe('computePerformanceScore', () => {
    test('returns 0 for empty log', () => {
      expect(svc.computePerformanceScore({})).toBe(0);
    });

    test('returns 100 for perfect scores', () => {
      const log = {
        sessions: { completion_rate: 100 },
        patients: { attendance_rate: 100 },
        target_achievement: { revenue_pct: 100 },
        quality: { satisfaction_score: 5 },
        staff: { staff_utilization_rate: 100 },
        transport: { on_time_rate: 100 },
      };
      expect(svc.computePerformanceScore(log)).toBe(100);
    });

    test('caps individual KPIs at their maximum', () => {
      const log = {
        sessions: { completion_rate: 200 },
        patients: { attendance_rate: 200 },
        target_achievement: { revenue_pct: 200 },
        quality: { satisfaction_score: 5 },
        staff: { staff_utilization_rate: 200 },
        transport: { on_time_rate: 200 },
      };
      const score = svc.computePerformanceScore(log);
      // revenue caps at 120, others at 100 (except quality uncapped from formula)
      expect(score).toBeGreaterThan(100);
    });
  });

  /* ─── analyzeTrends ────────────────────────────────────────────────────── */
  describe('analyzeTrends', () => {
    test('returns insufficient_data when < 2 logs', async () => {
      mockGetRecentLogs.mockResolvedValue([]);
      const result = await svc.analyzeTrends('BR01', 30);
      expect(result.insufficient_data).toBe(true);
    });

    test('returns trends for multiple logs', async () => {
      const logs = [
        {
          finance: { daily_revenue: 100 },
          sessions: { completed: 10, completion_rate: 80 },
          patients: { attendance_rate: 85 },
          quality: { satisfaction_score: 4 },
          staff: { staff_utilization_rate: 70 },
          performance_score: 75,
          snapshot_date_str: '2025-01-01',
        },
        {
          finance: { daily_revenue: 120 },
          sessions: { completed: 12, completion_rate: 85 },
          patients: { attendance_rate: 88 },
          quality: { satisfaction_score: 4.2 },
          staff: { staff_utilization_rate: 75 },
          performance_score: 80,
          snapshot_date_str: '2025-01-02',
        },
        {
          finance: { daily_revenue: 130 },
          sessions: { completed: 14, completion_rate: 90 },
          patients: { attendance_rate: 90 },
          quality: { satisfaction_score: 4.5 },
          staff: { staff_utilization_rate: 80 },
          performance_score: 85,
          snapshot_date_str: '2025-01-03',
        },
      ];
      mockGetRecentLogs.mockResolvedValue(logs);

      const result = await svc.analyzeTrends('BR01', 30);
      expect(result.branch_code).toBe('BR01');
      expect(result.period_days).toBe(30);
      expect(result.data_points).toBe(3);
      expect(result.trends.revenue).toBeDefined();
      expect(result.trends.revenue.direction).toBe('up');
      expect(result.trends.attendance_rate).toBeDefined();
    });
  });

  /* ─── forecastMetric ───────────────────────────────────────────────────── */
  describe('forecastMetric', () => {
    test('returns error for unknown metric', async () => {
      mockGetRecentLogs.mockResolvedValue([]);
      const result = await svc.forecastMetric('BR01', 'nonexistent');
      expect(result.error).toContain('Unknown metric');
    });

    test('returns forecast values for revenue with upward trend', async () => {
      const logs = Array.from({ length: 10 }, (_, i) => ({
        finance: { daily_revenue: 100 + i * 10 },
      }));
      mockGetRecentLogs.mockResolvedValue(logs);

      const result = await svc.forecastMetric('BR01', 'revenue', 3, 10);
      expect(result.branch_code).toBe('BR01');
      expect(result.metric).toBe('revenue');
      expect(result.forecast).toHaveLength(3);
      expect(result.model).toBeDefined();
      expect(result.model.slope).toBeGreaterThan(0);
      expect(result.monthly_projection).toBeDefined();
    });
  });

  /* ─── detectAnomalies ──────────────────────────────────────────────────── */
  describe('detectAnomalies', () => {
    test('returns insufficient_data when < 5 logs', async () => {
      mockGetRecentLogs.mockResolvedValue([{}, {}, {}]);
      const result = await svc.detectAnomalies('BR01');
      expect(result.insufficient_data).toBe(true);
    });

    test('detects anomaly when current value strongly deviates', async () => {
      // Add slight variance so std > 0 (needed for z-score computation)
      const history = Array.from({ length: 9 }, (_, i) => ({
        sessions: { completion_rate: 88 + (i % 3) },
        patients: { attendance_rate: 84 + (i % 3) },
        finance: { daily_revenue: 950 + i * 10 },
        quality: { satisfaction_score: 4.0 + i * 0.05, incidents_today: 0 },
        transport: { on_time_rate: 93 + (i % 3) },
        snapshot_date_str: `2025-01-0${i + 1}`,
      }));
      // last entry with extreme drop in sessions
      history.push({
        sessions: { completion_rate: 20 },
        patients: { attendance_rate: 85 },
        finance: { daily_revenue: 1000 },
        quality: { satisfaction_score: 4.2, incidents_today: 0 },
        transport: { on_time_rate: 95 },
        snapshot_date_str: '2025-01-10',
      });
      mockGetRecentLogs.mockResolvedValue(history);

      const result = await svc.detectAnomalies('BR01');
      expect(result.anomalies_count).toBeGreaterThan(0);
    });

    test('returns no anomalies for consistent data', async () => {
      const log = () => ({
        sessions: { completion_rate: 90 },
        patients: { attendance_rate: 85 },
        finance: { daily_revenue: 1000 },
        quality: { satisfaction_score: 4.2, incidents_today: 0 },
        transport: { on_time_rate: 95 },
        snapshot_date_str: '2025-01-01',
      });
      mockGetRecentLogs.mockResolvedValue(Array.from({ length: 10 }, log));

      const result = await svc.detectAnomalies('BR01');
      expect(result.anomalies_count).toBe(0);
    });
  });

  /* ─── getBranchRankings ────────────────────────────────────────────────── */
  describe('getBranchRankings', () => {
    test('returns ranked branches', async () => {
      mockGetRankingsForDate.mockResolvedValue([
        {
          branch_code: 'BR01',
          performance_score: 95,
          performance_grade: 'A+',
          sessions: { completed: 20 },
          patients: { attendance_rate: 90 },
          finance: { daily_revenue: 5000 },
          quality: { satisfaction_score: 4.5 },
          anomalies: [],
        },
        {
          branch_code: 'BR02',
          performance_score: 80,
          performance_grade: 'B+',
          sessions: { completed: 15 },
          patients: { attendance_rate: 85 },
          finance: { daily_revenue: 3000 },
          quality: { satisfaction_score: 4 },
          anomalies: [{}],
        },
      ]);

      const rankings = await svc.getBranchRankings('2025-01-01');
      expect(rankings).toHaveLength(2);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].branch_code).toBe('BR01');
      expect(rankings[1].rank).toBe(2);
      expect(rankings[1].anomalies_count).toBe(1);
    });

    test('returns empty for no data', async () => {
      mockGetRankingsForDate.mockResolvedValue([]);
      expect(await svc.getBranchRankings('2025-01-01')).toHaveLength(0);
    });
  });

  /* ─── getNetworkIntelligence ───────────────────────────────────────────── */
  describe('getNetworkIntelligence', () => {
    test('returns network intelligence with trends', async () => {
      mockGetNetworkAggregates.mockResolvedValue([
        { total_revenue: 10000, total_sessions: 50 },
        { total_revenue: 11000, total_sessions: 55 },
        { total_revenue: 12000, total_sessions: 60 },
      ]);
      const mockLean = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSort = jest.fn().mockReturnValue({ limit: mockLimit });
      mockPerfLogFind.mockReturnValue({ sort: mockSort });

      const result = await svc.getNetworkIntelligence(30);
      expect(result.period_days).toBe(30);
      expect(result.network_trends.revenue).toBeDefined();
      expect(result.network_trends.revenue.direction).toBe('up');
      expect(result.network_trends.sessions).toBeDefined();
      expect(result.daily_aggregates).toBeDefined();
      expect(result.recent_anomalies).toBeDefined();
    });
  });

  /* ─── generateRecommendations ──────────────────────────────────────────── */
  describe('generateRecommendations', () => {
    test('returns empty when no logs', async () => {
      mockGetRecentLogs.mockResolvedValue([]);
      mockGetMonthlyTargets.mockResolvedValue(null);
      const result = await svc.generateRecommendations('BR01');
      expect(result.recommendations).toHaveLength(0);
    });

    test('generates low session completion recommendation', async () => {
      mockGetRecentLogs.mockResolvedValue([
        {
          sessions: { completion_rate: 70 },
          patients: { attendance_rate: 90, absent_today: 2 },
          quality: { satisfaction_score: 4.5, incidents_today: 0 },
          staff: { staff_utilization_rate: 80 },
          target_achievement: { revenue_pct: 90 },
          performance_score: 75,
        },
      ]);
      mockGetMonthlyTargets.mockResolvedValue(null);

      const result = await svc.generateRecommendations('BR01');
      const sessionRec = result.recommendations.find(r => r.category === 'sessions');
      expect(sessionRec).toBeDefined();
      expect(sessionRec.priority).toBe('high');
    });

    test('generates low attendance recommendation', async () => {
      mockGetRecentLogs.mockResolvedValue([
        {
          sessions: { completion_rate: 95 },
          patients: { attendance_rate: 60, absent_today: 8 },
          quality: { satisfaction_score: 4.5, incidents_today: 0 },
          staff: { staff_utilization_rate: 80 },
          target_achievement: { revenue_pct: 90 },
          performance_score: 75,
        },
      ]);
      mockGetMonthlyTargets.mockResolvedValue(null);

      const result = await svc.generateRecommendations('BR01');
      const attRec = result.recommendations.find(r => r.category === 'attendance');
      expect(attRec).toBeDefined();
    });

    test('generates high incidents (critical) recommendation', async () => {
      mockGetRecentLogs.mockResolvedValue([
        {
          sessions: { completion_rate: 95 },
          patients: { attendance_rate: 90, absent_today: 1 },
          quality: { satisfaction_score: 4.5, incidents_today: 5 },
          staff: { staff_utilization_rate: 80 },
          target_achievement: { revenue_pct: 90 },
          performance_score: 75,
        },
      ]);
      mockGetMonthlyTargets.mockResolvedValue(null);

      const result = await svc.generateRecommendations('BR01');
      const safetyRec = result.recommendations.find(r => r.category === 'safety');
      expect(safetyRec).toBeDefined();
      expect(safetyRec.priority).toBe('critical');
    });

    test('generates revenue below target recommendation', async () => {
      mockGetRecentLogs.mockResolvedValue([
        {
          sessions: { completion_rate: 90 },
          patients: { attendance_rate: 90, absent_today: 1 },
          quality: { satisfaction_score: 4.5, incidents_today: 0 },
          staff: { staff_utilization_rate: 80 },
          target_achievement: { revenue_pct: 50 },
          performance_score: 60,
        },
      ]);
      mockGetMonthlyTargets.mockResolvedValue({
        kpis: [{ metric: 'monthly_revenue', target_value: 100000 }],
      });

      const result = await svc.generateRecommendations('BR01');
      const finRec = result.recommendations.find(r => r.category === 'finance');
      expect(finRec).toBeDefined();
    });

    test('generates multiple recommendations for poor metrics', async () => {
      mockGetRecentLogs.mockResolvedValue([
        {
          sessions: { completion_rate: 50 },
          patients: { attendance_rate: 50, absent_today: 15 },
          quality: { satisfaction_score: 3.0, incidents_today: 5 },
          staff: { staff_utilization_rate: 40 },
          target_achievement: { revenue_pct: 40 },
          performance_score: 30,
        },
      ]);
      mockGetMonthlyTargets.mockResolvedValue({
        kpis: [{ metric: 'monthly_revenue', target_value: 100000 }],
      });

      const result = await svc.generateRecommendations('BR01');
      expect(result.recommendations.length).toBeGreaterThan(1);
      const cats = result.recommendations.map(r => r.category);
      expect(cats).toEqual(expect.arrayContaining(['sessions', 'attendance']));
    });
  });

  /* ─── buildDailySnapshot ───────────────────────────────────────────────── */
  describe('buildDailySnapshot', () => {
    test('creates snapshot with targets and computes scores', async () => {
      mockGetMonthlyTargets.mockResolvedValue({
        kpis: [
          { metric: 'monthly_revenue', target_value: 100000 },
          { metric: 'sessions_count', target_value: 500 },
          { metric: 'attendance_rate', target_value: 90 },
        ],
      });
      // detectAnomalies internal call — insufficient data
      mockGetRecentLogs.mockResolvedValue([]);
      mockFindOneAndUpdate.mockImplementation((_f, upd) => Promise.resolve(upd.$set));

      const result = await svc.buildDailySnapshot('BR01', {
        sessions: { completed: 20, completion_rate: 85 },
        patients: { attendance_rate: 88 },
        finance: { daily_revenue: 3000, mtd_revenue: 50000 },
      });

      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      const setArg = mockFindOneAndUpdate.mock.calls[0][1].$set;
      expect(setArg.branch_code).toBe('BR01');
      expect(setArg.performance_score).toBeDefined();
      expect(setArg.performance_grade).toBeDefined();
      expect(setArg.target_achievement).toBeDefined();
      expect(setArg.target_achievement.revenue_pct).toBeGreaterThan(0);
    });

    test('creates snapshot without targets (all zeros)', async () => {
      mockGetMonthlyTargets.mockResolvedValue(null);
      mockGetRecentLogs.mockResolvedValue([]);
      mockFindOneAndUpdate.mockImplementation((_f, upd) => Promise.resolve(upd.$set));

      await svc.buildDailySnapshot('BR01');
      const setArg = mockFindOneAndUpdate.mock.calls[0][1].$set;
      expect(setArg.target_achievement).toEqual({
        revenue_pct: 0,
        sessions_pct: 0,
        attendance_pct: 0,
        overall_pct: 0,
      });
    });
  });
});
