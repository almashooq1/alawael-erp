'use strict';

/**
 * Facility.model.js — Phase 16 Commit 3 (4.0.68).
 *
 * A Facility is a physical building owned or operated by the
 * organisation. It's explicitly separated from Branch so a single
 * branch can own multiple buildings (main + warehouse + annex) and
 * a single building can be shared between branches (HQ).
 *
 * Design notes:
 *
 *   1. `branchId` is the PRIMARY owning branch. Shared use by
 *      other branches is modelled via `sharedWithBranchIds[]` so
 *      access-control and cost-allocation logic can honour it
 *      without re-denormalising.
 *
 *   2. `code` is globally unique and human-friendly (e.g.
 *      RY-MAIN-B1 for "Riyadh Main branch, Building 1"). This is
 *      what operators type in inspection reports, WOs, etc.
 *
 *   3. `compliance` is a rolled-up snapshot — the authoritative
 *      history lives in FacilityInspection. The snapshot exists
 *      so the ops dashboard renders without joining every time.
 *
 *   4. Soft-delete via `deleted_at` so a decommissioned building
 *      stays in audit trails (maintenance history, asset
 *      assignments, inspection records) rather than being purged.
 */

const mongoose = require('mongoose');
const {
  FACILITY_TYPES,
  FACILITY_STATUSES,
  OWNERSHIP_TYPES,
} = require('../../config/facility.registry');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: null },
    district: { type: String, default: null },
    city: { type: String, default: null },
    region: { type: String, default: null },
    postalCode: { type: String, default: null },
    country: { type: String, default: 'SA' },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

const complianceSnapshotSchema = new mongoose.Schema(
  {
    lastInspectionAt: { type: Date, default: null },
    openFindings: { type: Number, default: 0 },
    criticalFindings: { type: Number, default: 0 },
    certificatesExpiringSoon: { type: Number, default: 0 }, // ≤ 30d
    certificatesExpired: { type: Number, default: 0 },
  },
  { _id: false }
);

const facilitySchema = new mongoose.Schema(
  {
    // ── identity ─────────────────────────────────────────────────
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },

    // ── ownership & affiliation ──────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    sharedWithBranchIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Branch',
      default: [],
    },
    ownership: { type: String, enum: OWNERSHIP_TYPES, default: 'owned' },
    landlord: { type: String, default: null }, // for leased buildings
    leaseExpiresAt: { type: Date, default: null },

    // ── classification ───────────────────────────────────────────
    type: { type: String, enum: FACILITY_TYPES, required: true, index: true },
    status: {
      type: String,
      enum: FACILITY_STATUSES,
      default: 'active',
      index: true,
    },

    // ── physical attributes ──────────────────────────────────────
    address: { type: addressSchema, default: () => ({}) },
    totalAreaSqm: { type: Number, default: null, min: 0 },
    totalFloors: { type: Number, default: 1, min: 0 },
    usableFloors: { type: Number, default: null, min: 0 },
    capacityPersons: { type: Number, default: null, min: 0 },
    hasWheelchairAccess: { type: Boolean, default: false },
    hasEmergencyExits: { type: Boolean, default: true },

    // ── operational ──────────────────────────────────────────────
    commissionedAt: { type: Date, default: null },
    decommissionedAt: { type: Date, default: null },

    // ── rolled-up compliance state ───────────────────────────────
    compliance: { type: complianceSnapshotSchema, default: () => ({}) },

    // ── misc ─────────────────────────────────────────────────────
    notes: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// ── indexes ─────────────────────────────────────────────────────────
facilitySchema.index({ branchId: 1, status: 1 });
facilitySchema.index({ type: 1, status: 1 });

// ── virtuals ────────────────────────────────────────────────────────

facilitySchema.virtual('isOperational').get(function () {
  return this.status === 'active' && !this.deleted_at;
});

facilitySchema.set('toJSON', { virtuals: true });
facilitySchema.set('toObject', { virtuals: true });

const Facility = mongoose.models.Facility || mongoose.model('Facility', facilitySchema);

module.exports = Facility;
