const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    service_type: { type: String, required: true },
    requested_therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    registration_date: { type: Date, required: true, default: Date.now },
    // عوامل حساب الأولوية
    disability_severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'profound'],
      required: true,
    },
    age_months: { type: Number }, // كلما أصغر العمر كلما كانت الأولوية أعلى
    waiting_days: { type: Number, default: 0 }, // يُحسب تلقائياً
    urgent_medical_referral: { type: Boolean, default: false },
    referral_document_path: { type: String },
    // نقاط الأولوية (تُحسب تلقائياً)
    // disability_severity: profound=40, severe=30, moderate=20, mild=10
    // age < 3 years: +20, 3-6 years: +10
    // waiting_days > 30: +10, > 60: +20
    // urgent_referral: +25
    priority_score: { type: Number, default: 0 },
    priority_rank: { type: Number }, // الترتيب ضمن القائمة
    preferred_days: [{ type: String }],
    preferred_time: { type: String, enum: ['morning', 'afternoon', 'any'], default: 'any' },
    notes: { type: String },
    status: {
      type: String,
      enum: ['waiting', 'notified', 'scheduled', 'declined', 'expired'],
      default: 'waiting',
    },
    notified_at: { type: Date },
    scheduled_appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

waitlistEntrySchema.pre('save', function (next) {
  // حساب أيام الانتظار
  this.waiting_days = Math.floor((Date.now() - this.registration_date) / (1000 * 60 * 60 * 24));
  // حساب نقاط الأولوية
  let score = 0;
  // شدة الإعاقة
  const severityScores = { profound: 40, severe: 30, moderate: 20, mild: 10 };
  score += severityScores[this.disability_severity] || 0;
  // العمر
  if (this.age_months && this.age_months < 36) score += 20;
  else if (this.age_months && this.age_months < 72) score += 10;
  // مدة الانتظار
  if (this.waiting_days > 60) score += 20;
  else if (this.waiting_days > 30) score += 10;
  // إحالة طبية عاجلة
  if (this.urgent_medical_referral) score += 25;
  this.priority_score = score;
  next();
});

waitlistEntrySchema.index({ branch_id: 1, service_type: 1, priority_score: -1 });
waitlistEntrySchema.index({ beneficiary_id: 1 });
waitlistEntrySchema.index({ status: 1 });
waitlistEntrySchema.index({ registration_date: 1 });
waitlistEntrySchema.index({ deleted_at: 1 });

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);
