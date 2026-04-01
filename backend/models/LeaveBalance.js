/**
 * LeaveBalance Model — أرصدة الإجازات
 * Based on: leave_balances table (prompt_02 §5.5)
 */
const mongoose = require('mongoose');

const LeaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    year: { type: String, required: true, match: /^\d{4}$/ },
    leaveType: {
      type: String,
      required: true,
      enum: [
        'annual', // إجازة سنوية
        'sick', // مرضية
        'emergency', // طارئة
        'maternity', // أمومة
        'paternity', // أبوة
        'hajj', // حج
        'marriage', // زواج
        'bereavement', // وفاة
        'study', // دراسة
        'unpaid', // بدون راتب
      ],
    },
    // الأيام المستحقة حسب العقد / النظام
    entitledDays: { type: Number, required: true, min: 0 },
    // الأيام المستخدمة
    usedDays: { type: Number, default: 0, min: 0 },
    // أيام مرحّلة من السنة السابقة
    carriedOver: { type: Number, default: 0, min: 0 },
    // الأيام المتبقية (محسوبة)
    remainingDays: { type: Number, default: 0, min: 0 },
    // تاريخ انتهاء المرحَّل (بعض الشركات تضع حد أقصى)
    carryOverExpiry: { type: Date },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// unique: موظف + سنة + نوع الإجازة
LeaveBalanceSchema.index({ employee: 1, year: 1, leaveType: 1 }, { unique: true });

// قبل الحفظ: احسب المتبقي تلقائياً
LeaveBalanceSchema.pre('save', function (next) {
  this.remainingDays = Math.max(0, this.entitledDays + this.carriedOver - this.usedDays);
  next();
});

module.exports = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', LeaveBalanceSchema);
