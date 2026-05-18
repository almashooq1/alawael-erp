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

  // ─── Wave 99 Phase 4 — Attendance Integration ──────────────────
  RECONCILIATION_CASE_NOT_FOUND: 'RECONCILIATION_CASE_NOT_FOUND',
  RECONCILIATION_NOTHING_TO_MERGE: 'RECONCILIATION_NOTHING_TO_MERGE',
  RECONCILIATION_ALREADY_LOCKED: 'RECONCILIATION_ALREADY_LOCKED',
  PAYROLL_PERIOD_NOT_FOUND: 'PAYROLL_PERIOD_NOT_FOUND',
  PAYROLL_PERIOD_ALREADY_CLOSED: 'PAYROLL_PERIOD_ALREADY_CLOSED',
  PAYROLL_PERIOD_NOT_CLOSED: 'PAYROLL_PERIOD_NOT_CLOSED',
  PAYROLL_PERIOD_LOCKED: 'PAYROLL_PERIOD_LOCKED',
  PAYROLL_PERIOD_OVERLAP: 'PAYROLL_PERIOD_OVERLAP',
  PAYROLL_OVERRIDE_REASON_REQUIRED: 'PAYROLL_OVERRIDE_REASON_REQUIRED',
  PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE: 'PAYROLL_OVERRIDE_APPROVER_CHAIN_INCOMPLETE',
  PAYROLL_OVERRIDE_NAFATH_REQUIRED: 'PAYROLL_OVERRIDE_NAFATH_REQUIRED',
  SHIFT_CALENDAR_MISSING: 'SHIFT_CALENDAR_MISSING',
  SHIFT_DATE_REQUIRED: 'SHIFT_DATE_REQUIRED',

  // ─── Wave 100 Phase 5 — Fraud Detection ────────────────────────
  FRAUD_FLAG_NOT_FOUND: 'FRAUD_FLAG_NOT_FOUND',
  FRAUD_FLAG_NOT_OPEN: 'FRAUD_FLAG_NOT_OPEN',
  FRAUD_FLAG_RESOLUTION_REASON_REQUIRED: 'FRAUD_FLAG_RESOLUTION_REASON_REQUIRED',
  FRAUD_SCORE_NOT_FOUND: 'FRAUD_SCORE_NOT_FOUND',
  INVALID_FRAUD_KIND: 'INVALID_FRAUD_KIND',
  INVALID_FRAUD_SEVERITY: 'INVALID_FRAUD_SEVERITY',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
  PROCESSED_EVENT_LACKS_EMPLOYEE: 'PROCESSED_EVENT_LACKS_EMPLOYEE',
  TEMPLATE_REQUIRED: 'TEMPLATE_REQUIRED',
  FRAUD_DETECTION_NOTHING_TO_FLAG: 'FRAUD_DETECTION_NOTHING_TO_FLAG',

  // ─── Wave 106 Phase F — ISAPI Sync Worker ──────────────────────
  SYNC_ADAPTER_REQUIRED: 'SYNC_ADAPTER_REQUIRED',
  SYNC_DEVICE_UNREACHABLE: 'SYNC_DEVICE_UNREACHABLE',
  SYNC_DEVICE_NOT_SUBSCRIBED: 'SYNC_DEVICE_NOT_SUBSCRIBED',
  SYNC_LIBRARY_ARCHIVED: 'SYNC_LIBRARY_ARCHIVED',
  SYNC_PARTIAL_FAILURE: 'SYNC_PARTIAL_FAILURE',
  SYNC_DRIFT_DETECTED: 'SYNC_DRIFT_DETECTED',
  SYNC_CREDENTIALS_MISSING: 'SYNC_CREDENTIALS_MISSING',
  ISAPI_REQUEST_FAILED: 'ISAPI_REQUEST_FAILED',
  ISAPI_RESPONSE_INVALID: 'ISAPI_RESPONSE_INVALID',

  // ─── Wave 108 — Operational Scheduler ──────────────────────────
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_HANDLER_UNAVAILABLE: 'JOB_HANDLER_UNAVAILABLE',
  JOB_ALREADY_RUNNING: 'JOB_ALREADY_RUNNING',
  JOB_DISABLED: 'JOB_DISABLED',
  JOB_HANDLER_THREW: 'JOB_HANDLER_THREW',

  // ─── Wave 109 — Real-Time Event Stream ────────────────────────
  STREAM_NOT_RUNNING: 'STREAM_NOT_RUNNING',
  STREAM_DEVICE_INCAPABLE: 'STREAM_DEVICE_INCAPABLE',
  STREAM_TRANSPORT_FAILED: 'STREAM_TRANSPORT_FAILED',
  STREAM_PARSE_FAILED: 'STREAM_PARSE_FAILED',
  STREAM_CIRCUIT_OPEN: 'STREAM_CIRCUIT_OPEN',
  STREAM_TIME_DRIFT: 'STREAM_TIME_DRIFT',
  STREAM_BACKPRESSURE: 'STREAM_BACKPRESSURE',

  // ─── Wave 110 — Per-Branch Config Overrides ───────────────────
  BRANCH_CONFIG_NOT_FOUND: 'BRANCH_CONFIG_NOT_FOUND',
  BRANCH_CONFIG_INVALID_THRESHOLD: 'BRANCH_CONFIG_INVALID_THRESHOLD',
  BRANCH_CONFIG_INVALID_KEY: 'BRANCH_CONFIG_INVALID_KEY',
  BRANCH_CONFIG_NO_BRANCH: 'BRANCH_CONFIG_NO_BRANCH',

  // ─── Wave 113 — Anomaly Detector ──────────────────────────────
  ANOMALY_DETECTOR_UNAVAILABLE: 'ANOMALY_DETECTOR_UNAVAILABLE',

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

// ─── Wave 99 Phase 4 — Attendance Integration ───────────────────

