/**
 * Driver Shift & Scheduling Model - نموذج جدولة ومناوبات السائقين
 */

const mongoose = require('mongoose');

const driverShiftSchema = new mongoose.Schema(
  {
    shiftNumber: { type: String, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    type: {
      type: String,
      enum: ['morning', 'afternoon', 'night', 'split', 'on_call', 'overtime', 'training', 'relief'],
      required: true,
    },

    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'started', 'completed', 'cancelled', 'no_show', 'swapped'],
      default: 'scheduled',
    },

    schedule: {
      date: { type: Date, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      plannedHours: { type: Number },
      breakMinutes: { type: Number, default: 30 },
    },

    actual: {
      clockIn: { type: Date },
      clockOut: { type: Date },
      actualHours: { type: Number },
      overtime: { type: Number, default: 0 },
      lateMinutes: { type: Number, default: 0 },
      earlyLeaveMinutes: { type: Number, default: 0 },
    },

    route: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
    trips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }],

    // Hours of Service (HOS) compliance
    hos: {
      dailyDrivingHours: { type: Number, default: 0 },
      dailyDutyHours: { type: Number, default: 0 },
      weeklyDrivingHours: { type: Number, default: 0 },
      consecutiveDrivingHours: { type: Number, default: 0 },
      restPeriodHours: { type: Number, default: 0 },
      maxDailyDriving: { type: Number, default: 9 },
      maxWeeklyDriving: { type: Number, default: 56 },
      minRestPeriod: { type: Number, default: 11 },
      compliant: { type: Boolean, default: true },
      violations: [
        {
          type: {
            type: String,
            enum: [
              'daily_driving_exceeded',
              'weekly_driving_exceeded',
              'insufficient_rest',
              'consecutive_driving',
            ],
          },
          details: { type: String },
          date: { type: Date, default: Date.now },
        },
      ],
    },

    swap: {
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      originalDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      requestedAt: { type: Date },
    },

    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

driverShiftSchema.index({ driver: 1, 'schedule.date': 1 });
driverShiftSchema.index({ organization: 1, 'schedule.date': 1, status: 1 });
driverShiftSchema.index({ vehicle: 1, 'schedule.date': 1 });

driverShiftSchema.pre('save', async function (next) {
  if (!this.shiftNumber) {
    const count = await mongoose.model('DriverShift').countDocuments();
    this.shiftNumber = `SHF-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Shift Template for recurring schedules
const shiftTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    pattern: {
      type: String,
      enum: ['fixed', 'rotating', 'flexible', 'split'],
      default: 'fixed',
    },
    shifts: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 },
        type: { type: String },
        startTime: { type: String },
        endTime: { type: String },
        breakMinutes: { type: Number, default: 30 },
      },
    ],
    rotationDays: { type: Number },
    restDaysBetween: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const DriverShift = mongoose.model('DriverShift', driverShiftSchema);
const ShiftTemplate = mongoose.model('ShiftTemplate', shiftTemplateSchema);

module.exports = { DriverShift, ShiftTemplate };
