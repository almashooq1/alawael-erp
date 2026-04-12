/**
 * Unit Tests — automationService.js
 * Batch 40 · P#79
 *
 * Class with module-level Maps. jest.isolateModules for fresh state.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

function freshService() {
  let svc;
  jest.isolateModules(() => {
    const AutomationService = require('../../services/automationService');
    svc = new AutomationService();
  });
  return svc;
}

describe('AutomationService', () => {
  let svc;
  beforeEach(() => {
    svc = freshService();
  });

  // ═══════════════════════════════════
  // Default Workflows
  // ═══════════════════════════════════
  describe('initializeDefaultWorkflows', () => {
    test('getWorkflows returns 4 default workflows', async () => {
      const r = await svc.getWorkflows();
      expect(r.success).toBe(true);
      expect(r.total).toBe(4);
      expect(r.workflows.length).toBe(4);
    });
  });

  // ═══════════════════════════════════
  // Create & Get Automation
  // ═══════════════════════════════════
  describe('createAutomation', () => {
    test('returns success with automationId', async () => {
      const r = await svc.createAutomation('Test Auto', 'user-registered', [
        { action: 'send-email', template: 'test' },
      ]);
      expect(r.success).toBe(true);
      expect(r.automationId).toBeDefined();
    });
  });

  describe('getAutomation', () => {
    test('returns automation after creation', async () => {
      const { automationId } = await svc.createAutomation('A', 'evt', []);
      const r = await svc.getAutomation(automationId);
      expect(r.success).toBe(true);
      expect(r.automation.name).toBe('A');
    });

    test('returns error for unknown id', async () => {
      const r = await svc.getAutomation('nonexist');
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/not found/i);
    });
  });

  describe('getAutomations', () => {
    test('returns list sorted by createdAt', async () => {
      await svc.createAutomation('A1', 'e1', []);
      await new Promise(r => setTimeout(r, 5));
      await svc.createAutomation('A2', 'e2', []);
      const r = await svc.getAutomations();
      expect(r.success).toBe(true);
      expect(r.total).toBe(2);
    });

    test('respects limit', async () => {
      await svc.createAutomation('X1', 'e', []);
      await new Promise(r => setTimeout(r, 5));
      await svc.createAutomation('X2', 'e', []);
      await new Promise(r => setTimeout(r, 5));
      await svc.createAutomation('X3', 'e', []);
      const r = await svc.getAutomations(2);
      expect(r.automations.length).toBe(2);
    });
  });

  // ═══════════════════════════════════
  // Execute Automation
  // ═══════════════════════════════════
  describe('executeAutomation', () => {
    test('executes with results', async () => {
      const { automationId } = await svc.createAutomation('Exec', 'evt', [
        { action: 'send-email', template: 'welcome' },
      ]);
      const r = await svc.executeAutomation(automationId, {});
      expect(r.success).toBe(true);
      expect(r.results.length).toBe(1);
      expect(r.results[0].status).toBe('completed');
    });

    test('returns not-found for unknown id', async () => {
      const r = await svc.executeAutomation('xxx');
      expect(r.success).toBe(false);
    });

    test('returns error when automation is disabled', async () => {
      const { automationId } = await svc.createAutomation('Dis', 'evt', []);
      await svc.toggleAutomation(automationId, false);
      const r = await svc.executeAutomation(automationId, {});
      expect(r.success).toBe(false);
      expect(r.error).toMatch(/disabled/i);
    });

    test('returns failure when conditions not met', async () => {
      const { automationId } = await svc.createAutomation(
        'Cond',
        'evt',
        [{ action: 'log-activity', description: 'test' }],
        { role: 'admin' }
      );
      const r = await svc.executeAutomation(automationId, { role: 'user' });
      expect(r.success).toBe(false);
    });

    test('increments executionCount after execution', async () => {
      const { automationId } = await svc.createAutomation('Cnt', 'evt', [
        { action: 'log-activity', description: 't' },
      ]);
      await svc.executeAutomation(automationId, {});
      const r = await svc.getAutomation(automationId);
      expect(r.automation.executionCount).toBe(1);
    });
  });

  // ═══════════════════════════════════
  // Execute Action (switch cases)
  // ═══════════════════════════════════
  describe('executeAction', () => {
    test('send-email returns completed', async () => {
      const r = await svc.executeAction({ action: 'send-email', template: 'welcome' }, {});
      expect(r.status).toBe('completed');
      expect(r.message).toContain('Email sent');
    });

    test('send-sms returns completed', async () => {
      const r = await svc.executeAction({ action: 'send-sms', message: 'Hi' }, {});
      expect(r.status).toBe('completed');
    });

    test('notify-manager returns completed', async () => {
      const r = await svc.executeAction({ action: 'notify-manager', message: 'New request' }, {});
      expect(r.message).toContain('Manager notified');
    });

    test('create-task returns taskId', async () => {
      const r = await svc.executeAction({ action: 'create-task', description: 'Do X' }, {});
      expect(r.taskId).toBeDefined();
    });

    test('issue-certificate returns certificateId', async () => {
      const r = await svc.executeAction({ action: 'issue-certificate' }, {});
      expect(r.certificateId).toBeDefined();
    });

    test('update-profile returns completed', async () => {
      const r = await svc.executeAction({ action: 'update-profile' }, {});
      expect(r.message).toContain('profile updated');
    });

    test('create-approval-task returns taskId', async () => {
      const r = await svc.executeAction({ action: 'create-approval-task' }, {});
      expect(r.taskId).toBeDefined();
    });

    test('set-deadline returns dueDate', async () => {
      const r = await svc.executeAction({ action: 'set-deadline', days: 5 }, {});
      expect(r.dueDate).toBeInstanceOf(Date);
    });

    test('assign-guide returns message', async () => {
      const r = await svc.executeAction({ action: 'assign-guide', guide: 'getting-started' }, {});
      expect(r.message).toContain('Guide assigned');
    });

    test('create-notification returns notificationId', async () => {
      const r = await svc.executeAction({ action: 'create-notification', message: 'Hi' }, {});
      expect(r.notificationId).toBeDefined();
    });

    test('log-activity returns completed', async () => {
      const r = await svc.executeAction({ action: 'log-activity', description: 'Test' }, {});
      expect(r.message).toContain('Activity logged');
    });

    test('unknown action returns status unknown', async () => {
      const r = await svc.executeAction({ action: 'xyz' }, {});
      expect(r.status).toBe('unknown');
    });
  });

  // ═══════════════════════════════════
  // evaluateConditions
  // ═══════════════════════════════════
  describe('evaluateConditions', () => {
    test('returns true for empty conditions', () => {
      expect(svc.evaluateConditions({}, {})).toBe(true);
      expect(svc.evaluateConditions(null, {})).toBe(true);
    });

    test('returns true when all conditions matched', () => {
      expect(svc.evaluateConditions({ role: 'admin' }, { role: 'admin' })).toBe(true);
    });

    test('returns false when condition not met', () => {
      expect(svc.evaluateConditions({ role: 'admin' }, { role: 'user' })).toBe(false);
    });
  });

  // ═══════════════════════════════════
  // toggleAutomation
  // ═══════════════════════════════════
  describe('toggleAutomation', () => {
    test('disables automation', async () => {
      const { automationId } = await svc.createAutomation('T', 'e', []);
      const r = await svc.toggleAutomation(automationId, false);
      expect(r.success).toBe(true);
      expect(r.message).toContain('disabled');
    });

    test('enables automation', async () => {
      const { automationId } = await svc.createAutomation('T', 'e', []);
      await svc.toggleAutomation(automationId, false);
      const r = await svc.toggleAutomation(automationId, true);
      expect(r.message).toContain('enabled');
    });

    test('returns error for unknown id', async () => {
      const r = await svc.toggleAutomation('xxx', true);
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════
  // deleteAutomation
  // ═══════════════════════════════════
  describe('deleteAutomation', () => {
    test('deletes existing automation', async () => {
      const { automationId } = await svc.createAutomation('Del', 'e', []);
      const r = await svc.deleteAutomation(automationId);
      expect(r.success).toBe(true);
      expect((await svc.getAutomation(automationId)).success).toBe(false);
    });
  });

  // ═══════════════════════════════════
  // scheduleTask & getScheduledTasks
  // ═══════════════════════════════════
  describe('scheduleTask', () => {
    test('creates scheduled task', async () => {
      const r = await svc.scheduleTask('Backup', { action: 'log-activity' }, '2026-12-31');
      expect(r.success).toBe(true);
      expect(r.taskId).toBeDefined();
    });
  });

  describe('getScheduledTasks', () => {
    test('returns tasks sorted by scheduledFor', async () => {
      await svc.scheduleTask('T1', {}, '2026-06-01');
      await new Promise(r => setTimeout(r, 5));
      await svc.scheduleTask('T2', {}, '2026-01-01');
      const r = await svc.getScheduledTasks();
      expect(r.success).toBe(true);
      expect(r.tasks.length).toBe(2);
      // sorted ascending by scheduledFor
      expect(new Date(r.tasks[0].scheduledFor) <= new Date(r.tasks[1].scheduledFor)).toBe(true);
    });
  });

  // ═══════════════════════════════════
  // triggerWorkflow
  // ═══════════════════════════════════
  describe('triggerWorkflow', () => {
    test('executes all steps for default workflow', async () => {
      const r = await svc.triggerWorkflow('welcome-new-user', {});
      expect(r.success).toBe(true);
      expect(r.results.length).toBe(3);
    });

    test('returns error for unknown or disabled workflow', async () => {
      const r = await svc.triggerWorkflow('nonexistent', {});
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════
  // getAutomationStats
  // ═══════════════════════════════════
  describe('getAutomationStats', () => {
    test('returns stats with counts', async () => {
      await svc.createAutomation('S1', 'e', []);
      const r = await svc.getAutomationStats();
      expect(r.success).toBe(true);
      expect(r.stats.totalAutomations).toBe(1);
      expect(r.stats.totalWorkflows).toBe(4);
    });
  });

  // ═══════════════════════════════════
  // getAutomationLogs
  // ═══════════════════════════════════
  describe('getAutomationLogs', () => {
    test('returns logs for existing automation', async () => {
      const { automationId } = await svc.createAutomation('L', 'e', []);
      const r = await svc.getAutomationLogs(automationId);
      expect(r.success).toBe(true);
      expect(Array.isArray(r.logs)).toBe(true);
    });

    test('returns error for unknown id', async () => {
      const r = await svc.getAutomationLogs('xxx');
      expect(r.success).toBe(false);
    });
  });
});
