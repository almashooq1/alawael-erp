'use strict';

/**
 * hikvision.registry.js — Wave 96 Phase 1 (Hikvision Workforce
 * Surveillance & Attendance — Foundation).
 *
 * Single source of truth for device kinds, capabilities, event kinds,
 * trust tiers, confidence thresholds, and reason codes used by the
 * Hikvision integration layer.
 *
 * This phase covers:
 *   • Device registry        (hikvision_device)
 *   • Camera channel mapping (hikvision_camera_channel)
 *   • Raw event ingestion    (hikvision_raw_event)
 *   • Device health logging  (device_health_log)
 *
 * Phases 2-5 (face library, recognition, attendance integration,
 * fraud detection) extend this registry without changing the existing
 * shape — every new event kind / reason code is additive.
 */

// ─── Device kinds ────────────────────────────────────────────────
// `terminal` — face/fingerprint stand at a gate (active verification)
// `camera`   — IP camera, may be passive recognition or surveillance
// `nvr`      — recorder, surveillance only
const DEVICE_KIND = Object.freeze({
  TERMINAL: 'terminal',
  CAMERA: 'camera',
  NVR: 'nvr',
});
const DEVICE_KINDS = Object.freeze(Object.values(DEVICE_KIND));

// ─── Device capabilities ─────────────────────────────────────────
// Multi-select set per device. Drives which event kinds a device may
// emit, and which roles can be enrolled.
const CAPABILITY = Object.freeze({
  FACE: 'face',
  FINGERPRINT: 'fingerprint',
  CARD: 'card',
  LPR: 'lpr',
  ANTI_SPOOF: 'anti-spoof',
  TEMPERATURE: 'temperature',
});
const CAPABILITIES = Object.freeze(Object.values(CAPABILITY));

// ─── Enrollment role ─────────────────────────────────────────────
// `primary`           — device is the trusted source for its zone
// `secondary`         — corroborator only; events do NOT enter ledger
//                       alone, they raise confidence on a primary
// `surveillance-only` — never participates in attendance, forensics
//                       and incidents only
const ENROLLMENT_ROLE = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SURVEILLANCE_ONLY: 'surveillance-only',
});
const ENROLLMENT_ROLES = Object.freeze(Object.values(ENROLLMENT_ROLE));

// ─── Device status (operational) ─────────────────────────────────
const DEVICE_STATUS = Object.freeze({
  PROVISIONING: 'provisioning',
  ONLINE: 'online',
  DEGRADED: 'degraded', // online but drift/lag flagged
  OFFLINE: 'offline',
  RETIRED: 'retired',
});
const DEVICE_STATUSES = Object.freeze(Object.values(DEVICE_STATUS));

// ─── Channel direction ───────────────────────────────────────────
const CHANNEL_DIRECTION = Object.freeze({
  IN: 'in',
  OUT: 'out',
  BIDIRECTIONAL: 'bidirectional',
});
const CHANNEL_DIRECTIONS = Object.freeze(Object.values(CHANNEL_DIRECTION));

// ─── Recognition mode per channel ────────────────────────────────
const RECOGNITION_MODE = Object.freeze({
  FACE: 'face',
  FACE_ANTI_SPOOF: 'face+anti-spoof',
  SURVEILLANCE: 'surveillance',
});
const RECOGNITION_MODES = Object.freeze(Object.values(RECOGNITION_MODE));

// ─── Raw event kinds emitted by Hikvision devices ────────────────
// Phase 1 stores everything; processed_event (Phase 3) is responsible
// for triaging and normalizing into attendance-eligible kinds.
const RAW_EVENT_KIND = Object.freeze({
  FACE_MATCH: 'face-match', // matched against face library
  FACE_MISMATCH: 'face-mismatch', // captured but did not match
  UNREGISTERED_FACE: 'unregistered-face', // captured, no library hit
  FINGERPRINT: 'fingerprint',
  CARD: 'card',
  TAILGATE: 'tailgate', // two persons through one badge
  SPOOF_ATTEMPT: 'spoof-attempt',
  TEMPERATURE: 'temperature',
  DOOR_OPEN: 'door-open',
  DEVICE_HEARTBEAT: 'device-heartbeat',
  DEVICE_ERROR: 'device-error',
  UNKNOWN: 'unknown', // parser couldn't classify
});
const RAW_EVENT_KINDS = Object.freeze(Object.values(RAW_EVENT_KIND));

