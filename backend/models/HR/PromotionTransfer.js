/**
 * Promotion/Transfer Model — نموذج الترقيات والتنقلات
 *
 * Handles employee promotions, transfers, and secondments.
 */
const mongoose = require('mongoose');

const PromotionTransferSchema = new mongoose.Schema(
  {
    requestNumber: {
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
      enum: ['ترقية', 'نقل داخلي', 'نقل خارجي', 'انتداب', 'إعارة', 'تكليف'],
      required: true,
    },
    // Current position info
    current: {
      department: String,
      position: String,
      grade: String,
      salary: Number,
      branch: String,
    },
    // New position info
    proposed: {
      department: String,
      position: String,
      grade: String,
      salary: Number,
      branch: String,
    },
    reason: {
      type: String,
      required: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    endDate: Date, // for temporary assignments
    status: {
      type: String,
      enum: [
        'مقترح',
        'موافقة المدير المباشر',
        'موافقة الموارد البشرية',
        'موافقة الإدارة العليا',
        'معتمد',
        'تم التنفيذ',
        'مرفوض',
        'ملغي',
      ],
      default: 'مقترح',
    },
    approvalWorkflow: [
      {
        step: String,
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        status: { type: String, enum: ['معلق', 'موافق', 'مرفوض'] },
        date: Date,
        notes: String,
      },
    ],
    salaryAdjustment: {
      oldSalary: Number,
      newSalary: Number,
      adjustment: Number,
      adjustmentPercentage: Number,
      effectiveFrom: Date,
    },
    performanceScore: Number,
    yearsInCurrentPosition: Number,
    qualifications: [String],
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    handoverPlan: {
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      startDate: Date,
      endDate: Date,
      tasks: [String],
      completed: { type: Boolean, default: false },
    },
    notes: String,
  },
  { timestamps: true }
);

PromotionTransferSchema.index({ employeeId: 1, type: 1, status: 1 });
// requestNumber: removed — unique:true creates implicit index
PromotionTransferSchema.index({ status: 1 });

PromotionTransferSchema.pre('save', async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('PromotionTransfer').countDocuments();
    const prefix = this.type === 'ترقية' ? 'PRM' : 'TRF';
    this.requestNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports =
  mongoose.models.PromotionTransfer || mongoose.model('PromotionTransfer', PromotionTransferSchema);
