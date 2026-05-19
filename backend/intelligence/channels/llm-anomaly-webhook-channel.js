'use strict';

/**
 * llm-anomaly-webhook-channel.js — Wave 146.
 *
 * Posts a Slack-compatible JSON payload to a configurable URL when
 * an anomaly fires or resolves. URL comes from
 * LLM_ANOMALY_WEBHOOK_URL — when unset, the factory returns null and
 * the dispatcher simply has one less channel.
 *
 * Failure modes:
 *   - Non-2xx response → resolves {ok:false, status, body}; dispatcher
 *     catches via _deliverToAll wrapping. Never throws upstream.
 *   - Network/timeout → returns {ok:false, message}.
 *
 * 5s timeout. Single attempt — the dispatcher's per-id rate-limit
 * already gives natural retry behavior on the next scan tick.
 */

const DEFAULT_TIMEOUT_MS = 5000;

function _payload({ kind, anomaly, source, detectedAt }) {
  const isFired = kind === 'anomaly-fired';
  const emoji = isFired
    ? anomaly.severity === 'critical'
      ? '🔴'
      : anomaly.severity === 'warning'
        ? '🟡'
        : '🔵'
    : '✅';
  const verb = isFired ? 'fired' : 'resolved';
  const text = `${emoji} LLM anomaly ${verb}: *${anomaly.id}*\n${anomaly.summaryAr || ''}\nseverity=${anomaly.severity} · source=${source} · at ${detectedAt}`;
  return {
    text,
    attachments: [
      {
        color: isFired
          ? anomaly.severity === 'critical'
            ? '#dc2626'
            : anomaly.severity === 'warning'
              ? '#f59e0b'
              : '#3b82f6'
          : '#10b981',
        fields: [
          { title: 'kind', value: anomaly.kind, short: true },
          { title: 'severity', value: anomaly.severity, short: true },
          { title: 'event', value: kind, short: true },
          { title: 'source', value: source, short: true },
          ...(anomaly.suggestedAction
            ? [{ title: 'suggestedAction', value: anomaly.suggestedAction, short: false }]
            : []),
        ],
      },
    ],
  };
}

function createLlmAnomalyWebhookChannel({
  url = process.env.LLM_ANOMALY_WEBHOOK_URL || null,
  fetcher = globalThis.fetch,
  logger = console,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  name = 'webhook',
} = {}) {
  if (!url) {
    if (logger.info)
      logger.info('[llm-anomaly-webhook] disabled — LLM_ANOMALY_WEBHOOK_URL not set');
    return null;
  }
  if (typeof fetcher !== 'function') {
    if (logger.warn) logger.warn('[llm-anomaly-webhook] disabled — no fetch available');
    return null;
  }

  return {
    name,
    async deliver(event) {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      try {
        const res = await fetcher(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(_payload(event)),
          ...(controller ? { signal: controller.signal } : {}),
        });
        if (!res.ok) {
          let body = '';
          try {
            body = await res.text();
          } catch {
            /* ignore */
          }
          return { ok: false, status: res.status, body: body.slice(0, 200) };
        }
        return { ok: true, status: res.status };
      } catch (err) {
        return { ok: false, message: err.message };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

module.exports = { createLlmAnomalyWebhookChannel, _payload };