// ─── Parse status of a raw event ─────────────────────────────────
const PARSE_STATUS = Object.freeze({
  PENDING: 'pending',
  PARSED: 'parsed',
  FAILED: 'failed',
  SKIPPED: 'skipped', // unknown event kind, intentionally not processed
});
const PARSE_STATUSES = Object.freeze(Object.values(PARSE_STATUS));

// ─── Trust tiers for attendance source events (Phase 3+ reference) ─
// Phase 1 stores the registry; Phase 3 enforces it.
const TRUST_TIER = Object.freeze({
  TIER_1: 1, // fingerprint + face terminal corroborated (within 30s)
  TIER_2: 2, // face terminal alone
  TIER_3: 3, // camera passive recognition
});
const TRUST_TIERS = Object.freeze(Object.values(TRUST_TIER));

// ─── Confidence thresholds (per-branch overridable) ──────────────
// All thresholds are PERCENTAGES (0-100). Phase 3 reads these as
// defaults and merges branch-specific overrides on top.
const DEFAULT_CONFIDENCE_THRESHOLDS = Object.freeze({
  FACE_TERMINAL_AUTO_ACCEPT: 85,
  FACE_TERMINAL_REVIEW_FLOOR: 60,
  CAMERA_GATE_AUTO_ACCEPT: 90,
  CAMERA_GATE_REVIEW_FLOOR: 75,
  CAMERA_CORRIDOR_REVIEW_FLOOR: 80, // corridor never auto-accepts
  // suppression window: same employee+zone within Nms collapses
  DUPLICATE_SUPPRESSION_WINDOW_MS: 60_000,
  // fingerprint + face corroboration window
  CORROBORATION_WINDOW_MS: 30_000,
  // max acceptable drift between device capturedAt and server time
  TIME_DRIFT_MAX_MS: 2_000,
  // heartbeat freshness — anything older marks device degraded
  HEARTBEAT_STALE_MS: 5 * 60_000, // 5 min
  HEARTBEAT_OFFLINE_MS: 15 * 60_000, // 15 min
});

// ─── Webhook security ────────────────────────────────────────────
// Phase 1 enforces these at the route layer.
const WEBHOOK_SECURITY = Object.freeze({
  HMAC_HEADER: 'x-hikvision-signature',
  HMAC_ALGO: 'sha256',
  // Acceptable clock skew between device and ingestion server. Older
  // payloads are rejected as replay attempts.
  REPLAY_WINDOW_MS: 5 * 60_000,
  TIMESTAMP_HEADER: 'x-hikvision-timestamp',
  // Per-device payload size cap (defence against device misbehaviour)
  MAX_PAYLOAD_BYTES: 256 * 1024, // 256KB
});

