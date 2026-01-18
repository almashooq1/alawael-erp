/**
 * Automation Engine Service
 * Workflow automation, task scheduling, and event-based actions
 */

// In-memory storage
let automations = new Map();
let workflows = new Map();
let triggers = new Map();
let scheduledTasks = new Map();

class AutomationService {
  constructor() {
    this.initializeDefaultWorkflows();
  }

  /**
   * Initialize default workflows
   */
  initializeDefaultWorkflows() {
    // Welcome workflow
    workflows.set('welcome-new-user', {
      name: 'Welcome New User',
      trigger: 'user-registered',
      steps: [
        { action: 'send-email', template: 'welcome' },
        { action: 'create-task', description: 'Complete profile setup' },
        { action: 'assign-guide', guide: 'getting-started' },
      ],
      enabled: true,
    });

    // Leave approval workflow
    workflows.set('leave-approval', {
      name: 'Leave Approval Workflow',
      trigger: 'leave-requested',
      steps: [
        { action: 'notify-manager', message: 'New leave request' },
        { action: 'create-approval-task' },
        { action: 'send-confirmation-email' },
      ],
      enabled: true,
    });

    // Course completion workflow
    workflows.set('course-completion', {
      name: 'Course Completion Workflow',
      trigger: 'course-completed',
      steps: [{ action: 'issue-certificate' }, { action: 'update-profile' }, { action: 'send-congratulations-email' }],
      enabled: true,
    });

    // Document approval workflow
    workflows.set('document-approval', {
      name: 'Document Approval Workflow',
      trigger: 'document-submitted',
      steps: [{ action: 'notify-approver' }, { action: 'create-approval-task' }, { action: 'set-deadline', days: 3 }],
      enabled: true,
    });
  }

