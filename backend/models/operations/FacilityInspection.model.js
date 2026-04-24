'use strict';

/**
 * FacilityInspection.model.js — Phase 16 Commit 3 (4.0.68).
 *
 * Records one inspection cycle for a facility (fire safety, civil
 * defense, HVAC, etc.), the findings raised during it, and the
 * closure trail for each finding.
 *
 * Key design decisions:
 *
 *   1. **Findings are inline, not separate collection.** A typical
 *      inspection has 0–20 findings; inlining keeps the join cost
 *      at zero for the dashboard and preserves ordering without a
 *      sortKey.
 *
 *   2. **Each finding carries its own `slaId`.** The service
 *      activates a `facility.inspection.closeout` SLA clock per
 *      finding and stamps the id back here so the UI can show a
 *      per-finding countdown.
 *
 *   3. **Each finding carries an optional `workOrderId`.** When a
 *      critical/major finding spawns a corrective-maintenance WO,
 *      we back-link so the WO ↔ finding round-trip is trivial.
 *
 *   4. **Sign-off is first-class.** Inspector + reviewer are
 *      separate roles with separate timestamps so CBAHI /
 *      accreditation auditors can see the full four-eyes trail.
 */

const mongoose = require('mongoose');
const {
  INSPECTION_TYPE_CODES,
  INSPECTION_STATUSES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
} = require('../../config/facility.registry');

const findingSchema = new mongoose.Schema(
  {
    code: { type: String, default: null }, // optional regulator code (e.g. CBAHI-7.2)
    description: { type: String, required: true },
    severity: { type: String, enum: FINDING_SEVERITIES, required: true },
    location: { type: String, default: null }, // floor/room within facility
    recommendation: { type: String, default: null },
    photos: { type: [String], default: [] },

    status: { type: String, enum: FINDING_STATUSES, default: 'open', index: true },
    dueDate: { type: Date, default: null },

    slaId: { type: mongoose.Schema.Types.ObjectId, ref: 'SLA', default: null },
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceWorkOrder',
      default: null,
    },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    raisedAt: { type: Date, default: Date.now },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedAt: { type: Date, default: null },
    closureNotes: { type: String, default: null },
  },
  { _id: true, timestamps: true }
);

const facilityInspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: { type: String, unique: true, required: true, uppercase: true },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    type: { type: String, enum: INSPECTION_TYPE_CODES, required: true, index: true },
    status: {
      type: String,
      enum: INSPECTION_STATUSES,
      default: 'scheduled',
      index: true,
    },

    scheduledFor: { type: Date, required: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    inspectorNameSnapshot: { type: String, default: null },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerNameSnapshot: { type: String, default: null },

    findings: { type: [findingSchema], default: [] },

    summary: { type: String, default: null },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },

    // Rolled-up finding counts so list views don't need to scan.
    openFindingsCount: { type: Number, default: 0 },
    criticalFindingsCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── indexes ─────────────────────────────────────────────────────────
facilityInspectionSchema.index({ facilityId: 1, type: 1, scheduledFor: -1 });
facilityInspectionSchema.index({ status: 1, scheduledFor: 1 });

// ── auto-numbering ──────────────────────────────────────────────────
facilityInspectionSchema.pre('validate', async function () {
  if (this.inspectionNumber) return;
  const year = (this.scheduledFor || new Date()).getUTCFullYear();
  const Model = mongoose.model('FacilityInspection');
  const count = await Model.countDocuments({
    inspectionNumber: { $regex: `^INSP-${year}-` },
  });
  this.inspectionNumber = `INSP-${year}-${String(count + 1).padStart(5, '0')}`;
});

// ── automatic counts ────────────────────────────────────────────────
facilityInspectionSchema.pre('save', function () {
  const open = (this.findings || []).filter(f =>
    ['open', 'in_progress', 'awaiting_vendor'].includes(f.status)
  );
  this.openFindingsCount = open.length;
  this.criticalFindingsCount = open.filter(f => f.severity === 'critical').length;
});

const FacilityInspection =
  mongoose.models.FacilityInspection ||
  mongoose.model('FacilityInspection', facilityInspectionSchema);

module.exports = FacilityInspection;