// ─── Reason codes (mapped to HTTP status by routes layer) ────────
// Stable contract. Adding a code is fine; renaming is a breaking
// change for clients.
const REASON = Object.freeze({
  // Device registry
  DEVICE_CODE_REQUIRED: 'DEVICE_CODE_REQUIRED',
  DEVICE_CODE_TAKEN: 'DEVICE_CODE_TAKEN',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_RETIRED: 'DEVICE_RETIRED',
  INVALID_DEVICE_KIND: 'INVALID_DEVICE_KIND',
  INVALID_CAPABILITY: 'INVALID_CAPABILITY',
  INVALID_ENROLLMENT_ROLE: 'INVALID_ENROLLMENT_ROLE',
  BRANCH_REQUIRED: 'BRANCH_REQUIRED',
  IP_REQUIRED: 'IP_REQUIRED',
  IP_INVALID: 'IP_INVALID',
  CAPABILITIES_REQUIRED: 'CAPABILITIES_REQUIRED',

  // Channel registry
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND',
  CHANNEL_DEVICE_MISMATCH: 'CHANNEL_DEVICE_MISMATCH',
  INVALID_CHANNEL_DIRECTION: 'INVALID_CHANNEL_DIRECTION',
  INVALID_RECOGNITION_MODE: 'INVALID_RECOGNITION_MODE',
  ATTENDANCE_REQUIRES_FACE: 'ATTENDANCE_REQUIRES_FACE',

  // Event ingestion
  EVENT_DEVICE_UNKNOWN: 'EVENT_DEVICE_UNKNOWN',
  EVENT_DUPLICATE: 'EVENT_DUPLICATE',
  EVENT_PAYLOAD_REQUIRED: 'EVENT_PAYLOAD_REQUIRED',
  EVENT_PAYLOAD_TOO_LARGE: 'EVENT_PAYLOAD_TOO_LARGE',
  EVENT_SIGNATURE_INVALID: 'EVENT_SIGNATURE_INVALID',
  EVENT_TIMESTAMP_INVALID: 'EVENT_TIMESTAMP_INVALID',
  EVENT_REPLAY: 'EVENT_REPLAY',

  // Health monitoring
  HEALTH_DEVICE_REQUIRED: 'HEALTH_DEVICE_REQUIRED',
  HEALTH_INVALID_DRIFT: 'HEALTH_INVALID_DRIFT',

  // ─── Wave 97 Phase 2 — Face Library + Enrollment ─────────────
  LIBRARY_CODE_REQUIRED: 'LIBRARY_CODE_REQUIRED',
  LIBRARY_CODE_TAKEN: 'LIBRARY_CODE_TAKEN',
  LIBRARY_NOT_FOUND: 'LIBRARY_NOT_FOUND',
  LIBRARY_ARCHIVED: 'LIBRARY_ARCHIVED',
  LIBRARY_FULL: 'LIBRARY_FULL',
  LIBRARY_BRANCH_MISMATCH: 'LIBRARY_BRANCH_MISMATCH',
  INVALID_SYNC_STRATEGY: 'INVALID_SYNC_STRATEGY',
  INVALID_LIBRARY_STATUS: 'INVALID_LIBRARY_STATUS',
  DEVICE_ALREADY_SUBSCRIBED: 'DEVICE_ALREADY_SUBSCRIBED',
  DEVICE_NOT_SUBSCRIBED: 'DEVICE_NOT_SUBSCRIBED',
  DEVICE_NOT_FACE_CAPABLE: 'DEVICE_NOT_FACE_CAPABLE',

  // Template / enrollment
  EMPLOYEE_REQUIRED: 'EMPLOYEE_REQUIRED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_DUPLICATE: 'TEMPLATE_DUPLICATE',
  TEMPLATE_NOT_PENDING: 'TEMPLATE_NOT_PENDING',
  TEMPLATE_NOT_ACTIVE: 'TEMPLATE_NOT_ACTIVE',
  INVALID_TEMPLATE_STATUS: 'INVALID_TEMPLATE_STATUS',
  IMAGES_REQUIRED: 'IMAGES_REQUIRED',
  FRONT_IMAGE_REQUIRED: 'FRONT_IMAGE_REQUIRED',
  IMAGE_QUALITY_TOO_LOW: 'IMAGE_QUALITY_TOO_LOW',
  INVALID_IMAGE_ANGLE: 'INVALID_IMAGE_ANGLE',
  PERSON_ID_REQUIRED: 'PERSON_ID_REQUIRED',
  CHECKSUM_REQUIRED: 'CHECKSUM_REQUIRED',
  SUSPENSION_REASON_REQUIRED: 'SUSPENSION_REASON_REQUIRED',

  // ─── Wave 98 Phase 3 — Recognition + Confidence Review ────────
  RAW_EVENT_NOT_FOUND: 'RAW_EVENT_NOT_FOUND',
  RAW_EVENT_NOT_PENDING: 'RAW_EVENT_NOT_PENDING',
  PROCESSED_EVENT_NOT_FOUND: 'PROCESSED_EVENT_NOT_FOUND',
  REVIEW_NOT_FOUND: 'REVIEW_NOT_FOUND',
  REVIEW_NOT_OPEN: 'REVIEW_NOT_OPEN',
  REVIEW_RESOLUTION_REASON_REQUIRED: 'REVIEW_RESOLUTION_REASON_REQUIRED',
  SOURCE_EVENT_NOT_FOUND: 'SOURCE_EVENT_NOT_FOUND',
  EVENT_KIND_NOT_PROCESSABLE: 'EVENT_KIND_NOT_PROCESSABLE',
  TEMPLATE_INACTIVE_FOR_MATCH: 'TEMPLATE_INACTIVE_FOR_MATCH',
  CONFIDENCE_OUT_OF_RANGE: 'CONFIDENCE_OUT_OF_RANGE',

  // Generic
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SAVE_FAILED: 'SAVE_FAILED',
});

