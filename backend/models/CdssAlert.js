/**
 * CdssAlert Model — نموذج تنبيهات دعم القرار السريري
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const cdssAlertSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalRule', required: true },
    triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    alertType: {
      type: String,
      enum: [
        'drug_interaction',
        'allergy',
        'lab_critical',
        'contraindication',
        'risk_flag',
        'guideline',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      required: true,
    },
    contextType: { type: String, maxlength: 100 }, // prescription, lab_result, diagnosis
    contextId: { type: mongoose.Schema.Types.ObjectId },
    message: { type: String, required: true },
    messageAr: { type: String, required: true },
    alertData: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'overridden', 'resolved'],
      default: 'active',
    },
    triggeredAt: { type: Date, required: true, default: Date.now },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    overrideReason: { type: String },
    resolvedAt: { type: Date },
    wasActedUpon: { type: Boolean, default: false },
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

cdssAlertSchema.index({ branchId: 1, beneficiaryId: 1, status: 1 });
cdssAlertSchema.index({ alertType: 1, severity: 1 });
cdssAlertSchema.index({ triggeredAt: -1 });
cdssAlertSchema.index({ contextType: 1, contextId: 1 });

cdssAlertSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.models.CdssAlert || mongoose.model('CdssAlert', cdssAlertSchema);
