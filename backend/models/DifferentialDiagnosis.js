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

// W494: callback → async.
differentialDiagnosisSchema.pre('save', async function () {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
});

// ── W1060: unified-core linkage ───────────────────────────────────────
// Confirming a differential diagnosis is the milestone. Publish
// differential_diagnosis.confirmed → CareTimeline. NON-callback hooks only.
differentialDiagnosisSchema.pre('save', function () {
  this.$__diffDxConfirmedNow =
    this.status === 'confirmed' && (this.isNew || this.isModified('status'));
});

function emitDifferentialDiagnosisConfirmed(doc) {
  if (!doc || !doc.$__diffDxConfirmedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('differential-diagnosis', 'differential_diagnosis.confirmed', {
      diagnosisId: String(doc._id),
      beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      confirmedDiagnosisId: doc.confirmedDiagnosisId ? String(doc.confirmedDiagnosisId) : null,
      confirmedAt: doc.confirmedAt || doc.updatedAt || new Date(),
    });
  } catch (_err) {
    /* bus optional — never block the write */
  }
}

differentialDiagnosisSchema.post('save', emitDifferentialDiagnosisConfirmed);

module.exports =
  mongoose.models.DifferentialDiagnosis ||
  mongoose.model('DifferentialDiagnosis', differentialDiagnosisSchema);
