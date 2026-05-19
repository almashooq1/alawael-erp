'use strict';

/**
 * BranchGeofence — Wave 122.
 *
 * Per-branch (or per-field-zone) geofence for mobile check-in
 * validation. A polygon (≥3 vertices) + optional radius buffer
 * + optional active-hours schedule.
 *
 * Wave-18 invariants:
 *   • branchId required
 *   • polygon ≥3 valid [lat,lng] vertices
 *   • bufferM ≥ 0
 *   • allowedRoles subset of known roles (open list; not strictly
 *     validated to allow custom roles)
 */

const mongoose = require('mongoose');

const GEOFENCE_KIND = ['branch-perimeter', 'field-zone', 'driver-garage', 'corridor'];

const BranchGeofenceSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    nameAr: { type: String, required: true, maxlength: 100 },
    kind: { type: String, enum: GEOFENCE_KIND, default: 'branch-perimeter' },

    // Polygon vertices — [[lat, lng], ...]. Stored as a Mixed array
    // because Mongoose doesn't have native nested-tuple support.
    polygon: { type: mongoose.Schema.Types.Mixed, required: true },

    // Tolerance in meters around the polygon edge.
    bufferM: { type: Number, default: 25, min: 0, max: 500 },

    // Active hours — array of { day: 0..6 (UTC), start: HH:MM, end: HH:MM }.
    // Empty = always-open.
    activeHours: {
      type: [
        new mongoose.Schema(
          {
            day: { type: Number, min: 0, max: 6, required: true },
            start: { type: String, required: true, maxlength: 5 },
            end: { type: String, required: true, maxlength: 5 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    // Roles allowed to use this geofence for check-in. Empty = any role.
    allowedRoles: { type: [String], default: () => [] },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'branch_geofences' }
);

BranchGeofenceSchema.index({ branchId: 1, active: 1 });

BranchGeofenceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

BranchGeofenceSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!this.branchId) {
    this.invalidate('branchId', 'required');
    ok = false;
  }
  if (!Array.isArray(this.polygon) || this.polygon.length < 3) {
    this.invalidate('polygon', 'polygon must have ≥3 vertices');
    ok = false;
  } else {
    for (let i = 0; i < this.polygon.length; i++) {
      const p = this.polygon[i];
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1]) ||
        p[0] < -90 ||
        p[0] > 90 ||
        p[1] < -180 ||
        p[1] > 180
      ) {
        this.invalidate(`polygon.${i}`, 'vertex must be [lat,lng] with valid range');
        ok = false;
        break;
      }
    }
  }
  return ok;
});

module.exports =
  mongoose.models.BranchGeofence || mongoose.model('BranchGeofence', BranchGeofenceSchema);

module.exports.BranchGeofenceSchema = BranchGeofenceSchema;
module.exports.GEOFENCE_KIND = GEOFENCE_KIND;
