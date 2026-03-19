/* eslint-disable no-unused-vars */
/**
 * WhatsApp Enhanced Models - نماذج متقدمة لنظام الوتساب
 * =====================================================
 * نماذج إضافية للميزات المتقدمة:
 * - الشات بوت والردود التلقائية
 * - الرسائل المجدولة
 * - الحملات التسويقية
 * - مجموعات جهات الاتصال
 * - الردود السريعة
 * - قواعد التوجيه والتعيين التلقائي
 * - تحليلات متقدمة
 * - القوائم السوداء والبيضاء
 * - استطلاعات الرأي
 * - الملصقات (Labels)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ─── 1) Chatbot Rule - قواعد الشات بوت ──────────────────────────────────────
const ChatbotRuleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    // نوع المطابقة
    matchType: {
      type: String,
      enum: ['keyword', 'regex', 'contains', 'starts_with', 'exact', 'ai_intent', 'default'],
      default: 'contains',
    },

    // أنماط المطابقة
    patterns: [{ type: String }], // كلمات أو تعبيرات منتظمة
    patternFlags: { type: String, default: 'i' }, // regex flags

    // نوع الرد
    responseType: {
      type: String,
      enum: ['text', 'template', 'interactive', 'media', 'flow', 'transfer_agent'],
      default: 'text',
    },

    // محتوى الرد
    response: {
      text: { type: String },
      textAr: { type: String },
      templateName: { type: String },
      templateParams: [Schema.Types.Mixed],
      interactive: Schema.Types.Mixed, // buttons or list payload
      mediaUrl: { type: String },
      mediaType: { type: String, enum: ['image', 'video', 'document', 'audio'] },
      flowSteps: [
        {
          stepId: String,
          message: String,
          messageAr: String,
          type: { type: String, enum: ['text', 'button', 'list', 'input'] },
          options: [{ label: String, labelAr: String, value: String, nextStep: String }],
          nextStep: String, // default next step
          validation: { type: String }, // regex for input validation
        },
      ],
      transferTo: {
        department: String,
        agentId: { type: Schema.Types.ObjectId, ref: 'User' },
        message: String,
      },
    },

    // شروط التفعيل
    conditions: {
      activeHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String }, // "08:00"
        end: { type: String }, // "17:00"
        timezone: { type: String, default: 'Asia/Riyadh' },
        daysOfWeek: [{ type: Number }], // 0=Sun ... 6=Sat
      },
      contactTags: [String], // فقط لجهات الاتصال بهذه التصنيفات
      excludeTags: [String],
      maxTriggersPerContact: { type: Number, default: 0 }, // 0 = unlimited
      cooldownMinutes: { type: Number, default: 0 },
    },

    // الأولوية (الأعلى تُنفَّذ أولاً)
    priority: { type: Number, default: 50, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false }, // القاعدة الافتراضية إذا لم تطابق أي قاعدة

    // إحصائيات
    stats: {
      triggered: { type: Number, default: 0 },
      lastTriggered: { type: Date },
      successRate: { type: Number, default: 100 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'whatsapp_chatbot_rules' }
);

ChatbotRuleSchema.index({ tenantId: 1, isActive: 1, priority: -1 });
ChatbotRuleSchema.index({ tenantId: 1, matchType: 1 });

// ─── 2) Chatbot Session - جلسة الشات بوت ───────────────────────────────────
const ChatbotSessionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    contactPhone: { type: String, required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'WhatsAppConversation' },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'waiting_input', 'transferred', 'completed', 'expired'],
      default: 'active',
    },

    // القاعدة النشطة
    activeRuleId: { type: Schema.Types.ObjectId, ref: 'WhatsAppChatbotRule' },
    currentFlowStep: { type: String },

    // بيانات مُجمَّعة من المستخدم
    collectedData: Schema.Types.Mixed,

    // سجل العمليات
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        ruleId: { type: Schema.Types.ObjectId, ref: 'WhatsAppChatbotRule' },
        userMessage: String,
        botResponse: String,
        flowStep: String,
      },
    ],

    expiresAt: { type: Date, index: true },
  },
  { timestamps: true, collection: 'whatsapp_chatbot_sessions' }
);

ChatbotSessionSchema.index({ contactPhone: 1, status: 1 });

// ─── 3) Scheduled Message - الرسائل المجدولة ────────────────────────────────
const ScheduledMessageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    // المستلم
    recipient: {
      phone: { type: String, required: true },
      name: { type: String },
    },

    // محتوى الرسالة
    messageType: {
      type: String,
      enum: ['text', 'template', 'image', 'document', 'video', 'interactive'],
      default: 'text',
    },
    content: {
      text: String,
      templateName: String,
      templateParams: [Schema.Types.Mixed],
      mediaUrl: String,
      mediaCaption: String,
      interactive: Schema.Types.Mixed,
    },

    // الجدولة
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Asia/Riyadh' },

    // التكرار
    recurrence: {
      enabled: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'custom'],
      },
      interval: { type: Number, default: 1 },
      daysOfWeek: [Number], // for weekly
      dayOfMonth: { type: Number }, // for monthly
      endDate: { type: Date },
      maxOccurrences: { type: Number },
      occurrenceCount: { type: Number, default: 0 },
    },

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'failed', 'cancelled', 'paused'],
      default: 'pending',
      index: true,
    },

    // نتيجة الإرسال
    result: {
      waMessageId: String,
      sentAt: Date,
      error: String,
      attempts: { type: Number, default: 0 },
    },

    // ربط بحملة
    campaignId: { type: Schema.Types.ObjectId, ref: 'WhatsAppCampaign' },

    // ملاحظات
    notes: String,
    tags: [String],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'whatsapp_scheduled_messages' }
);

ScheduledMessageSchema.index({ status: 1, scheduledAt: 1 });
ScheduledMessageSchema.index({ tenantId: 1, status: 1 });
ScheduledMessageSchema.index({ campaignId: 1 });

// ─── 4) Campaign - الحملات التسويقية ────────────────────────────────────────
const CampaignSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    // نوع الحملة
    type: {
      type: String,
      enum: ['broadcast', 'drip', 'triggered', 'promotional', 'transactional', 'survey'],
      default: 'broadcast',
    },

    // المحتوى
    messageType: {
      type: String,
      enum: ['text', 'template', 'image', 'document', 'video', 'interactive'],
      default: 'template',
    },
    content: {
      text: String,
      templateName: String,
      templateParams: [Schema.Types.Mixed],
      mediaUrl: String,
      mediaCaption: String,
      interactive: Schema.Types.Mixed,
    },

    // الجمهور المستهدف
    audience: {
      type: {
        type: String,
        enum: ['all', 'group', 'tags', 'custom', 'import'],
        default: 'custom',
      },
      groupIds: [{ type: Schema.Types.ObjectId, ref: 'WhatsAppContactGroup' }],
      tags: [String],
      customRecipients: [
        {
          phone: String,
          name: String,
          params: Schema.Types.Mixed, // template variables per recipient
        },
      ],
      filters: {
        lastMessageAfter: Date,
        lastMessageBefore: Date,
        optedIn: { type: Boolean },
      },
      totalRecipients: { type: Number, default: 0 },
    },

    // الجدولة
    schedule: {
      type: {
        type: String,
        enum: ['immediate', 'scheduled', 'drip'],
        default: 'immediate',
      },
      startAt: Date,
      endAt: Date,
      timezone: { type: String, default: 'Asia/Riyadh' },
      // Drip settings
      dripSteps: [
        {
          delayMinutes: Number,
          messageType: String,
          content: Schema.Types.Mixed,
        },
      ],
    },

    // إعدادات الإرسال
    settings: {
      batchSize: { type: Number, default: 50 },
      batchDelayMs: { type: Number, default: 2000 },
      maxRetries: { type: Number, default: 3 },
      respectOptOut: { type: Boolean, default: true },
      respectQuietHours: { type: Boolean, default: true },
      quietHoursStart: { type: String, default: '22:00' },
      quietHoursEnd: { type: String, default: '07:00' },
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'],
      default: 'draft',
      index: true,
    },

    // التقدم
    progress: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      opted_out: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      startedAt: Date,
      completedAt: Date,
      lastProcessedAt: Date,
    },

    // A/B Testing
    abTest: {
      enabled: { type: Boolean, default: false },
      variants: [
        {
          name: String,
          content: Schema.Types.Mixed,
          percentage: Number, // % of audience
          stats: {
            sent: { type: Number, default: 0 },
            delivered: { type: Number, default: 0 },
            read: { type: Number, default: 0 },
            replied: { type: Number, default: 0 },
          },
        },
      ],
      winnerCriteria: { type: String, enum: ['read_rate', 'reply_rate', 'delivery_rate'] },
      testDurationHours: { type: Number, default: 24 },
    },

    tags: [String],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'whatsapp_campaigns' }
);

CampaignSchema.index({ tenantId: 1, status: 1 });
CampaignSchema.index({ 'schedule.startAt': 1, status: 1 });

// ─── 5) Contact Group - مجموعات جهات الاتصال ────────────────────────────────
const ContactGroupSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    color: { type: String, default: '#2196F3' },
    icon: { type: String, default: 'group' },

    // الأعضاء
    members: [
      {
        phone: { type: String, required: true },
        name: { type: String },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // إعدادات
    settings: {
      allowBroadcast: { type: Boolean, default: true },
      autoAdd: {
        enabled: { type: Boolean, default: false },
        tags: [String], // auto-add contacts with these tags
      },
    },

    memberCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'whatsapp_contact_groups' }
);

ContactGroupSchema.index({ tenantId: 1, isActive: 1 });

// ─── 6) Contact - جهة الاتصال ───────────────────────────────────────────────
const ContactSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    phone: { type: String, required: true, index: true },
    name: { type: String },
    nameAr: { type: String },
    email: { type: String },

    // ربط بمستخدم النظام
    userId: { type: Schema.Types.ObjectId, ref: 'User' },

    // الملف الشخصي من واتساب
    waProfile: {
      name: String,
      picture: String,
    },

    // التصنيفات
    tags: [String],
    labels: [{ type: Schema.Types.ObjectId, ref: 'WhatsAppLabel' }],
    groups: [{ type: Schema.Types.ObjectId, ref: 'WhatsAppContactGroup' }],

    // حالة الاشتراك
    optIn: {
      status: { type: Boolean, default: true },
      optedInAt: Date,
      optedOutAt: Date,
      method: { type: String, enum: ['manual', 'keyword', 'form', 'api'] },
    },

    // القائمة السوداء
    blocked: {
      status: { type: Boolean, default: false },
      reason: String,
      blockedAt: Date,
      blockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // إحصائيات
    stats: {
      totalMessages: { type: Number, default: 0 },
      totalInbound: { type: Number, default: 0 },
      totalOutbound: { type: Number, default: 0 },
      lastMessageAt: Date,
      lastInboundAt: Date,
      lastOutboundAt: Date,
      avgResponseTime: { type: Number, default: 0 }, // ms
      conversationCount: { type: Number, default: 0 },
    },

    // ملاحظات
    notes: [
      {
        text: String,
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // بيانات مخصصة
    customFields: Schema.Types.Mixed,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'whatsapp_contacts' }
);

ContactSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
ContactSchema.index({ tenantId: 1, tags: 1 });
ContactSchema.index({ tenantId: 1, 'blocked.status': 1 });
ContactSchema.index({ tenantId: 1, 'optIn.status': 1 });

// ─── 7) Quick Reply - الردود السريعة ────────────────────────────────────────
const QuickReplySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    shortcut: { type: String, required: true }, // e.g. "/greet"
    title: { type: String, required: true },
    titleAr: { type: String },
    category: {
      type: String,
      enum: ['greeting', 'farewell', 'faq', 'support', 'sales', 'hr', 'finance', 'general'],
      default: 'general',
    },

    // المحتوى
    messageType: {
      type: String,
      enum: ['text', 'template', 'image', 'document', 'interactive'],
      default: 'text',
    },
    content: {
      text: String,
      textAr: String,
      templateName: String,
      mediaUrl: String,
      interactive: Schema.Types.Mixed,
    },

    // المتغيرات - يمكن استبدالها عند الإرسال
    // مثل: {{name}}, {{company}}, {{date}}
    variables: [
      {
        key: String,
        label: String,
        labelAr: String,
        defaultValue: String,
      },
    ],

    // الإحصائيات
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,

    isActive: { type: Boolean, default: true },
    isGlobal: { type: Boolean, default: false }, // متاح لجميع الموظفين
    allowedRoles: [String], // الأدوار المسموح لها
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'whatsapp_quick_replies' }
);

QuickReplySchema.index({ tenantId: 1, shortcut: 1 }, { unique: true });
QuickReplySchema.index({ tenantId: 1, category: 1 });

// ─── 8) Auto-Assignment Rule - قواعد التعيين التلقائي ────────────────────────
const AutoAssignmentRuleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },

    // نوع القاعدة
    type: {
      type: String,
      enum: ['round_robin', 'keyword', 'department', 'load_balanced', 'skill_based', 'manual'],
      default: 'round_robin',
    },

    // شروط المطابقة
    conditions: {
      keywords: [String],
      contactTags: [String],
      messageContains: [String],
      language: { type: String },
      timeRange: {
        start: String,
        end: String,
        daysOfWeek: [Number],
      },
    },

    // هدف التعيين
    assignment: {
      department: String,
      teamId: { type: Schema.Types.ObjectId },
      agents: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User' },
          weight: { type: Number, default: 1 }, // for load balancing
          skills: [String],
          maxConcurrent: { type: Number, default: 10 },
          currentLoad: { type: Number, default: 0 },
        },
      ],
      currentAgentIndex: { type: Number, default: 0 }, // for round-robin
    },

    // إشعار
    notification: {
      notifyAgent: { type: Boolean, default: true },
      notifyAdmin: { type: Boolean, default: false },
      autoReply: { type: String }, // رسالة تلقائية عند التعيين
      autoReplyAr: { type: String },
    },

    // SLA
    sla: {
      firstResponseMinutes: { type: Number, default: 15 },
      resolutionMinutes: { type: Number, default: 120 },
      escalateAfterMinutes: { type: Number, default: 30 },
      escalateTo: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    priority: { type: Number, default: 50 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'whatsapp_auto_assignment_rules' }
);

AutoAssignmentRuleSchema.index({ tenantId: 1, isActive: 1, priority: -1 });

// ─── 9) Label - الملصقات ────────────────────────────────────────────────────
const LabelSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    color: { type: String, default: '#4CAF50' },
    icon: { type: String },
    description: { type: String },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'whatsapp_labels' }
);

LabelSchema.index({ tenantId: 1, name: 1 }, { unique: true });

// ─── 10) Survey / Poll - استطلاعات الرأي ────────────────────────────────────
const SurveySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },

    // الأسئلة
    questions: [
      {
        questionId: { type: String, required: true },
        text: { type: String, required: true },
        textAr: { type: String },
        type: {
          type: String,
          enum: ['single_choice', 'multiple_choice', 'rating', 'text', 'yes_no', 'nps'],
          default: 'single_choice',
        },
        options: [
          {
            label: String,
            labelAr: String,
            value: String,
          },
        ],
        required: { type: Boolean, default: true },
        order: { type: Number },
      },
    ],

    // الجمهور
    audience: {
      type: { type: String, enum: ['all', 'group', 'custom'], default: 'custom' },
      groupIds: [{ type: Schema.Types.ObjectId, ref: 'WhatsAppContactGroup' }],
      recipients: [{ phone: String, name: String }],
    },

    // الإعدادات
    settings: {
      anonymous: { type: Boolean, default: false },
      multipleResponses: { type: Boolean, default: false },
      thankYouMessage: { type: String, default: 'شكراً لمشاركتك!' },
      expiresAt: Date,
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'expired'],
      default: 'draft',
    },

    // الإحصائيات
    stats: {
      totalSent: { type: Number, default: 0 },
      totalResponses: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      npsScore: { type: Number, default: 0 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'whatsapp_surveys' }
);

SurveySchema.index({ tenantId: 1, status: 1 });

// ─── 10b) Survey Response - استجابات الاستطلاع ──────────────────────────────
const SurveyResponseSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: 'WhatsAppSurvey', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    contactPhone: { type: String, required: true },
    contactName: { type: String },

    answers: [
      {
        questionId: String,
        value: Schema.Types.Mixed, // string, number, or array
        answeredAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ['partial', 'completed'],
      default: 'partial',
    },
    currentQuestion: { type: Number, default: 0 },
    completedAt: Date,
  },
  { timestamps: true, collection: 'whatsapp_survey_responses' }
);

SurveyResponseSchema.index({ surveyId: 1, contactPhone: 1 });

// ─── 11) Flow / Workflow - سير العمل ────────────────────────────────────────
const FlowSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },

    // المشغّل (Trigger)
    trigger: {
      type: {
        type: String,
        enum: [
          'message_received',
          'keyword',
          'new_contact',
          'opt_in',
          'webhook',
          'scheduled',
          'manual',
        ],
        default: 'keyword',
      },
      keywords: [String],
      webhookSecret: String,
      schedule: String, // cron expression
    },

    // الخطوات
    steps: [
      {
        stepId: { type: String, required: true },
        name: String,
        type: {
          type: String,
          enum: [
            'send_message',
            'wait_reply',
            'delay',
            'condition',
            'assign_agent',
            'add_tag',
            'remove_tag',
            'add_to_group',
            'http_request',
            'set_variable',
            'send_survey',
            'end',
          ],
          required: true,
        },
        config: Schema.Types.Mixed,
        nextSteps: [
          {
            condition: String, // expression or 'default'
            stepId: String,
          },
        ],
      },
    ],

    // المتغيرات
    variables: [
      {
        name: String,
        type: { type: String, enum: ['string', 'number', 'boolean', 'date'] },
        defaultValue: Schema.Types.Mixed,
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    isActive: { type: Boolean, default: false },

    stats: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      avgDurationMs: { type: Number, default: 0 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'whatsapp_flows' }
);

FlowSchema.index({ tenantId: 1, isActive: 1 });

// ─── 12) Analytics Snapshot - لقطات تحليلية ─────────────────────────────────
const AnalyticsSnapshotSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    date: { type: Date, required: true, index: true },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily',
    },

    messages: {
      total: { type: Number, default: 0 },
      inbound: { type: Number, default: 0 },
      outbound: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },

    conversations: {
      total: { type: Number, default: 0 },
      newConversations: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      avgFirstResponseMs: { type: Number, default: 0 },
      avgResolutionMs: { type: Number, default: 0 },
    },

    contacts: {
      totalActive: { type: Number, default: 0 },
      newContacts: { type: Number, default: 0 },
      optedOut: { type: Number, default: 0 },
      blocked: { type: Number, default: 0 },
    },

    chatbot: {
      triggered: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      transferredToAgent: { type: Number, default: 0 },
    },

    campaigns: {
      active: { type: Number, default: 0 },
      messagesSent: { type: Number, default: 0 },
      deliveryRate: { type: Number, default: 0 },
      readRate: { type: Number, default: 0 },
    },

    // أفضل القوالب أداءً
    topTemplates: [
      {
        templateName: String,
        sent: Number,
        delivered: Number,
        read: Number,
      },
    ],

    // أوقات الذروة
    peakHours: [
      {
        hour: Number,
        messageCount: Number,
      },
    ],
  },
  { timestamps: true, collection: 'whatsapp_analytics_snapshots' }
);

AnalyticsSnapshotSchema.index({ tenantId: 1, date: -1, period: 1 });

// ─── 13) Blacklist - القائمة السوداء ────────────────────────────────────────
const BlacklistSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    phone: { type: String, required: true },
    reason: { type: String },
    reasonAr: { type: String },
    category: {
      type: String,
      enum: ['spam', 'abuse', 'opt_out', 'bounced', 'manual', 'compliance'],
      default: 'manual',
    },
    expiresAt: { type: Date }, // null = permanent block
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'whatsapp_blacklist' }
);

BlacklistSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
BlacklistSchema.index({ tenantId: 1, isActive: 1 });

// ─── 14) Notification Preference - تفضيلات الإشعارات ────────────────────────
const NotificationPreferenceSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    contactPhone: { type: String, required: true },

    // القنوات المفعلة
    channels: {
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },

    // أنواع الإشعارات
    categories: {
      appointments: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      updates: { type: Boolean, default: true },
      surveys: { type: Boolean, default: true },
    },

    // أوقات الإرسال المفضلة
    preferredHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '21:00' },
    },

    language: { type: String, default: 'ar' },
  },
  { timestamps: true, collection: 'whatsapp_notification_preferences' }
);

NotificationPreferenceSchema.index({ tenantId: 1, contactPhone: 1 }, { unique: true });

// ═══════════════════════════════════════════════════════════════════════════════
// Export all models
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  ChatbotRule:
    mongoose.models.WhatsAppChatbotRule || mongoose.model('WhatsAppChatbotRule', ChatbotRuleSchema),
  ChatbotSession:
    mongoose.models.WhatsAppChatbotSession ||
    mongoose.model('WhatsAppChatbotSession', ChatbotSessionSchema),
  ScheduledMessage:
    mongoose.models.WhatsAppScheduledMessage ||
    mongoose.model('WhatsAppScheduledMessage', ScheduledMessageSchema),
  Campaign: mongoose.models.WhatsAppCampaign || mongoose.model('WhatsAppCampaign', CampaignSchema),
  ContactGroup:
    mongoose.models.WhatsAppContactGroup ||
    mongoose.model('WhatsAppContactGroup', ContactGroupSchema),
  Contact: mongoose.models.WhatsAppContact || mongoose.model('WhatsAppContact', ContactSchema),
  QuickReply:
    mongoose.models.WhatsAppQuickReply || mongoose.model('WhatsAppQuickReply', QuickReplySchema),
  AutoAssignmentRule:
    mongoose.models.WhatsAppAutoAssignmentRule ||
    mongoose.model('WhatsAppAutoAssignmentRule', AutoAssignmentRuleSchema),
  Label: mongoose.models.WhatsAppLabel || mongoose.model('WhatsAppLabel', LabelSchema),
  Survey: mongoose.models.WhatsAppSurvey || mongoose.model('WhatsAppSurvey', SurveySchema),
  SurveyResponse:
    mongoose.models.WhatsAppSurveyResponse ||
    mongoose.model('WhatsAppSurveyResponse', SurveyResponseSchema),
  Flow: mongoose.models.WhatsAppFlow || mongoose.model('WhatsAppFlow', FlowSchema),
  AnalyticsSnapshot:
    mongoose.models.WhatsAppAnalyticsSnapshot ||
    mongoose.model('WhatsAppAnalyticsSnapshot', AnalyticsSnapshotSchema),
  Blacklist:
    mongoose.models.WhatsAppBlacklist || mongoose.model('WhatsAppBlacklist', BlacklistSchema),
  NotificationPreference:
    mongoose.models.WhatsAppNotificationPreference ||
    mongoose.model('WhatsAppNotificationPreference', NotificationPreferenceSchema),
};
