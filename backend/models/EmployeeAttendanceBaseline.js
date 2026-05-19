'use strict';

/**
 * EmployeeAttendanceBaseline — Wave 132.
 *
 * Per-employee statistical baseline learned from the trailing-N-days
 * window of DailyAttendanceRecord rows. Captures:
 *
 *   - typical check-in time (mean + stddev in minutes-of-day)
 *   - typical check-out time
 *   - typical worked minutes
 *   - typical day-of-week pattern (which workdays the employee uses)
 *
 * Used by Wave 132 anomaly detector to detect deviations from the
 * EMPLOYEE'S OWN pattern rather than global thresholds. Two
 * employees with very different working patterns get fair treatment.
 *
 * Refresh cadence: nightly cron, configurable. The doc stores
 * lastRefreshedAt + sampleSize so consumers can decide whether the
 * baseline is mature enough to use (we require ≥ MIN_SAMPLE_SIZE
 * before flagging anomalies).
 *
 * Wave-18 invariants:
 *   • (employeeId) unique
 *   • sampleSize ≥ 0
 *   • when sampleSize ≥ MIN_SAMPLE_SIZE, mean/stddev fields populated
 */

const mongoose = require('mongoose');

const MIN_SAMPLE_SIZE = 10; // need at least 10 days before trusting the baseline
const DEFAULT_WINDOW_DAYS = 90;

const StatSchema = new mongoose.Schema(
  {
    meanMinutes: { type: Number, default: null },
    stddevMinutes: { type: Number, default: null },
    minMinutes: { type: Number, default: null },
    maxMinutes: { type: Number, default: null },
  },
  { _id: false }
);

const EmployeeAttendanceBaselineSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true,
    },

    // checkInMinuteOfDay = hours*60 + minutes from midnight UTC.
    checkInTime: { type: StatSchema, default: () => ({}) },
    checkOutTime: { type: StatSchema, default: () => ({}) },
    workedMinutes: { type: StatSchema, default: () => ({}) },

    // Day-of-week presence rate (0..1 per day, 0=Sun .. 6=Sat).
    workdayPattern: {
      type: [{ type: Number, min: 0, max: 1 }],
      default: () => [0, 0, 0, 0, 0, 0, 0],
    },

    sampleSize: { type: Number, default: 0, min: 0 },
    windowDays: { type: Number, default: DEFAULT_WINDOW_DAYS },
    lastRefreshedAt: { type: Date, default: null },

    // Bookkeeping — which dates fed the baseline (helps debug
    // weird-looking deltas).
    sampledDateRange: {
      start: { type: Date, default: null },
      end: { type: Date, default: null },
    },
  },
  { timestamps: true, collection: 'employee_attendance_baselines' }
);

EmployeeAttendanceBaselineSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

EmployeeAttendanceBaselineSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.employeeId) {
    this.invalidate('employeeId', 'required');
    ok = false;
  }
  if (typeof this.sampleSize !== 'number' || this.sampleSize < 0) {
    this.invalidate('sampleSize', 'must be ≥ 0');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.EmployeeAttendanceBaseline ||
  mongoose.model('EmployeeAttendanceBaseline', EmployeeAttendanceBaselineSchema);

module.exports.EmployeeAttendanceBaselineSchema = EmployeeAttendanceBaselineSchema;
module.exports.MIN_SAMPLE_SIZE = MIN_SAMPLE_SIZE;
module.exports.DEFAULT_WINDOW_DAYS = DEFAULT_WINDOW_DAYS;
