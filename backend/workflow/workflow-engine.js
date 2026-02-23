/**
 * Workflow Engine - محرك سير العمل
 * Enterprise Workflow Automation for Alawael ERP
 */

const mongoose = require('mongoose');

/**
 * Workflow Configuration
 */
const workflowConfig = {
  // Execution settings
  maxConcurrentWorkflows: 100,
  defaultTimeout: 3600000, // 1 hour
  retryAttempts: 3,
  retryDelay: 5000,
  
  // Priority levels
  priorities: {
    low: 1,
    normal: 5,
    high: 10,
    critical: 20,
  },
};

/**
 * Workflow Definition Schema
 */
const WorkflowDefinitionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  version: { type: String, default: '1.0.0' },
  
  // Trigger configuration
  trigger: {
    type: { type: String, enum: ['manual', 'event', 'schedule', 'webhook'], required: true },
    event: String,
    schedule: String, // Cron expression
    webhook: String,
  },
  
  // Steps definition
  steps: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['task', 'decision', 'parallel', 'delay', 'notification'], required: true },
    
    // Task configuration
    action: String,
    params: mongoose.Schema.Types.Mixed,
    
    // Decision configuration
    conditions: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'exists'] },
      value: mongoose.Schema.Types.Mixed,
      nextStep: String,
    }],
    
    // Flow control
    nextStep: String,
    parallelSteps: [String],
    
    // Error handling
    onError: { type: String, enum: ['continue', 'stop', 'retry'] },
    retryCount: { type: Number, default: 0 },
  }],
  
  // Initial step
  initialStep: String,
  
  // Metadata
  category: String,
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
  definitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
  definitionName: String,
  
  // Status
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  
  // Context data
  context: mongoose.Schema.Types.Mixed,
  
  // Current state
  currentStep: String,
  completedSteps: [String],
  
  // Execution history
  history: [{
    stepId: String,
    stepName: String,
    status: String,
    startedAt: Date,
    completedAt: Date,
    output: mongoose.Schema.Types.Mixed,
    error: String,
  }],
  
  // Priority
  priority: { type: Number, default: 5 },
  
  // Timing
  startedAt: Date,
  completedAt: Date,
  
  // Trigger info
  triggeredBy: String,
  triggerType: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'workflow_instances',
});

// Indexes
WorkflowInstanceSchema.index({ status: 1, createdAt: -1 });
WorkflowInstanceSchema.index({ definitionId: 1, status: 1 });
WorkflowInstanceSchema.index({ tenantId: 1 });

/**
 * Workflow Engine Class
 */
class WorkflowEngine {
  constructor() {
    this.WorkflowDefinition = null;
    this.WorkflowInstance = null;
    this.actionHandlers = new Map();
    this.eventListeners = new Map();
    this.runningInstances = new Map();
  }
  
  /**
   * Initialize engine
   */
  async initialize(connection) {
    this.WorkflowDefinition = connection.model('WorkflowDefinition', WorkflowDefinitionSchema);
    this.WorkflowInstance = connection.model('WorkflowInstance', WorkflowInstanceSchema);
    
    // Register default actions
    this.registerDefaultActions();
    
    console.log('✅ Workflow Engine initialized');
  }
  
  /**
   * Register default actions
   */
  registerDefaultActions() {
    // Notification action
    this.registerAction('notify', async (params, context) => {
      const { notificationService } = require('../communication/email-service');
      // Send notification based on params
      return { notified: true, recipients: params.recipients };
    });
    
    // Email action
    this.registerAction('sendEmail', async (params, context) => {
      const { emailService } = require('../communication/email-service');
      await emailService.send(params);
      return { sent: true };
    });
    
    // Database action
    this.registerAction('dbUpdate', async (params, context) => {
      const { model, query, update } = params;
      // Perform database update
      return { updated: true };
    });
    
    // API action
    this.registerAction('apiCall', async (params, context) => {
      const axios = require('axios');
      const response = await axios(params);
      return { data: response.data, status: response.status };
    });
    
    // Delay action
    this.registerAction('delay', async (params, context) => {
      await new Promise(resolve => setTimeout(resolve, params.duration || 1000));
      return { delayed: true };
    });
    
    // Transform action
    this.registerAction('transform', async (params, context) => {
      const { mapping } = params;
      const result = {};
      for (const [key, path] of Object.entries(mapping)) {
        result[key] = this.getValueFromPath(context, path);
      }
      return result;
    });
    
    // Log action
    this.registerAction('log', async (params, context) => {
      console.log(`[Workflow] ${params.message}`, params.data || '');
      return { logged: true };
    });
  }
  
  /**
   * Register custom action
   */
  registerAction(name, handler) {
    this.actionHandlers.set(name, handler);
  }
  
  /**
   * Create workflow definition
   */
  async createDefinition(definition) {
    const workflow = new this.WorkflowDefinition(definition);
    await workflow.save();
    return workflow;
  }
  
