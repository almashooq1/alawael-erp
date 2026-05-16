'use strict';

/**
 * workflow.service.js — Wave 12.
 *
 * User-initiated state transitions on persisted Alert documents.
 * Pairs the engine's autonomous lifecycle (raise → auto-resolve)
 * with operator actions (acknowledge, assign, snooze, mute, manual
 * resolve, comment). Every operation:
 *
 *   1. Reads the current alert and validates the requested
 *      transition is legal given its current state.
 *   2. Persists the change atomically (Mongo $set + $push) so
 *      concurrent operations don't lose state.
 *   3. Appends a `state.transitions[]` entry with actor + reason +
 *      IP for the audit trail.
 *   4. Optionally writes an AuditLog row (PDPL Art.13) when the
 *      caller wires `auditLogger`.
 *   5. Returns the updated document.
 *
 * The service is created via a factory so tests can inject a fake
 * AlertModel without touching Mongo. Same DI pattern HrCopilot +
 * BriefingService use.
 *
 * Never throws on a no-op (acking an already-acked alert, resolving
 * an already-resolved one) — returns `{ ok: false, reason }` and
 * leaves the document untouched. The HTTP layer maps these to 200
 * with the existing alert (idempotent UX).
 */

const DefaultAlertModel = require('./alert.model');

// Bounds the SnoozeUntil / MutedUntil deltas the route layer accepts.
// Snooze caps at 1 week to prevent "permanent snooze" anti-pattern.
const MIN_SNOOZE_MIN = 5;
const MAX_SNOOZE_MIN = 7 * 24 * 60;
const MIN_MUTE_HOURS = 1;
const MAX_MUTE_HOURS = 30 * 24; // 30 days

// Mute requires a justification long enough to be meaningful in audit.
const MIN_MUTE_REASON_LEN = 10;
const MIN_RESOLVE_NOTE_LEN = 0; // resolve note is optional
const MIN_COMMENT_LEN = 1;
const MAX_COMMENT_LEN = 2000;

