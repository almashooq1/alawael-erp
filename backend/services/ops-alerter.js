/**
 * ops-alerter.js — thin wrapper that fans out an operational alert
 * (backup failure, DR verification failure, scheduler crash, …) to
 * the on-call admin via the existing unifiedNotifier.
 *
 * Recipients come from env, so the alerter works even if the DB is
 * the thing that failed:
 *   OPS_ALERT_EMAIL       comma-separated emails
 *   OPS_ALERT_PHONE       comma-separated phones (whatsapp/sms)
 *   OPS_ALERT_CHANNELS    optional override, default "auto"
 *
 * If no recipients are configured the call is a no-op (logged at warn).
 * Errors inside the alerter NEVER throw — alerting must not mask the
 * original failure that triggered it.
 */

'use strict';

const logger = require('../utils/logger');

function splitCsv(v) {
  return (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

async function sendOpsAlert({ kind, severity = 'high', subject, body, metadata }) {
  const emails = splitCsv(process.env.OPS_ALERT_EMAIL);
  const phones = splitCsv(process.env.OPS_ALERT_PHONE);
  const channelOverride = process.env.OPS_ALERT_CHANNELS;

  if (emails.length === 0 && phones.length === 0) {
    logger.warn(
      '[ops-alerter] no recipients configured (OPS_ALERT_EMAIL / OPS_ALERT_PHONE) — alert dropped',
      {
        kind,
        subject,
      }
    );
    return { success: false, reason: 'no_recipients' };
  }

  const fullSubject = `[${severity.toUpperCase()}][${kind}] ${subject}`;
  const recipients = [...phones.map(p => ({ phone: p })), ...emails.map(e => ({ email: e }))];

  const results = [];
  for (const to of recipients) {
    try {
      const { notify } = require('./unifiedNotifier');
      const r = await notify({
        to,
        channels: channelOverride || 'auto',
        subject: fullSubject,
        body,
        priority: severity === 'critical' ? 'urgent' : 'high',
        templateKey: `ops_alert.${kind}`,
        metadata: { ...metadata, kind, severity },
      });
      results.push({ to, ...r });
    } catch (err) {
      logger.error('[ops-alerter] dispatch error (swallowed)', {
        kind,
        to,
        error: err.message,
      });
      results.push({ to, success: false, error: err.message });
    }
  }

  const anySuccess = results.some(r => r.success);
  logger.info('[ops-alerter] dispatched', {
    kind,
    severity,
    recipients: recipients.length,
    success: anySuccess,
  });
  return { success: anySuccess, results };
}

module.exports = { sendOpsAlert };
