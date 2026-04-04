/**
 * RehabPlanSuggestion Model — نموذج اقتراحات خطط التأهيل الذكية
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const rehabPlanSuggestionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    diagnosisId: { type: mongoose.Schema.Types.ObjectId },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generationMethod: {
      type: String,
      enum: ['rule_based', 'ml_model', 'hybrid'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'modified', 'rejected'],
      default: 'pending',
    },
    suggestedGoals: { type: mongoose.Schema.Types.Mixed },
    suggestedInterventions: { type: mongoose.Schema.Types.Mixed },
    suggestedFrequency: { type: mongoose.Schema.Types.Mixed },
    outcomeMeasures: { type: mongoose.Schema.Types.Mixed },
    estimatedDurationWeeks: { type: Number },
    confidenceScore: { type: Number, min: 0, max: 1 },
    evidenceReferences: { type: mongoose.Schema.Types.Mixed },
    clinicianNotes: { type: String },
    acceptedAt: { type: Date },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modificationsMade: { type: mongoose.Schema.Types.Mixed },
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

rehabPlanSuggestionSchema.index({ branchId: 1, beneficiaryId: 1, status: 1 });
rehabPlanSuggestionSchema.index({ generationMethod: 1 });
rehabPlanSuggestionSchema.index({ confidenceScore: -1 });

rehabPlanSuggestionSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('RehabPlanSuggestion', rehabPlanSuggestionSchema);
