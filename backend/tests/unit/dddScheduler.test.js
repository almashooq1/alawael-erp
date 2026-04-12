'use strict';

// No model file to mock

const svc = require('../../services/dddScheduler');

describe('dddScheduler service', () => {
  test('JOB_SCHEDULE is an array', () => { expect(Array.isArray(svc.JOB_SCHEDULE)).toBe(true); });
  test('jobKPISnapshots runs without crash', async () => {
    await svc.jobKPISnapshots(); // returns undefined if models missing — OK
  });
  test('jobOverdueTaskAlerts runs without crash', async () => {
    await svc.jobOverdueTaskAlerts();
  });
  test('jobSessionReminders runs without crash', async () => {
    await svc.jobSessionReminders();
  });
  test('jobEpisodePhaseTimeouts runs without crash', async () => {
    await svc.jobEpisodePhaseTimeouts();
  });
  test('jobCleanupResolvedAlerts runs without crash', async () => {
    await svc.jobCleanupResolvedAlerts();
  });
  test('jobCleanupAutomationLogs runs without crash', async () => {
    await svc.jobCleanupAutomationLogs();
  });
  test('runJobManually is callable', () => {
    expect(typeof svc.runJobManually).toBe('function');
  });
  test('getSchedulerDashboard returns health object', async () => {
    const d = await svc.getSchedulerDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
