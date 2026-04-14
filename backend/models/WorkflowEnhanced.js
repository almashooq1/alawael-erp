/**
 * Enhanced Workflow Models - نماذج سير العمل المتقدمة
 *
 * Additional schemas for extended workflow features:
 * - Comments & Discussion Threads
 * - Favorites & Bookmarks
 * - Delegation & Out-of-Office
 * - Reminders & Scheduled Notifications
 * - Webhooks & External Triggers
 * - Saved Reports & Filters
 * - Workflow Tags
 * - Version Snapshots
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// 1) WORKFLOW COMMENT — تعليقات سير العمل
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowCommentSchema = new Schema(
  {
    // Target — either an instance or a task
    workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },

    // Thread support
    parentComment: { type: Schema.Types.ObjectId, ref: 'WorkflowComment' },
    isReply: { type: Boolean, default: false },

    // Content
    content: { type: String, required: true, maxlength: 5000 },
    contentType: {
      type: String,
      enum: ['text', 'markdown', 'system'],
      default: 'text',
    },

    // Mentions
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Attachments
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        size: { type: Number },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Reactions
    reactions: [
      {
        emoji: { type: String },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Flags
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },

    // Author
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WorkflowCommentSchema.index({ workflowInstance: 1, createdAt: -1 });
WorkflowCommentSchema.index({ taskInstance: 1, createdAt: -1 });
WorkflowCommentSchema.index({ parentComment: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 2) WORKFLOW FAVORITE — المفضلة والمُثبتات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowFavoriteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: {
      type: String,
      enum: ['definition', 'instance', 'template'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String }, // Custom label
    color: { type: String }, // Color tag
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WorkflowFavoriteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════════════════════
// 3) WORKFLOW DELEGATION — التفويض والنيابة
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowDelegationSchema = new Schema(
  {
    // The user who is delegating
    delegator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The user who receives the delegation
    delegate: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Scope
    scope: {
      type: String,
      enum: ['all', 'specific_workflows', 'specific_categories'],
      default: 'all',
    },
    workflowDefinitions: [{ type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' }],
    categories: [{ type: String }],

    // Duration
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Reason
    reason: {
      type: String,
      enum: ['vacation', 'sick_leave', 'business_trip', 'training', 'other'],
      default: 'vacation',
    },
    reasonText: { type: String },

    // Status
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
    },

    // Auto-reply message
    autoReplyEnabled: { type: Boolean, default: false },
    autoReplyMessage: { type: String },

    // Notifications
    notifyDelegator: { type: Boolean, default: true },
    notifyDelegate: { type: Boolean, default: true },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

WorkflowDelegationSchema.index({ delegator: 1, status: 1 });
WorkflowDelegationSchema.index({ delegate: 1, status: 1 });
WorkflowDelegationSchema.index({ startDate: 1, endDate: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 4) WORKFLOW REMINDER — التذكيرات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowReminderSchema = new Schema(
  {
    // Target
    workflowInstance: { type: Schema.Types.ObjectId, ref: 'WorkflowInstance' },
    taskInstance: { type: Schema.Types.ObjectId, ref: 'TaskInstance' },

    // Who to remind
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Schedule
    reminderDate: { type: Date, required: true },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['daily', 'weekly', 'custom_hours'],
    },
    recurringHours: { type: Number }, // For custom_hours
    nextReminderDate: { type: Date },

    // Content
    title: { type: String, required: true },
    message: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Channels
    channels: [
      {
        type: String,
        enum: ['in_app', 'email', 'sms', 'push'],
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['pending', 'sent', 'cancelled', 'failed'],
      default: 'pending',
    },
    sentAt: { type: Date },
    error: { type: String },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowReminderSchema.index({ reminderDate: 1, status: 1 });
WorkflowReminderSchema.index({ user: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 5) WORKFLOW WEBHOOK — الربط الخارجي
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowWebhookSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    // Target workflow
    workflowDefinition: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' },

    // Events to trigger on
    events: [
      {
        type: String,
        enum: [
          'instance.started',
          'instance.completed',
          'instance.cancelled',
          'instance.error',
          'task.assigned',
          'task.completed',
          'task.overdue',
          'sla.violated',
          'comment.added',
        ],
      },
    ],

    // Webhook URL
    url: { type: String, required: true },
    method: { type: String, enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    headers: { type: Map, of: String },
    secretKey: { type: String, select: false }, // For HMAC signature
    contentType: {
      type: String,
      enum: ['application/json', 'application/x-www-form-urlencoded'],
      default: 'application/json',
    },

    // Authentication
    auth: {
      type: { type: String, enum: ['none', 'bearer', 'basic', 'api_key'] },
      token: { type: String, select: false },
      username: { type: String },
      password: { type: String, select: false },
      apiKeyHeader: { type: String },
      apiKeyValue: { type: String, select: false },
    },

    // Retry
    retryCount: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 5000 }, // ms

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active',
    },
    lastTriggeredAt: { type: Date },
    lastResponseStatus: { type: Number },
    lastError: { type: String },
    totalTriggered: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowWebhookSchema.index({ workflowDefinition: 1 });
WorkflowWebhookSchema.index({ events: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 6) WORKFLOW SAVED REPORT — التقارير المحفوظة
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowSavedReportSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    // Report type
    reportType: {
      type: String,
      enum: [
        'performance',
        'sla_compliance',
        'task_distribution',
        'bottleneck_analysis',
        'user_productivity',
        'category_breakdown',
        'trend_analysis',
        'custom',
      ],
      required: true,
    },

    // Filters
    filters: {
      dateRange: {
        start: { type: Date },
        end: { type: Date },
      },
      categories: [String],
      statuses: [String],
      priorities: [String],
      assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      definitions: [{ type: Schema.Types.ObjectId, ref: 'WorkflowDefinition' }],
    },

    // Schedule
    isScheduled: { type: Boolean, default: false },
    schedule: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
      dayOfWeek: { type: Number }, // 0-6
      dayOfMonth: { type: Number }, // 1-31
      time: { type: String }, // HH:mm
      recipients: [{ type: String }], // Email addresses
      format: { type: String, enum: ['pdf', 'excel', 'csv'], default: 'pdf' },
    },
    lastGeneratedAt: { type: Date },
    nextGenerateAt: { type: Date },

    // Sharing
    isPublic: { type: Boolean, default: false },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowSavedReportSchema.index({ createdBy: 1 });
WorkflowSavedReportSchema.index({ reportType: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 7) WORKFLOW TAG — التصنيفات والوسوم
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowTagSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    color: { type: String, default: '#1976d2' },
    icon: { type: String },
    description: { type: String },
    category: {
      type: String,
      enum: ['department', 'priority', 'type', 'status', 'custom'],
      default: 'custom',
    },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowTagSchema.index({ name: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════════════════════
// 8) WORKFLOW VERSION SNAPSHOT — نسخ التعريفات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowVersionSchema = new Schema(
  {
    workflowDefinition: { type: Schema.Types.ObjectId, ref: 'WorkflowDefinition', required: true },
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true }, // Full definition snapshot
    changeLog: { type: String },
    changeType: {
      type: String,
      enum: ['created', 'steps_modified', 'settings_changed', 'published', 'deprecated'],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

WorkflowVersionSchema.index({ workflowDefinition: 1, version: -1 });

// ═══════════════════════════════════════════════════════════════════════════════
// 9) WORKFLOW NOTIFICATION PREFERENCE — تفضيلات الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════
const WorkflowNotifPrefSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    // Global toggle
    enabled: { type: Boolean, default: true },

    // By event
    events: {
      taskAssigned: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      taskCompleted: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
      },
      taskOverdue: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      instanceCompleted: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
      commentMention: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      slaWarning: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      delegationReceived: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
      },
    },

    // Digest
    digestEnabled: { type: Boolean, default: false },
    digestFrequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    digestTime: { type: String, default: '08:00' }, // HH:mm

    // Quiet hours
    quietHoursEnabled: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: '22:00' },
    quietHoursEnd: { type: String, default: '07:00' },
  },
  { timestamps: true }
);

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER MODELS
// ═══════════════════════════════════════════════════════════════════════════════

const WorkflowComment =
  mongoose.models.WorkflowComment || mongoose.model('WorkflowComment', WorkflowCommentSchema);
const WorkflowFavorite =
  mongoose.models.WorkflowFavorite || mongoose.model('WorkflowFavorite', WorkflowFavoriteSchema);
const WorkflowDelegation =
  mongoose.models.WorkflowDelegation ||
  mongoose.model('WorkflowDelegation', WorkflowDelegationSchema);
const WorkflowReminder =
  mongoose.models.WorkflowReminder || mongoose.model('WorkflowReminder', WorkflowReminderSchema);
const WorkflowWebhook =
  mongoose.models.WorkflowWebhook || mongoose.model('WorkflowWebhook', WorkflowWebhookSchema);
const WorkflowSavedReport =
  mongoose.models.WorkflowSavedReport ||
  mongoose.model('WorkflowSavedReport', WorkflowSavedReportSchema);
const WorkflowTag = mongoose.models.WorkflowTag || mongoose.model('WorkflowTag', WorkflowTagSchema);
const WorkflowVersion =
  mongoose.models.WorkflowVersion || mongoose.model('WorkflowVersion', WorkflowVersionSchema);
const WorkflowNotifPref =
  mongoose.models.WorkflowNotifPref || mongoose.model('WorkflowNotifPref', WorkflowNotifPrefSchema);

module.exports = {
  WorkflowComment,
  WorkflowFavorite,
  WorkflowDelegation,
  WorkflowReminder,
  WorkflowWebhook,
  WorkflowSavedReport,
  WorkflowTag,
  WorkflowVersion,
  WorkflowNotifPref,
};