// ─── Wave 97 Phase 2 — Face library & template enrollment ───────

const LIBRARY_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused', // existing templates serve matches but no new enrollments
  ARCHIVED: 'archived', // read-only, no new operations
});
const LIBRARY_STATUSES = Object.freeze(Object.values(LIBRARY_STATUS));

const SYNC_STRATEGY = Object.freeze({
  BRANCH_ONLY: 'branch-only', // library ⇔ devices in same branch
  MULTI_BRANCH: 'multi-branch', // library shared across listed branches
  GLOBAL: 'global', // pushed to every face-capable device
});
const SYNC_STRATEGIES = Object.freeze(Object.values(SYNC_STRATEGY));

const TEMPLATE_STATUS = Object.freeze({
  PENDING: 'pending', // enrolled in DB, awaiting device confirmation
  ACTIVE: 'active', // confirmed by at least one device, can match
  SUSPENDED: 'suspended', // present in DB but excluded from matching
  DELETED: 'deleted', // tombstoned (employee exit cascade or operator delete)
});
const TEMPLATE_STATUSES = Object.freeze(Object.values(TEMPLATE_STATUS));

const IMAGE_ANGLE = Object.freeze({
  FRONT: 'front',
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
});
const IMAGE_ANGLES = Object.freeze(Object.values(IMAGE_ANGLE));

// Image-quality scoring contract — 0..100. Below MIN_ENROLLMENT_QUALITY,
// an image is rejected at enrollment time. Below MIN_OPERATIONAL_QUALITY,
// the template is kept but a "low-quality" flag is raised on each match
// event during recognition (Phase 3).
const IMAGE_QUALITY = Object.freeze({
  MIN_ENROLLMENT_QUALITY: 70,
  MIN_OPERATIONAL_QUALITY: 60,
  RECOMMENDED_QUALITY: 85,
});

const TEMPLATE_DEFAULTS = Object.freeze({
  MAX_LIBRARY_CAPACITY: 50_000, // hard ceiling — most Hikvision NVRs cap ≤50k
  MIN_IMAGES_FOR_MULTI_ANGLE: 3, // at least 3 angles for "robust" templates
  MAX_IMAGES_PER_TEMPLATE: 10,
});

// Reason codes for cascade triggers — written into `deactivationReason`
// when a template is suspended/deleted by a workflow rather than an
// operator decision.
const CASCADE_REASON = Object.freeze({
  EMPLOYEE_EXIT: 'employee-exit',
  EMPLOYEE_SUSPENDED: 'employee-suspended',
  LIBRARY_ARCHIVED: 'library-archived',
  DUPLICATE_DETECTED: 'duplicate-detected',
  OPERATOR_OVERRIDE: 'operator-override',
});
const CASCADE_REASONS = Object.freeze(Object.values(CASCADE_REASON));

// ─── Wave 98 Phase 3 — Recognition & Confidence Review ──────────

// Outcome of running an event through the confidence gate. Drives
// whether a processed event is auto-accepted, sent to review, or
// rejected. Phase 5 (fraud detection) extends this without removing
// any existing kind.
const GATE_DECISION = Object.freeze({
  AUTO_ACCEPT: 'auto-accept',
  REVIEW: 'review',
  REJECT: 'reject',
  SUPPRESSED: 'suppressed', // duplicate within window — kept linked, not counted
});
const GATE_DECISIONS = Object.freeze(Object.values(GATE_DECISION));

// Anti-spoof outcome — the Hikvision device emits this; we mirror it.
const ANTI_SPOOF = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  UNKNOWN: 'unknown', // device didn't report
});
const ANTI_SPOOF_RESULTS = Object.freeze(Object.values(ANTI_SPOOF));

// State of an item in the confidence review queue.
const REVIEW_STATE = Object.freeze({
  OPEN: 'open',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  EXPIRED: 'expired', // SLA elapsed; auto-escalated by sweeper
});
const REVIEW_STATES = Object.freeze(Object.values(REVIEW_STATE));

