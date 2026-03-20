/**
 * Fleet Tire Model - نموذج إدارة الإطارات
 *
 * تتبع دورة حياة الإطارات والتبديل والتآكل
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// سجل تبديل الإطار
const tireRotationSchema = new Schema({
  date: { type: Date, required: true },
  fromPosition: String,
  toPosition: String,
  odometerReading: Number,
  performedBy: String,
  notes: String,
});

// قراءة تآكل الإطار
const treadReadingSchema = new Schema({
  date: { type: Date, required: true },
  depth: { type: Number, required: true }, // ملم
  position: String,
  measuredBy: String,
});

const fleetTireSchema = new Schema(
  {
    // معلومات الإطار
    serialNumber: { type: String, required: true, unique: true },
    brand: { type: String, required: true },
    model: String,
    size: { type: String, required: true }, // مثل: 245/70R16
    type: {
      type: String,
      enum: ['summer', 'winter', 'all_season', 'off_road', 'performance', 'heavy_duty'],
      default: 'all_season',
    },

    // الحالة
    status: {
      type: String,
      enum: ['new', 'in_use', 'spare', 'retreaded', 'worn', 'damaged', 'disposed'],
      default: 'new',
    },

    // الموقع الحالي
    currentVehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    position: {
      type: String,
      enum: [
        'front_left',
        'front_right',
        'rear_left',
        'rear_right',
        'spare',
        'rear_inner_left',
        'rear_inner_right',
        'rear_outer_left',
        'rear_outer_right',
        'storage',
      ],
    },

    // معلومات الشراء
    purchase: {
      date: Date,
      vendor: String,
      cost: Number,
      warranty: {
        months: Number,
        maxKm: Number,
        expiryDate: Date,
      },
      invoiceNumber: String,
    },

    // الاستخدام
    usage: {
      installDate: Date,
      installOdometer: Number,
      currentOdometer: Number,
      totalKm: { type: Number, default: 0 },
      maxRecommendedKm: { type: Number, default: 60000 },
      retreads: { type: Number, default: 0 },
      maxRetreads: { type: Number, default: 2 },
    },

    // حالة التآكل
    treadDepth: {
      original: { type: Number, default: 8 }, // ملم
      current: { type: Number, default: 8 },
      minimum: { type: Number, default: 1.6 },
      warningLevel: { type: Number, default: 3 },
      readings: [treadReadingSchema],
    },

    // ضغط الهواء
    pressure: {
      recommended: Number, // PSI
      lastReading: Number,
      lastChecked: Date,
      tpmsEnabled: { type: Boolean, default: false },
    },

    // سجل التبديل
    rotations: [tireRotationSchema],
    lastRotation: Date,
    nextRotationKm: Number,
    rotationIntervalKm: { type: Number, default: 10000 },

    // الإصلاحات
    repairs: [
      {
        date: Date,
        type: {
          type: String,
          enum: ['puncture', 'sidewall', 'bead', 'valve', 'retread', 'balance', 'alignment'],
        },
        description: String,
        cost: Number,
        vendor: String,
        performedBy: String,
      },
    ],

    // إحصائيات الأداء
    performance: {
      costPerKm: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      fuelEfficiencyImpact: Number,
      rating: { type: Number, min: 1, max: 5 },
    },

    // التخلص
    disposal: {
      date: Date,
      reason: String,
      method: { type: String, enum: ['recycled', 'retreaded', 'disposed', 'sold'] },
      finalOdometer: Number,
      totalLifeKm: Number,
    },

    notes: String,
    photos: [String],

    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

fleetTireSchema.index({ currentVehicle: 1, status: 1 });
fleetTireSchema.index({ status: 1 });
fleetTireSchema.index({ 'treadDepth.current': 1 });
fleetTireSchema.index({ organization: 1 });

// حساب التكلفة لكل كم
fleetTireSchema.pre('save', function (next) {
  if (this.usage.totalKm > 0 && this.performance.totalCost > 0) {
    this.performance.costPerKm = (this.performance.totalCost / this.usage.totalKm).toFixed(4);
  }
  next();
});

module.exports = mongoose.model('FleetTire', fleetTireSchema);
