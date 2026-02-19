/**
 * PHASE 17: CUSTOM WORKFLOW BUILDER
 * Visual Workflow Designer & Automation Engine
 * AlAwael ERP v1.4 | 2026-01-24
 */

// ============================================================================
// 1. WORKFLOW ENGINE
// ============================================================================
class WorkflowEngine {
  constructor(db) {
    this.db = db;
    this.workflows = new Map();
    this.executionHistory = new Map();
  }

  /**
   * Create workflow
   */
  async createWorkflow(userId, workflowData) {
    try {
      const workflow = {
        id: `workflow_${Date.now()}`,
        userId: userId,
        name: workflowData.name,
        description: workflowData.description || '',
        steps: workflowData.steps || [],
        triggers: workflowData.triggers || [],
        conditions: workflowData.conditions || [],
        actions: workflowData.actions || [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
      };

      await this.db.collection('workflows').insertOne(workflow);
      this.workflows.set(workflow.id, workflow);

      return { success: true, workflow };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add step to workflow
   */
  async addStep(workflowId, step) {
    try {
      const workflow =
        this.workflows.get(workflowId) ||
        (await this.db.collection('workflows').findOne({ id: workflowId }));

      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      step.id = `step_${Date.now()}`;
      workflow.steps.push(step);

      await this.db
        .collection('workflows')
        .updateOne({ id: workflowId }, { $set: { steps: workflow.steps } });

      return { success: true, step };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add condition to workflow
   */
  async addCondition(workflowId, condition) {
    try {
      const workflow =
        this.workflows.get(workflowId) ||
        (await this.db.collection('workflows').findOne({ id: workflowId }));

      if (!workflow) {
        return { success: false, error: 'Workflow not found' };
      }

      condition.id = `condition_${Date.now()}`;
      workflow.conditions.push(condition);

      await this.db
        .collection('workflows')
        .updateOne({ id: workflowId }, { $set: { conditions: workflow.conditions } });

      return { success: true, condition };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId, data = {}) {
    try {
      const workflow =
        this.workflows.get(workflowId) ||
        (await this.db.collection('workflows').findOne({ id: workflowId }));

      if (!workflow || !workflow.enabled) {
        return { success: false, error: 'Workflow not available' };
      }

      const execution = {
        id: `execution_${Date.now()}`,
        workflowId: workflowId,
        startTime: new Date(),
        status: 'running',
        steps: [],
        data: data,
      };

      // Execute workflow steps
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, data);
        execution.steps.push({
          stepId: step.id,
          status: stepResult.success ? 'completed' : 'failed',
          result: stepResult,
        });

        // Check conditions
        if (step.condition) {
          const conditionMet = await this.evaluateCondition(step.condition, data);
          if (!conditionMet && step.onConditionFail === 'stop') {
            execution.status = 'stopped';
            break;
          }
        }
      }

      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;
      execution.status = 'completed';

      await this.db.collection('workflow_executions').insertOne(execution);

      // Update execution count
      await this.db
        .collection('workflows')
        .updateOne({ id: workflowId }, { $inc: { executionCount: 1 } });

      return { success: true, execution };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute single step
   */
  async executeStep(step, data) {
    try {
      switch (step.type) {
        case 'send_email':
          return await this.sendEmailStep(step, data);
        case 'send_notification':
          return await this.sendNotificationStep(step, data);
        case 'update_record':
          return await this.updateRecordStep(step, data);
        case 'create_record':
          return await this.createRecordStep(step, data);
        case 'delay':
          return await this.delayStep(step, data);
        case 'webhook':
          return await this.webhookStep(step, data);
        default:
          return { success: true, action: step.type };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email step
   */
  async sendEmailStep(step, data) {
    return {
      success: true,
      action: 'email_sent',
      to: step.config?.to,
      subject: step.config?.subject,
      timestamp: new Date(),
    };
  }

  /**
   * Send notification step
   */
  async sendNotificationStep(step, data) {
    return {
      success: true,
      action: 'notification_sent',
      title: step.config?.title,
      message: step.config?.message,
      timestamp: new Date(),
    };
  }

  /**
   * Update record step
   */
  async updateRecordStep(step, data) {
    try {
      const result = await this.db
        .collection(step.config?.collection)
        .updateOne({ _id: step.config?.recordId }, { $set: step.config?.updates });

      return {
        success: true,
        action: 'record_updated',
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create record step
   */
  async createRecordStep(step, data) {
    try {
      const result = await this.db.collection(step.config?.collection).insertOne({
        ...step.config?.data,
        createdAt: new Date(),
      });

      return {
        success: true,
        action: 'record_created',
        insertedId: result.insertedId,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delay step
   */
  async delayStep(step, data) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          action: 'delay_completed',
          delayMs: step.config?.delay || 0,
        });
      }, step.config?.delay || 1000);
    });
  }

  /**
   * Webhook step
   */
  async webhookStep(step, data) {
    try {
      const response = await fetch(step.config?.url, {
        method: step.config?.method || 'POST',
        headers: step.config?.headers || {},
        body: JSON.stringify(data),
      });

      return {
        success: true,
        action: 'webhook_called',
        status: response.status,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Evaluate condition
   */
  async evaluateCondition(condition, data) {
    try {
      const { field, operator, value } = condition;
      const dataValue = this.getNestedValue(data, field);

      switch (operator) {
        case 'equals':
          return dataValue === value;
        case 'not_equals':
          return dataValue !== value;
        case 'greater_than':
          return dataValue > value;
        case 'less_than':
          return dataValue < value;
        case 'contains':
          return String(dataValue).includes(value);
        case 'in_array':
          return Array.isArray(value) && value.includes(dataValue);
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId) {
    try {
      return await this.db.collection('workflows').findOne({ id: workflowId });
    } catch (error) {
      return null;
    }
  }

  /**
   * List user workflows
   */
  async listUserWorkflows(userId) {
    try {
      return await this.db.collection('workflows').find({ userId }).toArray();
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId) {
    try {
      await this.db.collection('workflows').deleteOne({ id: workflowId });
      this.workflows.delete(workflowId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(workflowId, limit = 20) {
    try {
      return await this.db
        .collection('workflow_executions')
        .find({ workflowId })
        .sort({ startTime: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      return [];
    }
  }

  /**
   * Enable/Disable workflow
   */
  async setWorkflowEnabled(workflowId, enabled) {
    try {
      await this.db.collection('workflows').updateOne({ id: workflowId }, { $set: { enabled } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// 2. TEMPLATE LIBRARY
// ============================================================================
class WorkflowTemplates {
  static templates = {
    // Sales workflow
    sales_order_notification: {
      name: 'Sales Order Notification',
      description: 'Notify team when new order is created',
      steps: [
        {
          type: 'send_notification',
          config: { title: 'New Order', message: 'A new order has been created' },
        },
        { type: 'send_email', config: { to: 'sales@alawael.com', subject: 'New Order Alert' } },
      ],
    },

    // Inventory workflow
    low_stock_alert: {
      name: 'Low Stock Alert',
      description: 'Alert when inventory falls below threshold',
      steps: [
        {
          type: 'send_notification',
          config: { title: 'Low Stock', message: 'Item {{productName}} is low on stock' },
        },
        { type: 'send_email', config: { to: 'inventory@alawael.com', subject: 'Low Stock Alert' } },
      ],
    },

    // Customer workflow
    customer_welcome: {
      name: 'Customer Welcome',
      description: 'Send welcome message to new customer',
      steps: [
        { type: 'send_email', config: { to: '{{customerEmail}}', subject: 'Welcome to AlAwael' } },
        {
          type: 'send_notification',
          config: { title: 'Welcome', message: 'Welcome {{customerName}}!' },
        },
      ],
    },

    // Invoice workflow
    invoice_generation: {
      name: 'Auto Invoice Generation',
      description: 'Automatically generate and send invoice',
      steps: [
        { type: 'create_record', config: { collection: 'invoices' } },
        { type: 'send_email', config: { to: '{{customerEmail}}', subject: 'Your Invoice' } },
      ],
    },
  };

  /**
   * Get template
   */
  static getTemplate(templateName) {
    return this.templates[templateName];
  }

  /**
   * List all templates
   */
  static listTemplates() {
    return Object.entries(this.templates).map(([key, template]) => ({
      id: key,
      ...template,
    }));
  }
}

module.exports = {
  WorkflowEngine,
  WorkflowTemplates,
};