// Which queue an item lands in. Drives notification routing.
const REVIEW_QUEUE = Object.freeze({
  SUPERVISOR: 'supervisor',
  HR: 'hr',
  SECURITY: 'security',
});
const REVIEW_QUEUES = Object.freeze(Object.values(REVIEW_QUEUE));

// Reason a processed event was routed to review (or rejected).
const REVIEW_REASON = Object.freeze({
  LOW_CONFIDENCE: 'low-confidence',
  MISMATCH: 'mismatch',
  UNREGISTERED: 'unregistered-face',
  ANTI_SPOOF_FAILED: 'anti-spoof-failed',
  OFF_SHIFT: 'off-shift',
  WRONG_ZONE: 'wrong-zone',
  IMPOSSIBLE_TRAVEL: 'impossible-travel',
  REPEAT_MISMATCH: 'repeat-mismatch',
  CHANNEL_NOT_ATTENDANCE_ELIGIBLE: 'channel-not-attendance-eligible',
  TEMPLATE_INACTIVE: 'template-inactive',
});
const REVIEW_REASONS = Object.freeze(Object.values(REVIEW_REASON));

// Attendance source events — kind of action this event represents.
const ATTENDANCE_EVENT_KIND = Object.freeze({
  CHECK_IN: 'check-in',
  CHECK_OUT: 'check-out',
  PASSAGE: 'passage', // observed but neither in/out (corridor)
  UNKNOWN: 'unknown', // direction couldn't be inferred — Phase 4 shift rules resolve
});
const ATTENDANCE_EVENT_KINDS = Object.freeze(Object.values(ATTENDANCE_EVENT_KIND));

// Source of the attendance event (multi-source reconciler in Phase 4).
const ATTENDANCE_SOURCE = Object.freeze({
  FINGERPRINT: 'fingerprint',
  FACE_TERMINAL: 'face-terminal',
  CAMERA_PASSIVE: 'camera-passive',
  CARD: 'card',
  MANUAL: 'manual',
});
const ATTENDANCE_SOURCES = Object.freeze(Object.values(ATTENDANCE_SOURCE));

// Impossible-travel windows. If the same employee is seen in branches
// A and B within < the matching window, the second event is impossible
// and BOTH are routed to review.
const IMPOSSIBLE_TRAVEL_WINDOW_MS = 5 * 60_000; // 5 minutes

// SLA windows for the review queue. Phase 3 only enforces the OPEN
// → EXPIRED transition; UI (later wave) drives display.
const REVIEW_SLA_MS = Object.freeze({
  SUPERVISOR_OPEN_MAX: 30 * 60_000, // 30 min before escalation
  HR_OPEN_MAX: 2 * 60 * 60_000, // 2 hours
  SECURITY_OPEN_MAX: 15 * 60_000, // 15 min — security is urgent
});

// ─── Helpers (pure) ──────────────────────────────────────────────

