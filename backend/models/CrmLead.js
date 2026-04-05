/**
 * CrmLead Model — نموذج العملاء المحتملين
 * Rehabilitation Center CRM - Lead Management
 */
const mongoose = require('mongoose');

const crmLeadActivitySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', required: true },
    type: {
      type: String,
      enum: [
        'call',
        'email',
        'sms',
        'whatsapp',
        'visit',
        'note',
        'status_change',
        'assessment',
        'meeting',
        'follow_up',
      ],
      default: 'note',
    },
    subject: { type: String, maxlength: 255 },
    body: { type: String },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
    outcome: {
      type: String,
      enum: [
        'no_answer',
        'voicemail',
        'interested',
        'not_interested',
        'callback',
        'enrolled',
        'follow_up',
        'sent',
        'failed',
      ],
    },
    durationMinutes: { type: Number, min: 1 },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    oldStatus: { type: String },
    newStatus: { type: String },
    nextFollowupAt: { type: Date },
    attachments: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const crmLeadSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    firstName: { type: String, required: true, maxlength: 100 },
    lastName: { type: String, required: true, maxlength: 100 },
    phone: { type: String, maxlength: 20 },
    email: { type: String, maxlength: 150, lowercase: true },
    whatsapp: { type: String, maxlength: 20 },
    nationalId: { type: String, maxlength: 20 },
    status: {
      type: String,
      enum: [
        'new',
        'contacted',
        'qualified',
        'assessment_scheduled',
        'enrolled',
        'lost',
        'inactive',
      ],
      default: 'new',
      index: true,
    },
    source: {
      type: String,
      enum: [
        'website',
        'phone',
        'referral',
        'social_media',
        'walk_in',
        'b2b_partner',
        'advertisement',
        'other',
      ],
      default: 'website',
    },
    sourceDetail: { type: String, maxlength: 255 },
    disabilityType: { type: String, maxlength: 100 },
    serviceInterest: { type: String, maxlength: 200 },
    age: { type: Number, min: 1, max: 120 },
    gender: { type: String, enum: ['male', 'female'] },
    city: { type: String, maxlength: 100 },
    district: { type: String, maxlength: 100 },
    estimatedValue: { type: Number, default: 0, min: 0 },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', default: null },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmPartner', default: null },
    lastContactAt: { type: Date },
    nextFollowupAt: { type: Date, index: true },
    qualifiedAt: { type: Date },
    enrolledAt: { type: Date },
    lostAt: { type: Date },
    lostReason: { type: String, maxlength: 500 },
    notes: { type: String, maxlength: 3000 },
    tags: [{ type: String }],
    customFields: { type: mongoose.Schema.Types.Mixed },
    isVip: { type: Boolean, default: false },
    optedOutSms: { type: Boolean, default: false },
    optedOutEmail: { type: Boolean, default: false },
    // Embedded activities
    activities: [crmLeadActivitySchema],
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

// ── Indexes ──────────────────────────────────────────────────────────────────
crmLeadSchema.index({ branchId: 1, status: 1 });
crmLeadSchema.index({ branchId: 1, assignedTo: 1 });
crmLeadSchema.index({ branchId: 1, source: 1 });
crmLeadSchema.index({ leadScore: -1 });
crmLeadSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
crmLeadSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

crmLeadSchema.virtual('qualityScore').get(function () {
  return Math.min(100, this.leadScore || 0);
});

// ── Pre-save: auto UUID ───────────────────────────────────────────────────────
crmLeadSchema.pre('save', function (next) {
  if (!this.uuid) {
    this.uuid = require('crypto').randomUUID();
  }
  if (!this.nextFollowupAt) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    this.nextFollowupAt = d;
  }
  next();
});

// ── Static: calculate lead score ──────────────────────────────────────────────
crmLeadSchema.statics.calculateScore = function (data) {
  let score = 0;
  if (data.email) score += 10;
  if (data.phone) score += 10;
  if (data.whatsapp) score += 5;
  if (data.age) score += 5;
  if (data.city) score += 5;
  if (data.nationalId) score += 10;
  const sourceScores = {
    b2b_partner: 20,
    referral: 15,
    walk_in: 12,
    website: 10,
    phone: 10,
    social_media: 8,
    advertisement: 5,
    other: 3,
  };
  score += sourceScores[data.source] || 3;
  if (data.serviceInterest) score += 10;
  if (data.disabilityType) score += 5;
  if (data.estimatedValue > 0) score += Math.min(15, Math.floor(data.estimatedValue / 1000));
  return Math.min(100, score);
};

module.exports = mongoose.models.CrmLead || mongoose.model('CrmLead', crmLeadSchema);
