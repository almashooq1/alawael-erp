/**
 * Cost Allocation Models
 * توزيع التكاليف - Allocation Rules, Cost Drivers, ABC
 * Activity-based costing, allocation runs, profit center mapping
 */
const mongoose = require('mongoose');

const costAllocationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    allocationNumber: { type: String, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String },
    allocationType: {
      type: String,
      enum: [
        'direct',
        'step_down',
        'reciprocal',
        'activity_based',
        'volume_based',
        'revenue_based',
        'headcount_based',
        'custom',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'suspended', 'archived'],
      default: 'draft',
    },
    period: {
      fiscalYear: { type: Number },
      month: { type: Number },
      quarter: { type: Number },
      startDate: { type: Date },
      endDate: { type: Date },
    },
    costPool: {
      poolName: { type: String },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: 'SAR' },
      costCenter: { type: String },
      glAccount: { type: String },
      costCategory: {
        type: String,
        enum: [
          'overhead',
          'direct_labor',
          'direct_material',
          'indirect',
          'admin',
          'marketing',
          'it',
          'facilities',
          'depreciation',
        ],
      },
    },
    costDrivers: [
      {
        driverName: { type: String },
        driverType: {
          type: String,
          enum: [
            'volume',
            'headcount',
            'square_meters',
            'machine_hours',
            'transactions',
            'revenue',
            'time',
            'custom',
          ],
        },
        totalDriverUnits: { type: Number, default: 0 },
        unitCost: { type: Number, default: 0 },
        weight: { type: Number, default: 1 },
      },
    ],
    allocationRules: [
      {
        ruleName: { type: String },
        sourceCenter: { type: String },
        targetCenter: { type: String },
        allocationBasis: { type: String },
        percentage: { type: Number },
        fixedAmount: { type: Number },
        priority: { type: Number, default: 0 },
      },
    ],
    allocationResults: [
      {
        targetCostCenter: { type: String },
        targetDepartment: { type: String },
        targetProject: { type: String },
        allocatedAmount: { type: Number, default: 0 },
        driverUnitsConsumed: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
        profitCenter: { type: String },
      },
    ],
    activityBasedCosting: {
      enabled: { type: Boolean, default: false },
      activities: [
        {
          activityName: { type: String },
          activityPool: { type: Number, default: 0 },
          costDriver: { type: String },
          driverRate: { type: Number, default: 0 },
          totalDriverQuantity: { type: Number, default: 0 },
        },
      ],
    },
    profitCenterMapping: [
      {
        profitCenter: { type: String },
        profitCenterName: { type: String },
        allocatedRevenue: { type: Number, default: 0 },
        allocatedCost: { type: Number, default: 0 },
        contribution: { type: Number, default: 0 },
        marginPercentage: { type: Number, default: 0 },
      },
    ],
    executionLog: [
      {
        executedAt: { type: Date, default: Date.now },
        executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        totalAllocated: { type: Number },
        centersAffected: { type: Number },
        status: { type: String, enum: ['success', 'partial', 'failed'] },
        errorMessages: [{ type: String }],
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

costAllocationSchema.pre('save', async function () {
  if (!this.allocationNumber) {
    const count = await this.constructor.countDocuments();
    this.allocationNumber = `CAL-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.models.CostAllocation || mongoose.model('CostAllocation', costAllocationSchema);
