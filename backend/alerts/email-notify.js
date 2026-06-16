'use strict';

/**
 * email-notify.js — severity-gated email channel for the smart-alerts
 * engine (W1244).
 *
 * The dispatcher has carried full channel/recipient plumbing since Wave 9
 * (`_notify` → recipients.resolve → channels[name].send) but app.js never
 * injected either, so the notification half of the engine was dormant —
 * alerts persisted, nobody was told. With prod SMTP activated (W1242 +
 * Hostinger creds, 2026-06-12) this wires the missing half:
 *
 *   raise (first detection only — the engine's in-memory dedup means NO
 *   re-notify on every 5-min tick) → severity ≥ minSeverity → ONE email
 *   to the ops inbox via EmailManager.sendAlert (ALERT_NOTIFICATION
 *   bilingual template, priority 10 for critical).
 *
 * Config (read by app.js, not here):
 *   ALERTS_EMAIL_ENABLED=true        master switch (default OFF)
 *   OPS_ALERT_EMAIL=<inbox>          recipient (already set on prod)
 *   ALERTS_EMAIL_MIN_SEVERITY=high   info|warning|high|critical
 *
 * Failure is best-effort by design: a send error is recorded in the tick
 * report's `errors` and never blocks alert persistence.
 */

const SEVERITY_RANK = Object.freeze({ info: 0, warning: 1, high: 2, critical: 3 });

/**
 * @param {object} opts
 * @param {string} opts.opsEmail        destination inbox (required)
 * @param {string} [opts.minSeverity]   minimum severity to email (default 'high')
 * @param {object} [opts.logger]
 * @returns {{recipients: object, channels: object}|null} null when no inbox configured
 */
function buildEmailNotify({ opsEmail, minSeverity = 'high', logger = console } = {}) {
  if (!opsEmail || typeof opsEmail !== 'string' || !opsEmail.includes('@')) {
    return null;
  }
  const min = SEVERITY_RANK[minSeverity] !== undefined ? SEVERITY_RANK[minSeverity] : 2;

  return {
    recipients: {
      async resolve(alert) {
        const rank = SEVERITY_RANK[alert && alert.severity];
        if (rank === undefined || rank < min) return [];
        return [{ id: 'ops-inbox', email: opsEmail, channels: ['email'] }];
      },
    },
    channels: {
      email: {
        async send(alert, recipients) {
          const to = recipients && recipients[0] && recipients[0].email;
          if (!to) return { success: false, error: 'NO_EMAIL' };
          try {
            // Lazy require — the email stack must never be a load-time
            // dependency of the alerts engine.
            const { emailManager } = require('../services/email');
            const res = await emailManager.sendAlert(
              {
                severity: alert.severity,
                title: alert.message,
                message: alert.description || alert.message,
                source: alert.ruleId,
                type: alert.category || 'alert',
              },
              to
            );
            return {
              success: !!(res && res.success !== false && !res.error),
              error: (res && res.error) || undefined,
            };
          } catch (err) {
            logger.warn && logger.warn(`[SmartAlerts] email notify failed: ${err.message}`);
            return { success: false, error: err.message };
          }
        },
      },
    },
  };
}

module.exports = { buildEmailNotify, SEVERITY_RANK };
