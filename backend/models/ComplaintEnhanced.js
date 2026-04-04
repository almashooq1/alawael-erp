/**
 * Complaint Enhanced Models — نماذج الشكاوى المحسّنة (البرومبت 31)
 * Includes: ComplaintCategory, ComplaintSlaConfig, ComplaintWorkflowStep, CrmFeedback
 */
const mongoose = require('mongoose');

// ── Complaint Category ────────────────────────────────────────────────────
const complaintCategorySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, required: true, maxlength: 200 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplaintCategory', default: null },
    slaHours: { type: Number, default: 48, min: 1 },
    defaultPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    autoAssign: { type: Boolean, default: false },
    defaultAssigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintCategorySchema.index({ branchId: 1, isActive: 1 });
complaintCategorySchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

// ── Complaint SLA Config ──────────────────────────────────────────────────
const complaintSlaConfigSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    responseHours: { type: Number, default: 24, min: 1 },
    resolutionHours: { type: Number, default: 72, min: 1 },
    escalationHours: { type: Number, default: 48, min: 1 },
    escalationLevel1Hours: { type: Number, default: 24, min: 1 },
    escalationLevel2Hours: { type: Number, default: 48, min: 1 },
    escalationLevel3Hours: { type: Number, default: 72, min: 1 },
    level1EscalationUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level2EscalationUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    level3EscalationUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

complaintSlaConfigSchema.index({ branchId: 1, priority: 1 }, { unique: true });
complaintSlaConfigSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

// ── Complaint Workflow Step ───────────────────────────────────────────────
const complaintWorkflowStepSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplaintV2', required: true },
    action: {
      type: String,
      enum: [
        'submitted',
        'acknowledged',
        'assigned',
        'commented',
        'escalated',
        'resolved',
        'closed',
        'rejected',
        'reopened',
      ],
      default: 'submitted',
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, maxlength: 3000 },
    attachments: [{ type: String }],
    fromStatus: { type: String },
    toStatus: { type: String },
    isInternal: { type: Boolean, default: false },
    performedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

complaintWorkflowStepSchema.index({ complaintId: 1, action: 1 });
complaintWorkflowStepSchema.index({ performedAt: -1 });

