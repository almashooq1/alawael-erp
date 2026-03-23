/**
 * Employee Warning & Violations Model — الإنذارات والمخالفات
 * Saudi Labor Law Article 66 violation schedule
 * Progressive discipline: verbal → written → deduction → suspension → termination
 */
const mongoose = require('mongoose');

const AppealSchema = new mongoose.Schema(
  {
    appealText: { type: String, required: true },
    appealDate: { type: Date, default: Date.now },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decision: {
      type: String,
      enum: ['قيد المراجعة', 'مقبول', 'مرفوض', 'تعديل العقوبة'],
    },
    decisionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decisionDate: { type: Date },
    decisionNotes: { type: String },
    revisedPenalty: { type: String },
  },
  { timestamps: true }
);

const EmployeeWarningSchema = new mongoose.Schema(
  {
    warningNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // ── Violation Classification ──
    violationType: {
      type: String,
      enum: [
        'تأخر عن العمل',
        'غياب بدون إذن',
        'مخالفة أنظمة السلامة',
        'إهمال في العمل',
        'سوء سلوك',
        'التحريض على مخالفة الأنظمة',
        'مخالفة سياسة الشركة',
        'إفشاء أسرار العمل',
        'الاعتداء اللفظي',
        'الاعتداء الجسدي',
        'التزوير',
        'السرقة',
        'تضارب المصالح',
        'أخرى',
      ],
      required: true,
    },
    // ── Warning Level (Article 66 Schedule) ──
    warningLevel: {
      type: String,
      enum: [
        'تنبيه شفهي', // 1st occurrence
        'إنذار كتابي أول', // 2nd
        'إنذار كتابي ثاني', // 3rd
        'إنذار نهائي', // 4th
        'خصم من الراتب', // Financial penalty
        'إيقاف عن العمل', // Suspension
        'فصل', // Termination
      ],
      required: true,
    },
    // ── Occurrence Tracking ──
    occurrenceNumber: { type: Number, default: 1 },
    previousWarnings: [
      {
        warningId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeWarning' },
        warningNumber: { type: String },
        level: { type: String },
        date: { type: Date },
      },
    ],
    // ── Violation Details ──
    violationDate: { type: Date, required: true },
    violationTime: { type: String },
    violationLocation: { type: String },
    description: { type: String, required: true },
    witnesses: [{ type: String }],
    evidence: [
      {
        name: { type: String },
        fileUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // ── Penalty ──
    penalty: {
      deductionDays: { type: Number, default: 0 },
      deductionAmount: { type: Number, default: 0 },
      suspensionDays: { type: Number, default: 0 },
      suspensionStartDate: { type: Date },
      suspensionEndDate: { type: Date },
      terminationDate: { type: Date },
      otherPenalty: { type: String },
    },
    // ── Auto-Escalation ──
    escalationRule: {
      autoEscalate: { type: Boolean, default: true },
      escalateAfterDays: { type: Number, default: 90 },
      nextLevel: { type: String },
    },
    // ── Acknowledgement ──
    employeeAcknowledged: { type: Boolean, default: false },
    acknowledgedDate: { type: Date },
    employeeSignature: { type: String }, // base64 signature
    refusedToSign: { type: Boolean, default: false },
    witnessForRefusal: { type: String },
    // ── Appeal ──
    appeal: AppealSchema,
    // ── Status ──
    status: {
      type: String,
      enum: ['مسودة', 'صدر', 'مُبلّغ', 'معترض عليه', 'نُفّذ', 'ملغي', 'مُعدّل'],
      default: 'مسودة',
    },
    // ── Legal Reference ──
    laborLawArticle: {
      type: String,
      default: 'المادة 66 — جدول المخالفات والجزاءات',
    },
    // ── Meta ──
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──
EmployeeWarningSchema.virtual('isActive').get(function () {
  return ['صدر', 'مُبلّغ', 'نُفّذ'].includes(this.status);
});

EmployeeWarningSchema.virtual('canAppeal').get(function () {
  if (this.appeal?.decision) return false;
  const issued = this.createdAt || new Date();
  const daysSince = (new Date() - issued) / (1000 * 60 * 60 * 24);
  return daysSince <= 30; // 30 days appeal window
});

// ── Pre-save ──
EmployeeWarningSchema.pre('save', function (next) {
  if (!this.warningNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.warningNumber = `WRN-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
EmployeeWarningSchema.index({ employeeId: 1, status: 1 });
EmployeeWarningSchema.index({ violationType: 1, warningLevel: 1 });
EmployeeWarningSchema.index({ violationDate: -1 });

module.exports = mongoose.models.EmployeeWarning || mongoose.model('EmployeeWarning', EmployeeWarningSchema);