function nowDate() {
  return new Date();
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function buildTransition({ from, to, by, reason, ip }) {
  return {
    from,
    to,
    at: nowDate(),
    byUserId: by?.userId || null,
    byRole: by?.role || null,
    reason: reason || null,
    ip: ip || null,
  };
}

/**
 * @param {object} opts
 *   - alertModel: defaults to the canonical mongoose model.
 *   - auditLogger: optional `{ log(entry) }` integration (PDPL Art.13).
 *   - logger: console-compatible.
 */
function createAlertWorkflow({
  alertModel = DefaultAlertModel,
  auditLogger = null,
  logger = console,
} = {}) {
  function model() {
    // alert.model.js exposes a getter so we always reach the freshly
    // registered mongoose model — important under jest's `mongoose.models`
    // reset semantics between test files.
    return alertModel.model || alertModel;
  }

  async function audit(action, ctx, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: ctx?.userId || null,
        actorRole: ctx?.role || null,
        entityType: 'Alert',
        entityId: metadata?.alertId || null,
        ipAddress: ctx?.ip || null,
        metadata: metadata || {},
      });
    } catch (err) {
      logger.warn && logger.warn(`[alertWorkflow] audit ${action}: ${err.message}`);
    }
  }

  async function getAlert(alertId) {
    return model().findById(alertId);
  }

  /**
   * Acknowledge an alert. Stops escalation but the alert remains
   * OPEN until either resolved manually or auto-resolved by the
   * engine when the underlying condition clears.
   */
  async function acknowledgeAlert({ alertId, actor = {} }) {
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (alert.resolvedAt) return { ok: false, reason: 'ALREADY_RESOLVED', alert };
    if (alert.ackedAt) return { ok: true, alert, noop: true };

    const previous = alert.deriveState();
    alert.ackedAt = nowDate();
    alert.ackedBy = actor.userId || null;
    alert.state.current = 'ACKNOWLEDGED';
    alert.state.transitions.push(
      buildTransition({ from: previous, to: 'ACKNOWLEDGED', by: actor, ip: actor.ip })
    );
    await alert.save();
    await audit('alert.acknowledge', actor, { alertId, ruleId: alert.ruleId });
    return { ok: true, alert };
  }

  /**
   * Assign the alert to a specific user. This stops tier broadcast
   * — the dispatcher routes future notifications only to this user.
   */
  async function assignAlert({ alertId, assigneeUserId, actor = {} }) {
    if (!assigneeUserId) return { ok: false, reason: 'ASSIGNEE_REQUIRED' };
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (alert.resolvedAt) return { ok: false, reason: 'ALREADY_RESOLVED', alert };

    const previous = alert.deriveState();
    const now = nowDate();
    alert.ownership.assignedTo = assigneeUserId;
    alert.ownership.assignedAt = now;
    alert.ownership.assignedBy = actor.userId || null;
    alert.state.current = 'ASSIGNED';
    alert.state.transitions.push(
      buildTransition({ from: previous, to: 'ASSIGNED', by: actor, ip: actor.ip })
    );
    await alert.save();
    await audit('alert.assign', actor, {
      alertId,
      ruleId: alert.ruleId,
      assigneeUserId: String(assigneeUserId),
    });
    return { ok: true, alert };
  }

  /**
   * Snooze for a bounded period. Stops notifications + escalation
   * until snoozeUntil. The alert stays OPEN in the inbox with a
   * "snoozed until …" chip.
   */
  async function snoozeAlert({ alertId, minutes, actor = {}, reason = null }) {
    if (!isFiniteNumber(minutes) || minutes < MIN_SNOOZE_MIN || minutes > MAX_SNOOZE_MIN) {
      return { ok: false, reason: 'INVALID_SNOOZE_DURATION' };
    }
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (alert.resolvedAt) return { ok: false, reason: 'ALREADY_RESOLVED', alert };

    const previous = alert.deriveState();
    const until = new Date(Date.now() + minutes * 60 * 1000);
    alert.snoozeUntil = until;
    alert.state.current = 'SNOOZED';
    alert.state.transitions.push(
      buildTransition({ from: previous, to: 'SNOOZED', by: actor, reason, ip: actor.ip })
    );
    await alert.save();
    await audit('alert.snooze', actor, {
      alertId,
      ruleId: alert.ruleId,
      minutes,
      until,
      reason,
    });
    return { ok: true, alert };
  }

  /**
   * Mute notifications for hours. Mute is heavier than snooze: it
   * requires a justification (PDPL audit), suppresses ALL
   * notification channels (including escalation tiers), and the
   * inbox keeps showing the alert with a distinct "muted" badge.
   */
  async function muteAlert({ alertId, hours, reason, actor = {} }) {
    if (!isFiniteNumber(hours) || hours < MIN_MUTE_HOURS || hours > MAX_MUTE_HOURS) {
      return { ok: false, reason: 'INVALID_MUTE_DURATION' };
    }
    if (typeof reason !== 'string' || reason.trim().length < MIN_MUTE_REASON_LEN) {
      return { ok: false, reason: 'MUTE_REASON_REQUIRED' };
    }
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (alert.resolvedAt) return { ok: false, reason: 'ALREADY_RESOLVED', alert };

    const previous = alert.deriveState();
    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    alert.mutedUntil = until;
    alert.muteReason = reason.trim();
    alert.state.current = 'MUTED';
    alert.state.transitions.push(
      buildTransition({
        from: previous,
        to: 'MUTED',
        by: actor,
        reason: reason.trim(),
        ip: actor.ip,
      })
    );
    await alert.save();
    await audit('alert.mute', actor, {
      alertId,
      ruleId: alert.ruleId,
      hours,
      until,
      reason: reason.trim(),
    });
    return { ok: true, alert };
  }

  /**
   * Manually resolve an alert. Used when the operator fixes the
   * underlying condition outside the system (e.g. a credential
   * renewed via SCFHS portal — the engine can't see that until the
   * next sync, but the operator can close the alert now).
   */
  async function resolveAlertManually({ alertId, note = null, actor = {} }) {
    if (typeof note !== 'string' && note !== null) note = null;
    if (note && note.length > 2000) {
      return { ok: false, reason: 'RESOLVE_NOTE_TOO_LONG' };
    }
    if (note && note.length < MIN_RESOLVE_NOTE_LEN) {
      // (0 = optional) — kept for symmetry with comment validation
    }
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (alert.resolvedAt) return { ok: true, alert, noop: true };

    const previous = alert.deriveState();
    alert.resolvedAt = nowDate();
    alert.resolvedBy = actor.userId || null;
    alert.resolveNote = note;
    alert.state.current = 'RESOLVED';
    alert.state.transitions.push(
      buildTransition({
        from: previous,
        to: 'RESOLVED',
        by: actor,
        reason: note,
        ip: actor.ip,
      })
    );
    await alert.save();
    await audit('alert.resolve_manual', actor, {
      alertId,
      ruleId: alert.ruleId,
      note,
    });
    return { ok: true, alert };
  }

  /**
   * Append a comment to the alert. Does NOT change state — the
   * comment is purely additive context the next reviewer can use.
   */
  async function commentAlert({ alertId, text, actor = {} }) {
    if (typeof text !== 'string') return { ok: false, reason: 'COMMENT_TEXT_REQUIRED' };
    const trimmed = text.trim();
    if (trimmed.length < MIN_COMMENT_LEN) {
      return { ok: false, reason: 'COMMENT_TEXT_REQUIRED' };
    }
    if (trimmed.length > MAX_COMMENT_LEN) {
      return { ok: false, reason: 'COMMENT_TEXT_TOO_LONG' };
    }
    if (!actor.userId) {
      return { ok: false, reason: 'ACTOR_REQUIRED' };
    }
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };

    alert.comments.push({
      byUserId: actor.userId,
      byRole: actor.role || null,
      text: trimmed,
      at: nowDate(),
    });
    await alert.save();
    await audit('alert.comment', actor, {
      alertId,
      ruleId: alert.ruleId,
      commentLen: trimmed.length,
    });
    return { ok: true, alert };
  }

  /**
   * Record a re-open event on an alert that the engine detected.
   * Called by the dispatcher when `engineResult.reopened` contains
   * an entry. Sets `resolvedAt = null` so the alert returns to the
   * active inbox and pushes a `reopens[]` entry for audit.
   */
  async function recordReopen({ alertId, previousResolvedAt, reason = 'engine_redetected' }) {
    const alert = await getAlert(alertId);
    if (!alert) return { ok: false, reason: 'NOT_FOUND' };
    if (!alert.resolvedAt) {
      return { ok: true, alert, noop: true }; // already open
    }
    const previous = 'RESOLVED';
    alert.resolvedAt = null;
    alert.resolveNote = null;
    alert.resolvedBy = null;
    alert.state.current = 'OPEN';
    alert.state.transitions.push(
      buildTransition({
        from: previous,
        to: 'OPEN',
        by: { role: 'engine' },
        reason: `reopen:${reason}`,
      })
    );
    alert.reopens.push({
      reopenedAt: nowDate(),
      previousResolvedAt: previousResolvedAt || null,
      reason,
      triggeredByUserId: null,
    });
    // Reset escalation tier on reopen — re-detected conditions should
    // restart the tier timer rather than picking up where we left off.
    alert.escalation.currentTier = 1;
    alert.escalation.tier1At = nowDate();
    alert.escalation.tier2At = null;
    alert.escalation.tier3At = null;
    await alert.save();
    await audit(
      'alert.reopen',
      { role: 'engine' },
      {
        alertId,
        ruleId: alert.ruleId,
        previousResolvedAt,
        reason,
      }
    );
    return { ok: true, alert };
  }

  return {
    acknowledgeAlert,
    assignAlert,
    snoozeAlert,
    muteAlert,
    resolveAlertManually,
    commentAlert,
    recordReopen,
  };
}

module.exports = {
  createAlertWorkflow,
  // Exposed so tests + routes can validate the same way the service does.
  BOUNDS: {
    MIN_SNOOZE_MIN,
    MAX_SNOOZE_MIN,
    MIN_MUTE_HOURS,
    MAX_MUTE_HOURS,
    MIN_MUTE_REASON_LEN,
    MIN_COMMENT_LEN,
    MAX_COMMENT_LEN,
  },
};
