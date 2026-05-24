'use strict';

/**
 * capa-alerts-subscriber.service.js — W349 (CAPA Pass 7 consumer).
 *
 * Bus subscriber for `quality.capa.overdue` events emitted by the W344
 * sweepOverdue cron + manual /sweep route. Acts as the bridge between the
 * CAPA pipeline (W337+W340+W344+W345+W346+W348) and the downstream alerting
 * surface (notification channels, AiAlert collection, Slack/email — when wired).
 *
 * Public surface:
 *   wireCapaAlerts({ bus, logger, downstreamEmit })
 *     - bus: the QualityEventBus instance (from getDefault())
 *     - logger: structured logger
 *     - downstreamEmit?: optional alternate emitter for the downstream
 *       `notification.capa.overdue.alert` event (defaults to the same bus)
 *
 * Subscribes once. Returns the unsubscribe function so the bootstrap can
 * tear down for testing (the bus.on returns its own unsubscribe; we just
 * forward it).
 *
 * Behaviour per event:
 *   1. Log a structured WARNING line (visible in ops logs, parseable).
 *   2. Emit downstream `notification.capa.overdue.alert` with a normalized
 *      payload — downstream notification services (when wired) consume this
 *      to fan-out to Slack/email/in-app/SMS without coupling to CAPA internals.
 *   3. Per-event try/catch so a thrown downstream listener can never break
 *      the bus or block other CAPA events.
 *
 * Deliberately does NOT:
 *   - Write to AiAlert (enum doesn't include 'capa_overdue'; schema decision
 *     deferred to the AiAlert owner — separate ADR if needed).
 *   - Auto-transition the CAPA (escalation is a human decision — see W337 lib).
 *   - Persist anything (the bus's ring buffer + the log line are the audit trail).
 */

const DOWNSTREAM_EVENT = 'notification.capa.overdue.alert';

function _normalizePayload(payload = {}) {
  return {
    source: 'quality.capa.overdue',
    capaId: payload.capaId ?? null,
    capaNumber: payload.capaNumber ?? null,
    status: payload.status ?? null,
    ownerUserId: payload.ownerUserId ?? null,
    branchId: payload.branchId ?? null,
    daysOverdue: Number.isFinite(payload.daysOverdue) ? payload.daysOverdue : null,
    dueDate: payload.dueDate ?? null,
    detectedAt: new Date().toISOString(),
    severity: _severityForDays(payload.daysOverdue),
  };
}

function _severityForDays(days) {
  if (!Number.isFinite(days)) return 'warning';
  if (days >= 30) return 'critical';
  if (days >= 7) return 'warning';
  return 'info';
}

function wireCapaAlerts({ bus, logger = console, downstreamEmit = null } = {}) {
  if (!bus || typeof bus.on !== 'function') {
    throw new Error('wireCapaAlerts: bus with .on(pattern, fn) required');
  }
  const emit =
    typeof downstreamEmit === 'function'
      ? downstreamEmit
      : typeof bus.emit === 'function'
        ? (name, payload) => bus.emit(name, payload)
        : null;

  const unsubscribe = bus.on('quality.capa.overdue', async payload => {
    const normalized = _normalizePayload(payload);
    logger.warn?.(
      `[capa-alerts] OVERDUE capa=${normalized.capaNumber ?? '?'} status=${normalized.status ?? '?'} daysOverdue=${normalized.daysOverdue ?? '?'} severity=${normalized.severity} owner=${normalized.ownerUserId ?? '?'} branch=${normalized.branchId ?? '?'}`
    );
    if (!emit) return;
    try {
      await emit(DOWNSTREAM_EVENT, normalized);
    } catch (err) {
      logger.error?.(
        `[capa-alerts] downstream emit failed for ${normalized.capaNumber}: ${err.message}`
      );
    }
  });

  return {
    unsubscribe,
    downstreamEvent: DOWNSTREAM_EVENT,
    // expose for tests
    _internals: { _normalizePayload, _severityForDays },
  };
}

module.exports = {
  wireCapaAlerts,
  DOWNSTREAM_EVENT,
};
