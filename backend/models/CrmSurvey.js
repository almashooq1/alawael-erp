/**
 * CrmSurvey & CrmSurveyResponse Models — نماذج استطلاعات الرضا
 */
const mongoose = require('mongoose');

// ── Survey Response Schema ─────────────────────────────────────────────────
const surveyResponseSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmSurvey', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrmLead', default: null },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    npsScore: { type: Number, min: 0, max: 10 },
    answers: { type: mongoose.Schema.Types.Mixed },
    comment: { type: String, maxlength: 2000 },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    sentimentScore: { type: Number, min: 0, max: 1 },
    channel: { type: String, default: 'web', maxlength: 50 },
    respondentName: { type: String, maxlength: 150 },
    submittedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

surveyResponseSchema.index({ surveyId: 1, sentiment: 1 });
surveyResponseSchema.index({ leadId: 1 });

// ── Survey Schema ──────────────────────────────────────────────────────────
const crmSurveySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    title: { type: String, required: true, maxlength: 255 },
    titleAr: { type: String, maxlength: 255 },
    type: { type: String, enum: ['nps', 'csat', 'ces', 'custom'], default: 'nps' },
    trigger: {
      type: String,
      enum: ['manual', 'enrollment', 'session_complete', 'discharge', 'monthly', 'quarterly'],
      default: 'manual',
    },
    questions: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    responseCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0, min: 0, max: 10 },
    responses: [surveyResponseSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

crmSurveySchema.index({ branchId: 1, isActive: 1 });

crmSurveySchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.CrmSurvey || mongoose.model('CrmSurvey', crmSurveySchema);
