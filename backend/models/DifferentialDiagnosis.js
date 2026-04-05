/**
 * DifferentialDiagnosis Model — نموذج مساعد التشخيص التفريقي
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const differentialDiagnosisSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    presentingSymptoms: { type: mongoose.Schema.Types.Mixed, required: true },
    clinicalFindings: { type: mongoose.Schema.Types.Mixed },
    suggestedDiagnoses: { type: mongoose.Schema.Types.Mixed }, // [{icd_code, name, probability, reasoning}]
    recommendedInvestigations: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['active', 'confirmed', 'dismissed'],
      default: 'active',
    },
    confirmedDiagnosisId: { type: mongoose.Schema.Types.ObjectId },
    clinicianAssessment: { type: String },
    confirmedAt: { type: Date },
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

differentialDiagnosisSchema.index({ branchId: 1, beneficiaryId: 1, status: 1 });

differentialDiagnosisSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports =
  mongoose.models.DifferentialDiagnosis ||
  mongoose.model('DifferentialDiagnosis', differentialDiagnosisSchema);
