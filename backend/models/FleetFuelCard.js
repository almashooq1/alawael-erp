/**
 * Fleet Fuel Card Model - نموذج بطاقات الوقود
 *
 * إدارة بطاقات الوقود وتسجيل المعاملات ومنع الاحتيال
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// معاملة وقود
const fuelTransactionSchema = new Schema({
  date: { type: Date, required: true },
  station: {
    name: String,
    code: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    address: String,
  },
  fuelType: {
    type: String,
    enum: ['petrol_91', 'petrol_95', 'diesel', 'premium_diesel', 'electric', 'hybrid'],
    required: true,
  },
  quantity: { type: Number, required: true }, // لتر
  pricePerUnit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  odometer: Number,
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
  receiptNumber: String,
  receiptPhoto: String,

  // التحقق
  verified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  suspicious: { type: Boolean, default: false },
  suspiciousReason: String,

  // كفاءة الوقود
  kmSinceLastFill: Number,
  fuelEfficiency: Number, // كم/لتر
  expectedEfficiency: Number,
  efficiencyVariance: Number, // نسبة الانحراف %
});

const fleetFuelCardSchema = new Schema(
  {
    // معلومات البطاقة
    cardNumber: { type: String, required: true, unique: true },
    cardType: {
      type: String,
      enum: ['company', 'individual', 'prepaid', 'credit', 'fleet'],
      default: 'fleet',
    },
    provider: {
      type: String,
      enum: [
        'saudi_aramco',
        'naft',
        'al_balad',
        'sasco',
        'aljeri',
        'adnoc',
        'total',
        'shell',
        'other',
      ],
      default: 'saudi_aramco',
    },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'suspended', 'expired', 'lost', 'stolen', 'cancelled', 'pending_activation'],
      default: 'pending_activation',
    },

    // التخصيص
    assignedVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    assignedDriver: { type: Schema.Types.ObjectId, ref: 'Driver' },

    // الصلاحية
    issuedDate: Date,
    expiryDate: Date,
    activatedDate: Date,

    // الحدود
    limits: {
      dailyLimit: { type: Number, default: 500 }, // ريال
      weeklyLimit: { type: Number, default: 2000 },
      monthlyLimit: { type: Number, default: 8000 },
      transactionLimit: { type: Number, default: 300 },
      dailyTransactionCount: { type: Number, default: 3 },
      allowedFuelTypes: [
        { type: String, enum: ['petrol_91', 'petrol_95', 'diesel', 'premium_diesel', 'electric'] },
      ],
      allowedDays: [{ type: String, enum: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] }],
      allowedHoursStart: String,
      allowedHoursEnd: String,
      restrictToGeofence: { type: Schema.Types.ObjectId, ref: 'Geofence' },
    },

    // الاستخدام
    usage: {
      currentMonthSpent: { type: Number, default: 0 },
      currentWeekSpent: { type: Number, default: 0 },
      currentDaySpent: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      totalLiters: { type: Number, default: 0 },
      transactionCount: { type: Number, default: 0 },
      lastTransaction: Date,
      averagePerTransaction: Number,
    },

    // المعاملات
    transactions: [fuelTransactionSchema],

    // PIN
    pin: {
      hash: String,
      lastChanged: Date,
      failedAttempts: { type: Number, default: 0 },
      locked: { type: Boolean, default: false },
    },

    // تنبيهات الاحتيال
    fraudAlerts: [
      {
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: [
            'unusual_amount',
            'unusual_location',
            'unusual_frequency',
            'unusual_time',
            'exceeded_limit',
            'card_sharing',
            'odometer_mismatch',
          ],
        },
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        resolved: { type: Boolean, default: false },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: Date,
        resolution: String,
      },
    ],

    // الإشعارات
    notifications: {
      onTransaction: { type: Boolean, default: true },
      onLimitReached: { type: Boolean, default: true },
      onFraudAlert: { type: Boolean, default: true },
      onExpiry: { type: Boolean, default: true },
      recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    notes: String,

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

fleetFuelCardSchema.index({ assignedVehicle: 1 });
fleetFuelCardSchema.index({ assignedDriver: 1 });
fleetFuelCardSchema.index({ status: 1 });
fleetFuelCardSchema.index({ expiryDate: 1 });
fleetFuelCardSchema.index({ organization: 1 });

module.exports = mongoose.model('FleetFuelCard', fleetFuelCardSchema);
