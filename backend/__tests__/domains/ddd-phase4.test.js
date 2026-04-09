/**
 * DDD Phase 4 — Integration Tests
 * اختبارات تكاملية للمرحلة الرابعة
 *
 * Tests: Workflow Automations, Analytics, Export, Scheduler
 */

'use strict';

// ── Workflow Automations ────────────────────────────────────────────────

describe('DDD Workflow Automations', () => {
  let automations;

  beforeAll(() => {
    automations = require('../../integration/dddWorkflowAutomations');
  });

  test('exports all required functions', () => {
    expect(typeof automations.processAutomation).toBe('function');
    expect(typeof automations.initializeDDDAutomations).toBe('function');
    expect(typeof automations.getAutomationLogs).toBe('function');
    expect(typeof automations.evaluateConditions).toBe('function');
    expect(typeof automations.resolveTemplate).toBe('function');
  });

  test('AUTOMATION_RULES has ≥10 enabled rules', () => {
    const enabled = automations.AUTOMATION_RULES.filter(r => r.enabled);
    expect(enabled.length).toBeGreaterThanOrEqual(10);
  });

  test('each rule has required fields', () => {
    for (const rule of automations.AUTOMATION_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.trigger).toBeTruthy();
      expect(rule.trigger.domain).toBeTruthy();
      expect(rule.trigger.event).toBeTruthy();
      expect(Array.isArray(rule.actions)).toBe(true);
      expect(rule.actions.length).toBeGreaterThan(0);
    }
  });

  test('resolveTemplate handles {{now}}', () => {
    const result = automations.resolveTemplate('Time: {{now}}', {});
    expect(result).toMatch(/Time: \d{4}-\d{2}-\d{2}/);
  });

  test('resolveTemplate handles nested paths', () => {
    const ctx = { doc: { beneficiary: 'ABC123', title: 'Test' } };
    const result = automations.resolveTemplate('Ben: {{doc.beneficiary}}', ctx);
    expect(result).toBe('Ben: ABC123');
  });

  test('resolveTemplate handles addDays', () => {
    const result = automations.resolveTemplate('{{addDays(now, 3)}}', {});
    const parsed = new Date(result);
    expect(parsed.getTime()).toBeGreaterThan(Date.now());
  });

  test('evaluateConditions returns true for empty conditions', () => {
    expect(automations.evaluateConditions([], {})).toBe(true);
    expect(automations.evaluateConditions(null, {})).toBe(true);
  });

  test('evaluateConditions checks equals', () => {
    const ctx = { doc: { status: 'completed' } };
    expect(
      automations.evaluateConditions([{ field: 'doc.status', equals: 'completed' }], ctx)
    ).toBe(true);
    expect(automations.evaluateConditions([{ field: 'doc.status', equals: 'pending' }], ctx)).toBe(
      false
    );
  });

  test('evaluateConditions checks in', () => {
    const ctx = { doc: { riskLevel: 'high' } };
    expect(
      automations.evaluateConditions([{ field: 'doc.riskLevel', in: ['high', 'critical'] }], ctx)
    ).toBe(true);
    expect(
      automations.evaluateConditions([{ field: 'doc.riskLevel', in: ['low', 'medium'] }], ctx)
    ).toBe(false);
  });

  test('evaluateConditions checks includes for arrays', () => {
    const ctx = { changes: ['phase', 'status'] };
    expect(automations.evaluateConditions([{ field: 'changes', includes: 'phase' }], ctx)).toBe(
      true
    );
    expect(automations.evaluateConditions([{ field: 'changes', includes: 'priority' }], ctx)).toBe(
      false
    );
  });

  test('AutomationLog model is registered', () => {
    expect(automations.AutomationLog).toBeTruthy();
    expect(automations.AutomationLog.modelName).toBe('AutomationLog');
  });
});

// ── Analytics Pipelines ─────────────────────────────────────────────────

describe('DDD Analytics Pipelines', () => {
  let analytics;

  beforeAll(() => {
    analytics = require('../../domains/_base/ddd-analytics');
  });

  test('exports all pipeline functions', () => {
    expect(typeof analytics.beneficiaryDistribution).toBe('function');
    expect(typeof analytics.beneficiaryTrend).toBe('function');
    expect(typeof analytics.episodePhaseDistribution).toBe('function');
    expect(typeof analytics.episodeAverageDuration).toBe('function');
    expect(typeof analytics.sessionUtilization).toBe('function');
    expect(typeof analytics.sessionTypeDistribution).toBe('function');
    expect(typeof analytics.therapistProductivity).toBe('function');
    expect(typeof analytics.goalAchievementRate).toBe('function');
    expect(typeof analytics.qualityComplianceRate).toBe('function');
    expect(typeof analytics.riskScoreDistribution).toBe('function');
    expect(typeof analytics.behaviorTrend).toBe('function');
    expect(typeof analytics.teleRehabStats).toBe('function');
    expect(typeof analytics.executiveSummary).toBe('function');
  });

  test('exports createAnalyticsRouter', () => {
    expect(typeof analytics.createAnalyticsRouter).toBe('function');
  });

  test('createAnalyticsRouter returns Express router', () => {
    const router = analytics.createAnalyticsRouter();
    expect(router).toBeTruthy();
    expect(typeof router.get).toBe('function');
  });
});

