/**
 * ClinicalRule Model — نموذج قواعد دعم القرار السريري
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const clinicalRuleSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    code: { type: String, required: true, unique: true, maxlength: 50 },
    name: { type: String, required: true, maxlength: 255 },
    nameAr: { type: String, required: true, maxlength: 255 },
    category: {
      type: String,
      enum: [
        'drug_interaction',
        'allergy',
        'lab_alert',
        'contraindication',
        'guideline',
        'risk_assessment',
        'protocol',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      required: true,
    },
    description: { type: String },
    descriptionAr: { type: String },
    conditions: { type: mongoose.Schema.Types.Mixed, required: true }, // JSON Logic
    actions: { type: mongoose.Schema.Types.Mixed, required: true },
    evidenceReferences: { type: mongoose.Schema.Types.Mixed },
    guidelineSource: { type: String, maxlength: 100 }, // MOH, SCOT, WHO, APTA
    guidelineVersion: { type: String, maxlength: 50 },
    isActive: { type: Boolean, default: true },
    requiresOverrideReason: { type: Boolean, default: false },
    priority: { type: Number, default: 100, min: 1, max: 999 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
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

clinicalRuleSchema.index({ branchId: 1, category: 1, isActive: 1 });
clinicalRuleSchema.index({ severity: 1, isActive: 1 });
clinicalRuleSchema.index({ priority: 1 });

clinicalRuleSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.ClinicalRule || mongoose.model('ClinicalRule', clinicalRuleSchema);