function isValidIPv4(s) {
  if (typeof s !== 'string') return false;
  const parts = s.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function isAttendanceEligibleKind(kind) {
  return (
    kind === RAW_EVENT_KIND.FACE_MATCH ||
    kind === RAW_EVENT_KIND.FINGERPRINT ||
    kind === RAW_EVENT_KIND.CARD
  );
}

/**
 * Classify a device's health status from the latest probe and
 * inactivity window.
 *   - never seen / >HEARTBEAT_OFFLINE_MS old → 'offline'
 *   - >HEARTBEAT_STALE_MS old   or   drift > TIME_DRIFT_MAX_MS → 'degraded'
 *   - else → 'online'
 *
 * `retired` is operator-set and isn't derived here.
 */
/**
 * Validate an enrollment image array. Returns
 *   { ok: true }                                   — passes
 *   { ok: false, reason: '<code>', errors? }       — fails
 *
 * Rules:
 *   - 1..MAX_IMAGES_PER_TEMPLATE items
 *   - at least one image with angle='front'
 *   - every image angle ∈ IMAGE_ANGLES
 *   - every image quality ≥ MIN_ENROLLMENT_QUALITY
 *   - no duplicate angles unless explicitly allowMultiPerAngle=true
 */
function validateEnrollmentImages(images, { allowMultiPerAngle = false } = {}) {
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, reason: REASON.IMAGES_REQUIRED };
  }
  if (images.length > TEMPLATE_DEFAULTS.MAX_IMAGES_PER_TEMPLATE) {
    return {
      ok: false,
      reason: REASON.VALIDATION_FAILED,
      errors: { images: `max ${TEMPLATE_DEFAULTS.MAX_IMAGES_PER_TEMPLATE}` },
    };
  }
  const seenAngles = new Set();
  let hasFront = false;
  for (let i = 0; i < images.length; i += 1) {
    const img = images[i];
    if (!img || typeof img !== 'object') {
      return {
        ok: false,
        reason: REASON.VALIDATION_FAILED,
        errors: { images: `images[${i}] not an object` },
      };
    }
    if (!IMAGE_ANGLES.includes(img.angle)) {
      return { ok: false, reason: REASON.INVALID_IMAGE_ANGLE, errors: { angle: img.angle } };
    }
    if (!allowMultiPerAngle && seenAngles.has(img.angle)) {
      return {
        ok: false,
        reason: REASON.VALIDATION_FAILED,
        errors: { images: `duplicate angle "${img.angle}"` },
      };
    }
    seenAngles.add(img.angle);
    if (img.angle === IMAGE_ANGLE.FRONT) hasFront = true;
    const q = Number(img.quality);
    if (!Number.isFinite(q) || q < IMAGE_QUALITY.MIN_ENROLLMENT_QUALITY) {
      return {
        ok: false,
        reason: REASON.IMAGE_QUALITY_TOO_LOW,
        errors: {
          images: `images[${i}] quality=${img.quality} < ${IMAGE_QUALITY.MIN_ENROLLMENT_QUALITY}`,
        },
      };
    }
  }
  if (!hasFront) return { ok: false, reason: REASON.FRONT_IMAGE_REQUIRED };
  return { ok: true };
}

/**
 * Decide whether a device should serve a library based on the
 * library's syncStrategy + the device's branchId.
 *   - branch-only  → device.branchId === library.branchId
 *   - multi-branch → device.branchId ∈ library.allowedBranchIds
 *   - global       → any face-capable device
 */
function isDeviceEligibleForLibrary(library, device) {
  if (!library || !device) return false;
  if (!Array.isArray(device.capabilities) || !device.capabilities.includes(CAPABILITY.FACE)) {
    return false;
  }
  switch (library.syncStrategy) {
    case SYNC_STRATEGY.GLOBAL:
      return true;
    case SYNC_STRATEGY.MULTI_BRANCH:
      return (
        Array.isArray(library.allowedBranchIds) &&
        library.allowedBranchIds.some(b => String(b) === String(device.branchId))
      );
    case SYNC_STRATEGY.BRANCH_ONLY:
    default:
      return String(library.branchId) === String(device.branchId);
  }
}

/**
 * Resolve the trust tier for an event given its source device kind +
 * whether a corroborating event already exists. Phase 3 uses this to
 * pick a confidence threshold; Phase 4 uses it for multi-source merge.
 *
 *   tier 1 = fingerprint + face-terminal within CORROBORATION_WINDOW_MS
 *   tier 2 = face-terminal alone OR fingerprint alone
 *   tier 3 = camera passive
 */
function resolveTrustTier({ source, corroborated = false } = {}) {
  if (
    corroborated &&
    (source === ATTENDANCE_SOURCE.FACE_TERMINAL || source === ATTENDANCE_SOURCE.FINGERPRINT)
  ) {
    return TRUST_TIER.TIER_1;
  }
  if (source === ATTENDANCE_SOURCE.FACE_TERMINAL || source === ATTENDANCE_SOURCE.FINGERPRINT) {
    return TRUST_TIER.TIER_2;
  }
  return TRUST_TIER.TIER_3;
}