// Lifecycle of a payroll period.
//   open    — events flow in, modifications allowed
//   closing — snapshot in progress; new events still blocked
//   closed  — immutable; corrections only via override ledger
const PAYROLL_PERIOD_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
});
const PAYROLL_PERIOD_STATUSES = Object.freeze(Object.values(PAYROLL_PERIOD_STATUS));

// Reconciliation conflict types — drives the UI badge + which queue
// (HR / supervisor) sees the case for resolution.
const RECONCILIATION_CONFLICT = Object.freeze({
  NONE: 'none', // multiple sources agreed, no conflict
  MULTI_SOURCE_DISAGREEMENT: 'multi-source-disagreement',
  MISSING_CHECKOUT: 'missing-checkout',
  MISSING_CHECKIN: 'missing-checkin',
  SHIFT_BRIDGE: 'shift-bridge', // crosses midnight
  IMPOSSIBLE_TRAVEL: 'impossible-travel',
  NO_EVENTS: 'no-events', // employee on roster, zero source events
});
const RECONCILIATION_CONFLICTS = Object.freeze(Object.values(RECONCILIATION_CONFLICT));

// Resolved in/out classification a reconciler emits to the ledger.
const SHIFT_CLASSIFICATION = Object.freeze({
  ON_TIME: 'on-time',
  LATE: 'late',
  EARLY: 'early-arrival',
  EARLY_OUT: 'early-out',
  OVERTIME: 'overtime',
  NO_SHOW: 'no-show',
  ON_LEAVE: 'on-leave', // shouldn't have been on roster — reconciler ignores
});
const SHIFT_CLASSIFICATIONS = Object.freeze(Object.values(SHIFT_CLASSIFICATION));

// Approver chain required for a payroll override. Order matters —
// HR first, then finance, then ceo for amounts above the threshold.
const PAYROLL_OVERRIDE_APPROVAL = Object.freeze({
  HR_MANAGER: 'hr_manager',
  FINANCE: 'finance',
  CEO: 'ceo',
});
const PAYROLL_OVERRIDE_APPROVALS = Object.freeze(Object.values(PAYROLL_OVERRIDE_APPROVAL));

// Reconciliation engine tunables.
const RECONCILIATION_DEFAULTS = Object.freeze({
  GRACE_PERIOD_MIN: 10, // ±10 min around expected shift bounds
  OVERTIME_THRESHOLD_MIN: 15, // anything >15 min beyond shift end = OT
  NO_SHOW_GRACE_MIN: 60, // employee not seen within 60 min of shift start
  CROSS_MIDNIGHT_WINDOW_HOURS: 14, // any shift spanning <14h is valid same-shift
});

/**
 * Pure helper: classify a check-in time against a shift's expected
 * window. Returns one of SHIFT_CLASSIFICATIONS plus the delta in
 * minutes (positive = late / over, negative = early / before).
 */
function classifyCheckIn(
  checkInAt,
  shift,
  { grace = RECONCILIATION_DEFAULTS.GRACE_PERIOD_MIN } = {}
) {
  if (!checkInAt || !shift || !shift.startAt) {
    return { classification: SHIFT_CLASSIFICATION.NO_SHOW, deltaMin: null };
  }
  const inT = checkInAt instanceof Date ? checkInAt.getTime() : Date.parse(checkInAt);
  const expT = shift.startAt instanceof Date ? shift.startAt.getTime() : Date.parse(shift.startAt);
  if (!Number.isFinite(inT) || !Number.isFinite(expT)) {
    return { classification: SHIFT_CLASSIFICATION.NO_SHOW, deltaMin: null };
  }
  const deltaMin = Math.round((inT - expT) / 60_000);
  if (deltaMin < -grace) return { classification: SHIFT_CLASSIFICATION.EARLY, deltaMin };
  if (deltaMin > grace) return { classification: SHIFT_CLASSIFICATION.LATE, deltaMin };
  return { classification: SHIFT_CLASSIFICATION.ON_TIME, deltaMin };
}

/**
 * Pure helper: classify a check-out time against a shift's expected
 * window. Returns OVERTIME / ON_TIME / EARLY_OUT.
 */
function classifyCheckOut(
  checkOutAt,
  shift,
  {
    grace = RECONCILIATION_DEFAULTS.GRACE_PERIOD_MIN,
    overtimeThreshold = RECONCILIATION_DEFAULTS.OVERTIME_THRESHOLD_MIN,
  } = {}
) {
  if (!checkOutAt || !shift || !shift.endAt) {
    return { classification: SHIFT_CLASSIFICATION.NO_SHOW, deltaMin: null };
  }
  const outT = checkOutAt instanceof Date ? checkOutAt.getTime() : Date.parse(checkOutAt);
  const expT = shift.endAt instanceof Date ? shift.endAt.getTime() : Date.parse(shift.endAt);
  if (!Number.isFinite(outT) || !Number.isFinite(expT)) {
    return { classification: SHIFT_CLASSIFICATION.NO_SHOW, deltaMin: null };
  }
  const deltaMin = Math.round((outT - expT) / 60_000);
  if (deltaMin > overtimeThreshold) {
    return { classification: SHIFT_CLASSIFICATION.OVERTIME, deltaMin };
  }
  if (deltaMin < -grace) {
    return { classification: SHIFT_CLASSIFICATION.EARLY_OUT, deltaMin };
  }
  return { classification: SHIFT_CLASSIFICATION.ON_TIME, deltaMin };
}

/**
 * Pure helper: pair events within the corroboration window. Returns
 * the pairs found + the un-paired remainders.
 *   - events of TIER-2 source (fingerprint OR face-terminal) that
 *     fall within CORROBORATION_WINDOW_MS of each other AND differ
 *     in `source` are merged into a TIER-1 pair.
 *
 * Used by the reconciler step that emits the "ledger" check-in/out.
 */
