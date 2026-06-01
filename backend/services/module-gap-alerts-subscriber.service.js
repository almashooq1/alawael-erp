'use strict';

/**
 * module-gap-alerts-subscriber.service.js — Wave 717.
 *
 * Bus subscriber that turns the W695 module-gap sweeper events into the
 * notification-fan-out seam. Mirrors the W349 capa-alerts-subscriber pattern
 * exactly: subscribe on the QualityEventBus, log a structured WARN, and emit
 * a downstream `notification.module_gap.overdue.alert` event that the
 * notification channels (in-app/email/SMS) consume — without coupling the
 * sweepers to notification internals.
 *
 * Upgrades the W695 sweepers from log-ONLY to a real alert pipeline:
 *   sweeper → emit `module_gap.<x>.overdue` → THIS subscriber →
 *   emit `notification.module_gap.overdue.alert` → channel subscribers.
 *
 * Public surface:
 *   wireModuleGapAlerts({ bus, logger, downstreamEmit })
 *     - bus: QualityEventBus instance (from getDefault())
 *     - logger: structured logger
 *     - downstreamEmit?: optional alternate emitter (defaults to the bus)
 *   Returns { unsubscribe, downstreamEvent }.
 *
 * Subscribes ONCE on the `module_gap.*` wildcard. Per-event try/catch so a
 * thrown downstream listener can never break the bus. Persists nothing (the
 * bus ring-buffer + the log line are the audit trail) — read-only, same as
 * the sweepers it serves (W364 invariant).
 */

const DOWNSTREAM_EVENT = 'notification.module_gap.overdue.alert';
const SOURCE_PATTERN = 'module_gap.*';

function _severityForDays(days) {
  if (!Number.isFinite(days)) return 'warning';
  if (days >= 30) return 'critical';
  if (days >= 7) return 'warning';
  return 'info';
}

function _normalizePayload(sourceEvent, payload = {}) {
  return {
    source: sourceEvent,
    kind: payload.kind ?? sourceEvent,
    beneficiaryId: payload.beneficiaryId ?? null,
    branchId: payload.branchId ?? null,
    recordId: payload.recordId ?? null,
    daysOverdue: Number.isFinite(payload.daysOverdue) ? payload.daysOverdue : null,
    dueDate: payload.dueDate ?? null,
    detail: payload.detail ?? null,
    severity: _severityForDays(payload.daysOverdue),
    detectedAt: new Date().toISOString(),
  };
}

function wireModuleGapAlerts({ bus, logger = console, downstreamEmit = null } = {}) {
  if (!bus || typeof bus.on !== 'function') {
    throw new Error('wireModuleGapAlerts: bus with .on(pattern, fn) required');
  }
  const emit =
    typeof downstreamEmit === 'function'
      ? downstreamEmit
      : typeof bus.emit === 'function'
        ? (name, payload) => bus.emit(name, payload)
        : null;

  const unsubscribe = bus.on(SOURCE_PATTERN, async (payload, eventName) => {
    // The QualityEventBus invokes listeners as (name, payload); guard both.
    const src = typeof payload === 'string' ? payload : eventName;
    const data = typeof payload === 'string' ? {} : payload || {};
    const normalized = _normalizePayload(src || SOURCE_PATTERN, data);
    logger.warn?.(
      `[module-gap-alerts] ${normalized.source} beneficiary=${normalized.beneficiaryId ?? '?'} ` +
        `record=${normalized.recordId ?? '?'} daysOverdue=${normalized.daysOverdue ?? '?'} ` +
        `severity=${normalized.severity} branch=${normalized.branchId ?? '?'}`
    );
    if (!emit) return;
    try {
      await emit(DOWNSTREAM_EVENT, normalized);
    } catch (err) {
      logger.error?.(`[module-gap-alerts] downstream emit failed: ${err.message}`);
    }
  });

  return { unsubscribe, downstreamEvent: DOWNSTREAM_EVENT, sourcePattern: SOURCE_PATTERN };
}

module.exports = { wireModuleGapAlerts, DOWNSTREAM_EVENT, SOURCE_PATTERN, _normalizePayload };