  /**
   * Create automation
   */
  async createAutomation(name, trigger, actions, conditions = {}) {
    try {
      const automationId = `auto_${Date.now()}`;

      const automation = {
        id: automationId,
        name,
        trigger,
        actions,
        conditions,
        enabled: true,
        createdAt: new Date(),
        executionCount: 0,
        lastExecuted: null,
      };

      automations.set(automationId, automation);

      return {
        success: true,
        message: 'Automation created',
        automationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute automation
   */
  async executeAutomation(automationId, data = {}) {
    try {
      const automation = automations.get(automationId);

      if (!automation) {
        return {
          success: false,
          error: 'Automation not found',
        };
      }

      if (!automation.enabled) {
        return {
          success: false,
          error: 'Automation is disabled',
        };
      }

      // Check conditions
      if (!this.evaluateConditions(automation.conditions, data)) {
        return {
          success: false,
          message: 'Conditions not met',
        };
      }

      // Execute actions
      const results = [];
      for (const action of automation.actions) {
        const result = await this.executeAction(action, data);
        results.push(result);
      }

      // Update automation
      automation.executionCount++;
      automation.lastExecuted = new Date();
      automations.set(automationId, automation);

      return {
        success: true,
        message: 'Automation executed successfully',
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute action
   */
  async executeAction(action, data) {
    try {
      const result = {
        action: action.action,
        status: 'completed',
        timestamp: new Date(),
      };

      switch (action.action) {
        case 'send-email':
          result.message = `Email sent using template: ${action.template}`;
          // In production: call emailService
          break;

        case 'send-sms':
          result.message = `SMS sent: ${action.message}`;
          // In production: call smsService
          break;

        case 'notify-manager':
          result.message = `Manager notified: ${action.message}`;
          break;

        case 'create-task':
          result.taskId = `task_${Date.now()}`;
          result.message = `Task created: ${action.description}`;
          break;

        case 'issue-certificate':
          result.certificateId = `cert_${Date.now()}`;
          result.message = 'Certificate issued';
          break;

        case 'update-profile':
          result.message = 'User profile updated';
          break;

        case 'create-approval-task':
          result.taskId = `task_${Date.now()}`;
          result.message = 'Approval task created';
          break;

        case 'set-deadline': {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (action.days || 3));
          result.dueDate = dueDate;
          result.message = `Deadline set to ${dueDate.toDateString()}`;
          break;
        }

        case 'assign-guide':
          result.message = `Guide assigned: ${action.guide}`;
          break;

        case 'create-notification':
          result.notificationId = `notif_${Date.now()}`;
          result.message = action.message;
          break;

        case 'log-activity':
          result.message = `Activity logged: ${action.description}`;
          break;

        default:
          result.status = 'unknown';
          result.message = 'Unknown action';
      }

      return result;
    } catch (error) {
      return {
        action: action.action,
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Evaluate conditions
   */
  evaluateConditions(conditions, data) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Schedule task
   */
  async scheduleTask(name, action, scheduledFor, recurrence = null) {
    try {
      const taskId = `sched_${Date.now()}`;

      const task = {
        id: taskId,
        name,
        action,
        scheduledFor: new Date(scheduledFor),
        recurrence, // 'daily', 'weekly', 'monthly'
        enabled: true,
        createdAt: new Date(),
        executionCount: 0,
        lastExecuted: null,
      };

      scheduledTasks.set(taskId, task);

      return {
        success: true,
        message: 'Task scheduled',
        taskId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get automation details
   */
  async getAutomation(automationId) {
    try {
      const automation = automations.get(automationId);

      if (!automation) {
        return {
          success: false,
          error: 'Automation not found',
        };
      }

      return {
        success: true,
        automation,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all automations
   */
  async getAutomations(limit = 50) {
    try {
      const automationsList = Array.from(automations.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      return {
        success: true,
        automations: automationsList,
        total: automations.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Enable/Disable automation
   */
  async toggleAutomation(automationId, enabled) {
    try {
      const automation = automations.get(automationId);

      if (!automation) {
        return {
          success: false,
          error: 'Automation not found',
        };
      }

      automation.enabled = enabled;
      automations.set(automationId, automation);

      return {
        success: true,
        message: `Automation ${enabled ? 'enabled' : 'disabled'}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete automation
   */
  async deleteAutomation(automationId) {
    try {
      automations.delete(automationId);

      return {
        success: true,
        message: 'Automation deleted',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get workflows
   */
  async getWorkflows(limit = 50) {
    try {
      const workflowsList = Array.from(workflows.entries())
        .slice(0, limit)
        .map(([id, workflow]) => ({ id, ...workflow }));

      return {
        success: true,
        workflows: workflowsList,
        total: workflows.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Trigger workflow
   */
  async triggerWorkflow(workflowId, data = {}) {
    try {
      const workflow = workflows.get(workflowId);

      if (!workflow || !workflow.enabled) {
        return {
          success: false,
          error: 'Workflow not found or disabled',
        };
      }

      // Execute all steps in workflow
      const results = [];
      for (const step of workflow.steps) {
        const result = await this.executeAction(step, data);
        results.push(result);
      }

      return {
        success: true,
        message: 'Workflow executed',
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get automation statistics
   */
  async getAutomationStats() {
    try {
      const stats = {
        totalAutomations: automations.size,
        enabledAutomations: Array.from(automations.values()).filter(a => a.enabled).length,
        totalExecutions: Array.from(automations.values()).reduce((sum, a) => sum + a.executionCount, 0),
        totalWorkflows: workflows.size,
        scheduledTasks: scheduledTasks.size,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get scheduled tasks
   */
  async getScheduledTasks(limit = 50) {
    try {
      const tasksList = Array.from(scheduledTasks.values())
        .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
        .slice(0, limit);

      return {
        success: true,
        tasks: tasksList,
        total: scheduledTasks.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get automation history/logs
   */
  async getAutomationLogs(automationId, limit = 100) {
    try {
      const automation = automations.get(automationId);

      if (!automation) {
        return {
          success: false,
          error: 'Automation not found',
        };
      }

      // In production, query logs from database
      const logs = [
        {
          executionTime: new Date(),
          status: 'success',
          duration: 245, // ms
        },
      ];

      return {
        success: true,
        logs: logs.slice(0, limit),
        total: automation.executionCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = AutomationService;
