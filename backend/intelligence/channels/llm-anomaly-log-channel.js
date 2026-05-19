'use strict';

/**
 * llm-anomaly-log-channel.js — Wave 146.
 *
 * Simplest possible channel: writes a one-line summary to the
 * injected logger at warn/info level (matching severity).
 *
 * Always succeeds (the only failure mode is the logger itself
 * throwing, which is caller-isolated by the dispatcher).
 */

function createLlmAnomalyLogChannel({ logger = console, name = 'log' } = {}) {
  return {
    name,
    async deliver({ kind, anomaly }) {
      if (!anomaly) return { ok: false };
      const sev = anomaly.severity;
      const tag = kind === 'anomaly-fired' ? '🚨 FIRED  ' : '✓  RESOLVED';
      const line = `[llm-anomaly:${sev}] ${tag} ${anomaly.id} — ${anomaly.summaryAr || ''}`;

      if (kind === 'anomaly-fired') {
        if (sev === 'critical' && logger.error) logger.error(line);
        else if (logger.warn) logger.warn(line);
      } else if (logger.info) {
        logger.info(line);
      }
      return { ok: true };
    },
  };
}

module.exports = { createLlmAnomalyLogChannel };
