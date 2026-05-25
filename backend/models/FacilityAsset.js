'use strict';

/**
 * FacilityAsset — Wave 369.
 *
 * "أصول المنشأة" — building infrastructure with preventive-maintenance
 * (PPM) + inspection lifecycle. Covers accessibility-critical assets
 * (elevators, ramps, lifts), HVAC, fire-safety systems, water-treatment,
 * generators, oxygen+gas plant, sensory rooms, hydrotherapy pools.
 *
 * Distinct from `AssistiveDevice` (W359) — that's per-beneficiary loaned
 * personal equipment. This is BUILDING infrastructure (one elevator
 * serves the whole branch).
 *
 * Distinct from `Classroom.accessibility` flags — those say "this room
 * IS accessible" booleans; this is the asset itself + its inspection
 * + maintenance schedule + regulatory certificates.
 *
 * Maps to CBAHI EOC.3 (Fire), EOC.5 (Medical equipment PPM), EOC.7
 * (Accessibility), EOC.8 (Water), EOC.9 (Oxygen / medical gas), EOC.10
 * (Electrical), EOC.11 (Biomedical waste) — every standard the W367
 * expansion added.
 *
 * Wave-18 invariants:
 *   • category ∈ FacilityAsset.CATEGORIES
 *   • criticality ∈ {low, medium, high, life_safety} — life_safety
 *     blocks deactivation without explicit safety justification
 *   • status='inspection_failed' requires defectsFound + escalatedAt
 *   • status='out_of_service' requires outOfServiceReason
 *   • Each inspection entry: kind + performedAt + outcome required
 *   • nextInspectionDue + nextMaintenanceDue advance from last entry +
 *     intervalDays
 *   • Regulatory certificates: number + issuingAuthority + expiresAt all
 *     present when any one is set
 */

const mongoose = require('mongoose');

const CATEGORIES = [
  // Accessibility-critical
  'elevator',
  'wheelchair_lift',
  'ramp',
  'accessible_restroom',
  'accessible_door',
  // HVAC
  'hvac_unit',
  'air_handler',
  // Fire safety
  'fire_alarm_panel',
  'fire_sprinkler',
  'fire_extinguisher',
  'smoke_detector',
  'emergency_exit',
  // Water + plumbing
  'water_heater',
  'water_tank',
  'water_treatment',
  // Power + medical gases
  'generator',
  'ups_battery',
  'medical_oxygen_plant',
  'medical_gas_outlet',
  // Therapy spaces (specialized equipment)
  'hydrotherapy_pool',
  'sensory_room',
  'snoezelen',
  'therapy_swing',
  // Security + comms
  'cctv_camera',
  'access_control_door',
  'pa_system',
  // Other
  'other',
];

const STATUSES = ['in_service', 'inspection_failed', 'maintenance', 'out_of_service', 'retired'];

const CRITICALITY = ['low', 'medium', 'high', 'life_safety'];

const INSPECTION_KINDS = [
  'regulatory_annual', // civil defence / accessibility authority
  'preventive_maintenance',
  'corrective_repair',
  'calibration',
  'load_test',
  'safety_check',
  'cleaning_sanitization',
];

const INSPECTION_OUTCOMES = ['pass', 'pass_with_observations', 'fail', 'deferred'];

// Sub-schemas ──────────────────────────────────────────────────

const InspectionEntrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: INSPECTION_KINDS, required: true },
    performedAt: { type: Date, required: true },
    performedByName: { type: String, default: '', maxlength: 100 },
    vendorName: { type: String, default: '', maxlength: 150 },
    vendorLicense: { type: String, default: '', maxlength: 100 },
    outcome: { type: String, enum: INSPECTION_OUTCOMES, required: true },
    findings: { type: String, default: '', maxlength: 2000 },
    defectsFound: { type: [String], default: () => [] },
    correctiveActionsRequired: { type: [String], default: () => [] },
    correctiveActionsCompletedAt: { type: Date, default: null },
    cost: { type: Number, default: 0, min: 0 },
    nextDueAt: { type: Date, default: null },
    certificateRef: { type: String, default: '', maxlength: 100 },
  },
  { _id: true }
);

const RegulatoryCertificateSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', maxlength: 150 },
    number: { type: String, default: '', maxlength: 100 },
    issuingAuthority: { type: String, default: '', maxlength: 200 }, // e.g. Civil Defence, MOH
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    fileUrl: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

// Main schema ──────────────────────────────────────────────────

const FacilityAssetSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    assetTag: { type: String, required: true, maxlength: 50, index: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, default: '', maxlength: 200 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    description: { type: String, default: '', maxlength: 1000 },

    // ── Location ──────────────────────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    building: { type: String, default: '', maxlength: 100 },
    floor: { type: String, default: '', maxlength: 50 },
    room: { type: String, default: '', maxlength: 100 },
    locationDescription: { type: String, default: '', maxlength: 500 },

    // ── Manufacturer + model ─────────────────────────────────────
    manufacturer: { type: String, default: '', maxlength: 150 },
    modelNumber: { type: String, default: '', maxlength: 100 },
    serialNumber: { type: String, default: '', maxlength: 150 },

    // ── Acquisition + cost ───────────────────────────────────────
    installedAt: { type: Date, default: null },
    installationCost: { type: Number, default: 0, min: 0 },
    expectedLifespanYears: { type: Number, default: null, min: 0, max: 100 },
    warrantyExpiresAt: { type: Date, default: null },
    vendorContact: { type: String, default: '', maxlength: 300 }, // free-form contact info

    // ── Criticality + lifecycle ──────────────────────────────────
    criticality: { type: String, enum: CRITICALITY, default: 'medium', index: true },
    status: { type: String, enum: STATUSES, default: 'in_service', required: true, index: true },
    outOfServiceReason: { type: String, default: '', maxlength: 500 },
    outOfServiceSince: { type: Date, default: null },

    // ── Maintenance + inspection schedule ────────────────────────
    inspectionIntervalDays: { type: Number, default: null, min: 1, max: 3650 },
    maintenanceIntervalDays: { type: Number, default: null, min: 1, max: 3650 },
    nextInspectionDue: { type: Date, default: null, index: true },
    nextMaintenanceDue: { type: Date, default: null, index: true },

    // ── Inspection + maintenance history (capped) ────────────────
    inspections: { type: [InspectionEntrySchema], default: () => [] }, // cap 50 newest

    // ── Regulatory certificates ──────────────────────────────────
    certificates: { type: [RegulatoryCertificateSchema], default: () => [] },

    // ── Last incident link (if asset failure caused an incident) ─
    lastIncidentAt: { type: Date, default: null },
    linkedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },

    // ── Retirement ───────────────────────────────────────────────
    retiredAt: { type: Date, default: null },
    retirementReason: { type: String, default: '', maxlength: 500 },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'facility_assets' }
);

FacilityAssetSchema.index({ assetTag: 1, branchId: 1 }, { unique: true });
FacilityAssetSchema.index({ branchId: 1, category: 1, status: 1 });
FacilityAssetSchema.index({ branchId: 1, criticality: 1, status: 1 });

FacilityAssetSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

FacilityAssetSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!CATEGORIES.includes(this.category)) {
    this.invalidate('category', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!CRITICALITY.includes(this.criticality)) {
    this.invalidate('criticality', `must be one of ${CRITICALITY.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }

  if (!String(this.assetTag || '').trim()) {
    this.invalidate('assetTag', 'assetTag required');
    ok = false;
  }
  if (!String(this.name || '').trim()) {
    this.invalidate('name', 'name required');
    ok = false;
  }

  // out_of_service requires reason + since
  if (this.status === 'out_of_service') {
    if (!String(this.outOfServiceReason || '').trim()) {
      this.invalidate('outOfServiceReason', 'outOfServiceReason required');
      ok = false;
    }
    if (!this.outOfServiceSince) {
      this.invalidate('outOfServiceSince', 'outOfServiceSince required');
      ok = false;
    }
  }

  // retired requires retiredAt + reason
  if (this.status === 'retired') {
    if (!this.retiredAt) {
      this.invalidate('retiredAt', 'retiredAt required when retired');
      ok = false;
    }
    if (!String(this.retirementReason || '').trim()) {
      this.invalidate('retirementReason', 'retirementReason required when retired');
      ok = false;
    }
  }

  // inspection_failed must have at least one failed inspection w/ defects
  if (this.status === 'inspection_failed') {
    const failed = (this.inspections || []).find(
      i => i.outcome === 'fail' && Array.isArray(i.defectsFound) && i.defectsFound.length > 0
    );
    if (!failed) {
      this.invalidate(
        'inspections',
        'inspection_failed status requires a fail-outcome inspection with defectsFound'
      );
      ok = false;
    }
  }

  // Inspection entry integrity
  if (Array.isArray(this.inspections)) {
    for (let i = 0; i < this.inspections.length; i++) {
      const e = this.inspections[i];
      if (!INSPECTION_KINDS.includes(e.kind)) {
        this.invalidate(`inspections.${i}.kind`, 'inspection kind required');
        ok = false;
      }
      if (!e.performedAt) {
        this.invalidate(`inspections.${i}.performedAt`, 'performedAt required');
        ok = false;
      }
      if (!INSPECTION_OUTCOMES.includes(e.outcome)) {
        this.invalidate(`inspections.${i}.outcome`, 'outcome required');
        ok = false;
      }
      if (e.outcome === 'fail' && (!Array.isArray(e.defectsFound) || e.defectsFound.length === 0)) {
        this.invalidate(`inspections.${i}.defectsFound`, 'fail outcome requires defectsFound');
        ok = false;
      }
    }
  }

  // Certificate integrity: if any field set, all required
  if (Array.isArray(this.certificates)) {
    for (let i = 0; i < this.certificates.length; i++) {
      const c = this.certificates[i];
      const anySet = c.number || c.issuingAuthority || c.expiresAt;
      if (anySet) {
        if (!String(c.number || '').trim()) {
          this.invalidate(`certificates.${i}.number`, 'cert number required');
          ok = false;
        }
        if (!String(c.issuingAuthority || '').trim()) {
          this.invalidate(`certificates.${i}.issuingAuthority`, 'issuingAuthority required');
          ok = false;
        }
        if (!c.expiresAt) {
          this.invalidate(`certificates.${i}.expiresAt`, 'expiresAt required');
          ok = false;
        }
      }
    }
  }

  return ok;
});

FacilityAssetSchema.virtual('isInspectionOverdue').get(function () {
  return !!(
    this.status !== 'retired' &&
    this.nextInspectionDue &&
    new Date(this.nextInspectionDue) < new Date()
  );
});

FacilityAssetSchema.virtual('isMaintenanceOverdue').get(function () {
  return !!(
    this.status !== 'retired' &&
    this.nextMaintenanceDue &&
    new Date(this.nextMaintenanceDue) < new Date()
  );
});

FacilityAssetSchema.virtual('hasExpiredCertificate').get(function () {
  if (!Array.isArray(this.certificates) || this.certificates.length === 0) return false;
  const now = Date.now();
  return this.certificates.some(c => c.expiresAt && new Date(c.expiresAt).getTime() < now);
});

FacilityAssetSchema.set('toJSON', { virtuals: true });
FacilityAssetSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.FacilityAsset || mongoose.model('FacilityAsset', FacilityAssetSchema);

module.exports.CATEGORIES = CATEGORIES;
module.exports.STATUSES = STATUSES;
module.exports.CRITICALITY = CRITICALITY;
module.exports.INSPECTION_KINDS = INSPECTION_KINDS;
module.exports.INSPECTION_OUTCOMES = INSPECTION_OUTCOMES;