// ── Export Service ───────────────────────────────────────────────────────

describe('DDD Export Service', () => {
  let exportService;

  beforeAll(() => {
    exportService = require('../../services/dddExportService');
  });

  test('exports all required functions', () => {
    expect(typeof exportService.fetchExportData).toBe('function');
    expect(typeof exportService.toCSV).toBe('function');
    expect(typeof exportService.toExcel).toBe('function');
    expect(typeof exportService.toPDF).toBe('function');
    expect(typeof exportService.formatValue).toBe('function');
    expect(typeof exportService.createExportRouter).toBe('function');
  });

  test('EXPORT_COLUMNS has ≥8 model definitions', () => {
    const models = Object.keys(exportService.EXPORT_COLUMNS);
    expect(models.length).toBeGreaterThanOrEqual(8);
  });

  test('each column definition has required fields', () => {
    for (const [model, columns] of Object.entries(exportService.EXPORT_COLUMNS)) {
      expect(Array.isArray(columns)).toBe(true);
      for (const col of columns) {
        expect(col.key).toBeTruthy();
        expect(col.headerAr).toBeTruthy();
        expect(col.headerEn).toBeTruthy();
      }
    }
  });

  test('formatValue handles dates', () => {
    const date = new Date('2026-01-15T10:00:00Z');
    expect(exportService.formatValue(date)).toBe('2026-01-15');
  });

  test('formatValue handles null/undefined', () => {
    expect(exportService.formatValue(null)).toBe('');
    expect(exportService.formatValue(undefined)).toBe('');
  });

  test('formatValue handles strings', () => {
    expect(exportService.formatValue('hello')).toBe('hello');
  });

  test('toCSV generates proper CSV with Arabic BOM', () => {
    const data = [{ firstName: 'أحمد', lastName: 'محمد', mrn: 'MRN001', status: 'active' }];
    const csv = exportService.toCSV(data, 'Beneficiary', 'ar');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('رقم الملف');
    expect(csv).toContain('MRN001');
  });

  test('toCSV English headers', () => {
    const data = [{ firstName: 'Ahmed', lastName: 'Ali' }];
    const csv = exportService.toCSV(data, 'Beneficiary', 'en');
    expect(csv).toContain('First Name');
  });

  test('createExportRouter returns Express router', () => {
    const router = exportService.createExportRouter();
    expect(router).toBeTruthy();
    expect(typeof router.get).toBe('function');
  });
});

// ── Scheduler ───────────────────────────────────────────────────────────

describe('DDD Scheduler', () => {
  let scheduler;

  beforeAll(() => {
    scheduler = require('../../services/dddScheduler');
  });

  test('exports all required functions', () => {
    expect(typeof scheduler.initializeDDDScheduler).toBe('function');
    expect(typeof scheduler.stopDDDScheduler).toBe('function');
    expect(typeof scheduler.getSchedulerStatus).toBe('function');
    expect(typeof scheduler.runJobManually).toBe('function');
  });

  test('JOB_SCHEDULE has ≥6 jobs', () => {
    expect(scheduler.JOB_SCHEDULE.length).toBeGreaterThanOrEqual(6);
  });

  test('each job has name, cron, and fn', () => {
    for (const job of scheduler.JOB_SCHEDULE) {
      expect(job.name).toBeTruthy();
      expect(job.cron).toBeTruthy();
      expect(typeof job.fn).toBe('function');
    }
  });

  test('getSchedulerStatus returns proper structure', () => {
    const status = scheduler.getSchedulerStatus();
    expect(typeof status.active).toBe('boolean');
    expect(Array.isArray(status.jobs)).toBe(true);
    expect(status.jobs.length).toBe(scheduler.JOB_SCHEDULE.length);
  });

  test('individual job functions are exported', () => {
    expect(typeof scheduler.jobKPISnapshots).toBe('function');
    expect(typeof scheduler.jobOverdueTaskAlerts).toBe('function');
    expect(typeof scheduler.jobSessionReminders).toBe('function');
    expect(typeof scheduler.jobEpisodePhaseTimeouts).toBe('function');
    expect(typeof scheduler.jobCleanupResolvedAlerts).toBe('function');
    expect(typeof scheduler.jobCleanupAutomationLogs).toBe('function');
  });
});
