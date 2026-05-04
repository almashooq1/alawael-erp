'use strict';

const { getModuleKPIs, getDashboardKPIs } = require('../../utils/kpiCalculator');

describe('kpiCalculator — getModuleKPIs()', () => {
  test('returns object with moduleKey field matching input', () => {
    const result = getModuleKPIs('hr');
    expect(result.moduleKey).toBe('hr');
  });

  test('returns a timestamp string', () => {
    const result = getModuleKPIs('reports');
    expect(typeof result.timestamp).toBe('string');
    expect(() => new Date(result.timestamp)).not.toThrow();
  });

  test('returns metrics object', () => {
    const result = getModuleKPIs('finance');
    expect(result).toHaveProperty('metrics');
    expect(typeof result.metrics).toBe('object');
  });

  test('metrics includes performance sub-object', () => {
    const result = getModuleKPIs('security');
    expect(result.metrics).toHaveProperty('performance');
    expect(result.metrics.performance).toHaveProperty('responseTime');
    expect(result.metrics.performance).toHaveProperty('successRate');
    expect(result.metrics.performance).toHaveProperty('errorRate');
  });

  test('metrics includes activeUsers and totalRecords', () => {
    const result = getModuleKPIs('rehab');
    expect(typeof result.metrics.activeUsers).toBe('number');
    expect(typeof result.metrics.totalRecords).toBe('number');
    expect(result.metrics.activeUsers).toBeGreaterThanOrEqual(10);
  });

  test('hr module includes totalEmployees', () => {
    const result = getModuleKPIs('hr');
    expect(result.metrics).toHaveProperty('totalEmployees');
    expect(result.metrics.totalEmployees).toBeGreaterThanOrEqual(50);
  });

  test('reports module includes generatedToday and scheduledReports', () => {
    const result = getModuleKPIs('reports');
    expect(result.metrics).toHaveProperty('generatedToday');
    expect(result.metrics).toHaveProperty('scheduledReports');
  });

  test('finance module includes totalTransactions', () => {
    const result = getModuleKPIs('finance');
    expect(result.metrics).toHaveProperty('totalTransactions');
    expect(result.metrics).toHaveProperty('pendingApprovals');
  });

  test('security module includes alerts and blockedAttempts', () => {
    const result = getModuleKPIs('security');
    expect(result.metrics).toHaveProperty('alerts');
    expect(result.metrics).toHaveProperty('blockedAttempts');
  });

  test('elearning module includes activeCourses and completionRate', () => {
    const result = getModuleKPIs('elearning');
    expect(result.metrics).toHaveProperty('activeCourses');
    expect(result.metrics).toHaveProperty('completionRate');
    expect(result.metrics.completionRate).toBeGreaterThanOrEqual(70);
  });

  test('rehab module includes activePatients and completedSessions', () => {
    const result = getModuleKPIs('rehab');
    expect(result.metrics).toHaveProperty('activePatients');
    expect(result.metrics).toHaveProperty('completedSessions');
  });

  test('appeals module includes pendingAppeals and resolvedToday', () => {
    const result = getModuleKPIs('appeals');
    expect(result.metrics).toHaveProperty('pendingAppeals');
    expect(result.metrics).toHaveProperty('resolvedToday');
  });

  test('biometrics module includes activeDevices and authenticationsToday', () => {
    const result = getModuleKPIs('biometrics');
    expect(result.metrics).toHaveProperty('activeDevices');
    expect(result.metrics).toHaveProperty('authenticationsToday');
  });

  test('unknown module returns default KPI structure', () => {
    const result = getModuleKPIs('unknown-module');
    expect(result.moduleKey).toBe('unknown-module');
    expect(result).toHaveProperty('metrics');
    expect(result.metrics).toHaveProperty('activeUsers');
  });

  test('successRate is between 95 and 100', () => {
    const result = getModuleKPIs('hr');
    const sr = result.metrics.performance.successRate;
    expect(sr).toBeGreaterThanOrEqual(95);
    expect(sr).toBeLessThanOrEqual(100);
  });
});

describe('kpiCalculator — getDashboardKPIs()', () => {
  test('returns a timestamp string', () => {
    const result = getDashboardKPIs();
    expect(typeof result.timestamp).toBe('string');
  });

  test('returns summary with totalUsers and activeModules', () => {
    const result = getDashboardKPIs();
    expect(result).toHaveProperty('summary');
    expect(result.summary).toHaveProperty('totalUsers');
    expect(result.summary.activeModules).toBe(8);
    expect(result.summary.uptime).toBe('99.9%');
  });

  test('systemHealth is between 95 and 100', () => {
    const result = getDashboardKPIs();
    expect(result.summary.systemHealth).toBeGreaterThanOrEqual(95);
    expect(result.summary.systemHealth).toBeLessThanOrEqual(100);
  });

  test('modules object contains all 8 expected modules', () => {
    const result = getDashboardKPIs();
    const expectedModules = [
      'reports',
      'finance',
      'hr',
      'security',
      'elearning',
      'rehab',
      'appeals',
      'biometrics',
    ];
    expectedModules.forEach(m => {
      expect(result.modules).toHaveProperty(m);
      expect(result.modules[m].moduleKey).toBe(m);
    });
  });

  test('each module in dashboard has metrics', () => {
    const result = getDashboardKPIs();
    Object.values(result.modules).forEach(mod => {
      expect(mod).toHaveProperty('metrics');
    });
  });
});
