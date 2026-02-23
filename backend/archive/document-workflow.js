/**
 * Document Workflow Service - خدمة سير عمل المستندات
 * Workflow Management for Electronic Archive System
 */

const mongoose = require('mongoose');

/**
 * Workflow Configuration
 */
const workflowConfig = {
  // Default stages
  defaultStages: ['draft', 'review', 'approval', 'published', 'archived'],
  
  // Timeout settings
  timeout: {
    review: 7 * 24 * 60 * 60 * 1000, // 7 days
    approval: 3 * 24 * 60 * 60 * 1000, // 3 days
  },
  
  // Notifications
  notifications: {
    enabled: true,
    channels: ['in_app', 'email'],
  },
};

/**
 * Workflow Definition Schema
 */
const WorkflowDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  category: { type: String, default: 'general' },
  
  // Stages
  stages: [{
    name: { type: String, required: true },
    order: { type: Number, required: true },
    type: { type: String, enum: ['start', 'review', 'approval', 'parallel', 'end'], required: true },
    
    // Assignees
    assignees: {
      type: { type: String, enum: ['user', 'role', 'department', 'manager', 'custom'] },
      value: [String],
      expression: String, // Custom expression for dynamic assignment
    },
    
    // Actions
    actions: [{
      name: String,
      type: { type: String, enum: ['approve', 'reject', 'delegate', 'comment', 'attach', 'custom'] },
      nextStage: String,
      conditions: mongoose.Schema.Types.Mixed,
    }],
    
    // Timeout
    timeout: {
      duration: Number, // milliseconds
      action: { type: String, enum: ['escalate', 'auto_approve', 'auto_reject', 'notify'] },
      escalateTo: [String],
    },
    
    // Required fields
    requiredFields: [String],
    
    // Notifications
    notifications: {
      onEnter: { type: Boolean, default: true },
      onExit: { type: Boolean, default: false },
      onTimeout: { type: Boolean, default: true },
    },
  }],
  
  // Transitions
  transitions: [{
    from: { type: String, required: true },
    to: { type: String, required: true },
    condition: String, // Expression
    auto: { type: Boolean, default: false },
  }],
  
  // Settings
  settings: {
    allowBack: { type: Boolean, default: false },
    allowCancel: { type: Boolean, default: true },
    allowDelegate: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    allowAttachments: { type: Boolean, default: true },
    requireCommentOnReject: { type: Boolean, default: true },
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'workflow_definitions',
});

/**
 * Workflow Instance Schema
 */
const WorkflowInstanceSchema = new mongoose.Schema({
  // Reference
  definitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
  workflowName: String,
  
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  documentType: String,
  documentNumber: String,
  
  // Current state
  currentStage: String,
  currentAssignees: [String],
  status: { type: String, enum: ['running', 'completed', 'cancelled', 'paused'], default: 'running' },
  
  // History
  history: [{
    stage: String,
    action: String,
    performedBy: String,
    performedAt: { type: Date, default: Date.now },
    assignees: [String],
    comment: String,
    attachments: [String],
    metadata: mongoose.Schema.Types.Mixed,
  }],
  
  // Pending tasks
  pendingTasks: [{
    taskId: String,
    stage: String,
    assignee: String,
    assignedAt: { type: Date, default: Date.now },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'completed', 'expired'], default: 'pending' },
  }],
  
  // Variables
  variables: mongoose.Schema.Types.Mixed,
  
  // Priority
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  
  // Deadline
  deadline: Date,
  
  // Started by
  startedBy: String,
  startedAt: { type: Date, default: Date.now },
  
  // Completed
  completedAt: Date,
  completedBy: String,
  completionReason: String,
  
  // Tenant
  tenantId: String,
}, {
  collection: 'workflow_instances',
});

