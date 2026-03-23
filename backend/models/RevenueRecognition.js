/**
 * Revenue Recognition Models - IFRS 15
 * الاعتراف بالإيراد - Performance Obligations & Contract Revenue
 * 5-step model compliance, contract modifications, variable consideration
 */
const mongoose = require('mongoose');

const performanceObligationSchema = new mongoose.Schema({
  description: { type: String, required: true },
  descriptionEn: { type: String },
  type: {
    type: String,
    enum: ['product', 'service', 'license', 'warranty', 'construction', 'subscription', 'other'],
    default: 'service',
  },
  standalonePrice: { type: Number, required: true },
  allocatedPrice: { type: Number, default: 0 },
  recognitionMethod: {
    type: String,
    enum: ['point_in_time', 'over_time_output', 'over_time_input', 'over_time_milestone'],
    default: 'point_in_time',
  },
  percentComplete: { type: Number, default: 0, min: 0, max: 100 },
  recognizedAmount: { type: Number, default: 0 },
  deferredAmount: { type: Number, default: 0 },
  satisfiedDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'satisfied', 'cancelled'],
    default: 'pending',
  },
});

const revenueContractSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    contractNumber: { type: String, unique: true },
    customerName: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    contractDate: { type: Date, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    totalContractValue: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    performanceObligations: [performanceObligationSchema],
    variableConsideration: {
      hasVariable: { type: Boolean, default: false },
      estimationMethod: {
        type: String,
        enum: ['expected_value', 'most_likely'],
        default: 'expected_value',
      },
      estimatedAmount: { type: Number, default: 0 },
      constraintApplied: { type: Boolean, default: false },
    },
    contractModifications: [
      {
        modificationDate: { type: Date },
        description: { type: String },
        treatmentType: {
          type: String,
          enum: ['separate_contract', 'cumulative_catchup', 'prospective'],
          default: 'cumulative_catchup',
        },
        amountChange: { type: Number, default: 0 },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    totalRecognized: { type: Number, default: 0 },
    totalDeferred: { type: Number, default: 0 },
    vatRate: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ['draft', 'active', 'modified', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

revenueContractSchema.pre('save', async function (next) {
  if (!this.contractNumber) {
    const count = await this.constructor.countDocuments({ organization: this.organization });
    this.contractNumber = `REV-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const RevenueContract = mongoose.models.RevenueContract || mongoose.model('RevenueContract', revenueContractSchema);

// Revenue Schedule Entry - جدول الاعتراف بالإيراد
const revenueScheduleSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'RevenueContract', required: true },
    period: { type: String, required: true },
    recognitionDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    obligationIndex: { type: Number },
    type: {
      type: String,
      enum: ['scheduled', 'milestone', 'adjustment', 'catchup'],
      default: 'scheduled',
    },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    posted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const RevenueSchedule = mongoose.models.RevenueSchedule || mongoose.model('RevenueSchedule', revenueScheduleSchema);

module.exports = { RevenueContract, RevenueSchedule };
