const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema(
  {
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    cert_type: {
      type: String,
      enum: [
        'scfhs',
        'cpt',
        'aba_board',
        'bcba',
        'bcabc',
        'first_aid',
        'cpr',
        'language',
        'academic',
        'professional',
        'other',
      ],
      required: true,
    },
    cert_name_ar: { type: String, required: true },
    cert_name_en: { type: String },
    issuing_authority: { type: String },
    cert_number: { type: String },
    issue_date: { type: Date },
    expiry_date: { type: Date },
    is_mandatory: { type: Boolean, default: false },
    file_path: { type: String },
    status: {
      type: String,
      enum: ['valid', 'expired', 'expiring_soon', 'pending_renewal'],
      default: 'valid',
    },
    reminder_sent: { type: Boolean, default: false },
    reminder_sent_at: { type: Date },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

certificationSchema.virtual('days_until_expiry').get(function () {
  if (!this.expiry_date) return null;
  return Math.ceil((this.expiry_date - new Date()) / (1000 * 60 * 60 * 24));
});

certificationSchema.virtual('is_expired').get(function () {
  if (!this.expiry_date) return false;
  return new Date() > this.expiry_date;
});

certificationSchema.statics.findExpiringSoon = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.find({
    expiry_date: { $lte: futureDate, $gte: new Date() },
    deleted_at: null,
  }).populate('employee_id', 'full_name_ar employee_number branch_id');
};

certificationSchema.index({ employee_id: 1, cert_type: 1 });
certificationSchema.index({ expiry_date: 1 });
certificationSchema.index({ status: 1 });
certificationSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.Certification || mongoose.model('Certification', certificationSchema);
