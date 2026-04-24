'use strict';

/**
 * routeOptimization.registry.js — Phase 16 Commit 7 (4.0.72).
 *
 * Canonical vocabulary for the transport RouteOptimizationJob
 * subsystem. Pure data.
 *
 * Context — the existing fleet stack (`Vehicle`, `Driver`, `Trip`,
 * `BusRoute`) tracks individual trips in-flight but has no planning
 * layer. This commit adds the morning-planning artifact: a job
 * clusters today's pickup requests by geography + constraints,
 * outputs an ordered stop list with ETAs, assigns a vehicle +
 * driver, and reconciles planned vs actual at runtime.
 *
 * The single subject the Phase-16 SLA engine already knows about
 * for this domain is `transport.trip.pickup` (10-min response /
 * 20-min resolution). One SLA clock per planned stop — a stop with
 * medical-priority beneficiaries gets the same policy, just
 * watched more aggressively by the escalation matrix.
 *
 * Algorithm surface — deliberately simple + deterministic for the
 * v1. A full TSP solver is out of scope; a geographic-bucket +
 * constraint-satisfaction pass covers 80% of the value and is
 * easy to reason about.
 */

// ── job lifecycle ───────────────────────────────────────────────────

const JOB_STATUSES = Object.freeze([
  'planning', // draft, adding pickup requests
  'optimized', // stops computed, pending vehicle+driver assignment
  'published', // vehicle+driver assigned, stops locked, SLA active
  'in_transit', // driver has started the trip
  'completed', // all stops visited (or definitively missed)
  'cancelled',
]);

const JOB_TERMINAL_STATUSES = Object.freeze(['completed', 'cancelled']);

