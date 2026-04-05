/**
 * Ticket Enhanced Models — نماذج نظام التذاكر الشامل
 * البرومبت 22: tickets, ticket_comments, ticket_attachments, ticket_sla_configs, ticket_escalation_rules
 */

const mongoose = require('mongoose');

// ─── Ticket ───────────────────────────────────────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true }, // TKT-20260101-0001
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

    // التصنيف
    type: {
      type: String,
      required: true,
      enum: [
        'technical_issue',
        'maintenance',
        'equipment_request',
        'complaint',
        'suggestion',
        'training_request',
        'access_request',
        'data_request',
        'other',
      ],
    },
    category: { type: String, default: null },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: [
        'open',
        'assigned',
        'in_progress',
        'waiting_info',
        'waiting_vendor',
        'resolved',
        'closed',
        'reopened',
        'cancelled',
      ],
      default: 'open',
    },

    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    affectedModule: [String],
    tags: [String],

    // SLA
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    slaResponseDeadline: { type: Date, default: null },
    slaResolutionDeadline: { type: Date, default: null },
    slaResponseBreached: { type: Boolean, default: false },
    slaResolutionBreached: { type: Boolean, default: false },

    // التصعيد
    escalationLevel: { type: Number, default: 0 },
    lastEscalatedAt: { type: Date, default: null },

    // التقييم
    satisfactionRating: { type: Number, min: 1, max: 5, default: null },
    satisfactionComment: { type: String, default: null },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ branchId: 1, status: 1 });
ticketSchema.index({ type: 1, status: 1 });

// Virtual: isOverdue
ticketSchema.virtual('isOverdue').get(function () {
  const closedStatuses = ['closed', 'cancelled', 'resolved'];
  if (closedStatuses.includes(this.status)) return false;
  return this.slaResponseBreached || this.slaResolutionBreached;
});

// Virtual: priorityLabel
ticketSchema.virtual('priorityLabel').get(function () {
  const labels = { low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج' };
  return labels[this.priority] || this.priority;
});

// Virtual: statusLabel
ticketSchema.virtual('statusLabel').get(function () {
  const labels = {
    open: 'مفتوحة',
    assigned: 'مُعينة',
    in_progress: 'قيد العمل',
    waiting_info: 'بانتظار معلومات',
    waiting_vendor: 'بانتظار مورد',
    resolved: 'محلولة',
    closed: 'مغلقة',
    reopened: 'أُعيد فتحها',
    cancelled: 'ملغاة',
  };
  return labels[this.status] || this.status;
});

// Virtual: typeLabel
ticketSchema.virtual('typeLabel').get(function () {
  const labels = {
    technical_issue: 'مشكلة تقنية',
    maintenance: 'طلب صيانة',
    equipment_request: 'طلب أجهزة',
    complaint: 'شكوى',
    suggestion: 'اقتراح',
    training_request: 'طلب تدريب',
    access_request: 'طلب صلاحيات',
    data_request: 'طلب بيانات',
    other: 'أخرى',
  };
  return labels[this.type] || this.type;
});

ticketSchema.set('toJSON', { virtuals: true });
ticketSchema.set('toObject', { virtuals: true });

// Auto-generate ticket number before save
ticketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const count = await mongoose.model('TicketEnhanced').countDocuments({
      createdAt: { $gte: startOfDay },
    });
    this.ticketNumber = `TKT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ─── TicketComment ────────────────────────────────────────────────────────────
const ticketCommentSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketEnhanced', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 5000 },
    isInternal: { type: Boolean, default: false }, // ملاحظة داخلية
    isSystem: { type: Boolean, default: false }, // رسالة نظام تلقائية
    attachments: [
      {
        fileName: String,
        filePath: String,
        mimeType: String,
        fileSize: Number,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

ticketCommentSchema.index({ ticketId: 1, createdAt: 1 });

// ─── TicketSlaConfig ──────────────────────────────────────────────────────────
const ticketSlaConfigSchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    type: { type: String, default: null }, // null = all types
    responseTimeHours: { type: Number, required: true }, // وقت الاستجابة
    resolutionTimeHours: { type: Number, required: true }, // وقت الحل
    businessHoursOnly: { type: Boolean, default: true }, // فقط ساعات العمل
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── TicketEscalationRule ────────────────────────────────────────────────────
const ticketEscalationRuleSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true }, // 1, 2, 3
    triggerAfterHours: { type: Number, required: true }, // ساعات بعد فوات SLA
    triggerType: {
      type: String,
      required: true,
      enum: ['sla_response_breach', 'sla_resolution_breach', 'no_update'],
    },
    notifyRoles: [String], // ['it_manager', 'admin']
    assignToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sendEmail: { type: Boolean, default: true },
    sendSms: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── TicketAutoAssignment ────────────────────────────────────────────────────
const ticketAutoAssignmentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    category: { type: String, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    assignToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignToRole: { type: String, default: null },
    assignmentMethod: {
      type: String,
      enum: ['direct', 'round_robin', 'least_busy'],
      default: 'direct',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  TicketEnhanced: mongoose.models.TicketEnhanced || mongoose.model('TicketEnhanced', ticketSchema),
  TicketComment:
    mongoose.models.TicketComment || mongoose.model('TicketComment', ticketCommentSchema),
  TicketSlaConfig:
    mongoose.models.TicketSlaConfig || mongoose.model('TicketSlaConfig', ticketSlaConfigSchema),
  TicketEscalationRule:
    mongoose.models.TicketEscalationRule ||
    mongoose.model('TicketEscalationRule', ticketEscalationRuleSchema),
  TicketAutoAssignment:
    mongoose.models.TicketAutoAssignment ||
    mongoose.model('TicketAutoAssignment', ticketAutoAssignmentSchema),
};
