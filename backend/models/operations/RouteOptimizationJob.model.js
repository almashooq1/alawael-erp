'use strict';

/**
 * RouteOptimizationJob.model.js — Phase 16 Commit 7 (4.0.72).
 *
 * One morning/afternoon planning run for a single branch. Carries
 * the inputs (pickup requests), the optimised stop sequence, the
 * vehicle + driver assignment, and the per-stop variance record.
 *
 * Why a dedicated job instead of stamping plan fields on the
 * existing `Trip` model: a trip is the runtime record (GPS,
 * odometer, fuel) of a specific execution. A planning job is
 * the *intent* — it must be immutable enough to diff against
 * reality, and it must survive cancellation (the cancelled plan
 * is still part of the audit trail).
 *
 * Relationships:
 *   • `branchId` — required. One job is one branch's run.
 *   • `assignedVehicleId`/`assignedDriverId` — optional in
 *     `planning`/`optimized`, required to transition to
 *     `published`.
 *   • Each stop carries an optional `slaId` populated by the
 *     service when the job is published (one SLA clock per stop).
 *   • `linkedTripId` — back-reference to the fleet Trip that
 *     executes this plan at runtime (optional, populated when
 *     the driver starts the trip).
 */

const mongoose = require('mongoose');
const {
  JOB_STATUSES,
  PICKUP_PRIORITIES,
  STOP_STATUSES,
  VEHICLE_CAPABILITIES,
} = require('../../config/routeOptimization.registry');

const coordinatesSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

const pickupRequestSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
    },
    beneficiaryNameSnapshot: { type: String, default: null },
    guardianPhone: { type: String, default: null },
    pickupAddress: { type: String, default: null },
    postalCode: { type: String, default: null },
    coordinates: { type: coordinatesSchema, default: () => ({}) },
    priority: {
      type: String,
      enum: PICKUP_PRIORITIES,
      default: 'standard',
      index: true,
    },
    requiredCapabilities: { type: [String], default: [] }, // VEHICLE_CAPABILITIES subset
    preferredWindow: {
      earliest: { type: Date, default: null },
      latest: { type: Date, default: null },
    },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const plannedStopSchema = new mongoose.Schema(
  {
    sequence: { type: Number, required: true, min: 0 },
    address: { type: String, default: null },
    coordinates: { type: coordinatesSchema, default: () => ({}) },
    // The beneficiaries being served at this stop. Multiple can
    // share a single physical stop (same building / cluster).
    requestIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    beneficiarySnapshot: {
      // Denormalised summary so a stale-plan export still reads.
      count: { type: Number, default: 0 },
      names: { type: [String], default: [] },
    },
    plannedArrival: { type: Date, required: true },
    actualArrival: { type: Date, default: null },
    varianceMinutes: { type: Number, default: null },

    status: {
      type: String,
      enum: STOP_STATUSES,
      default: 'planned',
      index: true,
    },
    statusAt: { type: Date, default: null },
    statusNotes: { type: String, default: null },

    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    event: { type: String, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: null },
  },
  { _id: false }
);

const routeOptimizationJobSchema = new mongoose.Schema(
  {
    // ── identity ────────────────────────────────────────────────
    jobNumber: { type: String, required: true, unique: true, uppercase: true },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    runDate: { type: Date, required: true, index: true },
    shift: { type: String, default: 'morning', index: true },
    departureTime: { type: Date, required: true },

    // ── status machine ──────────────────────────────────────────
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'planning',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── assignment ──────────────────────────────────────────────
    assignedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    assignedVehicleRegistration: { type: String, default: null },
    assignedVehicleCapabilities: { type: [String], default: [] }, // snapshot at publish
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    assignedDriverNameSnapshot: { type: String, default: null },

    // ── plan inputs + outputs ───────────────────────────────────
    requests: { type: [pickupRequestSchema], default: [] },
    plannedStops: { type: [plannedStopSchema], default: [] },

    // ── runtime link ────────────────────────────────────────────
    linkedTripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null,
    },

    // ── optimization params (snapshotted at optimize-time) ──────
    optimizationParams: {
      minutesPerStop: { type: Number, default: 10 },
      maxStopsPerVehicle: { type: Number, default: 20 },
      algorithm: { type: String, default: 'geo-bucket-nn-v1' },
      optimizedAt: { type: Date, default: null },
    },

    // ── variance summary (rolled up at completion) ──────────────
    varianceSummary: {
      totalStops: { type: Number, default: 0 },
      onTimeCount: { type: Number, default: 0 },
      lateCount: { type: Number, default: 0 }, // > 5 min late
      missedCount: { type: Number, default: 0 },
      avgVarianceMinutes: { type: Number, default: null },
      maxVarianceMinutes: { type: Number, default: null },
    },

    // ── misc ────────────────────────────────────────────────────
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'route_optimization_jobs' }
);

// ── indexes ─────────────────────────────────────────────────────────
routeOptimizationJobSchema.index({ branchId: 1, runDate: 1, shift: 1 });
routeOptimizationJobSchema.index({ status: 1, runDate: 1 });

// ── auto-numbering ROJ-YYYY-NNNNN ───────────────────────────────────
routeOptimizationJobSchema.pre('validate', async function () {
  if (this.jobNumber) return;
  const year = (this.runDate || new Date()).getUTCFullYear();
  const Model = mongoose.model('RouteOptimizationJob');
  const count = await Model.countDocuments({
    jobNumber: { $regex: `^ROJ-${year}-` },
  });
  this.jobNumber = `ROJ-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── virtuals ────────────────────────────────────────────────────────
routeOptimizationJobSchema.virtual('onTimePct').get(function () {
  const total = this.varianceSummary?.totalStops || 0;
  if (!total) return null;
  return Math.round(((this.varianceSummary.onTimeCount || 0) / total) * 10000) / 100;
});

routeOptimizationJobSchema.set('toJSON', { virtuals: true });
routeOptimizationJobSchema.set('toObject', { virtuals: true });

const RouteOptimizationJob =
  mongoose.models.RouteOptimizationJob ||
  mongoose.model('RouteOptimizationJob', routeOptimizationJobSchema);

module.exports = RouteOptimizationJob;
module.exports.VEHICLE_CAPABILITIES = VEHICLE_CAPABILITIES;