// ── Complaint V2 (Enhanced) ────────────────────────────────────────────────
const complaintV2Schema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    complaintNumber: { type: String, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', default: null },
    complainantName: { type: String, required: true, maxlength: 150 },
    complainantPhone: { type: String, maxlength: 20 },
    complainantEmail: { type: String, maxlength: 150, lowercase: true },
    complainantType: {
      type: String,
      enum: ['patient', 'guardian', 'visitor', 'employee', 'anonymous', 'other'],
      default: 'patient',
    },
    channel: {
      type: String,
      enum: ['web', 'phone', 'email', 'walk_in', 'whatsapp', 'social_media', 'postal'],
      default: 'web',
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'acknowledged',
        'under_review',
        'escalated',
        'resolved',
        'closed',
        'rejected',
      ],
      default: 'submitted',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    category: { type: String, maxlength: 100 },
    subcategory: { type: String, maxlength: 100 },
    subject: { type: String, required: true, maxlength: 255 },
    description: { type: String, required: true, minlength: 10, maxlength: 5000 },
    attachments: [{ type: String }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    slaDueAt: { type: Date },
    slaBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0, min: 0, max: 3 },
    escalatedAt: { type: Date },
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNotes: { type: String, maxlength: 3000 },
    satisfactionRating: { type: Number, min: 1, max: 5 },
    satisfactionComment: { type: String, maxlength: 1000 },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'very_negative'],
    },
    sentimentScore: { type: Number, min: 0, max: 1 },
    aiClassification: { type: mongoose.Schema.Types.Mixed },
    rootCause: { type: String, maxlength: 500 },
    requiresFollowup: { type: Boolean, default: false },
    followupDate: { type: Date },
    isRecurring: { type: Boolean, default: false },
    qualityFlag: { type: Boolean, default: false },
    // Embedded workflow steps
    workflowSteps: [complaintWorkflowStepSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
complaintV2Schema.index({ branchId: 1, status: 1 });
complaintV2Schema.index({ branchId: 1, priority: 1 });
complaintV2Schema.index({ slaDueAt: 1, slaBreached: 1 });
complaintV2Schema.index({ assignedTo: 1, status: 1 });
complaintV2Schema.index({ category: 1, status: 1 });
complaintV2Schema.index({ createdAt: -1 });

// ── Virtuals ───────────────────────────────────────────────────────────────
complaintV2Schema.virtual('waitingHours').get(function () {
  return Math.round(((Date.now() - this.createdAt) / (1000 * 60 * 60)) * 10) / 10;
});

complaintV2Schema.virtual('slaProgress').get(function () {
  if (!this.slaDueAt) return 0;
  const total = this.slaDueAt - this.createdAt;
  const elapsed = Date.now() - this.createdAt;
  return Math.min(100, Math.round((elapsed / total) * 100));
});

// ── Pre-save: auto number & uuid ──────────────────────────────────────────
complaintV2Schema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

// ── Static: generate complaint number ────────────────────────────────────
complaintV2Schema.statics.generateNumber = async function (branchId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count =
    (await this.countDocuments({
      branchId,
      createdAt: {
        $gte: new Date(year, now.getMonth(), 1),
        $lt: new Date(year, now.getMonth() + 1, 1),
      },
    })) + 1;
  return `CMP-${year}${month}-${String(count).padStart(5, '0')}`;
};

// ── Static: analyze sentiment ─────────────────────────────────────────────
complaintV2Schema.statics.analyzeSentiment = function (text) {
  const positiveWords = [
    'ممتاز',
    'رائع',
    'شكرًا',
    'جيد',
    'مميز',
    'احترافي',
    'سريع',
    'جميل',
    'مفيد',
    'كفء',
  ];
  const negativeWords = [
    'سيء',
    'رديء',
    'بطيء',
    'خاطئ',
    'مهمل',
    'متأخر',
    'لا',
    'ليس',
    'فشل',
    'خطأ',
    'مشكلة',
    'شكوى',
  ];
  let pos = 0,
    neg = 0;
  positiveWords.forEach(w => {
    if (text.includes(w)) pos++;
  });
  negativeWords.forEach(w => {
    if (text.includes(w)) neg++;
  });
  const total = pos + neg;
  return total === 0 ? 0.5 : Math.round((pos / total) * 100) / 100;
};

// ── Static: classify with AI ──────────────────────────────────────────────
complaintV2Schema.statics.classifyWithAI = function (description, subject = '') {
  const text = `${subject} ${description}`.trim();
  const score = this.analyzeSentiment(text);
  const sentiment =
    score >= 0.6
      ? 'positive'
      : score >= 0.3
        ? 'neutral'
        : score >= 0.1
          ? 'negative'
          : 'very_negative';

  const keywords = {
    medical: ['علاج', 'طبيب', 'دواء', 'تشخيص', 'صحة', 'إصابة', 'ألم'],
    staff: ['موظف', 'معالج', 'سلوك', 'تعامل', 'أدب', 'احترام'],
    facility: ['مبنى', 'نظافة', 'مرافق', 'مكان', 'غرفة', 'حمام'],
    billing: ['فاتورة', 'دفع', 'رسوم', 'مبلغ', 'تكلفة', 'مالي'],
    scheduling: ['موعد', 'جدول', 'انتظار', 'تأخير', 'وقت', 'حجز'],
  };

  let category = 'general';
  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(w => text.includes(w))) {
      category = cat;
      break;
    }
  }

  const criticalWords = ['عاجل', 'خطير', 'طارئ', 'ضرر', 'أذى', 'وفاة', 'خطأ طبي'];
  const isCritical = criticalWords.some(w => text.includes(w));

  const priority = isCritical ? 'critical' : score < 0.1 ? 'high' : score < 0.3 ? 'medium' : 'low';

  return {
    sentiment,
    score,
    category,
    priority,
    confidence: 0.75,
    processedAt: new Date().toISOString(),
  };
};

// ── CrmFeedback Model ─────────────────────────────────────────────────────
const crmFeedbackSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', default: null },
    submitterName: { type: String, maxlength: 150 },
    submitterPhone: { type: String, maxlength: 20 },
    type: {
      type: String,
      enum: ['suggestion', 'compliment', 'general', 'idea'],
      default: 'general',
    },
    channel: {
      type: String,
      enum: ['web', 'app', 'paper', 'phone', 'email'],
      default: 'web',
    },
    subject: { type: String, maxlength: 255 },
    content: { type: String, required: true, minlength: 5, maxlength: 3000 },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'implemented', 'archived'],
      default: 'new',
    },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    sentimentScore: { type: Number, min: 0, max: 1 },
    response: { type: String, maxlength: 2000 },
    respondedAt: { type: Date },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rating: { type: Number, min: 1, max: 5 },
    isAnonymous: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

crmFeedbackSchema.index({ branchId: 1, type: 1 });
crmFeedbackSchema.index({ branchId: 1, status: 1 });
crmFeedbackSchema.index({ sentiment: 1 });

crmFeedbackSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

// ── Exports ───────────────────────────────────────────────────────────────
const ComplaintCategory = mongoose.model('ComplaintCategory', complaintCategorySchema);
const ComplaintSlaConfig = mongoose.model('ComplaintSlaConfig', complaintSlaConfigSchema);
const ComplaintV2 = mongoose.model('ComplaintV2', complaintV2Schema);
const CrmFeedback = mongoose.model('CrmFeedback', crmFeedbackSchema);

module.exports = { ComplaintCategory, ComplaintSlaConfig, ComplaintV2, CrmFeedback };
