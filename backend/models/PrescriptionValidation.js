/**
 * PrescriptionValidation Model — نموذج التحقق من صحة الوصفات الطبية
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const prescriptionValidationSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ['passed', 'warnings', 'failed'],
      required: true,
    },
    checksPerformed: { type: mongoose.Schema.Types.Mixed }, // [{check_type, result, details}]
    warnings: { type: mongoose.Schema.Types.Mixed },
    errors: { type: mongoose.Schema.Types.Mixed },
    drugInteractionResults: { type: mongoose.Schema.Types.Mixed },
    allergyCheckResults: { type: mongoose.Schema.Types.Mixed },
    dosageCheckResults: { type: mongoose.Schema.Types.Mixed },
    pharmacistReviewed: { type: Boolean, default: false },
    pharmacistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    pharmacistNotes: { type: String },
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

prescriptionValidationSchema.index({ branchId: 1, beneficiaryId: 1, status: 1 });
prescriptionValidationSchema.index({ prescriptionId: 1 });

prescriptionValidationSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('PrescriptionValidation', prescriptionValidationSchema);
