/**
 * Fleet Fuel Model - نموذج إدارة الوقود
 * Fuel consumption tracking, refueling logs, efficiency analytics
 */

const mongoose = require('mongoose');

const fleetFuelSchema = new mongoose.Schema(
  {
    transactionNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    fuelCard: { type: mongoose.Schema.Types.ObjectId, ref: 'FleetFuelCard' },

    type: {
      type: String,
      enum: ['refueling', 'consumption_record', 'adjustment', 'transfer'],
      default: 'refueling',
    },

    fuelType: {
      type: String,
      enum: [
        'gasoline_91',
        'gasoline_95',
        'diesel',
        'premium_diesel',
        'lpg',
        'electric',
        'hybrid',
        'other',
      ],
      required: true,
    },

    // Refueling details
    quantity: { type: Number, required: true }, // liters or kWh
    unitPrice: { type: Number, required: true }, // SAR per unit
    totalCost: { type: Number },
    currency: { type: String, default: 'SAR' },

    // Odometer
    odometerReading: { type: Number },
    previousOdometer: { type: Number },
    distanceSinceLastFill: { type: Number },

    // Efficiency
    fuelEfficiency: { type: Number }, // km per liter
    averageConsumption: { type: Number }, // liters per 100km

    // Station info
    station: {
      name: { type: String },
      nameAr: { type: String },
      brand: { type: String },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number],
      },
      address: { type: String },
      city: { type: String },
    },

    // Tank status
    tankLevel: {
      before: { type: Number, min: 0, max: 100 },
      after: { type: Number, min: 0, max: 100 },
    },
    fullTank: { type: Boolean, default: false },

    // Payment
    paymentMethod: {
      type: String,
      enum: ['fuel_card', 'cash', 'company_account', 'credit_card', 'mobile_pay', 'other'],
      default: 'fuel_card',
    },
    receiptNumber: { type: String },
    receiptImage: { type: String },

    // Budget
    budgetCategory: { type: String },
    budgetPeriod: { type: String },
    isOverBudget: { type: Boolean, default: false },

    // Anomaly detection
    anomaly: {
      detected: { type: Boolean, default: false },
      type: {
        type: String,
        enum: [
          'excessive_consumption',
          'unusual_quantity',
          'frequency_spike',
          'location_mismatch',
          'none',
        ],
        default: 'none',
      },
      severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      notes: { type: String },
      investigatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      investigatedAt: { type: Date },
    },

    date: { type: Date, default: Date.now },
    notes: { type: String },
    notesAr: { type: String },

    status: {
      type: String,
      enum: ['pending', 'verified', 'disputed', 'cancelled'],
      default: 'pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-numbering
fleetFuelSchema.pre('save', async function (next) {
  if (!this.transactionNumber) {
    const count = await this.constructor.countDocuments();
    this.transactionNumber = `FUEL-${String(count + 1).padStart(6, '0')}`;
  }
  // Auto-calc total cost
  if (this.quantity && this.unitPrice && !this.totalCost) {
    this.totalCost = Math.round(this.quantity * this.unitPrice * 100) / 100;
  }
  // Auto-calc efficiency
  if (this.distanceSinceLastFill && this.quantity && this.quantity > 0) {
    this.fuelEfficiency = Math.round((this.distanceSinceLastFill / this.quantity) * 100) / 100;
    this.averageConsumption =
      Math.round((this.quantity / this.distanceSinceLastFill) * 10000) / 100;
  }
  next();
});

fleetFuelSchema.index({ organization: 1, vehicle: 1, date: -1 });
fleetFuelSchema.index({ organization: 1, driver: 1, date: -1 });
fleetFuelSchema.index({ organization: 1, status: 1 });
fleetFuelSchema.index({ 'anomaly.detected': 1 });
fleetFuelSchema.index({ 'station.location': '2dsphere' });

module.exports = mongoose.model('FleetFuel', fleetFuelSchema);
