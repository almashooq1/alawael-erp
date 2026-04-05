/**
 * CdssDecisionLog Model — سجل القرارات السريرية للتعلم الآلي
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const cdssDecisionLogSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    decisionType: {
      type: String,
      enum: ['alert_override', 'suggestion_accepted', 'risk_acknowledged', 'rule_evaluated'],
      required: true,
    },
    contextType: { type: String, maxlength: 100 },
    contextId: { type: mongoose.Schema.Types.ObjectId },
    decisionData: { type: mongoose.Schema.Types.Mixed, required: true },
    rationale: { type: String },
    outcome: { type: String },
    usedForMlTraining: { type: Boolean, default: false },
    decisionAt: { type: Date, required: true, default: Date.now },
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

cdssDecisionLogSchema.index({ branchId: 1, beneficiaryId: 1, decisionType: 1 });
cdssDecisionLogSchema.index({ decisionAt: -1 });
cdssDecisionLogSchema.index({ usedForMlTraining: 1 });

cdssDecisionLogSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.CdssDecisionLog || mongoose.model('CdssDecisionLog', cdssDecisionLogSchema);