function findCorroborationPairs(
  events,
  { windowMs = DEFAULT_CONFIDENCE_THRESHOLDS.CORROBORATION_WINDOW_MS } = {}
) {
  const sorted = (events || []).slice().sort((a, b) => {
    const at = a.eventTime instanceof Date ? a.eventTime.getTime() : Date.parse(a.eventTime);
    const bt = b.eventTime instanceof Date ? b.eventTime.getTime() : Date.parse(b.eventTime);
    return at - bt;
  });
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < sorted.length; i += 1) {
    if (used.has(i)) continue;
    const a = sorted[i];
    const at = a.eventTime instanceof Date ? a.eventTime.getTime() : Date.parse(a.eventTime);
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (used.has(j)) continue;
      const b = sorted[j];
      const bt = b.eventTime instanceof Date ? b.eventTime.getTime() : Date.parse(b.eventTime);
      if (bt - at > windowMs) break;
      if (a.source !== b.source) {
        pairs.push({ primary: a, corroborator: b });
        used.add(i);
        used.add(j);
        break;
      }
    }
  }
  const unpaired = sorted.filter((_, idx) => !used.has(idx));
  return { pairs, unpaired };
}

/**
 * Pure helper: dedup events within the same zone using the
 * DUPLICATE_SUPPRESSION_WINDOW_MS. The kept event is the one with
 * the highest trust tier; ties broken by earliest time.
 */
function dedupByZoneWindow(
  events,
  { windowMs = DEFAULT_CONFIDENCE_THRESHOLDS.DUPLICATE_SUPPRESSION_WINDOW_MS } = {}
) {
  const byZone = new Map();
  for (const ev of events || []) {
    const zoneKey = String(ev.zoneId || '__nozone__');
    const arr = byZone.get(zoneKey) || [];
    arr.push(ev);
    byZone.set(zoneKey, arr);
  }
  const kept = [];
  for (const [, arr] of byZone) {
    arr.sort((a, b) => {
      const at = a.eventTime instanceof Date ? a.eventTime.getTime() : Date.parse(a.eventTime);
      const bt = b.eventTime instanceof Date ? b.eventTime.getTime() : Date.parse(b.eventTime);
      return at - bt;
    });
    const seenKept = [];
    for (const ev of arr) {
      const evT = ev.eventTime instanceof Date ? ev.eventTime.getTime() : Date.parse(ev.eventTime);
      const recent = seenKept.find(k => {
        const kT = k.eventTime instanceof Date ? k.eventTime.getTime() : Date.parse(k.eventTime);
        return Math.abs(evT - kT) <= windowMs;
      });
      if (!recent) {
        seenKept.push(ev);
        continue;
      }
      // Same window — keep higher tier (lower number = higher trust).
      if ((ev.trustTier || 99) < (recent.trustTier || 99)) {
        const idx = seenKept.indexOf(recent);
        if (idx >= 0) seenKept[idx] = ev;
      }
    }
    kept.push(...seenKept);
  }
  return kept.sort((a, b) => {
    const at = a.eventTime instanceof Date ? a.eventTime.getTime() : Date.parse(a.eventTime);
    const bt = b.eventTime instanceof Date ? b.eventTime.getTime() : Date.parse(b.eventTime);
    return at - bt;
  });
}

// ─── Wave 100 Phase 5 — Fraud Detection ─────────────────────────

// Kind of fraud signal detected. The detection service emits exactly
// one of these per HikvisionFraudFlag. Severity is derived per kind
// + per pattern strength.
const FRAUD_KIND = Object.freeze({
  REPEAT_MISMATCH: 'repeat-mismatch', // ≥3 confidence-fail events on a template in window
  SHARED_IDENTITY: 'shared-identity', // template active in mutually-exclusive places (≥2 impossible-travel in 7d)
  OFF_HOURS_ACCESS: 'off-hours-access', // employee at gate well outside duty hours
  BURST_ACCESS: 'burst-access', // many events same employee in tiny window (DoS / tailgate)
  IMPOSSIBLE_TRAVEL: 'impossible-travel', // SINGLE occurrence (one-off, vs SHARED_IDENTITY repeating)
  ANTI_SPOOF_TREND: 'anti-spoof-trend', // ≥2 anti-spoof failures within 24h for same template
  TEMPLATE_INACTIVE_USED: 'template-inactive-used', // suspended template still matching
  UNREGISTERED_REPEAT: 'unregistered-repeat', // same unregistered face seen ≥3 times
});
const FRAUD_KINDS = Object.freeze(Object.values(FRAUD_KIND));

const FRAUD_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});
const FRAUD_SEVERITIES = Object.freeze(Object.values(FRAUD_SEVERITY));

// Score impact per (kind, severity) — used by the score service to
// compute the rolling employee fraud score. Lower bound 0, upper 100.
const FRAUD_SCORE_IMPACT = Object.freeze({
  low: 5,
  medium: 15,
  high: 30,
  critical: 50,
});

// Lifecycle of a fraud flag.
//   open         → newly detected, awaiting operator action
//   acknowledged → operator confirmed the flag is real (kept on score)
//   dismissed    → operator confirmed false-positive (removed from score)
//   escalated    → flag bumped to security/DPO
//   expired      → time-based decay (older than retention window)
const FRAUD_FLAG_STATE = Object.freeze({
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  DISMISSED: 'dismissed',
  ESCALATED: 'escalated',
  EXPIRED: 'expired',
});
const FRAUD_FLAG_STATES = Object.freeze(Object.values(FRAUD_FLAG_STATE));