const JOB_TRANSITIONS = Object.freeze({
  planning: [
    { to: 'optimized', event: 'optimized' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  optimized: [
    { to: 'planning', event: 'reopened' }, // back to draft to add more stops
    { to: 'published', event: 'published' }, // requires assignedVehicle + assignedDriver
    { to: 'cancelled', event: 'cancelled' },
  ],
  published: [
    { to: 'in_transit', event: 'started' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  in_transit: [
    { to: 'completed', event: 'completed' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  completed: [],
  cancelled: [],
});

// ── pickup-priority classes ─────────────────────────────────────────

const PICKUP_PRIORITIES = Object.freeze([
  'medical', // top priority, always first in window
  'standard',
  'optional',
]);

// ── per-stop lifecycle ──────────────────────────────────────────────

const STOP_STATUSES = Object.freeze([
  'planned', // part of the plan, not yet visited
  'arrived', // driver logged arrival
  'picked_up', // passenger boarded
  'missed', // vehicle reached stop, no-show by passenger
  'skipped', // vehicle bypassed the stop (operational)
  'cancelled',
]);

// Stop statuses considered resolved for SLA purposes.
const STOP_RESOLUTION_STATUSES = Object.freeze(['picked_up']);
const STOP_MISSED_STATUSES = Object.freeze(['missed', 'skipped', 'cancelled']);

// ── vehicle-capability constraints ──────────────────────────────────

const VEHICLE_CAPABILITIES = Object.freeze([
  'wheelchair_lift',
  'female_only',
  'medical_equipment',
  'child_seat',
]);

// ── shift windows (default) ─────────────────────────────────────────
//
// A job is always tied to a named shift so two different buses
// can share the same morning without the service having to invent
// disambiguators. Branches can register custom shifts via the
// `customShifts` field on the job; these are the defaults.

const DEFAULT_SHIFTS = Object.freeze([
  { code: 'morning', label: 'Morning pickup', startHour: 7, windowMinutes: 90 },
  { code: 'afternoon', label: 'Afternoon dropoff', startHour: 14, windowMinutes: 90 },
]);

// ── defaults ────────────────────────────────────────────────────────

const DEFAULT_MINUTES_PER_STOP = 10; // travel + service time between stops
const DEFAULT_BASE_SPEED_KMH = 40;
const DEFAULT_MAX_STOPS_PER_VEHICLE = 20;

// ── helpers ─────────────────────────────────────────────────────────

function canTransition(from, to) {
  const edges = JOB_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = JOB_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function isTerminal(status) {
  return JOB_TERMINAL_STATUSES.includes(status);
}

function slaPolicyForStop() {
  return 'transport.trip.pickup';
}

function priorityRank(priority) {
  // lower = served first
  switch (priority) {
    case 'medical':
      return 0;
    case 'standard':
      return 1;
    case 'optional':
      return 2;
    default:
      return 3;
  }
}

/**
 * Bucket a pickup request into a rough geographic cell. The default
 * uses the postal code when available (first 4 digits), else rounds
 * lat/lng to 2 decimals (~1km cells in Riyadh). Pure function so
 * tests can lock behaviour without monkey-patching.
 */
function geoBucketKey(request) {
  if (request.postalCode) return `pc:${String(request.postalCode).slice(0, 4)}`;
  if (
    request.coordinates &&
    typeof request.coordinates.lat === 'number' &&
    typeof request.coordinates.lng === 'number'
  ) {
    const lat = Math.round(request.coordinates.lat * 100) / 100;
    const lng = Math.round(request.coordinates.lng * 100) / 100;
    return `ll:${lat},${lng}`;
  }
  return `unknown`;
}

/**
 * Return true if the given vehicle can serve the request's
 * constraints (e.g. wheelchair lift required).
 */
function vehicleCanServe(vehicle, request) {
  const requires = request.requiredCapabilities || [];
  const has = vehicle.capabilities || [];
  for (const cap of requires) {
    if (!has.includes(cap)) return false;
  }
  return true;
}

/**
 * Compute planned arrival times given a departure time and the
 * number of stops scheduled before this one. Deterministic so
 * reconciliation diffs are meaningful.
 */
function plannedArrivalAt(departureTime, stopIndex, minutesPerStop = DEFAULT_MINUTES_PER_STOP) {
  const offset = stopIndex * minutesPerStop;
  return new Date(new Date(departureTime).getTime() + offset * 60 * 1000);
}

/**
 * Variance in minutes between actual and planned. Positive = late,
 * negative = early. Null if either is missing.
 */
function varianceMinutes(plannedAt, actualAt) {
  if (!plannedAt || !actualAt) return null;
  const diffMs = new Date(actualAt).getTime() - new Date(plannedAt).getTime();
  return Math.round(diffMs / 60000);
}

// ── validation ──────────────────────────────────────────────────────

function validate() {
  for (const [from, edges] of Object.entries(JOB_TRANSITIONS)) {
    if (!JOB_STATUSES.includes(from)) {
      throw new Error(`route-optimization registry: transition source '${from}' unknown`);
    }
    for (const edge of edges) {
      if (!JOB_STATUSES.includes(edge.to)) {
        throw new Error(
          `route-optimization registry: transition ${from}→${edge.to}: unknown target`
        );
      }
      if (!edge.event) {
        throw new Error(`route-optimization registry: transition ${from}→${edge.to} missing event`);
      }
    }
  }
  return true;
}

module.exports = {
  JOB_STATUSES,
  JOB_TERMINAL_STATUSES,
  JOB_TRANSITIONS,
  PICKUP_PRIORITIES,
  STOP_STATUSES,
  STOP_RESOLUTION_STATUSES,
  STOP_MISSED_STATUSES,
  VEHICLE_CAPABILITIES,
  DEFAULT_SHIFTS,
  DEFAULT_MINUTES_PER_STOP,
  DEFAULT_BASE_SPEED_KMH,
  DEFAULT_MAX_STOPS_PER_VEHICLE,
  canTransition,
  eventForTransition,
  isTerminal,
  slaPolicyForStop,
  priorityRank,
  geoBucketKey,
  vehicleCanServe,
  plannedArrivalAt,
  varianceMinutes,
  validate,
};
