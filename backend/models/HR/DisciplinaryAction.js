/**
 * Disciplinary Action Model — نموذج الإنذارات والإجراءات التأديبية
 *
 * Tracks warnings, penalties, and disciplinary procedures per Saudi Labor Law.
 */
const mongoose = require('mongoose');

const DisciplinaryActionSchema = new mongoose.Schema(
  {
    actionNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'تنبيه شفهي',
        'إنذار كتابي أول',
        'إنذار كتابي ثاني',
        'إنذار نهائي',
        'خصم من الراتب',
        'إيقاف عن العمل',
        'تخفيض الدرجة',
        'فصل مع مكافأة',
        'فصل بدون مكافأة',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['بسيطة', 'متوسطة', 'جسيمة', 'خطيرة'],
      required: true,
    },
    violation: {
      type: {
        type: String,
        enum: [
          'تأخر متكرر',
          'غياب بدون إذن',
          'إهمال في العمل',
          'سوء سلوك',
          'مخالفة أنظمة السلامة',
          'إفشاء أسرار',
          'تزوير مستندات',
          'سرقة',
          'اعتداء',
          'أخرى',
        ],
      },
      description: { type: String, required: true },
      date: { type: Date, required: true },
      location: String,
      witnesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    },
    previousWarnings: {
      count: { type: Number, default: 0 },
      references: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DisciplinaryAction' }],
    },
    penalty: {
      deductionDays: Number,
      deductionAmount: Number,
      suspensionDays: Number,
      suspensionStartDate: Date,
      suspensionEndDate: Date,
    },
    status: {
      type: String,
      enum: ['مسودة', 'بانتظار الموافقة', 'معتمد', 'تم التنفيذ', 'تم الاعتراض', 'ملغي'],
      default: 'مسودة',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    approvalDate: Date,
    employeeAcknowledgement: {
      acknowledged: { type: Boolean, default: false },
      date: Date,
      signature: String,
      refusedToSign: { type: Boolean, default: false },
    },
    appeal: {
      filed: { type: Boolean, default: false },
      date: Date,
      reason: String,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      decision: { type: String, enum: ['معلق', 'قبول الاعتراض', 'رفض الاعتراض', 'تعديل العقوبة'] },
      decisionDate: Date,
      decisionNotes: String,
    },
    laborLawArticle: String, // مادة نظام العمل
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    expiryDate: Date, // تاريخ انتهاء صلاحية الإنذار
    notes: String,
  },
  { timestamps: true }
);

DisciplinaryActionSchema.index({ employeeId: 1, status: 1 });
DisciplinaryActionSchema.index({ actionNumber: 1 });
DisciplinaryActionSchema.index({ type: 1, status: 1 });

DisciplinaryActionSchema.pre('save', async function (next) {
  if (!this.actionNumber) {
    const count = await mongoose.model('DisciplinaryAction').countDocuments();
    this.actionNumber = `DA-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.models.DisciplinaryAction || mongoose.model('DisciplinaryAction', DisciplinaryActionSchema);
