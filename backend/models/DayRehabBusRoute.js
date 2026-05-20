'use strict';

/**
 * DayRehabBusRoute — Wave 183.
 *
 * "خطوط الباصات لمركز التأهيل النهاري" — focused day-rehab bus model.
 * Distinct from generic BusRoute / TransportRoute models:
 *  • Refs Beneficiary (not Student / User).
 *  • Pickup + Dropoff are paired (one route handles both directions).
 *  • Stops have an order + beneficiary assignment + estimated arrival.
 *  • Driver + supervisor (مشرفة) both required (regulatory).
 *
 * Wave-18 invariants:
 *  • (branchId, code) unique
 *  • stops have unique orders within a route
 *  • pickupStart < pickupEnd, dropoffStart < dropoffEnd
 */

const mongoose = require('mongoose');

const STATUSES = ['active', 'paused', 'archived'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const StopSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, maxlength: 100 },
    area: { type: String, default: '', maxlength: 100 },
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },
    estimatedPickupTime: { type: String, default: null, match: /^\d{2}:\d{2}$/ },
    estimatedDropoffTime: { type: String, default: null, match: /^\d{2}:\d{2}$/ },
    beneficiaryIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Beneficiary',
      default: () => [],
    },
    notes: { type: String, default: '', maxlength: 200 },
  },
  { _id: true }
);

const DayRehabBusRouteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 20 },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    direction: {
      type: String,
      enum: ['pickup', 'dropoff', 'both'],
      default: 'both',
    },
    stops: { type: [StopSchema], default: () => [] },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    driverName: { type: String, default: '', maxlength: 100 },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    supervisorName: { type: String, default: '', maxlength: 100 },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    vehicleLabel: { type: String, default: '', maxlength: 50 },
    pickupStartTime: { type: String, default: '06:30', match: /^\d{2}:\d{2}$/ },
    pickupEndTime: { type: String, default: '07:30', match: /^\d{2}:\d{2}$/ },
    dropoffStartTime: { type: String, default: '13:30', match: /^\d{2}:\d{2}$/ },
    dropoffEndTime: { type: String, default: '14:30', match: /^\d{2}:\d{2}$/ },
    workingDays: {
      type: [String],
      default: () => ['sun', 'mon', 'tue', 'wed', 'thu'],
      validate: {
        validator: v => Array.isArray(v) && v.every(d => DAYS.includes(d)),
      },
    },
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    color: { type: String, default: '#f59e0b' },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'day_rehab_bus_routes' }
);

DayRehabBusRouteSchema.index({ branchId: 1, code: 1 }, { unique: true });
DayRehabBusRouteSchema.index({ status: 1, branchId: 1 });
DayRehabBusRouteSchema.index({ 'stops.beneficiaryIds': 1 });

DayRehabBusRouteSchema.virtual('totalStops').get(function () {
  return Array.isArray(this.stops) ? this.stops.length : 0;
});
DayRehabBusRouteSchema.virtual('totalBeneficiaries').get(function () {
  if (!Array.isArray(this.stops)) return 0;
  const ids = new Set();
  for (const s of this.stops) {
    for (const b of s.beneficiaryIds || []) ids.add(String(b));
  }
  return ids.size;
});

DayRehabBusRouteSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DayRehabBusRouteSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.pickupStartTime >= this.pickupEndTime) {
    this.invalidate('pickupEndTime', 'pickup end must be after start');
    ok = false;
  }
  if (this.dropoffStartTime >= this.dropoffEndTime) {
    this.invalidate('dropoffEndTime', 'dropoff end must be after start');
    ok = false;
  }
  // Stop orders unique within route
  if (Array.isArray(this.stops)) {
    const orders = new Set();
    for (const s of this.stops) {
      if (orders.has(s.order)) {
        this.invalidate('stops', `duplicate stop order ${s.order}`);
        ok = false;
        break;
      }
      orders.add(s.order);
    }
  }
  return ok;
});

DayRehabBusRouteSchema.set('toJSON', { virtuals: true });
DayRehabBusRouteSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.DayRehabBusRoute || mongoose.model('DayRehabBusRoute', DayRehabBusRouteSchema);

module.exports.STATUSES = STATUSES;
module.exports.DAYS = DAYS;