// Engine tunables. Per-branch override is the same pattern used in
// confidence thresholds (Wave 98).
const FRAUD_DEFAULTS = Object.freeze({
  REPEAT_MISMATCH_THRESHOLD: 3, // ≥3 fails in window
  REPEAT_MISMATCH_WINDOW_MS: 24 * 60 * 60_000, // 24h
  SHARED_IDENTITY_WINDOW_MS: 7 * 24 * 60 * 60_000, // 7d for pattern detection
  SHARED_IDENTITY_THRESHOLD: 2, // ≥2 impossible-travel occurrences in 7d
  BURST_WINDOW_MS: 5 * 60_000, // 5 min
  BURST_THRESHOLD: 5, // ≥5 events in 5 min
  OFF_HOURS_BUFFER_HOURS: 3, // event outside shift window by >3h triggers
  ANTI_SPOOF_TREND_THRESHOLD: 2, // ≥2 anti-spoof failures in 24h
  ANTI_SPOOF_TREND_WINDOW_MS: 24 * 60 * 60_000,
  UNREGISTERED_REPEAT_THRESHOLD: 3,
  UNREGISTERED_REPEAT_WINDOW_MS: 7 * 24 * 60 * 60_000,
  // Score decay: flag's contribution halves after this window.
  SCORE_DECAY_HALF_LIFE_MS: 30 * 24 * 60 * 60_000, // 30d
  // Hard expire — flag won't contribute past this age.
  SCORE_HARD_EXPIRE_MS: 90 * 24 * 60 * 60_000, // 90d
  // Score bands for traffic-light UI.
  SCORE_BAND_LOW_MAX: 20,
  SCORE_BAND_MEDIUM_MAX: 50,
  SCORE_BAND_HIGH_MAX: 80,
});

/**
 * Pure helper: detect repeat-mismatch.
 *   - `events` is an array of processed events for the SAME templateId
 *     within the inspection window.
 *   - Returns null if threshold not met; otherwise a flag spec
 *     { kind, severity, scoreImpact, evidenceProcessedEventIds[], summary }.
 */
function detectRepeatMismatchInWindow(events, opts = {}) {
  const threshold = opts.threshold || FRAUD_DEFAULTS.REPEAT_MISMATCH_THRESHOLD;
  const fails = (events || []).filter(
    e =>
      e.decision === GATE_DECISION.REJECT &&
      (e.reviewReason === REVIEW_REASON.LOW_CONFIDENCE ||
        e.reviewReason === REVIEW_REASON.MISMATCH ||
        e.reviewReason === REVIEW_REASON.REPEAT_MISMATCH)
  );
  if (fails.length < threshold) return null;
  // Severity escalates with how many fails — 3 = HIGH (already triggered),
  // 5+ = CRITICAL.
  let severity = FRAUD_SEVERITY.HIGH;
  if (fails.length >= 5) severity = FRAUD_SEVERITY.CRITICAL;
  return {
    kind: FRAUD_KIND.REPEAT_MISMATCH,
    severity,
    scoreImpact: FRAUD_SCORE_IMPACT[severity],
    evidenceProcessedEventIds: fails.map(e => String(e._id)),
    summary: `${fails.length} mismatch events in inspection window`,
  };
}

/**
 * Pure helper: detect burst access (DoS-like or tailgating attempt).
 *   - `events` are processed events for the SAME employee.
 *   - Threshold: ≥5 events in a 5-min sliding window.
 */
function detectBurstPattern(events, opts = {}) {
  const threshold = opts.threshold || FRAUD_DEFAULTS.BURST_THRESHOLD;
  const windowMs = opts.windowMs || FRAUD_DEFAULTS.BURST_WINDOW_MS;
  if (!Array.isArray(events) || events.length < threshold) return null;
  const sorted = events.slice().sort((a, b) => {
    const at = a.capturedAt instanceof Date ? a.capturedAt.getTime() : Date.parse(a.capturedAt);
    const bt = b.capturedAt instanceof Date ? b.capturedAt.getTime() : Date.parse(b.capturedAt);
    return at - bt;
  });
  for (let i = 0; i + threshold - 1 < sorted.length; i += 1) {
    const start = sorted[i];
    const end = sorted[i + threshold - 1];
    const st =
      start.capturedAt instanceof Date ? start.capturedAt.getTime() : Date.parse(start.capturedAt);
    const et =
      end.capturedAt instanceof Date ? end.capturedAt.getTime() : Date.parse(end.capturedAt);
    if (et - st <= windowMs) {
      const burstEvents = sorted.slice(i, i + threshold);
      return {
        kind: FRAUD_KIND.BURST_ACCESS,
        severity: FRAUD_SEVERITY.HIGH,
        scoreImpact: FRAUD_SCORE_IMPACT[FRAUD_SEVERITY.HIGH],
        evidenceProcessedEventIds: burstEvents.map(e => String(e._id)),
        summary: `${threshold} events within ${Math.round((et - st) / 1000)}s`,
      };
    }
  }
  return null;
}

/**
 * Pure helper: compute current score from a set of flags. Each flag
 * contributes `scoreImpact * decayFactor` where decayFactor halves
 * every SCORE_DECAY_HALF_LIFE_MS and goes to 0 after SCORE_HARD_EXPIRE_MS.
 *
 * Returns a number in [0, 100].
 */
function computeScoreFromFlags(flags, { now = Date.now() } = {}) {
  let score = 0;
  for (const f of flags || []) {
    if (f.state === FRAUD_FLAG_STATE.DISMISSED || f.state === FRAUD_FLAG_STATE.EXPIRED) {
      continue;
    }
    const detectedAt =
      f.detectedAt instanceof Date ? f.detectedAt.getTime() : Date.parse(f.detectedAt);
    if (!Number.isFinite(detectedAt)) continue;
    const age = now - detectedAt;
    if (age >= FRAUD_DEFAULTS.SCORE_HARD_EXPIRE_MS) continue;
    // Half-life decay
    const halfLives = age / FRAUD_DEFAULTS.SCORE_DECAY_HALF_LIFE_MS;
    const decayFactor = Math.pow(0.5, halfLives);
    score += (f.scoreImpact || 0) * decayFactor;
  }
  return Math.min(100, Math.round(score * 100) / 100);
}

/**
 * Pure helper: classify a score into one of the 4 traffic-light bands.
 */