  /**
   * Start workflow
   */
  async start(definitionName, context = {}, options = {}) {
    // Get definition
    const definition = await this.WorkflowDefinition.findOne({ name: definitionName, isActive: true });
    if (!definition) {
      throw new Error(`Workflow definition '${definitionName}' not found`);
    }
    
    // Create instance
    const instance = new this.WorkflowInstance({
      definitionId: definition._id,
      definitionName: definition.name,
      context: { ...context, workflowId: definition._id },
      currentStep: definition.initialStep,
      priority: options.priority || 5,
      triggeredBy: options.triggeredBy || 'system',
      triggerType: options.triggerType || 'manual',
      tenantId: options.tenantId,
    });
    
    await instance.save();
    
    // Start execution
    this.execute(instance._id).catch(err => {
      console.error('Workflow execution error:', err);
    });
    
    return instance;
  }
  
  /**
   * Execute workflow instance
   */
  async execute(instanceId) {
    const instance = await this.WorkflowInstance.findById(instanceId);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    
    // Update status
    instance.status = 'running';
    instance.startedAt = new Date();
    await instance.save();
    
    try {
      const definition = await this.WorkflowDefinition.findById(instance.definitionId);
      
      while (instance.currentStep && instance.status === 'running') {
        const step = definition.steps.find(s => s.id === instance.currentStep);
        if (!step) break;
        
        // Execute step
        await this.executeStep(instance, step);
        
        // Save instance
        await instance.save();
      }
      
      // Mark as completed
      if (instance.status === 'running') {
        instance.status = 'completed';
        instance.completedAt = new Date();
        await instance.save();
      }
      
    } catch (error) {
      instance.status = 'failed';
      instance.completedAt = new Date();
      await instance.save();
      throw error;
    }
    
    return instance;
  }
  
  /**
   * Execute single step
   */
  async executeStep(instance, step) {
    const historyEntry = {
      stepId: step.id,
      stepName: step.name,
      status: 'running',
      startedAt: new Date(),
    };
    
    try {
      let output;
      
      switch (step.type) {
        case 'task':
          output = await this.executeTask(step, instance.context);
          break;
          
        case 'decision':
          output = await this.executeDecision(step, instance.context);
          break;
          
        case 'parallel':
          output = await this.executeParallel(step, instance.context);
          break;
          
        case 'delay':
          output = await this.executeDelay(step);
          break;
          
        case 'notification':
          output = await this.executeNotification(step, instance.context);
          break;
      }
      
      // Update history
      historyEntry.status = 'completed';
      historyEntry.completedAt = new Date();
      historyEntry.output = output;
      instance.history.push(historyEntry);
      instance.completedSteps.push(step.id);
      
      // Determine next step
      if (step.type === 'decision' && output.nextStep) {
        instance.currentStep = output.nextStep;
      } else {
        instance.currentStep = step.nextStep;
      }
      
    } catch (error) {
      historyEntry.status = 'failed';
      historyEntry.completedAt = new Date();
      historyEntry.error = error.message;
      instance.history.push(historyEntry);
      
      // Handle error
      if (step.onError === 'stop') {
        throw error;
      } else if (step.onError === 'retry' && step.retryCount > 0) {
        step.retryCount--;
        await new Promise(resolve => setTimeout(resolve, workflowConfig.retryDelay));
        return this.executeStep(instance, step);
      }
      
      instance.currentStep = step.nextStep;
    }
  }
  
  /**
   * Execute task step
   */
  async executeTask(step, context) {
    const handler = this.actionHandlers.get(step.action);
    if (!handler) {
      throw new Error(`Action '${step.action}' not found`);
    }
    
    const params = this.resolveParams(step.params || {}, context);
    return handler(params, context);
  }
  
  /**
   * Execute decision step
   */
  async executeDecision(step, context) {
    for (const condition of step.conditions) {
      const value = this.getValueFromPath(context, condition.field);
      
      if (this.evaluateCondition(value, condition.operator, condition.value)) {
        return { matched: true, nextStep: condition.nextStep };
      }
    }
    
    return { matched: false, nextStep: step.nextStep };
  }
  
  /**
   * Execute parallel steps
   */
  async executeParallel(step, context) {
    const promises = step.parallelSteps.map(async stepId => {
      // Find and execute parallel step
      return { stepId, completed: true };
    });
    
    const results = await Promise.all(promises);
    return { results };
  }
  
  /**
   * Execute delay step
   */
  async executeDelay(step) {
    const duration = step.params?.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    return { delayed: true, duration };
  }
  
  /**
   * Execute notification step
   */
  async executeNotification(step, context) {
    const params = this.resolveParams(step.params || {}, context);
    // Send notification
    return { notified: true, params };
  }
  
