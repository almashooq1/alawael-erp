'use strict';

/**
 * measure-alert-reassign-notify.service.js — Wave 516.
 *
 * Bus subscriber that consumes the W514 `medical.measure_alert.reassigned`
 * event and emits the downstream notification event
 * `notification.measure_alert.reassigned.alert` for channel-fanout services
 * (Slack / email / in-app / SMS / push).
 *
 * Pattern mirrors W349 capa-alerts-subscriber.service.js — the actual
 * channel implementation is decoupled. When notification services pick
 * up the downstream event, they receive a normalized payload with the
 * two affected therapist IDs + branch + actor.
 *
 * Why this exists
 *   - Both therapists (from + to) need to know about the reassign. The
 *     W515 SSE refresh handles their inbox UI, but if they're offline
 *     when the move happens, push/email is the catch-up channel.
 *   - The supervisor who applied the move gets implicit feedback via
 *     the row dimming in the W513 UI. No notification needed.
 *   - branchManager + admin roles see the move in their dashboards
 *     (W515 SSE). No notification needed.
 *
 * Public surface:
 *   wireMeasureAlertReassignNotify({ integrationBus, logger, downstreamEmit? })
 *     - integrationBus: required, with .subscribe(pattern, handler)
 *     - logger: console-compatible
 *     - downstreamEmit: optional (name, payload) → Promise<void>;
 *       defaults to integrationBus.publish('notification', '...')
 *
 *   Returns { unsubscribe, ranSinceBoot, DOWNSTREAM_EVENT }
 *
 * Safety:
 *   - Per-event try/catch — a thrown downstream handler never breaks the bus
 *   - Empty/malformed payload → logged + skipped (no downstream emit)
 *   - downstreamEmit failures logged but NOT re-thrown
 */

const SOURCE_PATTERN = 'medical.measure_alert.reassigned';
const DOWNSTREAM_EVENT = 'measure_alert.reassigned.alert'; // domain='notification'
const DOWNSTREAM_DOMAIN = 'notification';

function _normalizePayload(payload = {}) {
  return {
    source: SOURCE_PATTERN,
    alertId: payload.alertId ?? null,
    beneficiaryId: payload.beneficiaryId ?? null,
    branchId: payload.branchId ?? null,
    fromTherapistId: payload.fromTherapistId ?? null,
    toTherapistId: payload.toTherapistId ?? null,
    actorId: payload.actorId ?? null,
    alertType: payload.alertType ?? null,
    severity: _severityFor(payload.severity),
    reason: payload.reason ?? null,
    notifiedAt: new Date().toISOString(),
    // Each notification channel decides which recipient(s) to fan out
    // to. Default is both therapists. Notify service can filter further
    // (e.g. only push to mobile when severity is high+).
    recipients: [payload.fromTherapistId, payload.toTherapistId].filter(Boolean),
  };
}

function _severityFor(s) {
  const v = typeof s === 'string' ? s.toLowerCase() : '';
  if (v === 'critical' || v === 'high') return v;
  if (v === 'medium' || v === 'low') return v;
  return 'info';
}

function wireMeasureAlertReassignNotify({
  integrationBus,
  logger = console,
  downstreamEmit = null,
} = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireMeasureAlertReassignNotify: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const emit =
    typeof downstreamEmit === 'function'
      ? downstreamEmit
      : typeof integrationBus.publish === 'function'
        ? (eventType, payload) => integrationBus.publish(DOWNSTREAM_DOMAIN, eventType, payload)
        : null;

  const stats = {
    received: 0,
    notified: 0,
    skipped: 0,
    errored: 0,
    lastError: null,
  };

  const handler = async event => {
    stats.received++;
    const payload = event?.payload || event || {};
    if (!payload.alertId || !payload.fromTherapistId || !payload.toTherapistId) {
      stats.skipped++;
      logger.warn?.(
        `[reassign-notify] skipping malformed event (alertId=${payload.alertId ?? '?'} from=${payload.fromTherapistId ?? '?'} to=${payload.toTherapistId ?? '?'})`
      );
      return;
    }

    const normalized = _normalizePayload(payload);
    logger.info?.(
      `[reassign-notify] alert=${normalized.alertId} ` +
        `from=${normalized.fromTherapistId} → to=${normalized.toTherapistId} ` +
        `by=${normalized.actorId ?? '?'} severity=${normalized.severity} ` +
        `branch=${normalized.branchId ?? '?'}`
    );

    if (!emit) {
      stats.skipped++;
      return;
    }
    try {
      await emit(DOWNSTREAM_EVENT, normalized);
      stats.notified++;
    } catch (err) {
      stats.errored++;
      stats.lastError = err?.message || String(err);
      logger.error?.(
        `[reassign-notify] downstream emit failed for alert=${normalized.alertId}: ${stats.lastError}`
      );
    }
  };

  const unsubscribe = integrationBus.subscribe(SOURCE_PATTERN, handler);

  logger.info?.(`[reassign-notify] W516 wired — subscribing to '${SOURCE_PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
    DOWNSTREAM_EVENT,
    DOWNSTREAM_DOMAIN,
    SOURCE_PATTERN,
  };
}

module.exports = {
  wireMeasureAlertReassignNotify,
  // Exported for tests
  _normalizePayload,
  _severityFor,
  SOURCE_PATTERN,
  DOWNSTREAM_EVENT,
  DOWNSTREAM_DOMAIN,
};