/**
 * Apply the confidence + anti-spoof rules to decide whether a
 * processed event auto-accepts, needs review, or is rejected. Pure
 * — no I/O. Channel + device shape is the minimum needed to pick a
 * threshold; Phase-3 service supplies them.
 *
 * Inputs:
 *   confidence       — 0..100 from device
 *   antiSpoofResult  — pass | fail | unknown
 *   source           — ATTENDANCE_SOURCE.* (face-terminal / camera-passive / …)
 *   channel          — { recognitionMode, attendanceEligible }  (optional)
 *   thresholds       — override DEFAULT_CONFIDENCE_THRESHOLDS    (optional)
 *
 * Returns:
 *   { decision, reason, queue, autoThreshold, reviewFloor }
 *     decision ∈ GATE_DECISIONS, reason ∈ REVIEW_REASONS|null
 */
function applyConfidenceGate({
  confidence,
  antiSpoofResult = ANTI_SPOOF.UNKNOWN,
  source = ATTENDANCE_SOURCE.CAMERA_PASSIVE,
  channel = null,
  thresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
} = {}) {
  const c = Number(confidence);
  if (!Number.isFinite(c) || c < 0 || c > 100) {
    return {
      decision: GATE_DECISION.REJECT,
      reason: REVIEW_REASON.LOW_CONFIDENCE,
      queue: REVIEW_QUEUE.SECURITY,
      autoThreshold: null,
      reviewFloor: null,
    };
  }

  // Anti-spoof FAIL is always a rejection + security review — confidence
  // doesn't matter if the device suspects a spoof attempt.
  if (antiSpoofResult === ANTI_SPOOF.FAIL) {
    return {
      decision: GATE_DECISION.REJECT,
      reason: REVIEW_REASON.ANTI_SPOOF_FAILED,
      queue: REVIEW_QUEUE.SECURITY,
      autoThreshold: null,
      reviewFloor: null,
    };
  }

  // Channel-level guard — if the channel exists and is NOT attendance
  // eligible, the event never auto-accepts. We still process it so the
  // security view sees the passage, but it goes to review.
  if (channel && channel.attendanceEligible === false) {
    return {
      decision: GATE_DECISION.REVIEW,
      reason: REVIEW_REASON.CHANNEL_NOT_ATTENDANCE_ELIGIBLE,
      queue: REVIEW_QUEUE.SECURITY,
      autoThreshold: null,
      reviewFloor: null,
    };
  }

  let autoThreshold;
  let reviewFloor;
  const queue = REVIEW_QUEUE.SUPERVISOR;

  if (source === ATTENDANCE_SOURCE.FACE_TERMINAL || source === ATTENDANCE_SOURCE.FINGERPRINT) {
    autoThreshold = thresholds.FACE_TERMINAL_AUTO_ACCEPT;
    reviewFloor = thresholds.FACE_TERMINAL_REVIEW_FLOOR;
  } else if (source === ATTENDANCE_SOURCE.CAMERA_PASSIVE) {
    // Corridor (non-eligible) was already handled above. Eligible camera
    // channels (gate) use the camera-gate thresholds.
    autoThreshold = thresholds.CAMERA_GATE_AUTO_ACCEPT;
    reviewFloor = thresholds.CAMERA_GATE_REVIEW_FLOOR;
  } else {
    // Card or unknown source — never auto-accept by face-alone metrics.
    autoThreshold = 101; // unreachable
    reviewFloor = thresholds.FACE_TERMINAL_REVIEW_FLOOR;
  }

  if (c >= autoThreshold) {
    return {
      decision: GATE_DECISION.AUTO_ACCEPT,
      reason: null,
      queue: null,
      autoThreshold,
      reviewFloor,
    };
  }
  if (c >= reviewFloor) {
    return {
      decision: GATE_DECISION.REVIEW,
      reason: REVIEW_REASON.LOW_CONFIDENCE,
      queue,
      autoThreshold,
      reviewFloor,
    };
  }
  return {
    decision: GATE_DECISION.REJECT,
    reason: REVIEW_REASON.LOW_CONFIDENCE,
    queue: REVIEW_QUEUE.SECURITY,
    autoThreshold,
    reviewFloor,
  };
}

/**
 * Pure helper: classify two events as impossible travel.
 *   - same employee
 *   - different branch
 *   - within IMPOSSIBLE_TRAVEL_WINDOW_MS
 *
 * Returns true if both criteria are met.
 */