// Indexes
WorkflowInstanceSchema.index({ documentId: 1 });
WorkflowInstanceSchema.index({ status: 1, currentAssignees: 1 });
WorkflowInstanceSchema.index({ 'pendingTasks.assignee': 1, 'pendingTasks.status': 1 });

/**
 * Document Workflow Service Class
 */
class DocumentWorkflowService {
  constructor() {
    this.WorkflowDefinition = null;
    this.WorkflowInstance = null;
    this.actionHandlers = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.WorkflowDefinition = connection.model('WorkflowDefinition', WorkflowDefinitionSchema);
    this.WorkflowInstance = connection.model('WorkflowInstance', WorkflowInstanceSchema);
    
    // Register default action handlers
    this.registerActionHandlers();
    
    // Create default workflows
    await this.createDefaultWorkflows();
    
    console.log('✅ Document Workflow Service initialized');
  }
  
  /**
   * Register action handlers
   */
  registerActionHandlers() {
    this.registerActionHandler('approve', async (instance, task, context) => {
      return { success: true, action: 'approve' };
    });
    
    this.registerActionHandler('reject', async (instance, task, context) => {
      return { success: true, action: 'reject' };
    });
    
    this.registerActionHandler('delegate', async (instance, task, context) => {
      return { success: true, action: 'delegate', delegatedTo: context.delegatedTo };
    });
    
    this.registerActionHandler('comment', async (instance, task, context) => {
      return { success: true, action: 'comment' };
    });
  }
  
  /**
   * Register action handler
   */
  registerActionHandler(name, handler) {
    this.actionHandlers.set(name, handler);
  }
  
  /**
   * Create default workflows
   */
  async createDefaultWorkflows() {
    const workflows = [
      {
        name: 'document_approval',
        description: 'موافقة المستندات القياسية',
        category: 'general',
        stages: [
          { name: 'draft', order: 1, type: 'start', actions: [{ name: 'إرسال للمراجعة', type: 'approve', nextStage: 'review' }] },
          { name: 'review', order: 2, type: 'review', assignees: { type: 'role', value: ['reviewer'] },
            actions: [
              { name: 'موافقة', type: 'approve', nextStage: 'approval' },
              { name: 'رفض', type: 'reject', nextStage: 'draft' },
            ],
            timeout: { duration: 7 * 24 * 60 * 60 * 1000, action: 'escalate' },
          },
          { name: 'approval', order: 3, type: 'approval', assignees: { type: 'role', value: ['approver'] },
            actions: [
              { name: 'موافقة نهائية', type: 'approve', nextStage: 'published' },
              { name: 'رفض', type: 'reject', nextStage: 'review' },
            ],
          },
          { name: 'published', order: 4, type: 'end' },
        ],
        settings: {
          allowBack: true,
          allowCancel: true,
          allowComments: true,
          requireCommentOnReject: true,
        },
      },
      {
        name: 'contract_approval',
        description: 'موافقة العقود',
        category: 'contracts',
        stages: [
          { name: 'draft', order: 1, type: 'start' },
          { name: 'legal_review', order: 2, type: 'review', assignees: { type: 'department', value: ['legal'] },
            actions: [{ name: 'موافقة قانونية', type: 'approve', nextStage: 'finance_review' }],
          },
          { name: 'finance_review', order: 3, type: 'review', assignees: { type: 'department', value: ['finance'] },
            actions: [{ name: 'موافقة مالية', type: 'approve', nextStage: 'management_approval' }],
          },
          { name: 'management_approval', order: 4, type: 'approval', assignees: { type: 'role', value: ['manager', 'ceo'] },
            actions: [{ name: 'موافقة الإدارة', type: 'approve', nextStage: 'signed' }],
          },
          { name: 'signed', order: 5, type: 'end' },
        ],
      },
      {
        name: 'invoice_approval',
        description: 'موافقة الفواتير',
        category: 'financial',
        stages: [
          { name: 'submitted', order: 1, type: 'start' },
          { name: 'verification', order: 2, type: 'review', assignees: { type: 'role', value: ['accountant'] },
            actions: [
              { name: 'تأكيد', type: 'approve', nextStage: 'approved' },
              { name: 'رفض', type: 'reject', nextStage: 'rejected' },
            ],
          },
          { name: 'approved', order: 3, type: 'end' },
          { name: 'rejected', order: 4, type: 'end' },
        ],
      },
    ];
    
    for (const workflow of workflows) {
      const existing = await this.WorkflowDefinition.findOne({ name: workflow.name });
      if (!existing) {
        await this.WorkflowDefinition.create(workflow);
      }
    }
  }
  