function classifyScoreBand(score) {
  const s = Number(score) || 0;
  if (s <= FRAUD_DEFAULTS.SCORE_BAND_LOW_MAX) return FRAUD_SEVERITY.LOW;
  if (s <= FRAUD_DEFAULTS.SCORE_BAND_MEDIUM_MAX) return FRAUD_SEVERITY.MEDIUM;
  if (s <= FRAUD_DEFAULTS.SCORE_BAND_HIGH_MAX) return FRAUD_SEVERITY.HIGH;
  return FRAUD_SEVERITY.CRITICAL;
}

// ─── Wave 106 Phase F — ISAPI Sync Worker ───────────────────────

// Outcome of a single library × device sync run.
const SYNC_RESULT = Object.freeze({
  SUCCESS: 'success', // every push + delete succeeded
  PARTIAL: 'partial', // some operations failed; retry next run
  FAILED: 'failed', // device unreachable / catastrophic error
  NO_OP: 'no-op', // DB matched device, nothing to do
  SKIPPED: 'skipped', // archived library / unsubscribed device / retired
});
const SYNC_RESULTS = Object.freeze(Object.values(SYNC_RESULT));

// How a template ended up in the diff plan.
const DIFF_OPERATION = Object.freeze({
  PUSH: 'push', // template in DB but missing on device
  DELETE: 'delete', // personId on device but not in DB (or DB marked deleted)
  VERIFY: 'verify', // both sides agree — just refresh lastSyncedAt
});
const DIFF_OPERATIONS = Object.freeze(Object.values(DIFF_OPERATION));

const SYNC_DEFAULTS = Object.freeze({
  // Hikvision NVRs throttle face-library writes — cap concurrent ops per device.
  MAX_OPS_PER_DEVICE_PER_RUN: 50,
  // ISAPI request timeout. Anything slower means the device is degraded.
  REQUEST_TIMEOUT_MS: 10_000,
  // Per-template push retry policy (transient failures).
  MAX_PUSH_RETRIES: 2,
  // Drift detection — how many syncs in a row can leave drift before raising alert.
  DRIFT_TOLERANCE_RUNS: 1,
  // Backoff between retries.
  RETRY_BACKOFF_MS: [1_000, 3_000],
});

// ─── Wave 108 — Operational Scheduler ──────────────────────────
//
// Job lifecycle: pending → running → (succeeded | failed). 'skipped'
// covers the case where the lock holder bailed out because of an
// upstream precondition (e.g. handler unavailable, job disabled).
const JOB_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  SKIPPED: 'skipped',
});
const JOB_STATUSES = Object.freeze(Object.values(JOB_STATUS));

const JOB_TRIGGER = Object.freeze({
  CRON: 'cron', // scheduled tick
  MANUAL: 'manual', // operator-initiated via UI/CLI
  STARTUP: 'startup', // one-shot on boot
});
const JOB_TRIGGERS = Object.freeze(Object.values(JOB_TRIGGER));

// Canonical job ids. Lookup is by string id; the actual handler is
// resolved from the JobRegistry at run-time so missing handlers throw
// JOB_HANDLER_UNAVAILABLE rather than silently no-op.
const JOB_ID = Object.freeze({
  SYNC_ALL: 'hikvision.sync-all',
  DRIFT_DETECT_ALL: 'hikvision.drift-detect-all',
  FRAUD_SCAN_TEMPLATES: 'hikvision.fraud.scan-templates',
  FRAUD_SCAN_UNREGISTERED: 'hikvision.fraud.scan-unregistered',
  FRAUD_SWEEP_EXPIRED: 'hikvision.fraud.sweep-expired',
  FRAUD_DECAY_ALL: 'hikvision.fraud.decay-all',
  RAW_EVENT_PARSE: 'hikvision.recognition.parse-pending',
  HEALTH_SWEEP: 'hikvision.health.sweep',
});
const JOB_IDS = Object.freeze(Object.values(JOB_ID));

// Recommended cron expressions per job. Operators can override per
// environment; these are the safe defaults.
const JOB_CRON_DEFAULTS = Object.freeze({
  [JOB_ID.SYNC_ALL]: '0 3 * * *', // 03:00 daily
  [JOB_ID.DRIFT_DETECT_ALL]: '*/30 * * * *', // every 30 min
  [JOB_ID.FRAUD_SCAN_TEMPLATES]: '0 2 * * *', // 02:00 daily
  [JOB_ID.FRAUD_SCAN_UNREGISTERED]: '0 */6 * * *', // every 6 hours
  [JOB_ID.FRAUD_SWEEP_EXPIRED]: '0 1 * * 0', // 01:00 every Sunday
  [JOB_ID.FRAUD_DECAY_ALL]: '0 0 * * *', // 00:00 daily
  [JOB_ID.RAW_EVENT_PARSE]: '*/2 * * * *', // every 2 min
  [JOB_ID.HEALTH_SWEEP]: '*/5 * * * *', // every 5 min
});

// Sensible upper bound on how long a single job run may take. Lock
// is force-released after this so a crashed process can't wedge the
// system permanently. Per-job override is allowed.
const JOB_DEFAULTS = Object.freeze({
  LOCK_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  HISTORY_RETAIN_RUNS: 50, // recent runs kept per job
});

// ─── Wave 109 — Real-Time Event Stream ─────────────────────────
//
// Per-device state machine for the ISAPI alert-stream client. The
// transitions are driven by network events (connect/disconnect/data)
// and the watchdog timer (silence > MAX_SILENCE_MS).
const STREAM_STATE = Object.freeze({
  IDLE: 'idle', // never connected since boot
  CONNECTING: 'connecting', // request in flight
  CONNECTED: 'connected', // bytes flowing
  RECONNECTING: 'reconnecting', // between attempts in backoff
  CIRCUIT_OPEN: 'circuit-open', // halted after repeated failures
  HALF_OPEN: 'half-open', // single probe to test recovery
  STOPPED: 'stopped', // operator-disabled
});
const STREAM_STATES = Object.freeze(Object.values(STREAM_STATE));

