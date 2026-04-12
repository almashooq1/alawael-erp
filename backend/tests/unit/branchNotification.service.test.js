/**
 * Unit Tests — BranchNotificationService
 * P#73 - Batch 34
 *
 * Functional exports (not class). Uses BranchPerformanceLog model + in-memory alertCache.
 * Covers: evaluateRules, dispatchAlerts, getRecipients, runAlertScan,
 *         runNetworkAlertScan, generateDailyDigest, clearAlertCache
 */

'use strict';

const mockPerfLogFind = jest.fn();
const mockGetRankingsForDate = jest.fn();

jest.mock('../../models/BranchPerformanceLog', () => ({
  find: (...a) => mockPerfLogFind(...a),
  getRankingsForDate: (...a) => mockGetRankingsForDate(...a),
}));

jest.mock('../../models/BranchAuditLog', () => ({}));

const {
  ALERT_RULES,
  evaluateRules,
  dispatchAlerts,
  runAlertScan,
  runNetworkAlertScan,
  generateDailyDigest,
  clearAlertCache,
} = require('../../services/branchNotification.service');

describe('BranchNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAlertCache();
  });

  /* ================================================================ */
  /*  ALERT_RULES                                                       */
  /* ================================================================ */
  describe('ALERT_RULES', () => {
    it('has 9 rules defined', () => {
      expect(ALERT_RULES).toHaveLength(9);
    });

    it('each rule has required fields', () => {
      for (const rule of ALERT_RULES) {
        expect(rule.id).toBeDefined();
        expect(rule.metric).toBeDefined();
        expect(typeof rule.condition).toBe('function');
        expect(rule.severity).toBeDefined();
        expect(rule.title_ar).toBeDefined();
        expect(typeof rule.message_ar).toBe('function');
      }
    });

    it('session_completion_critical triggers below 60%', () => {
      const rule = ALERT_RULES.find(r => r.id === 'session_completion_critical');
      expect(rule.condition(50)).toBe(true);
      expect(rule.condition(80)).toBe(false);
    });

    it('performance_improvement triggers at 90+', () => {
      const rule = ALERT_RULES.find(r => r.id === 'performance_improvement');
      expect(rule.condition(90)).toBe(true);
      expect(rule.condition(89)).toBe(false);
    });

    it('new_patients_spike triggers at 5+', () => {
      const rule = ALERT_RULES.find(r => r.id === 'new_patients_spike');
      expect(rule.condition(5)).toBe(true);
      expect(rule.condition(4)).toBe(false);
    });
  });

  /* ================================================================ */
  /*  evaluateRules                                                     */
  /* ================================================================ */
  describe('evaluateRules', () => {
    it('returns empty when no rules match', () => {
      const log = {
        branch_code: 'BR-1',
        snapshot_date_str: '2025-06-01',
        sessions: { completion_rate: 95 },
        performance_score: 50,
      };
      const alerts = evaluateRules(log);
      expect(alerts).toEqual([]);
    });

    it('triggers alert when condition met', () => {
      const log = {
        branch_code: 'BR-1',
        snapshot_date_str: '2025-06-01',
        sessions: { completion_rate: 50 },
      };
      const alerts = evaluateRules(log);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].rule_id).toBe('session_completion_critical');
      expect(alerts[0].severity).toBe('critical');
    });

    it('includes branch_code and date in alert', () => {
      const log = {
        branch_code: 'BR-X',
        snapshot_date_str: '2025-06-01',
        performance_score: 95,
      };
      const alerts = evaluateRules(log);
      const perfAlert = alerts.find(a => a.rule_id === 'performance_improvement');
      expect(perfAlert).toBeDefined();
      expect(perfAlert.branch_code).toBe('BR-X');
      expect(perfAlert.date).toBe('2025-06-01');
    });

    it('deduplicates same alert on same day', () => {
      const log = {
        branch_code: 'BR-2',
        snapshot_date_str: '2025-06-01',
        performance_score: 95,
      };
      evaluateRules(log);
      const second = evaluateRules(log);
      expect(second).toEqual([]);
    });

    it('does not dedup different branches', () => {
      const log1 = { branch_code: 'BR-A', snapshot_date_str: '2025-06-01', performance_score: 95 };
      const log2 = { branch_code: 'BR-B', snapshot_date_str: '2025-06-01', performance_score: 95 };
      evaluateRules(log1);
      const alerts2 = evaluateRules(log2);
      expect(alerts2.length).toBeGreaterThan(0);
    });

    it('rounds metric value', () => {
      const log = {
        branch_code: 'BR-R',
        snapshot_date_str: '2025-06-01',
        sessions: { completion_rate: 55.678 },
      };
      const alerts = evaluateRules(log);
      expect(alerts[0].value).toBe(55.68);
    });

    it('includes escalation for rules that have it', () => {
      const rule = ALERT_RULES.find(r => r.escalate_after_min);
      if (rule) {
        const log = { branch_code: 'BR-E', snapshot_date_str: '2025-06-01' };
        // Set the metric to trigger the rule
        const parts = rule.metric.split('.');
        let obj = log;
        for (let i = 0; i < parts.length - 1; i++) {
          obj[parts[i]] = {};
          obj = obj[parts[i]];
        }
        // Choose a value that triggers the condition
        obj[parts[parts.length - 1]] = rule.condition(0) ? 0 : 999;
        const alerts = evaluateRules(log);
        const triggered = alerts.find(a => a.rule_id === rule.id);
        if (triggered) {
          expect(triggered.escalation).toBeDefined();
          expect(triggered.escalation.target_role).toBe(rule.escalation_target);
        }
      }
    });

    it('skips undefined/null metric values', () => {
      const log = { branch_code: 'BR-N', snapshot_date_str: '2025-06-01' };
      const alerts = evaluateRules(log);
      expect(alerts).toEqual([]);
    });

    it('message_ar contains branch code', () => {
      const log = {
        branch_code: 'MYBRANCH',
        snapshot_date_str: '2025-06-01',
        performance_score: 95,
      };
      const alerts = evaluateRules(log);
      const alert = alerts.find(a => a.rule_id === 'performance_improvement');
      expect(alert.message).toContain('MYBRANCH');
    });
  });

  /* ================================================================ */
  /*  dispatchAlerts                                                    */
  /* ================================================================ */
  describe('dispatchAlerts', () => {
    it('returns dispatched array with status and channels', async () => {
      const alerts = [{ severity: 'info', branch_code: 'BR-1', message: 'test', title: 'T' }];
      const res = await dispatchAlerts(alerts);
      expect(res).toHaveLength(1);
      expect(res[0].status).toBe('dispatched');
      expect(res[0].channels).toContain('in_app');
    });

    it('info severity gets branch_manager recipients', async () => {
      const alerts = [{ severity: 'info', branch_code: 'BR-1' }];
      const res = await dispatchAlerts(alerts);
      expect(res[0].recipients.roles).toEqual(['branch_manager']);
    });

    it('critical severity gets all 3 roles', async () => {
      const alerts = [{ severity: 'critical', branch_code: 'BR-1' }];
      const res = await dispatchAlerts(alerts);
      expect(res[0].recipients.roles).toEqual(['hq_super_admin', 'hq_admin', 'branch_manager']);
    });

    it('warning severity gets admin + manager', async () => {
      const alerts = [{ severity: 'warning', branch_code: 'BR-1' }];
      const res = await dispatchAlerts(alerts);
      expect(res[0].recipients.roles).toEqual(['hq_admin', 'branch_manager']);
    });

    it('returns empty for empty input', async () => {
      const res = await dispatchAlerts([]);
      expect(res).toEqual([]);
    });
  });

  /* ================================================================ */
  /*  runAlertScan                                                      */
  /* ================================================================ */
  describe('runAlertScan', () => {
    it('returns 0 alerts when no rules triggered', async () => {
      const log = { branch_code: 'BR-1', snapshot_date_str: '2025-06-01' };
      const res = await runAlertScan('BR-1', log);
      expect(res.branch_code).toBe('BR-1');
      expect(res.alerts_triggered).toBe(0);
      expect(res.alerts).toEqual([]);
    });

    it('returns triggered alerts with counts', async () => {
      const log = {
        branch_code: 'BR-1',
        snapshot_date_str: '2025-06-02',
        sessions: { completion_rate: 50 },
        performance_score: 95,
      };
      const res = await runAlertScan('BR-1', log);
      expect(res.alerts_triggered).toBeGreaterThanOrEqual(2);
      expect(typeof res.warnings).toBe('number');
      expect(typeof res.info).toBe('number');
    });
  });

  /* ================================================================ */
  /*  runNetworkAlertScan                                               */
  /* ================================================================ */
  describe('runNetworkAlertScan', () => {
    it('scans all branches for today', async () => {
      mockPerfLogFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      const res = await runNetworkAlertScan();
      expect(res.branches_scanned).toBe(0);
      expect(res.total_alerts).toBe(0);
    });

    it('aggregates alerts across branches', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockPerfLogFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { branch_code: 'BR-A', snapshot_date_str: today, performance_score: 95 },
          { branch_code: 'BR-B', snapshot_date_str: today, performance_score: 95 },
        ]),
      });
      const res = await runNetworkAlertScan();
      expect(res.branches_scanned).toBe(2);
      expect(res.total_alerts).toBeGreaterThanOrEqual(2);
    });
  });

  /* ================================================================ */
  /*  generateDailyDigest                                               */
  /* ================================================================ */
  describe('generateDailyDigest', () => {
    it('returns digest with network summary', async () => {
      mockGetRankingsForDate.mockResolvedValue([
        {
          branch_code: 'BR-1',
          performance_score: 95,
          performance_grade: 'A+',
          finance: { daily_revenue: 10000 },
          sessions: { completed: 20 },
          patients: { present_today: 15 },
          anomalies: [],
        },
        {
          branch_code: 'BR-2',
          performance_score: 70,
          performance_grade: 'C',
          finance: { daily_revenue: 5000 },
          sessions: { completed: 10 },
          patients: { present_today: 8 },
          anomalies: [],
        },
      ]);

      const res = await generateDailyDigest();
      expect(res.network_summary.total_branches).toBe(2);
      expect(res.network_summary.avg_performance).toBe(83);
      expect(res.network_summary.top_performer).toBe('BR-1');
      expect(res.network_summary.bottom_performer).toBe('BR-2');
      expect(res.network_summary.total_revenue).toBe(15000);
      expect(res.network_summary.total_sessions).toBe(30);
      expect(res.network_summary.total_patients_present).toBe(23);
    });

    it('returns top 5 rankings', async () => {
      const logs = Array.from({ length: 8 }, (_, i) => ({
        branch_code: `BR-${i}`,
        performance_score: 90 - i * 5,
        performance_grade: 'B',
        finance: { daily_revenue: 0 },
        sessions: { completed: 0 },
        patients: { present_today: 0 },
        anomalies: [],
      }));
      mockGetRankingsForDate.mockResolvedValue(logs);

      const res = await generateDailyDigest();
      expect(res.rankings).toHaveLength(5);
      expect(res.rankings[0].rank).toBe(1);
      expect(res.rankings[0].branch).toBe('BR-0');
    });

    it('handles empty logs', async () => {
      mockGetRankingsForDate.mockResolvedValue([]);
      const res = await generateDailyDigest();
      expect(res.network_summary.total_branches).toBe(0);
      expect(res.network_summary.avg_performance).toBe(0);
      expect(res.network_summary.top_performer).toBe('N/A');
    });

    it('lists critical branches with anomalies', async () => {
      mockGetRankingsForDate.mockResolvedValue([
        {
          branch_code: 'BR-BAD',
          performance_score: 40,
          performance_grade: 'F',
          finance: { daily_revenue: 0 },
          sessions: { completed: 0 },
          patients: { present_today: 0 },
          anomalies: [{ type: 'revenue_drop' }],
        },
      ]);

      const res = await generateDailyDigest();
      expect(res.alerts_summary.critical_branches).toContain('BR-BAD');
    });
  });

  /* ================================================================ */
  /*  clearAlertCache                                                   */
  /* ================================================================ */
  describe('clearAlertCache', () => {
    it('allows same alert to fire again after clearing', () => {
      const log = {
        branch_code: 'BR-CLR',
        snapshot_date_str: '2025-06-01',
        performance_score: 95,
      };
      evaluateRules(log);
      clearAlertCache();
      const alerts = evaluateRules(log);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