  /**
   * Start workflow
   */
  async startWorkflow(workflowName, documentId, options = {}) {
    const definition = await this.WorkflowDefinition.findOne({ name: workflowName, isActive: true });
    if (!definition) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }
    
    // Get start stage
    const startStage = definition.stages.find(s => s.type === 'start');
    if (!startStage) {
      throw new Error('Workflow has no start stage');
    }
    
    // Get next stage
    const transition = definition.transitions.find(t => t.from === startStage.name);
    const nextStageName = transition?.to || definition.stages[1]?.name;
    const nextStage = definition.stages.find(s => s.name === nextStageName);
    
    // Determine assignees
    const assignees = await this.resolveAssignees(nextStage, options);
    
    // Create instance
    const instance = await this.WorkflowInstance.create({
      definitionId: definition._id,
      workflowName: definition.name,
      documentId,
      documentType: options.documentType,
      documentNumber: options.documentNumber,
      currentStage: nextStageName,
      currentAssignees: assignees,
      status: 'running',
      history: [{
        stage: startStage.name,
        action: 'start',
        performedBy: options.userId,
        performedAt: new Date(),
        comment: options.comment,
      }],
      pendingTasks: assignees.map((assignee, index) => ({
        taskId: `task-${Date.now()}-${index}`,
        stage: nextStageName,
        assignee,
        assignedAt: new Date(),
        status: 'pending',
      })),
      variables: options.variables || {},
      priority: options.priority || 'normal',
      deadline: options.deadline,
      startedBy: options.userId,
      tenantId: options.tenantId,
    });
    
    // Send notifications
    await this.sendNotifications(instance, nextStage, 'onEnter');
    