// Operating mode for the supervisor. Default 'off' so dev/test envs
// never open real network connections by accident.
const STREAM_MODE = Object.freeze({
  OFF: 'off',
  MOCK: 'mock',
  REAL: 'real',
});
const STREAM_MODES = Object.freeze(Object.values(STREAM_MODE));

const STREAM_DEFAULTS = Object.freeze({
  // Reconnect backoff schedule (ms). After the last entry the value
  // stays capped at the final element.
  BACKOFF_MS: Object.freeze([1_000, 3_000, 8_000, 20_000, 60_000]),
  // After this many consecutive failures, open the circuit.
  CIRCUIT_OPEN_AFTER_FAILURES: 5,
  // How long to stay in circuit-open before probing with half-open.
  CIRCUIT_HALF_OPEN_AFTER_MS: 5 * 60_000,
  // Per-connection idle timeout. Hikvision keep-alive packets land
  // every ~30s; we tolerate up to 90s before treating as half-open
  // TCP and forcing a reconnect.
  IDLE_TIMEOUT_MS: 90_000,
  // Watchdog cadence — checks lastBytesAt every WATCHDOG_INTERVAL_MS.
  WATCHDOG_INTERVAL_MS: 30_000,
  // Maximum gap between bytes before reconnect.
  MAX_SILENCE_MS: 90_000,
  // Batch insert window: collect events for this long or until the
  // batch size is reached, then ingestBatch().
  BATCH_WINDOW_MS: 50,
  BATCH_SIZE: 50,
  // Per-device LRU dedup cache (L1).
  DEDUP_LRU_SIZE: 256,
  // Per-device bounded queue. Older events dropped under pressure.
  BOUNDED_QUEUE_SIZE: 1_000,
  // Global rate limit across all clients (events/sec).
  MAX_INGEST_PER_SEC: 500,
  // If device.dateTime is more than this many ms away from server
  // clock, tag time-drift and exclude from reconciliation.
  MAX_ACCEPTABLE_DRIFT_MS: 300_000,
});

/**
 * normalizeStreamTimestamp(deviceDateTime, serverNow):
 * Pure helper. Returns:
 *   { capturedAt, driftMs, driftFlag }
 * driftFlag === 'time-drift' iff |driftMs| > MAX_ACCEPTABLE_DRIFT_MS.
 * capturedAt is ALWAYS deviceDateTime (we don't rewrite history); the
 * caller decides whether to tag/suppress the event.
 */
function normalizeStreamTimestamp(deviceDateTime, serverNow) {
  const server = serverNow instanceof Date ? serverNow : new Date();
  if (!deviceDateTime) {
    return { capturedAt: server, driftMs: 0, driftFlag: null };
  }
  const captured = deviceDateTime instanceof Date ? deviceDateTime : new Date(deviceDateTime);
  if (Number.isNaN(captured.getTime())) {
    return { capturedAt: server, driftMs: 0, driftFlag: 'parse-failed' };
  }
  const driftMs = server.getTime() - captured.getTime();
  const driftFlag =
    Math.abs(driftMs) > STREAM_DEFAULTS.MAX_ACCEPTABLE_DRIFT_MS ? 'time-drift' : null;
  return { capturedAt: captured, driftMs, driftFlag };
}

// ─── Wave 110 — Per-Branch Config Overrides ─────────────────
//
// Each branch may override a narrow subset of operational
// thresholds. Anything not overridden falls back to the global
// DEFAULT_CONFIDENCE_THRESHOLDS / FRAUD_DEFAULTS. The override is
// applied at evaluation time by branchConfigService.resolveEffective().
//
// Allow-list of overridable keys per category — anything outside
// these sets is rejected at write time with BRANCH_CONFIG_INVALID_KEY.
// We deliberately keep the surface small: only the dials operators
// actually need to tune per-branch. Adding a new key requires a code
// change so the audit trail covers it.
const BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS = Object.freeze([
  'FACE_TERMINAL_AUTO_ACCEPT',
  'FACE_TERMINAL_REVIEW_FLOOR',
  'CAMERA_GATE_AUTO_ACCEPT',
  'CAMERA_GATE_REVIEW_FLOOR',
  'CAMERA_CORRIDOR_REVIEW_FLOOR',
  'DUPLICATE_SUPPRESSION_WINDOW_MS',
  'CORROBORATION_WINDOW_MS',
]);

const BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS = Object.freeze([
  'REPEAT_MISMATCH_THRESHOLD',
  'REPEAT_MISMATCH_WINDOW_MS',
  'BURST_THRESHOLD',
  'BURST_WINDOW_MS',
  'SHARED_IDENTITY_THRESHOLD',
  'SHARED_IDENTITY_WINDOW_MS',
]);

// Validation rules per key. All thresholds are numeric; the bounds
// are policy decisions, not arbitrary — straying outside them
// produces nonsense results downstream (e.g. auto-accept below 50%
// false-acceptance-rate, or burst window above 1 hour).
const BRANCH_CONFIG_BOUNDS = Object.freeze({
  // confidence (% 0..100, but tighter floors per key)
  FACE_TERMINAL_AUTO_ACCEPT: { min: 50, max: 100 },
  FACE_TERMINAL_REVIEW_FLOOR: { min: 0, max: 99 },
  CAMERA_GATE_AUTO_ACCEPT: { min: 60, max: 100 },
  CAMERA_GATE_REVIEW_FLOOR: { min: 0, max: 99 },
  CAMERA_CORRIDOR_REVIEW_FLOOR: { min: 0, max: 100 },
  // windows (ms)
  DUPLICATE_SUPPRESSION_WINDOW_MS: { min: 1_000, max: 600_000 }, // 1s..10min
  CORROBORATION_WINDOW_MS: { min: 5_000, max: 300_000 }, // 5s..5min
  // fraud
  REPEAT_MISMATCH_THRESHOLD: { min: 1, max: 50 },
  REPEAT_MISMATCH_WINDOW_MS: { min: 60_000, max: 7 * 24 * 60 * 60_000 }, // 1min..7d
  BURST_THRESHOLD: { min: 2, max: 100 },
  BURST_WINDOW_MS: { min: 1_000, max: 3 * 60 * 60_000 }, // 1s..3h
  SHARED_IDENTITY_THRESHOLD: { min: 2, max: 50 },
  SHARED_IDENTITY_WINDOW_MS: { min: 60_000, max: 7 * 24 * 60 * 60_000 },
});

