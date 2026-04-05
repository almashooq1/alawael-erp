/**
 * EmploymentContract Model — عقود العمل
 * Based on: employment_contracts table (prompt_02 §5.5)
 */
const mongoose = require('mongoose');

const EmploymentContractSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    contractNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    contractType: {
      type: String,
      required: true,
      enum: ['permanent', 'temporary', 'part_time', 'probation'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // null = دائم
    // الراتب المتفق عليه في العقد
    salary: { type: Number, required: true, min: 0 },
    // البدلات
    benefits: {
      housingAllowance: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      foodAllowance: { type: Number, default: 0 },
      otherAllowances: { type: Number, default: 0 },
    },
    // أيام الإجازة السنوية
    vacationDays: { type: Number, default: 21 },
    // ساعات العمل الأسبوعية
    weeklyWorkHours: { type: Number, default: 40 },
    // ملف العقد
    filePath: { type: String },
    fileName: { type: String },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated', 'renewed', 'draft'],
      default: 'draft',
    },
    // تاريخ إنتهاء فترة الاختبار (للعقود التجريبية)
    probationEndDate: { type: Date },
    // العقد السابق (للتجديدات)
    previousContract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmploymentContract',
    },
    // من أعد العقد
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // من وقّع على العقد
    signedByEmployee: { type: Boolean, default: false },
    signedByEmployeeAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

EmploymentContractSchema.index({ employee: 1, status: 1 });
EmploymentContractSchema.index({ branch: 1 });
EmploymentContractSchema.index({ endDate: 1 }); // للتنبيه عند قرب الانتهاء

module.exports =
  mongoose.models.EmploymentContract ||
  mongoose.models.EmploymentContract ||
  mongoose.model('EmploymentContract', EmploymentContractSchema);
