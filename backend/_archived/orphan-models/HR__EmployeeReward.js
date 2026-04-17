/**
 * Employee Reward & Incentive Model — نموذج المكافآت والحوافز
 *
 * Comprehensive reward system: monthly bonuses, performance incentives,
 * recognition programs, and redeemable reward points.
 */
const mongoose = require('mongoose');

const EmployeeRewardSchema = new mongoose.Schema(
  {
    rewardNumber: { type: String, unique: true, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },

    type: {
      type: String,
      enum: [
        'مكافأة شهرية',
        'مكافأة ربع سنوية',
        'مكافأة سنوية',
        'حافز إنتاجية',
        'حافز أداء متميز',
        'تقدير موظف الشهر',
        'تقدير موظف السنة',
        'مكافأة مشروع',
        'مكافأة ابتكار',
        'مكافأة ولاء',
        'مكافأة التزام',
        'نقاط مكافآت',
        'بدل تميز',
        'شهادة تقدير',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['مالية', 'نقاط', 'تقديرية', 'عينية'],
      default: 'مالية',
    },

    amount: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    reason: { type: String, required: true, maxlength: 1000 },
    description: String,
    period: {
      month: Number,
      quarter: Number,
      year: { type: Number, default: () => new Date().getFullYear() },
    },

    status: {
      type: String,
      enum: ['مقترح', 'معتمد', 'مرفوض', 'تم الصرف', 'ملغي'],
      default: 'مقترح',
    },

    // Approval
    nominatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    approvalDate: Date,
    rejectionReason: String,

    // Payment
    paymentMethod: {
      type: String,
      enum: ['مع الراتب', 'تحويل منفصل', 'نقاط', 'عيني', ''],
      default: '',
    },
    payrollMonth: String,
    disbursementDate: Date,
    disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Certificate
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: String,

    // Recognition
    isPublic: { type: Boolean, default: true },
    announcement: String,

    notes: String,
    attachments: [String],
  },
  { timestamps: true }
);

EmployeeRewardSchema.index({ employeeId: 1, type: 1 });
EmployeeRewardSchema.index({ status: 1, type: 1 });
// rewardNumber: removed — unique:true creates implicit index
EmployeeRewardSchema.index({ 'period.year': 1, 'period.month': 1 });

module.exports =
  mongoose.models.EmployeeReward || mongoose.model('EmployeeReward', EmployeeRewardSchema);
