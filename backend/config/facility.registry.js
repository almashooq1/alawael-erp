'use strict';

/**
 * facility.registry.js — Phase 16 Commit 3 (4.0.68).
 *
 * Canonical vocabulary for the Facility domain. Pure data.
 *
 * Why this exists — before C3, "Branch" served double duty as both
 * a business unit and a physical building. That breaks when a
 * single branch runs multiple buildings (e.g. main clinic +
 * warehouse + satellite annex), or when a building serves
 * multiple branches (shared HQ). Separating Facility from Branch
 * lets maintenance, inspections, and SLAs target the right
 * physical place.
 *
 * Relationships:
 *
 *   Branch 1 ─── N Facility (primary branch)
 *   Facility N ─── M Branch (via sharedWithBranchIds, optional)
 *   Facility 1 ─── N Asset (optional `facilityId` on Asset)
 *   Facility 1 ─── N MaintenanceWorkOrder (optional `facilityId` on WO)
 *   Facility 1 ─── N FacilityInspection
 *
 * Inspection findings plug into the existing
 * `facility.inspection.closeout` SLA (defined in
 * `sla.registry.js`) — every open finding activates a clock, and
 * closing the finding resolves it.
 */

// ── facility types ───────────────────────────────────────────────────

const FACILITY_TYPES = Object.freeze([
  'clinic', // main rehab / day-care building
  'hq', // corporate headquarters
  'warehouse', // storage / inventory depot
  'annex', // satellite building attached to a clinic
  'residential', // residential care unit
  'administrative', // admin-only office
  'support', // maintenance / training / laundry
]);

const FACILITY_STATUSES = Object.freeze([
  'active',
  'under_construction',
  'under_renovation',
  'closed_temporary',
  'decommissioned',
]);

const OWNERSHIP_TYPES = Object.freeze(['owned', 'leased', 'shared', 'donated']);

// ── inspection types ─────────────────────────────────────────────────
//
// Match the real-world inspection cadence the ops team runs. Each
// type carries its own default cadence and the roles that can
// sign off, so the scheduler can auto-create upcoming inspections
// without the operator maintaining a calendar by hand.

const INSPECTION_TYPES = Object.freeze([
  { code: 'fire_safety', labelAr: 'سلامة الحريق', cadenceDays: 365 },
  { code: 'civil_defense', labelAr: 'الدفاع المدني', cadenceDays: 365 },
  { code: 'hvac', labelAr: 'التكييف والتهوية', cadenceDays: 180 },
  { code: 'electrical', labelAr: 'الكهرباء', cadenceDays: 365 },
  { code: 'plumbing', labelAr: 'السباكة', cadenceDays: 365 },
  { code: 'elevators', labelAr: 'المصاعد', cadenceDays: 90 },
  { code: 'food_safety', labelAr: 'سلامة الغذاء', cadenceDays: 180 },
  { code: 'accessibility', labelAr: 'إمكانية الوصول', cadenceDays: 365 },
  { code: 'infection_control', labelAr: 'مكافحة العدوى', cadenceDays: 90 },
  { code: 'pest_control', labelAr: 'مكافحة الحشرات', cadenceDays: 30 },
]);

const INSPECTION_TYPE_CODES = Object.freeze(INSPECTION_TYPES.map(t => t.code));

const INSPECTION_STATUSES = Object.freeze([
  'scheduled',
  'in_progress',
  'completed', // findings recorded, but finding closure still pending
  'closed', // all findings resolved + sign-off complete
  'cancelled',
]);

// ── finding severities + statuses ────────────────────────────────────

const FINDING_SEVERITIES = Object.freeze(['critical', 'major', 'minor', 'observation']);

const FINDING_STATUSES = Object.freeze([
  'open',
  'in_progress',
  'awaiting_vendor', // pause state — matches facility.inspection.closeout SLA
  'closed',
  'deferred', // accepted + scheduled for later cycle
]);

// Findings that map to the facility.inspection.closeout SLA pause-
// state list. Must match `sla.registry.js → facility.inspection.closeout.pauseOnStates`.
const FINDING_PAUSE_STATUSES = Object.freeze(['awaiting_vendor']);

const FINDING_RESOLUTION_STATUSES = Object.freeze(['closed', 'deferred']);

// ── lookups ──────────────────────────────────────────────────────────

function inspectionTypeByCode(code) {
  return INSPECTION_TYPES.find(t => t.code === code) || null;
}

/**
 * Every inspection finding activates an SLA clock. Returns the
 * policy id — today only one policy covers facility findings; the
 * function makes future per-severity policies a one-line change.
 */
function slaPolicyForFinding(/* finding */) {
  return 'facility.inspection.closeout';
}

/**
 * Findings severity ≥ 'major' also spawn a corrective-maintenance
 * work order. Observations never do; minor findings don't unless
 * the caller explicitly asks.
 */
function shouldSpawnWorkOrder({ severity }) {
  return severity === 'critical' || severity === 'major';
}

/**
 * Map a finding severity to a WO priority. Used by the service
 * when auto-spawning a work order so the WO picks up the right
 * `maintenance.wo.*` SLA in turn.
 */
function workOrderPriorityForSeverity(severity) {
  switch (severity) {
    case 'critical':
      return 'critical';
    case 'major':
      return 'high';
    case 'minor':
      return 'normal';
    default:
      return 'low';
  }
}

// ── validation ───────────────────────────────────────────────────────

function validate() {
  const typeCodes = new Set();
  for (const t of INSPECTION_TYPES) {
    if (!t.code || typeof t.code !== 'string') {
      throw new Error(`Facility registry: inspection type missing code`);
    }
    if (typeCodes.has(t.code)) {
      throw new Error(`Facility registry: duplicate inspection code '${t.code}'`);
    }
    typeCodes.add(t.code);
    if (typeof t.cadenceDays !== 'number' || t.cadenceDays <= 0) {
      throw new Error(`Facility registry: invalid cadenceDays for '${t.code}'`);
    }
  }
  return true;
}

module.exports = {
  FACILITY_TYPES,
  FACILITY_STATUSES,
  OWNERSHIP_TYPES,
  INSPECTION_TYPES,
  INSPECTION_TYPE_CODES,
  INSPECTION_STATUSES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_PAUSE_STATUSES,
  FINDING_RESOLUTION_STATUSES,
  inspectionTypeByCode,
  slaPolicyForFinding,
  shouldSpawnWorkOrder,
  workOrderPriorityForSeverity,
  validate,
};
