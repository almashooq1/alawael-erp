/**
 * Workflow Pro Models — نماذج سير العمل الاحترافية
 *
 * Additional schemas for pro-level workflow features:
 * 1. Custom Form Fields (نماذج مخصصة)
 * 2. Escalation Rules (قواعد التصعيد)
 * 3. SLA Policies (سياسات مستوى الخدمة)
 * 4. Workflow KPIs (مؤشرات الأداء)
 * 5. Approval Chains (سلاسل الموافقات)
 * 6. Automation Rules (قواعد الأتمتة)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// 1) CUSTOM FORM FIELD — حقول النماذج المخصصة
// ═══════════════════════════════════════════════════════════════════════════════
const FormFieldSchema = new Schema({
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  fieldType: {
    type: String,
    required: true,
    enum: [
      'text',
      'textarea',
      'number',
      'email',
      'phone',
      'date',
      'datetime',
      'time',
      'select',
      'multi_select',
      'radio',
      'checkbox',
      'file',
      'image',
      'signature',
      'currency',
      'percentage',
      'user_lookup',
      'department_lookup',
      'table',
      'rich_text',
      'rating',
    ],
  },
  placeholder: { type: String },
  placeholderAr: { type: String },
  defaultValue: { type: Schema.Types.Mixed },
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  section: { type: String, default: 'عام' },

  // Validation
  validation: {
    minLength: { type: Number },
    maxLength: { type: Number },
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    patternMessage: { type: String },
    allowedExtensions: [{ type: String }],
    maxFileSize: { type: Number },
  },

  // Options (for select, radio, checkbox)
  options: [
    {
      label: { type: String },
      labelAr: { type: String },
      value: { type: String },
      color: { type: String },
      icon: { type: String },
    },
  ],

  // Conditional visibility
  visibleWhen: {
    field: { type: String },
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'gt',
        'lt',
        'in',
        'not_in',
        'is_empty',
        'not_empty',
      ],
    },
    value: { type: Schema.Types.Mixed },
  },

  // Table columns (for fieldType === 'table')
  tableColumns: [
    {
      name: { type: String },
      nameAr: { type: String },
      type: { type: String, enum: ['text', 'number', 'date', 'select', 'currency'] },
      options: [{ label: String, value: String }],
      width: { type: Number },
    },
  ],

  helpText: { type: String },
  helpTextAr: { type: String },
});

const WorkflowFormTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },

    // Link to workflow definition or standalone
    workflowDefinition: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
    stepId: { type: String },

    fields: [FormFieldSchema],

    // Layout
    layout: {
      type: {
        type: String,
        enum: ['single_column', 'two_column', 'tabbed', 'wizard'],
        default: 'single_column',
      },
      sections: [
        {
          title: { type: String },
          titleAr: { type: String },
          icon: { type: String },
          columns: { type: Number, default: 1 },
          fields: [{ type: String }],
        },
      ],
    },

    // Computed fields
    computedFields: [
      {
        name: { type: String },
        nameAr: { type: String },
        formula: { type: String },
        dependsOn: [{ type: String }],
      },
    ],

    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowFormTemplateSchema.index({ workflowDefinition: 1, stepId: 1 });
WorkflowFormTemplateSchema.index({ isActive: 1, name: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 2) ESCALATION RULE — قواعد التصعيد
// ═══════════════════════════════════════════════════════════════════════════════
const EscalationLevelSchema = new Schema({
  level: { type: Number, required: true },
  name: { type: String },
  nameAr: { type: String },
  triggerAfterMinutes: { type: Number, required: true },
  escalateTo: {
    type: {
      type: String,
      enum: ['user', 'role', 'manager', 'department_head', 'ceo'],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
  },
  actions: [
    {
      type: {
        type: String,
        enum: [
          'notify_email',
          'notify_sms',
          'notify_push',
          'reassign',
          'change_priority',
          'add_comment',
          'trigger_webhook',
        ],
      },
      config: { type: Schema.Types.Mixed },
    },
  ],
  notificationTemplate: { type: String },
  notificationTemplateAr: { type: String },
});

const WorkflowEscalationRuleSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },

    // Scope
    scope: {
      type: { type: String, enum: ['global', 'workflow', 'category', 'step'], default: 'global' },
      workflowDefinition: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
      category: { type: String },
      stepId: { type: String },
    },

    // Trigger condition
    triggerOn: {
      type: String,
      enum: [
        'task_overdue',
        'instance_sla_breach',
        'no_action_taken',
        'pending_approval',
        'stuck_instance',
      ],
      default: 'task_overdue',
    },

    // Escalation chain
    levels: [EscalationLevelSchema],
    maxLevels: { type: Number, default: 3 },

    // Schedule settings
    schedule: {
      activeHours: {
        start: { type: String, default: '08:00' },
        end: { type: String, default: '17:00' },
      },
      activeDays: [{ type: Number }],
      timezone: { type: String, default: 'Asia/Riyadh' },
      excludeHolidays: { type: Boolean, default: true },
    },

    // Stats tracking
    stats: {
      totalTriggered: { type: Number, default: 0 },
      lastTriggered: { type: Date },
      resolvedBeforeEscalation: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowEscalationRuleSchema.index({ isActive: 1, 'scope.type': 1 });
WorkflowEscalationRuleSchema.index({ triggerOn: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 3) ESCALATION LOG — سجل التصعيدات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowEscalationLogSchema = new Schema(
  {
    escalationRule: { type: Schema.Types.ObjectId, ref: 'WorkflowEscalationRule', required: true },
    workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },

    currentLevel: { type: Number, default: 1 },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedFrom: { type: Schema.Types.ObjectId, ref: 'User' },

    reason: { type: String },
    status: {
      type: String,
      enum: ['active', 'resolved', 'expired', 'cancelled'],
      default: 'active',
    },

    actions: [
      {
        action: { type: String },
        executedAt: { type: Date, default: Date.now },
        result: { type: String, enum: ['success', 'failed'] },
        details: { type: Schema.Types.Mixed },
      },
    ],

    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String },
  },
  { timestamps: true }
);

WorkflowEscalationLogSchema.index({ escalationRule: 1, status: 1 });
WorkflowEscalationLogSchema.index({ taskInstance: 1 });
WorkflowEscalationLogSchema.index({ workflowInstance: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 4) SLA POLICY — سياسات مستوى الخدمة
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowSLAPolicySchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },

    // Scope — which workflows this SLA applies to
    scope: {
      type: {
        type: String,
        enum: ['global', 'workflow', 'category', 'priority'],
        default: 'global',
      },
      workflowDefinitions: [{ type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' }],
      categories: [{ type: String }],
      priorities: [{ type: String }],
    },

    // Targets
    targets: {
      responseTimeMinutes: { type: Number },
      resolutionTimeMinutes: { type: Number },
      firstActionTimeMinutes: { type: Number },
      approvalTimeMinutes: { type: Number },
    },

    // Warning thresholds (percentages)
    thresholds: {
      warning: { type: Number, default: 75 },
      critical: { type: Number, default: 90 },
      breach: { type: Number, default: 100 },
    },

    // Business hours
    businessHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      workDays: [{ type: Number }],
      timezone: { type: String, default: 'Asia/Riyadh' },
    },

    // Notification on breach
    notifications: {
      onWarning: {
        enabled: { type: Boolean, default: true },
        recipients: [{ type: String, enum: ['assignee', 'manager', 'admin'] }],
      },
      onCritical: {
        enabled: { type: Boolean, default: true },
        recipients: [{ type: String, enum: ['assignee', 'manager', 'admin', 'department_head'] }],
      },
      onBreach: {
        enabled: { type: Boolean, default: true },
        recipients: [
          { type: String, enum: ['assignee', 'manager', 'admin', 'department_head', 'ceo'] },
        ],
      },
    },

    // Penalties (optional)
    penalties: [
      {
        thresholdType: { type: String, enum: ['warning', 'critical', 'breach'] },
        action: { type: String, enum: ['notify', 'escalate', 'reassign', 'flag', 'deduct_points'] },
        config: { type: Schema.Types.Mixed },
      },
    ],

    // Compliance tracking
    compliance: {
      totalChecked: { type: Number, default: 0 },
      totalMet: { type: Number, default: 0 },
      totalBreached: { type: Number, default: 0 },
      complianceRate: { type: Number, default: 100 },
      lastCheckedAt: { type: Date },
    },

    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowSLAPolicySchema.index({ isActive: 1, priority: -1 });
WorkflowSLAPolicySchema.index({ 'scope.type': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5) APPROVAL CHAIN — سلاسل الموافقات
// ═══════════════════════════════════════════════════════════════════════════════
const ApprovalStepSchema = new Schema({
  order: { type: Number, required: true },
  name: { type: String },
  nameAr: { type: String },

  // Approver assignment
  approverType: {
    type: String,
    enum: [
      'specific_user',
      'role',
      'department_head',
      'direct_manager',
      'skip_level_manager',
      'group',
    ],
    required: true,
  },
  approverUser: { type: Schema.Types.ObjectId, ref: 'User' },
  approverRole: { type: String },
  approverGroup: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // Quorum settings (for group)
  quorum: {
    type: { type: String, enum: ['all', 'any', 'majority', 'count', 'percentage'], default: 'all' },
    count: { type: Number },
    percentage: { type: Number },
  },

  // Conditions
  conditions: [
    {
      field: { type: String },
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'in', 'between'],
      },
      value: { type: Schema.Types.Mixed },
      value2: { type: Schema.Types.Mixed },
    },
  ],

  // Auto-approve rules
  autoApprove: {
    enabled: { type: Boolean, default: false },
    afterMinutes: { type: Number },
    conditions: { type: Schema.Types.Mixed },
  },

  // Delegation fallback
  delegationEnabled: { type: Boolean, default: true },
  timeoutMinutes: { type: Number },
  timeoutAction: {
    type: String,
    enum: ['escalate', 'auto_approve', 'auto_reject', 'skip'],
    default: 'escalate',
  },

  instructions: { type: String },
  instructionsAr: { type: String },
});

const WorkflowApprovalChainSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },

    // Chain type
    chainType: {
      type: String,
      enum: ['serial', 'parallel', 'conditional', 'hybrid'],
      default: 'serial',
    },

    steps: [ApprovalStepSchema],

    // Conditional routing
    routing: [
      {
        condition: {
          field: { type: String },
          operator: { type: String },
          value: { type: Schema.Types.Mixed },
        },
        targetSteps: [{ type: Number }],
      },
    ],

    // On rejection
    onRejection: {
      action: {
        type: String,
        enum: ['stop', 'restart', 'go_to_step', 'notify_and_stop'],
        default: 'stop',
      },
      targetStep: { type: Number },
      requireComment: { type: Boolean, default: true },
    },

    // Stats
    stats: {
      timesUsed: { type: Number, default: 0 },
      avgCompletionMinutes: { type: Number, default: 0 },
      approvalRate: { type: Number, default: 0 },
    },

    category: {
      type: String,
      enum: ['general', 'financial', 'hr', 'procurement', 'legal', 'it', 'custom'],
      default: 'general',
    },
    isTemplate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowApprovalChainSchema.index({ isActive: 1, category: 1 });
WorkflowApprovalChainSchema.index({ isTemplate: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 6) APPROVAL CHAIN INSTANCE — مثيل سلسلة الموافقات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowApprovalInstanceSchema = new Schema(
  {
    approvalChain: { type: Schema.Types.ObjectId, ref: 'WorkflowApprovalChain', required: true },
    workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },

    currentStep: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'timed_out'],
      default: 'pending',
    },

    stepResults: [
      {
        stepOrder: { type: Number },
        approver: { type: Schema.Types.ObjectId, ref: 'User' },
        decision: {
          type: String,
          enum: ['approved', 'rejected', 'skipped', 'delegated', 'auto_approved', 'timed_out'],
        },
        comment: { type: String },
        decidedAt: { type: Date },
        delegatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],

    formData: { type: Schema.Types.Mixed },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowApprovalInstanceSchema.index({ approvalChain: 1, status: 1 });
WorkflowApprovalInstanceSchema.index({ workflowInstance: 1 });
WorkflowApprovalInstanceSchema.index({ 'stepResults.approver': 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 7) AUTOMATION RULE — قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════════════════════
const AutomationConditionSchema = new Schema({
  field: { type: String, required: true },
  operator: {
    type: String,
    enum: [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'not_in',
      'regex',
      'is_empty',
      'not_empty',
      'between',
      'starts_with',
      'ends_with',
    ],
    required: true,
  },
  value: { type: Schema.Types.Mixed },
  value2: { type: Schema.Types.Mixed },
});

const AutomationActionSchema = new Schema({
  actionType: {
    type: String,
    required: true,
    enum: [
      'assign_task',
      'reassign_task',
      'change_priority',
      'add_tag',
      'remove_tag',
      'add_comment',
      'send_notification',
      'send_email',
      'send_sms',
      'trigger_webhook',
      'start_sub_workflow',
      'update_field',
      'set_deadline',
      'escalate',
      'approve_auto',
      'reject_auto',
      'move_to_step',
      'suspend_instance',
      'cancel_instance',
      'log_audit',
    ],
  },
  config: { type: Schema.Types.Mixed, required: true },
  delay: {
    enabled: { type: Boolean, default: false },
    minutes: { type: Number, default: 0 },
  },
  order: { type: Number, default: 0 },
});

const WorkflowAutomationRuleSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String },
    descriptionAr: { type: String },

    // Trigger event
    trigger: {
      event: {
        type: String,
        required: true,
        enum: [
          'instance_started',
          'instance_completed',
          'instance_cancelled',
          'instance_suspended',
          'task_created',
          'task_assigned',
          'task_started',
          'task_completed',
          'task_overdue',
          'approval_requested',
          'approval_granted',
          'approval_rejected',
          'sla_warning',
          'sla_breach',
          'comment_added',
          'field_changed',
          'schedule',
        ],
      },
      // Schedule trigger (cron-like)
      schedule: {
        frequency: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly', 'cron'] },
        cronExpression: { type: String },
        nextRunAt: { type: Date },
      },
    },

    // Scope
    scope: {
      workflowDefinitions: [{ type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' }],
      categories: [{ type: String }],
      stepIds: [{ type: String }],
    },

    // Conditions (all must be true — AND logic)
    conditions: [AutomationConditionSchema],
    conditionLogic: { type: String, enum: ['and', 'or'], default: 'and' },

    // Actions (executed in order)
    actions: [AutomationActionSchema],

    // Execution settings
    execution: {
      maxExecutionsPerHour: { type: Number, default: 100 },
      cooldownMinutes: { type: Number, default: 0 },
      stopOnError: { type: Boolean, default: false },
      retryOnFailure: { type: Boolean, default: false },
      maxRetries: { type: Number, default: 3 },
    },

    // Stats
    stats: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      lastExecutedAt: { type: Date },
      lastError: { type: String },
      avgExecutionTimeMs: { type: Number, default: 0 },
    },

    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowAutomationRuleSchema.index({ isActive: 1, 'trigger.event': 1, priority: -1 });
WorkflowAutomationRuleSchema.index({ 'scope.workflowDefinitions': 1 });
WorkflowAutomationRuleSchema.index({ 'trigger.schedule.nextRunAt': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 8) AUTOMATION EXECUTION LOG — سجل تنفيذ الأتمتة
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowAutomationLogSchema = new Schema(
  {
    automationRule: { type: Schema.Types.ObjectId, ref: 'WorkflowAutomationRule', required: true },
    workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },

    triggerEvent: { type: String },
    triggerData: { type: Schema.Types.Mixed },

    conditionsMatched: { type: Boolean, default: true },
    conditionDetails: [
      { field: String, expected: Schema.Types.Mixed, actual: Schema.Types.Mixed, passed: Boolean },
    ],

    actionsExecuted: [
      {
        actionType: { type: String },
        status: { type: String, enum: ['success', 'failed', 'skipped'] },
        result: { type: Schema.Types.Mixed },
        executedAt: { type: Date, default: Date.now },
        error: { type: String },
        executionTimeMs: { type: Number },
      },
    ],

    status: { type: String, enum: ['success', 'partial', 'failed', 'skipped'], default: 'success' },
    executionTimeMs: { type: Number },
    error: { type: String },
  },
  { timestamps: true }
);

WorkflowAutomationLogSchema.index({ automationRule: 1, createdAt: -1 });
WorkflowAutomationLogSchema.index({ workflowInstance: 1 });
WorkflowAutomationLogSchema.index({ status: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 9) WORKFLOW KPI SNAPSHOT — لقطات مؤشرات الأداء
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowKPISnapshotSchema = new Schema(
  {
    period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    date: { type: Date, required: true },

    // Throughput KPIs
    throughput: {
      instancesStarted: { type: Number, default: 0 },
      instancesCompleted: { type: Number, default: 0 },
      instancesCancelled: { type: Number, default: 0 },
      tasksCreated: { type: Number, default: 0 },
      tasksCompleted: { type: Number, default: 0 },
    },

    // Time KPIs (in minutes)
    timing: {
      avgCycleTime: { type: Number, default: 0 },
      medianCycleTime: { type: Number, default: 0 },
      avgTaskTime: { type: Number, default: 0 },
      avgApprovalTime: { type: Number, default: 0 },
      avgFirstResponseTime: { type: Number, default: 0 },
    },

    // Quality KPIs
    quality: {
      firstPassYield: { type: Number, default: 0 },
      reworkRate: { type: Number, default: 0 },
      rejectionRate: { type: Number, default: 0 },
      slaComplianceRate: { type: Number, default: 0 },
      escalationRate: { type: Number, default: 0 },
    },

    // Efficiency KPIs
    efficiency: {
      automationRate: { type: Number, default: 0 },
      onTimeCompletionRate: { type: Number, default: 0 },
      bottleneckStepId: { type: String },
      bottleneckStepName: { type: String },
      avgStepsPerInstance: { type: Number, default: 0 },
    },

    // Workload KPIs
    workload: {
      activeInstances: { type: Number, default: 0 },
      pendingTasks: { type: Number, default: 0 },
      overdueItems: { type: Number, default: 0 },
      avgTasksPerUser: { type: Number, default: 0 },
    },

    // Breakdown by workflow definition
    byDefinition: [
      {
        definitionId: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' },
        definitionName: { type: String },
        instanceCount: { type: Number },
        avgCycleTime: { type: Number },
        slaCompliance: { type: Number },
      },
    ],

    // Breakdown by department
    byDepartment: [
      {
        department: { type: String },
        taskCount: { type: Number },
        avgCompletionTime: { type: Number },
        overdueCount: { type: Number },
      },
    ],

    generatedBy: { type: String, enum: ['system', 'manual'], default: 'system' },
  },
  { timestamps: true }
);

WorkflowKPISnapshotSchema.index({ period: 1, date: -1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

const WorkflowFormTemplate =
  mongoose.models.WorkflowFormTemplate ||
  mongoose.models.WorkflowFormTemplate || mongoose.model('WorkflowFormTemplate', WorkflowFormTemplateSchema);
const WorkflowEscalationRule =
  mongoose.models.WorkflowEscalationRule ||
  mongoose.models.WorkflowEscalationRule || mongoose.model('WorkflowEscalationRule', WorkflowEscalationRuleSchema);
const WorkflowEscalationLog =
  mongoose.models.WorkflowEscalationLog ||
  mongoose.models.WorkflowEscalationLog || mongoose.model('WorkflowEscalationLog', WorkflowEscalationLogSchema);
const WorkflowSLAPolicy =
  mongoose.models.WorkflowSLAPolicy || mongoose.model('WorkflowSLAPolicy', WorkflowSLAPolicySchema);
const WorkflowApprovalChain =
  mongoose.models.WorkflowApprovalChain ||
  mongoose.models.WorkflowApprovalChain || mongoose.model('WorkflowApprovalChain', WorkflowApprovalChainSchema);
const WorkflowApprovalInstance =
  mongoose.models.WorkflowApprovalInstance ||
  mongoose.models.WorkflowApprovalInstance || mongoose.model('WorkflowApprovalInstance', WorkflowApprovalInstanceSchema);
const WorkflowAutomationRule =
  mongoose.models.WorkflowAutomationRule ||
  mongoose.models.WorkflowAutomationRule || mongoose.model('WorkflowAutomationRule', WorkflowAutomationRuleSchema);
const WorkflowAutomationLog =
  mongoose.models.WorkflowAutomationLog ||
  mongoose.models.WorkflowAutomationLog || mongoose.model('WorkflowAutomationLog', WorkflowAutomationLogSchema);
const WorkflowKPISnapshot =
  mongoose.models.WorkflowKPISnapshot ||
  mongoose.models.WorkflowKPISnapshot || mongoose.model('WorkflowKPISnapshot', WorkflowKPISnapshotSchema);

module.exports = {
  WorkflowFormTemplate,
  WorkflowEscalationRule,
  WorkflowEscalationLog,
  WorkflowSLAPolicy,
  WorkflowApprovalChain,
  WorkflowApprovalInstance,
  WorkflowAutomationRule,
  WorkflowAutomationLog,
  WorkflowKPISnapshot,
};