function isImpossibleTravel(prior, current) {
  if (!prior || !current) return false;
  if (String(prior.employeeId) !== String(current.employeeId)) return false;
  if (String(prior.branchId) === String(current.branchId)) return false;
  const priorT =
    prior.capturedAt instanceof Date ? prior.capturedAt.getTime() : Date.parse(prior.capturedAt);
  const curT =
    current.capturedAt instanceof Date
      ? current.capturedAt.getTime()
      : Date.parse(current.capturedAt);
  if (!Number.isFinite(priorT) || !Number.isFinite(curT)) return false;
  return Math.abs(curT - priorT) < IMPOSSIBLE_TRAVEL_WINDOW_MS;
}

/**
 * Pure helper: pick the SLA window for a given review queue.
 */
function slaForQueue(queue) {
  switch (queue) {
    case REVIEW_QUEUE.SECURITY:
      return REVIEW_SLA_MS.SECURITY_OPEN_MAX;
    case REVIEW_QUEUE.HR:
      return REVIEW_SLA_MS.HR_OPEN_MAX;
    case REVIEW_QUEUE.SUPERVISOR:
    default:
      return REVIEW_SLA_MS.SUPERVISOR_OPEN_MAX;
  }
}

function classifyHealth({ lastHeartbeatAt, timeOffsetMs, now = Date.now() } = {}) {
  if (!lastHeartbeatAt) return DEVICE_STATUS.OFFLINE;
  const ts =
    lastHeartbeatAt instanceof Date ? lastHeartbeatAt.getTime() : Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(ts)) return DEVICE_STATUS.OFFLINE;
  const age = now - ts;
  if (age > DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_OFFLINE_MS) return DEVICE_STATUS.OFFLINE;
  if (age > DEFAULT_CONFIDENCE_THRESHOLDS.HEARTBEAT_STALE_MS) return DEVICE_STATUS.DEGRADED;
  if (
    Number.isFinite(timeOffsetMs) &&
    Math.abs(timeOffsetMs) > DEFAULT_CONFIDENCE_THRESHOLDS.TIME_DRIFT_MAX_MS
  ) {
    return DEVICE_STATUS.DEGRADED;
  }
  return DEVICE_STATUS.ONLINE;
}

module.exports = {
  DEVICE_KIND,
  DEVICE_KINDS,
  CAPABILITY,
  CAPABILITIES,
  ENROLLMENT_ROLE,
  ENROLLMENT_ROLES,
  DEVICE_STATUS,
  DEVICE_STATUSES,
  CHANNEL_DIRECTION,
  CHANNEL_DIRECTIONS,
  RECOGNITION_MODE,
  RECOGNITION_MODES,
  RAW_EVENT_KIND,
  RAW_EVENT_KINDS,
  PARSE_STATUS,
  PARSE_STATUSES,
  TRUST_TIER,
  TRUST_TIERS,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  WEBHOOK_SECURITY,
  REASON,
  // Wave 97 Phase 2 — face library + enrollment
  LIBRARY_STATUS,
  LIBRARY_STATUSES,
  SYNC_STRATEGY,
  SYNC_STRATEGIES,
  TEMPLATE_STATUS,
  TEMPLATE_STATUSES,
  IMAGE_ANGLE,
  IMAGE_ANGLES,
  IMAGE_QUALITY,
  TEMPLATE_DEFAULTS,
  CASCADE_REASON,
  CASCADE_REASONS,
  // Wave 98 Phase 3 — recognition + confidence review
  GATE_DECISION,
  GATE_DECISIONS,
  ANTI_SPOOF,
  ANTI_SPOOF_RESULTS,
  REVIEW_STATE,
  REVIEW_STATES,
  REVIEW_QUEUE,
  REVIEW_QUEUES,
  REVIEW_REASON,
  REVIEW_REASONS,
  ATTENDANCE_EVENT_KIND,
  ATTENDANCE_EVENT_KINDS,
  ATTENDANCE_SOURCE,
  ATTENDANCE_SOURCES,
  IMPOSSIBLE_TRAVEL_WINDOW_MS,
  REVIEW_SLA_MS,
  // helpers
  isValidIPv4,
  isAttendanceEligibleKind,
  classifyHealth,
  validateEnrollmentImages,
  isDeviceEligibleForLibrary,
  resolveTrustTier,
  applyConfidenceGate,
  isImpossibleTravel,
  slaForQueue,
};