  /**
   * Evaluate condition
   */
  evaluateCondition(value, operator, expected) {
    switch (operator) {
      case 'eq': return value === expected;
      case 'ne': return value !== expected;
      case 'gt': return value > expected;
      case 'lt': return value < expected;
      case 'gte': return value >= expected;
      case 'lte': return value <= expected;
      case 'contains': return String(value).includes(expected);
      case 'exists': return value !== undefined && value !== null;
      default: return false;
    }
  }
  
  /**
   * Resolve parameters with context
   */
  resolveParams(params, context) {
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const path = value.slice(2, -1);
        resolved[key] = this.getValueFromPath(context, path);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }
  
  /**
   * Get value from object path
   */
  getValueFromPath(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
  
  /**
   * Cancel workflow
   */
  async cancel(instanceId) {
    const instance = await this.WorkflowInstance.findByIdAndUpdate(
      instanceId,
      { status: 'cancelled', completedAt: new Date() },
      { new: true }
    );
    return instance;
  }
  
  /**
   * Get workflow status
   */
  async getStatus(instanceId) {
    const instance = await this.WorkflowInstance.findById(instanceId);
    return {
      status: instance.status,
      currentStep: instance.currentStep,
      completedSteps: instance.completedSteps,
      progress: (instance.completedSteps.length / (instance.history.length + 1)) * 100,
    };
  }
  
  /**
   * List workflow definitions
   */
  async listDefinitions(filter = {}) {
    return this.WorkflowDefinition.find(filter);
  }
  
  /**
   * List workflow instances
   */
  async listInstances(filter = {}) {
    return this.WorkflowInstance.find(filter).sort({ createdAt: -1 });
  }
}

// Singleton instance
const workflowEngine = new WorkflowEngine();

/**
 * Pre-built Workflow Templates
 */
const workflowTemplates = {
  // Approval workflow
  approval: {
    name: 'approval',
    description: 'سير عمل الموافقات',
    trigger: { type: 'manual' },
    steps: [
      { id: 'submit', name: 'إرسال للموافقة', type: 'task', action: 'notify', nextStep: 'wait_approval' },
      { id: 'wait_approval', name: 'انتظار الموافقة', type: 'decision', conditions: [
        { field: 'approved', operator: 'eq', value: true, nextStep: 'approved' },
        { field: 'approved', operator: 'eq', value: false, nextStep: 'rejected' },
      ], nextStep: 'timeout' },
      { id: 'approved', name: 'موافق عليه', type: 'task', action: 'notify' },
      { id: 'rejected', name: 'مرفوض', type: 'task', action: 'notify' },
      { id: 'timeout', name: 'انتهت المهلة', type: 'task', action: 'notify' },
    ],
    initialStep: 'submit',
  },
  
  // Onboarding workflow
  onboarding: {
    name: 'employee_onboarding',
    description: 'سير عمل توظيف موظف جديد',
    trigger: { type: 'event', event: 'employee.created' },
    steps: [
      { id: 'create_accounts', name: 'إنشاء الحسابات', type: 'task', action: 'dbUpdate', nextStep: 'send_welcome' },
      { id: 'send_welcome', name: 'إرسال ترحيب', type: 'task', action: 'sendEmail', nextStep: 'assign_training' },
      { id: 'assign_training', name: 'تسجيل التدريب', type: 'task', action: 'dbUpdate', nextStep: 'notify_manager' },
      { id: 'notify_manager', name: 'إشعار المدير', type: 'notification', action: 'notify' },
    ],
    initialStep: 'create_accounts',
  },
  
  // Purchase order workflow
  purchaseOrder: {
    name: 'purchase_order',
    description: 'سير عمل طلب الشراء',
    trigger: { type: 'manual' },
    steps: [
      { id: 'check_budget', name: 'التحقق من الميزانية', type: 'decision', conditions: [
        { field: 'withinBudget', operator: 'eq', value: true, nextStep: 'get_approval' },
      ], nextStep: 'reject_budget' },
      { id: 'get_approval', name: 'طلب الموافقة', type: 'task', action: 'notify', nextStep: 'wait_manager' },
      { id: 'wait_manager', name: 'انتظار موافقة المدير', type: 'decision', conditions: [
        { field: 'managerApproved', operator: 'eq', value: true, nextStep: 'create_po' },
      ], nextStep: 'reject_manager' },
      { id: 'create_po', name: 'إنشاء أمر الشراء', type: 'task', action: 'dbUpdate' },
      { id: 'reject_budget', name: 'رفض - تجاوز الميزانية', type: 'task', action: 'notify' },
      { id: 'reject_manager', name: 'رفض من المدير', type: 'task', action: 'notify' },
    ],
    initialStep: 'check_budget',
  },
};

module.exports = {
  WorkflowEngine,
  workflowEngine,
  workflowConfig,
  workflowTemplates,
};