/**
 * mergeBranchConfig(globalConfidence, globalFraud, override):
 * Pure helper. Returns a frozen {confidenceThresholds, fraudDefaults}
 * with override keys layered on top of the globals.
 *
 *   override.confidenceThresholds — partial subset of overridable keys
 *   override.fraudDefaults        — partial subset of overridable keys
 *
 * Unknown / unauthorised keys are SILENTLY dropped from the merged
 * result so a stale DB row can't sneak in a key removed from the
 * allow-list. Write-time validation catches them earlier.
 */
function mergeBranchConfig(globalConfidence, globalFraud, override) {
  const ct = { ...globalConfidence };
  const fd = { ...globalFraud };
  if (override && override.confidenceThresholds) {
    for (const k of BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS) {
      const v = override.confidenceThresholds[k];
      if (typeof v === 'number' && Number.isFinite(v)) ct[k] = v;
    }
  }
  if (override && override.fraudDefaults) {
    for (const k of BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS) {
      const v = override.fraudDefaults[k];
      if (typeof v === 'number' && Number.isFinite(v)) fd[k] = v;
    }
  }
  return Object.freeze({
    confidenceThresholds: Object.freeze(ct),
    fraudDefaults: Object.freeze(fd),
  });
}

/**
 * validateBranchConfigPatch(patch):
 * Pure helper used by the service before save. Returns
 *   { ok: true, normalized: { confidenceThresholds?, fraudDefaults? } }
 *   { ok: false, reason, errors }
 *
 * - Unknown keys → BRANCH_CONFIG_INVALID_KEY
 * - Out-of-bounds values → BRANCH_CONFIG_INVALID_THRESHOLD
 * - Non-numeric → BRANCH_CONFIG_INVALID_THRESHOLD
 */
function validateBranchConfigPatch(patch) {
  if (!patch || typeof patch !== 'object') {
    return { ok: false, reason: REASON.VALIDATION_FAILED, errors: { patch: 'object required' } };
  }
  const errors = {};
  const out = {};

  if (patch.confidenceThresholds !== undefined) {
    if (typeof patch.confidenceThresholds !== 'object' || patch.confidenceThresholds === null) {
      errors.confidenceThresholds = 'object required';
    } else {
      const ct = {};
      for (const [k, v] of Object.entries(patch.confidenceThresholds)) {
        if (!BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS.includes(k)) {
          errors[`confidenceThresholds.${k}`] = REASON.BRANCH_CONFIG_INVALID_KEY;
          continue;
        }
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          errors[`confidenceThresholds.${k}`] = REASON.BRANCH_CONFIG_INVALID_THRESHOLD;
          continue;
        }
        const b = BRANCH_CONFIG_BOUNDS[k];
        if (b && (v < b.min || v > b.max)) {
          errors[`confidenceThresholds.${k}`] =
            `${REASON.BRANCH_CONFIG_INVALID_THRESHOLD}:${b.min}..${b.max}`;
          continue;
        }
        ct[k] = v;
      }
      // Always emit the bucket when the caller sent it — even if empty,
      // so the service can distinguish "clear all overrides" from
      // "leave bucket alone". Operator intent.
      out.confidenceThresholds = ct;
    }
  }

  if (patch.fraudDefaults !== undefined) {
    if (typeof patch.fraudDefaults !== 'object' || patch.fraudDefaults === null) {
      errors.fraudDefaults = 'object required';
    } else {
      const fd = {};
      for (const [k, v] of Object.entries(patch.fraudDefaults)) {
        if (!BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS.includes(k)) {
          errors[`fraudDefaults.${k}`] = REASON.BRANCH_CONFIG_INVALID_KEY;
          continue;
        }
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          errors[`fraudDefaults.${k}`] = REASON.BRANCH_CONFIG_INVALID_THRESHOLD;
          continue;
        }
        const b = BRANCH_CONFIG_BOUNDS[k];
        if (b && (v < b.min || v > b.max)) {
          errors[`fraudDefaults.${k}`] =
            `${REASON.BRANCH_CONFIG_INVALID_THRESHOLD}:${b.min}..${b.max}`;
          continue;
        }
        fd[k] = v;
      }
      out.fraudDefaults = fd;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: REASON.VALIDATION_FAILED, errors };
  }
  return { ok: true, normalized: out };
}

/**
 * computeStreamExternalEventId(parts):
 * Deterministic key for cross-source dedup. Same event arriving via
 * webhook + stream produces the same key, so the unique index on
 * (deviceId, externalEventId) collapses duplicates.
 *
 * Inputs: { deviceCode, dateTime, channelID, fpid, eventType }
 */
function computeStreamExternalEventId({
  deviceCode,
  dateTime,
  channelID = '',
  fpid = '',
  eventType = '',
} = {}) {
  const crypto = require('crypto');
  const seed = [
    String(deviceCode || ''),
    String(dateTime || ''),
    String(channelID || ''),
    String(fpid || ''),
    String(eventType || ''),
  ].join('|');
  return 'stream-' + crypto.createHash('sha1').update(seed).digest('hex').slice(0, 24);
}

// ─── Wave 113 — Anomaly Detector ───────────────────────────────
//
// Detector emits anomalies, not alerts. Each anomaly is keyed by a
// deterministic dedup string so re-running the detector returns
// the same id for the same underlying issue — the alerts subsystem
// (or future webhook integration) can collapse repeats.