    return instance;
  }
  
  /**
   * Resolve assignees
   */
  async resolveAssignees(stage, context) {
    if (!stage?.assignees) return [];
    
    const { type, value, expression } = stage.assignees;
    
    switch (type) {
      case 'user':
        return value;
      case 'role':
        // Would query users with role
        return value;
      case 'department':
        // Would query department members
        return value;
      case 'manager':
        // Would get user's manager
        return context.managerId ? [context.managerId] : [];
      case 'custom':
        if (expression) {
          // Evaluate expression
          return [];
        }
        return value;
      default:
        return [];
    }
  }
  
  /**
   * Perform action
   */
  async performAction(instanceId, action, options = {}) {
    const instance = await this.WorkflowInstance.findById(instanceId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    
    if (instance.status !== 'running') {
      throw new Error(`Workflow is ${instance.status}`);
    }
    
    // Verify user is assignee
    const task = instance.pendingTasks.find(
      t => t.assignee === options.userId && t.status === 'pending'
    );
    if (!task) {
      throw new Error('User is not assigned to this task');
    }
    
    // Get definition
    const definition = await this.WorkflowDefinition.findById(instance.definitionId);
    const currentStage = definition.stages.find(s => s.name === instance.currentStage);
    const actionConfig = currentStage.actions.find(a => a.type === action);
    
    if (!actionConfig) {
      throw new Error(`Action '${action}' not allowed in current stage`);
    }
    
    // Execute action handler
    const handler = this.actionHandlers.get(action);
    if (handler) {
      await handler(instance, task, options);
    }
    
    // Update history
    instance.history.push({
      stage: instance.currentStage,
      action,
      performedBy: options.userId,
      performedAt: new Date(),
      comment: options.comment,
      attachments: options.attachments,
    });
    
    // Complete task
    task.status = 'completed';
    
    // Determine next stage
    const nextStageName = actionConfig.nextStage;
    
    if (action === 'reject' && !nextStageName) {
      // Handle rejection
      instance.status = 'completed';
      instance.completedAt = new Date();
      instance.completionReason = 'rejected';
    } else if (nextStageName) {
      const nextStage = definition.stages.find(s => s.name === nextStageName);
      
      if (nextStage.type === 'end') {
        // Workflow completed
        instance.status = 'completed';
        instance.completedAt = new Date();
        instance.completionReason = 'completed';
        instance.currentStage = nextStageName;
      } else {
        // Move to next stage
        instance.currentStage = nextStageName;
        const assignees = await this.resolveAssignees(nextStage, options);
        instance.currentAssignees = assignees;
        
        // Create new tasks
        instance.pendingTasks = assignees.map((assignee, index) => ({
          taskId: `task-${Date.now()}-${index}`,
          stage: nextStageName,
          assignee,
          assignedAt: new Date(),
          status: 'pending',
        }));
        
        // Send notifications
        await this.sendNotifications(instance, nextStage, 'onEnter');
      }
    }
    
    await instance.save();
    return instance;
  }
  
  /**
   * Send notifications
   */
  async sendNotifications(instance, stage, event) {
    if (!workflowConfig.notifications.enabled) return;
    
    // Would integrate with notification service
    console.log(`Notification: ${event} for stage ${stage.name} to ${instance.currentAssignees.join(', ')}`);
  }
  
  /**
   * Get pending tasks for user
   */
  async getPendingTasks(userId, options = {}) {
    const filter = {
      'pendingTasks.assignee': userId,
      'pendingTasks.status': 'pending',
      status: 'running',
    };
    
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    const instances = await this.WorkflowInstance.find(filter)
      .sort({ priority: -1, startedAt: 1 })
      .limit(options.limit || 50);
    
    return instances.map(instance => ({
      instanceId: instance._id,
      workflowName: instance.workflowName,
      documentId: instance.documentId,
      documentNumber: instance.documentNumber,
      currentStage: instance.currentStage,
      task: instance.pendingTasks.find(t => t.assignee === userId && t.status === 'pending'),
      priority: instance.priority,
      deadline: instance.deadline,
    }));
  }
  
  /**
   * Get workflow instance
   */
  async getInstance(instanceId) {
    return this.WorkflowInstance.findById(instanceId)
      .populate('definitionId')
      .populate('documentId');
  }
  
  /**
   * Get instances for document
   */
  async getDocumentWorkflows(documentId) {
    return this.WorkflowInstance.find({ documentId })
      .sort({ startedAt: -1 });
  }
  
  /**
   * Cancel workflow
   */
  async cancelWorkflow(instanceId, options = {}) {
    const instance = await this.WorkflowInstance.findById(instanceId);
    if (!instance) throw new Error('Workflow instance not found');
    
    instance.status = 'cancelled';
    instance.completedAt = new Date();
    instance.completionReason = options.reason || 'cancelled';
    
    instance.history.push({
      stage: instance.currentStage,
      action: 'cancel',
      performedBy: options.userId,
      performedAt: new Date(),
      comment: options.reason,
    });
    
    await instance.save();
    return instance;
  }
  
  /**
   * Delegate task
   */
  async delegateTask(instanceId, toUserId, options = {}) {
    const instance = await this.WorkflowInstance.findById(instanceId);
    if (!instance) throw new Error('Workflow instance not found');
    
    const task = instance.pendingTasks.find(
      t => t.assignee === options.userId && t.status === 'pending'
    );
    if (!task) throw new Error('Task not found');
    
    // Update task
    task.status = 'completed';
    
    // Add new task
    instance.pendingTasks.push({
      taskId: `task-${Date.now()}`,
      stage: instance.currentStage,
      assignee: toUserId,
      assignedAt: new Date(),
      status: 'pending',
    });
    
    // Update assignees
    instance.currentAssignees = instance.pendingTasks
      .filter(t => t.status === 'pending')
      .map(t => t.assignee);
    
    // Add to history
    instance.history.push({
      stage: instance.currentStage,
      action: 'delegate',
      performedBy: options.userId,
      performedAt: new Date(),
      comment: `Delegated to ${toUserId}`,
      metadata: { delegatedTo: toUserId },
    });
    
    await instance.save();
    return instance;
  }
  
  /**
   * Get workflow statistics
   */
  async getStatistics(options = {}) {
    const filter = {};
    if (options.tenantId) filter.tenantId = options.tenantId;
    
    const [total, running, completed, cancelled] = await Promise.all([
      this.WorkflowInstance.countDocuments(filter),
      this.WorkflowInstance.countDocuments({ ...filter, status: 'running' }),
      this.WorkflowInstance.countDocuments({ ...filter, status: 'completed' }),
      this.WorkflowInstance.countDocuments({ ...filter, status: 'cancelled' }),
    ]);
    
    const avgDuration = await this.WorkflowInstance.aggregate([
      { $match: { ...filter, status: 'completed' } },
      {
        $group: {
          _id: null,
          avgDuration: {
            $avg: { $subtract: ['$completedAt', '$startedAt'] },
          },
        },
      },
    ]);
    
    return {
      total,
      running,
      completed,
      cancelled,
      avgDuration: avgDuration[0]?.avgDuration || 0,
    };
  }
  
  /**
   * Process timeouts
   */
  async processTimeouts() {
    const now = new Date();
    const timedOutTasks = [];
    
    // Find instances with timed out tasks
    const instances = await this.WorkflowInstance.find({
      status: 'running',
      'pendingTasks.status': 'pending',
    });
    
    for (const instance of instances) {
      const definition = await this.WorkflowDefinition.findById(instance.definitionId);
      const currentStage = definition.stages.find(s => s.name === instance.currentStage);
      
      if (currentStage?.timeout) {
        for (const task of instance.pendingTasks) {
          if (task.status === 'pending') {
            const elapsed = now - task.assignedAt;
            if (elapsed > currentStage.timeout.duration) {
              timedOutTasks.push({ instance, task, stage: currentStage });
            }
          }
        }
      }
    }
    
    return { processed: timedOutTasks.length };
  }
}

// Singleton instance
const documentWorkflowService = new DocumentWorkflowService();

/**
 * Workflow Stages (Arabic)
 */
const workflowStages = {
  draft: { name: 'draft', label: 'مسودة', icon: 'edit' },
  review: { name: 'review', label: 'مراجعة', icon: 'eye' },
  approval: { name: 'approval', label: 'موافقة', icon: 'check-circle' },
  published: { name: 'published', label: 'منشور', icon: 'globe' },
  archived: { name: 'archived', label: 'مؤرشف', icon: 'archive' },
  rejected: { name: 'rejected', label: 'مرفوض', icon: 'times-circle' },
};

/**
 * Workflow Actions (Arabic)
 */
const workflowActions = {
  approve: { name: 'approve', label: 'موافقة', icon: 'check' },
  reject: { name: 'reject', label: 'رفض', icon: 'times' },
  delegate: { name: 'delegate', label: 'تفويض', icon: 'user-plus' },
  comment: { name: 'comment', label: 'تعليق', icon: 'comment' },
  cancel: { name: 'cancel', label: 'إلغاء', icon: 'ban' },
};

module.exports = {
  DocumentWorkflowService,
  documentWorkflowService,
  workflowConfig,
  workflowStages,
  workflowActions,
};