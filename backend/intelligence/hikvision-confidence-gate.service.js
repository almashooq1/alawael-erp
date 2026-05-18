'use strict';

/**
 * hikvision-confidence-gate.service.js — Wave 98 Phase 3.
 *
 * Single decision point for "what should we do with this normalised
 * event?" Inputs are PURE — already-extracted confidence + source +
 * channel + employee context. Outputs are PURE — gate decision +
 * reason + queue + flags. Side effects (writing review rows / source
 * events) live in `attendance-source.service` and the parser service.
 *
 * The reason we keep this separate from the parser:
 *   • The same gate is reused by Phase-4 manual-override flows and
 *     Phase-5 fraud-detection re-evaluation.
 *   • Pure logic = trivially unit-testable in isolation; the parser
 *     wraps it with model reads/writes.
 *
 * Public API:
 *   evaluate({ confidence, antiSpoofResult, source, channel,
 *              priorAcceptedSameZone, priorAcceptedDifferentBranch,
 *              employeeId, repeatMismatchCount, thresholds? })
 *     → { decision, reason, queue, autoThreshold, reviewFloor, flags }
 *
 *   buildSuppressionWindow(employeeId, zoneId, now, windowMs?)
 *     → { since: Date, until: Date }  — convenience for the parser.
 *
 *   resolveSourceFromDevice(device, channel) → ATTENDANCE_SOURCE.*
 *     — Used by the parser to pick the right thresholds.
 */

const reg = require('./hikvision.registry');

function createHikvisionConfidenceGateService({
  thresholds = reg.DEFAULT_CONFIDENCE_THRESHOLDS,
} = {}) {
  function evaluate(input = {}) {
    const {
      confidence,
      antiSpoofResult,
      source,
      channel,
      priorAcceptedSameZone = null,
      priorAcceptedDifferentBranch = null,
      repeatMismatchCount = 0,
      thresholds: thresholdsOverride,
    } = input;

    const flags = [];
    const thr = thresholdsOverride || thresholds;

    // 1) Duplicate suppression — same employee/zone within window with
    //    an already-accepted event. We tag and return early; the parser
    //    must point linkedSuppressedFromEventId at priorAcceptedSameZone.
    if (priorAcceptedSameZone) {
      flags.push('duplicate-suppressed');
      return {
        decision: reg.GATE_DECISION.SUPPRESSED,
        reason: null,
        queue: null,
        autoThreshold: null,
        reviewFloor: null,
        flags,
        linkedSuppressedFromEventId: priorAcceptedSameZone._id || priorAcceptedSameZone.id || null,
      };
    }

    // 2) Run the pure confidence rule.
    const base = reg.applyConfidenceGate({
      confidence,
      antiSpoofResult,
      source,
      channel,
      thresholds: thr,
    });

    // 3) Impossible-travel overlay — if there's an accepted event for
    //    the same employee in a DIFFERENT branch within the impossible
    //    window, ALWAYS route to review regardless of confidence. Both
    //    are flagged so the queue UI can show the pair.
    if (
      priorAcceptedDifferentBranch &&
      reg.isImpossibleTravel(priorAcceptedDifferentBranch, {
        employeeId: input.employeeId,
        branchId: input.branchId,
        capturedAt: input.capturedAt,
      })
    ) {
      flags.push('impossible-travel');
      return {
        decision: reg.GATE_DECISION.REVIEW,
        reason: reg.REVIEW_REASON.IMPOSSIBLE_TRAVEL,
        queue: reg.REVIEW_QUEUE.SECURITY,
        autoThreshold: base.autoThreshold,
        reviewFloor: base.reviewFloor,
        flags,
      };
    }

    // 4) Repeat-mismatch overlay — if this template has had ≥3
    //    confidence-fail events in a configurable window, escalate
    //    even an otherwise-passing one to security.
    if (repeatMismatchCount >= 3) {
      flags.push('repeat-mismatch');
      return {
        decision: reg.GATE_DECISION.REVIEW,
        reason: reg.REVIEW_REASON.REPEAT_MISMATCH,
        queue: reg.REVIEW_QUEUE.SECURITY,
        autoThreshold: base.autoThreshold,
        reviewFloor: base.reviewFloor,
        flags,
      };
    }

    return { ...base, flags };
  }

  function buildSuppressionWindow(employeeId, zoneId, now = new Date(), windowMs) {
    const w = Number.isFinite(windowMs) ? windowMs : thresholds.DUPLICATE_SUPPRESSION_WINDOW_MS;
    const until = now instanceof Date ? now : new Date(now);
    const since = new Date(until.getTime() - w);
    return { since, until, employeeId, zoneId };
  }

  function resolveSourceFromDevice(device, channel) {
    if (!device) return reg.ATTENDANCE_SOURCE.MANUAL;
    if (device.kind === reg.DEVICE_KIND.TERMINAL) {
      // Terminal: face vs fingerprint depends on capability — fingerprint
      // events are tagged separately by the device. The parser already
      // knows the eventKind (RAW_EVENT_KIND.FACE_MATCH vs FINGERPRINT)
      // and passes it on; if neither, fall back to face-terminal.
      return reg.ATTENDANCE_SOURCE.FACE_TERMINAL;
    }
    if (device.kind === reg.DEVICE_KIND.CAMERA) {
      // Eligible channel = primary attendance device. Non-eligible
      // channels still flow through so the security view sees them,
      // but the gate will downgrade.
      if (channel && channel.attendanceEligible === false) {
        return reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE;
      }
      return reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE;
    }
    if (device.kind === reg.DEVICE_KIND.NVR) {
      return reg.ATTENDANCE_SOURCE.CAMERA_PASSIVE;
    }
    return reg.ATTENDANCE_SOURCE.MANUAL;
  }

  return {
    evaluate,
    buildSuppressionWindow,
    resolveSourceFromDevice,
  };
}

module.exports = { createHikvisionConfidenceGateService };
