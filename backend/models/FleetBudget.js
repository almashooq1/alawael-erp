/**
 * Fleet Cost Analytics Model - نموذج تحليلات تكاليف الأسطول
 *
 * تتبع التكاليف التشغيلية وتحليل العائد على الاستثمار
 * وميزانيات الأسطول
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// سجل تكلفة فردي
const costEntrySchema = new Schema({
  date: { type: Date, required: true },
  category: {
    type: String,
    enum: [
      'fuel',
      'maintenance',
      'insurance',
      'registration',
      'toll',
      'parking',
      'tires',
      'cleaning',
      'fine',
      'accident',
      'depreciation',
      'finance_lease',
      'salary_driver',
      'training',
      'technology',
      'other',
    ],
    required: true,
  },
  subcategory: String,
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'SAR' },
  description: String,
  descriptionAr: String,
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip' },
  vendor: String,
  invoiceNumber: String,
  receipt: String,
  approved: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
});

const fleetBudgetSchema = new Schema(
  {
    // معلومات الميزانية
    name: { type: String, required: true },
    nameAr: String,
    period: {
      type: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
      year: { type: Number, required: true },
      month: Number,
      quarter: Number,
    },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'closed', 'exceeded'],
      default: 'draft',
    },

    // الميزانية المخصصة لكل فئة
    allocations: {
      fuel: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      maintenance: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      insurance: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      registration: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      tires: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      tolls: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      fines: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      drivers: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      technology: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
      other: { budget: { type: Number, default: 0 }, actual: { type: Number, default: 0 } },
    },

    totalBudget: { type: Number, default: 0 },
    totalActual: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    variancePercent: { type: Number, default: 0 },

    // سجلات التكاليف
    costEntries: [costEntrySchema],

    // تنبيهات الميزانية
    alerts: {
      warningThreshold: { type: Number, default: 80 }, // نسبة %
      criticalThreshold: { type: Number, default: 95 },
      autoNotify: { type: Boolean, default: true },
    },

    // التكلفة لكل كم
    costPerKm: {
      target: Number,
      actual: Number,
      totalKm: Number,
    },

    // التكلفة لكل مركبة
    costPerVehicle: [
      {
        vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
        totalCost: Number,
        costPerKm: Number,
        totalKm: Number,
        breakdown: {
          fuel: Number,
          maintenance: Number,
          insurance: Number,
          other: Number,
        },
      },
    ],

    // ملاحظات
    notes: String,

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// حساب الإجماليات قبل الحفظ
fleetBudgetSchema.pre('save', function (next) {
  const alloc = this.allocations;
  this.totalBudget = Object.values(alloc).reduce((sum, cat) => sum + (cat.budget || 0), 0);
  this.totalActual = Object.values(alloc).reduce((sum, cat) => sum + (cat.actual || 0), 0);
  this.variance = this.totalBudget - this.totalActual;
  this.variancePercent =
    this.totalBudget > 0 ? ((this.totalActual / this.totalBudget) * 100).toFixed(2) : 0;

  if (this.variancePercent >= this.alerts.criticalThreshold) {
    this.status = 'exceeded';
  }
  next();
});

fleetBudgetSchema.index({ 'period.year': 1, 'period.month': 1 });
fleetBudgetSchema.index({ status: 1 });
fleetBudgetSchema.index({ organization: 1 });

module.exports = mongoose.models.FleetBudget || mongoose.model('FleetBudget', fleetBudgetSchema);
