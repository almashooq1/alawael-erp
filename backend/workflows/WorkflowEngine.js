/**
 * Workflow Automation Engine - Phase 9
 * Automated business process workflows
 */

const EventEmitter = require('events');

class WorkflowEngine extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.workflows = new Map();
    this.runningWorkflows = new Map();
    this.initializeBuiltInWorkflows();
  }

  /**
   * Initialize built-in workflows
   */
  initializeBuiltInWorkflows() {
    // Leave Request Approval Workflow
    this.registerWorkflow('leave_request', {
      name: 'Leave Request Workflow',
      description: 'Automated leave request approval process',
      steps: [
        {
          id: 'submit',
          name: 'Submit Request',
          type: 'trigger',
          condition: 'leave_request.created',
        },
        {
          id: 'validate',
          name: 'Validate Request',
          type: 'action',
          handler: this.validateLeaveRequest.bind(this),
        },
        {
          id: 'manager_review',
          name: 'Manager Review',
          type: 'decision',
          assignTo: 'manager',
          options: ['approved', 'rejected', 'pending_info'],
        },
        {
          id: 'hr_review',
          name: 'HR Review',
          type: 'decision',
          assignTo: 'hr_admin',
          condition: 'manager_review === "approved"',
        },
        {
          id: 'notify_employee',
          name: 'Notify Employee',
          type: 'action',
          handler: this.notifyEmployee.bind(this),
        },
        {
          id: 'complete',
          name: 'Complete',
          type: 'end',
        },
      ],
      escalationPolicy: {
        afterDays: 3,
        escalateTo: 'hr_head',
        message: 'Leave request awaiting approval',
      },
    });

    // Onboarding Workflow
    this.registerWorkflow('employee_onboarding', {
      name: 'Employee Onboarding',
      description: 'New employee onboarding process',
      steps: [
        {
          id: 'create_account',
          name: 'Create User Account',
          type: 'action',
          handler: this.createEmployeeAccount.bind(this),
        },
        {
          id: 'setup_hardware',
          name: 'Setup Hardware Assignment',
          type: 'action',
          assignTo: 'it_admin',
        },
        {
          id: 'payroll_setup',
          name: 'Payroll Setup',
          type: 'action',
          assignTo: 'finance',
        },
        {
          id: 'orientation',
          name: 'Schedule Orientation',
          type: 'action',
          assignTo: 'hr_admin',
        },
        {
          id: 'welcome_email',
          name: 'Send Welcome Email',
          type: 'notification',
          template: 'employee_welcome',
        },
        {
          id: 'complete',
          name: 'Onboarding Complete',
          type: 'end',
        },
      ],
    });

    // Performance Review Workflow
    this.registerWorkflow('performance_review', {
      name: 'Performance Review Cycle',
      description: 'Annual employee performance review workflow',
      steps: [
        {
          id: 'notify_managers',
          name: 'Notify Managers of Review Period',
          type: 'action',
          handler: this.notifyReviewStart.bind(this),
        },
        {
          id: 'manager_evaluation',
          name: 'Manager Evaluation',
          type: 'form',
          assignTo: 'manager',
          dueDate: 'current_date + 14 days',
        },
        {
          id: 'peer_feedback',
          name: 'Peer Feedback Collection',
          type: 'form',
          assignTo: 'peer_group',
        },
        {
          id: 'employee_self_review',
          name: 'Employee Self Review',
          type: 'form',
          assignTo: 'employee',
        },
        {
          id: 'review_meeting',
          name: 'Review Meeting',
          type: 'scheduled_action',
          assignTo: 'manager',
        },
        {
          id: 'finalize',
          name: 'Finalize Review',
          type: 'action',
          assignTo: 'hr_admin',
        },
        {
          id: 'archive',
          name: 'Archive Review',
          type: 'action',
          handler: this.archiveReview.bind(this),
        },
        {
          id: 'complete',
          name: 'Complete',
          type: 'end',
        },
      ],
    });
  }

  /**
   * Register a custom workflow
   */
  registerWorkflow(workflowId, config) {
    this.workflows.set(workflowId, {
      id: workflowId,
      name: config.name,
      description: config.description,
      steps: config.steps,
      escalationPolicy: config.escalationPolicy || null,
      createdAt: new Date(),
    });
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(workflowId, context) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const instance = {
      id: this.generateInstanceId(),
      workflowId,
      context,
      currentStep: 0,
      status: 'running',
      startedAt: new Date(),
      history: [],
      assignments: [],
    };

    this.runningWorkflows.set(instance.id, instance);

    // Save workflow instance
    await this.db.collection('workflow_instances').insertOne(instance);

    // Execute first step
    await this.executeStep(instance, workflow.steps[0]);

    this.emit('workflow.started', {
      workflowId,
      instanceId: instance.id,
      context,
    });

    return instance;
  }

  /**
   * Execute a workflow step
   */
  async executeStep(instance, step) {
    try {
      const execution = {
        stepId: step.id,
        status: 'executing',
        startedAt: new Date(),
        result: null,
      };

      switch (step.type) {
        case 'action':
          if (step.handler) {
            execution.result = await step.handler(instance.context);
          }
          execution.status = 'completed';
          break;

        case 'decision':
          execution.assignedTo = step.assignTo;
          execution.status = 'pending_decision';
          await this.assignTask(step.assignTo, instance.id, step);
          break;

        case 'trigger':
          execution.status = 'waiting';
          break;

        case 'notification':
          await this.sendNotification(step.template, instance.context);
          execution.status = 'completed';
          break;

        case 'form':
          execution.status = 'pending_response';
          await this.assignTask(step.assignTo, instance.id, step);
          break;

        case 'end':
          execution.status = 'completed';
          instance.status = 'completed';
          break;

        default:
          execution.status = 'completed';
      }

      execution.completedAt = new Date();
      instance.history.push(execution);

      // Update workflow instance
      await this.db
        .collection('workflow_instances')
        .updateOne({ id: instance.id }, { $set: instance });

      this.emit('step.executed', {
        workflowId: instance.workflowId,
        instanceId: instance.id,
        step: step.id,
        status: execution.status,
      });

      return execution;
    } catch (error) {
      console.error(`Error executing step ${step.id}:`, error);
      throw error;
    }
  }

  /**
   * Complete a workflow step
   */
  async completeStep(instanceId, stepId, decision) {
    const instance = this.runningWorkflows.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    const workflow = this.workflows.get(instance.workflowId);
    const currentStep = workflow.steps[instance.currentStep];

    if (currentStep.id !== stepId) {
      throw new Error('Step mismatch');
    }

    // Store decision
    instance.lastDecision = {
      stepId,
      decision,
      timestamp: new Date(),
    };

    // Find next step
    let nextStepIndex = instance.currentStep + 1;
    if (currentStep.options && !currentStep.options.includes(decision)) {
      // Handle conditional routing
      const nextStep = workflow.steps.find(s => s.condition === `${stepId} === "${decision}"`);
      if (nextStep) {
        nextStepIndex = workflow.steps.indexOf(nextStep);
      }
    }

    instance.currentStep = nextStepIndex;

    // Execute next step
    if (nextStepIndex < workflow.steps.length) {
      const nextStep = workflow.steps[nextStepIndex];
      await this.executeStep(instance, nextStep);
    } else {
      instance.status = 'completed';
      instance.completedAt = new Date();
    }

    // Save updated workflow instance
    await this.db
      .collection('workflow_instances')
      .updateOne({ id: instance.id }, { $set: instance });

    this.emit('workflow.progressed', {
      instanceId,
      previousStep: stepId,
      currentStep: workflow.steps[instance.currentStep]?.id,
    });

    return instance;
  }

  /**
   * Assign task to user
   */
  async assignTask(assignee, workflowInstanceId, step) {
    const task = {
      id: this.generateTaskId(),
      workflowInstanceId,
      stepId: step.id,
      assignedTo: assignee,
      status: 'pending',
      createdAt: new Date(),
      dueDate: step.dueDate,
    };

    await this.db.collection('workflow_tasks').insertOne(task);
    instance.assignments.push(task.id);

    return task;
  }

  /**
   * Get pending tasks for user
   */
  async getPendingTasks(userId) {
    return await this.db
      .collection('workflow_tasks')
      .find({
        assignedTo: userId,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /**
   * Validate leave request
   */
  async validateLeaveRequest(context) {
    // Validate leave balance, dates, etc.
    return {
      valid: true,
      remainingBalance: 10,
    };
  }

  /**
   * Notify employee
   */
  async notifyEmployee(context) {
    console.log(`Notifying employee: ${context.employeeId}`);
    return { sent: true };
  }

  /**
   * Create employee account
   */
  async createEmployeeAccount(context) {
    console.log(`Creating account for: ${context.employeeName}`);
    return {
      accountCreated: true,
      username: context.employeeId,
    };
  }

  /**
   * Notify review start
   */
  async notifyReviewStart(context) {
    console.log('Notifying managers of review period');
    return { notified: true };
  }

  /**
   * Archive review
   */
  async archiveReview(context) {
    console.log(`Archiving review for: ${context.employeeId}`);
    return { archived: true };
  }

  /**
   * Send notification
   */
  async sendNotification(template, context) {
    console.log(`Sending notification: ${template}`);
    return { sent: true };
  }

  /**
   * Generate instance ID
   */
  generateInstanceId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get workflow instance status
   */
  async getWorkflowStatus(instanceId) {
    return await this.db.collection('workflow_instances').findOne({ id: instanceId });
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(workflowId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const instances = await this.db
      .collection('workflow_instances')
      .find({
        workflowId,
        startedAt: { $gte: since },
      })
      .toArray();

    return {
      total: instances.length,
      completed: instances.filter(i => i.status === 'completed').length,
      running: instances.filter(i => i.status === 'running').length,
      averageCompletionTime: this.calculateAverageCompletionTime(instances),
    };
  }

  /**
   * Calculate average workflow completion time
   */
  calculateAverageCompletionTime(instances) {
    const completed = instances.filter(i => i.completedAt && i.startedAt);
    if (completed.length === 0) return 0;

    const total = completed.reduce((sum, i) => {
      return sum + (i.completedAt - i.startedAt);
    }, 0);

    return Math.round(total / completed.length / 1000 / 60); // Return minutes
  }
}

module.exports = WorkflowEngine;