const ANOMALY_KIND = Object.freeze({
  CIRCUIT_OPEN_CLUSTER: 'circuit-open-cluster',
  STREAM_ERRORS_SPIKE: 'stream-errors-spike',
  SYNC_DRIFT_HIGH: 'sync-drift-high',
  FRAUD_CRITICAL: 'fraud-critical',
  REVIEW_QUEUE_STALE: 'review-queue-stale',
  RECONCILIATION_BACKLOG: 'reconciliation-backlog',
  SCHEDULER_FAILURE: 'scheduler-failure',
  NO_STREAM_DEVICES: 'no-stream-devices',
});
const ANOMALY_KINDS = Object.freeze(Object.values(ANOMALY_KIND));

const ANOMALY_SEVERITY = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
});
const ANOMALY_SEVERITIES = Object.freeze(Object.values(ANOMALY_SEVERITY));

// Thresholds the detector consults. Kept here (not embedded in the
// service) so they're discoverable + testable.
const ANOMALY_THRESHOLDS = Object.freeze({
  CIRCUIT_OPEN_CLUSTER_MIN: 3, // ≥ N devices circuit-open at once
  STREAM_ERRORS_SPIKE_MIN: 25, // any single device with ≥ N parse errors
  SYNC_DRIFT_PCT_HIGH: 0.5, // ≥ 50% of libraries with drift
  REVIEW_QUEUE_STALE_HOURS: 24, // oldest open review older than N hours
  RECONCILIATION_BACKLOG_MIN: 25, // ≥ N open cases
});

/**
 * Pure helper: given (templates, devicePersonIds), compute the diff plan.
 *   templates      — array of HikvisionFaceTemplateLink (active state)
 *   devicePersonIds — set/array of personIds currently on the device
 *
 * Returns:
 *   { toPush:   [{ template, op:'push' }],
 *     toDelete: [{ personId, op:'delete' }],
 *     toVerify: [{ template, op:'verify' }],
 *     stats: { totalTemplates, devicePersonsCount } }
 */
function computeSyncDiff(templates, devicePersonIds) {
  const deviceSet = new Set((devicePersonIds || []).map(p => String(p)));
  const dbActivePersonIds = new Set();

  const toPush = [];
  const toVerify = [];

  for (const t of templates || []) {
    if (t.status !== TEMPLATE_STATUS.ACTIVE && t.status !== TEMPLATE_STATUS.PENDING) {
      // suspended/deleted templates handled by toDelete loop below
      continue;
    }
    if (!t.hikvisionPersonId) {
      // pending without device personId → must push
      toPush.push({ template: t, op: DIFF_OPERATION.PUSH });
      continue;
    }
    dbActivePersonIds.add(String(t.hikvisionPersonId));
    if (deviceSet.has(String(t.hikvisionPersonId))) {
      toVerify.push({ template: t, op: DIFF_OPERATION.VERIFY });
    } else {
      // active in DB but missing from device → re-push
      toPush.push({ template: t, op: DIFF_OPERATION.PUSH });
    }
  }

  // Anything on device that isn't claimed by an active DB template gets deleted.
  const toDelete = [];
  for (const pid of deviceSet) {
    if (!dbActivePersonIds.has(pid)) {
      toDelete.push({ personId: pid, op: DIFF_OPERATION.DELETE });
    }
  }

  return {
    toPush,
    toDelete,
    toVerify,
    stats: {
      totalTemplates: (templates || []).length,
      devicePersonsCount: deviceSet.size,
    },
  };
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
  // Wave 99 Phase 4 — attendance integration
  PAYROLL_PERIOD_STATUS,
  PAYROLL_PERIOD_STATUSES,
  RECONCILIATION_CONFLICT,
  RECONCILIATION_CONFLICTS,
  SHIFT_CLASSIFICATION,
  SHIFT_CLASSIFICATIONS,
  PAYROLL_OVERRIDE_APPROVAL,
  PAYROLL_OVERRIDE_APPROVALS,
  RECONCILIATION_DEFAULTS,
  // Wave 100 Phase 5 — fraud detection
  FRAUD_KIND,
  FRAUD_KINDS,
  FRAUD_SEVERITY,
  FRAUD_SEVERITIES,
  FRAUD_SCORE_IMPACT,
  FRAUD_FLAG_STATE,
  FRAUD_FLAG_STATES,
  FRAUD_DEFAULTS,
  // Wave 106 Phase F — sync worker
  SYNC_RESULT,
  SYNC_RESULTS,
  DIFF_OPERATION,
  DIFF_OPERATIONS,
  SYNC_DEFAULTS,
  // Wave 108 — operational scheduler
  JOB_STATUS,
  JOB_STATUSES,
  JOB_TRIGGER,
  JOB_TRIGGERS,
  JOB_ID,
  JOB_IDS,
  JOB_CRON_DEFAULTS,
  JOB_DEFAULTS,
  // Wave 109 — real-time event stream
  STREAM_STATE,
  STREAM_STATES,
  STREAM_MODE,
  STREAM_MODES,
  STREAM_DEFAULTS,
  normalizeStreamTimestamp,
  computeStreamExternalEventId,
  // Wave 110 — per-branch config overrides
  BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS,
  BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS,
  BRANCH_CONFIG_BOUNDS,
  mergeBranchConfig,
  validateBranchConfigPatch,
  // Wave 113 — anomaly detector
  ANOMALY_KIND,
  ANOMALY_KINDS,
  ANOMALY_SEVERITY,
  ANOMALY_SEVERITIES,
  ANOMALY_THRESHOLDS,
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
  // Wave 99 Phase 4 — attendance integration helpers
  classifyCheckIn,
  classifyCheckOut,
  findCorroborationPairs,
  dedupByZoneWindow,
  // Wave 100 Phase 5 — fraud detection helpers
  detectRepeatMismatchInWindow,
  detectBurstPattern,
  computeScoreFromFlags,
  classifyScoreBand,
  // Wave 106 Phase F — sync worker helpers
  computeSyncDiff,
};
