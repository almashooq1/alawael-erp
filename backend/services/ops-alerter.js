/**
 * ops-alerter.js — fans out an operational alert (backup failure, DR
 * verification failure, scheduler crash, …) to the on-call admin.
 *
 * W733 ROOT FIX — durable-first, deliver-best-effort:
 *   1. ALWAYS persist an OpsAlert row (guaranteed sink — needs no external
 *      secret; survives even when the DB-less email transport is down). This
 *      closes the silent-drop gap: on prod SMTP_USER/SMTP_PASS are unset, so the
 *      old email-only path lost every alert to a pm2 log line nobody watches.
 *   2. THEN best-effort fan-out to OPS_ALERT_EMAIL / OPS_ALERT_PHONE via the
 *      existing unifiedNotifier. Delivery outcome is written back onto the row.
 *
 * Recipients come from env (so the alerter works even if the DB is the thing
 * that failed):
 *   OPS_ALERT_EMAIL       comma-separated emails
 *   OPS_ALERT_PHONE       comma-separated phones (whatsapp/sms)
 *   OPS_ALERT_CHANNELS    optional override, default "auto"
 *
 * Errors inside the alerter NEVER throw — alerting must not mask the original
 * failure that triggered it. The DB persist is itself wrapped: if it fails, we
 * still attempt delivery and log, never throw.
 */

'use strict';

const logger = require('../utils/logger');

function splitCsv(v) {
  return (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// Map the caller's free severity onto the OpsAlert enum (low/medium/high/critical).
function normalizeSeverity(s) {
  const v = String(s || 'high').toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(v)) return v;
  if (v === 'warning' || v === 'warn') return 'medium';
  return 'high';
}

/**
 * Durably record the alert. Returns the persisted doc (or null if persistence
 * is unavailable — e.g. mongoose not connected). NEVER throws.
 */
async function persistOpsAlert({ kind, severity, subject, body, metadata }) {
  try {
    // Lazy require so a missing connection degrades gracefully (the call is
    // wrapped) and so unit tests can mock the model module. The model file
    // itself guards with `mongoose.models.OpsAlert || mongoose.model(...)`.
    const OpsAlert = require('../models/OpsAlert');
    const doc = await OpsAlert.create({
      kind,
      severity: normalizeSeverity(severity),
      subject,
      body: body || '',
      metadata: metadata || {},
      status: 'open',
      delivery: 'pending',
    });
    return doc;
  } catch (err) {
    logger.error('[ops-alerter] durable persist failed (swallowed)', {
      kind,
      subject,
      error: err.message,
    });
    return null;
  }
}

async function sendOpsAlert({ kind, severity = 'high', subject, body, metadata }) {
  // 1) Durable sink FIRST — the alert is now captured no matter what follows.
  const record = await persistOpsAlert({ kind, severity, subject, body, metadata });

  const emails = splitCsv(process.env.OPS_ALERT_EMAIL);
  const phones = splitCsv(process.env.OPS_ALERT_PHONE);
  const channelOverride = process.env.OPS_ALERT_CHANNELS;

  // Helper to stamp the delivery outcome back onto the durable row (best-effort).
  async function recordDelivery(delivery, detail) {
    if (!record) return;
    try {
      record.delivery = delivery;
      if (detail) record.deliveryDetail = String(detail).slice(0, 1000);
      await record.save();
    } catch (err) {
      logger.error('[ops-alerter] delivery-status update failed (swallowed)', {
        kind,
        error: err.message,
      });
    }
  }

  if (emails.length === 0 && phones.length === 0) {
    logger.warn(
      '[ops-alerter] no external recipients (OPS_ALERT_EMAIL / OPS_ALERT_PHONE) — alert persisted (OpsAlert) but not emailed/SMSed',
      { kind, subject, opsAlertId: record && String(record._id) }
    );
    await recordDelivery('no_recipients');
    return {
      success: false,
      reason: 'no_recipients',
      persisted: !!record,
      opsAlertId: record && String(record._id),
    };
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
  await recordDelivery(
    anySuccess ? 'delivered' : 'failed',
    anySuccess ? '' : 'all channels failed'
  );
  logger.info('[ops-alerter] dispatched', {
    kind,
    severity,
    recipients: recipients.length,
    success: anySuccess,
    persisted: !!record,
    opsAlertId: record && String(record._id),
  });
  return {
    success: anySuccess,
    results,
    persisted: !!record,
    opsAlertId: record && String(record._id),
  };
}

module.exports = { sendOpsAlert };
