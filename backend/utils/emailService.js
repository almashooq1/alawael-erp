const nodemailer = require('nodemailer');
const logger = require('./logger');

// W735: cached transporter + a structured reason for diagnostics. The cache key
// is the resolved provider+creds fingerprint, so a credential change at runtime
// (e.g. after a pm2 restart that re-reads .env) rebuilds instead of serving a
// stale/null transporter forever (the old `if (transporter) return` bug).
let transporter = null;
let transporterFingerprint = null;
let lastStatus = { configured: false, provider: 'none', reason: 'not_initialized' };

/** Snapshot of why email is/ isn't configured — for ops diagnostics + self-tests. */
function emailStatus() {
  return { ...lastStatus };
}

/** Reset the cached transporter (forces re-resolution on next setup). */
function resetEmailTransporter() {
  transporter = null;
  transporterFingerprint = null;
  lastStatus = { configured: false, provider: 'none', reason: 'reset' };
}

function currentFingerprint() {
  // What inputs determine the transport — change ⇒ rebuild.
  return [
    process.env.SENDGRID_API_KEY ? 'sg:' + process.env.SENDGRID_API_KEY.slice(-6) : '',
    process.env.SMTP_HOST || '',
    process.env.SMTP_PORT || '',
    process.env.SMTP_USER || '',
    process.env.SMTP_PASS ? 'pw' : '',
  ].join('|');
}

/**
 * إعداد البريد الإلكتروني — provider-aware, secret-tolerant.
 *
 * Resolution order:
 *   1. SendGrid (SENDGRID_API_KEY) — API transport, easiest to credential.
 *   2. SMTP (SMTP_USER + SMTP_PASS) — Gmail/relay; numeric port + correct
 *      `secure` for 465.
 *   3. none → returns null with a structured reason (caller skips gracefully).
 *
 * W735 fixes: string-port → Number; secure auto-derived from port; SendGrid
 * fallback; resettable cache keyed on a creds fingerprint; no fire-and-forget
 * verify race (verify is best-effort + non-nulling — a transient verify blip no
 * longer discards a working transporter).
 */
function setupEmailTransporter() {
  const fp = currentFingerprint();
  if (transporter && transporterFingerprint === fp) return transporter;
  // inputs changed (or first call) → rebuild
  transporter = null;
  transporterFingerprint = fp;

  // 1) SendGrid API transport (preferred — single API key, no SMTP auth dance).
  if (process.env.SENDGRID_API_KEY) {
    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
      });
      lastStatus = { configured: true, provider: 'sendgrid', reason: 'ok' };
      return transporter;
    } catch (err) {
      logger.error('[emailService] SendGrid transport build failed', { error: err.message });
      // fall through to SMTP
    }
  }

  // 2) SMTP (Gmail / generic relay).
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // implicit TLS only on 465 (was hardcoded false — broke SSL)
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    lastStatus = { configured: true, provider: 'smtp', reason: 'ok' };

    // Best-effort connectivity check — log only, never null a built transporter
    // (the old code nulled it from an async callback AFTER returning it = race).
    if (typeof transporter.verify === 'function') {
      Promise.resolve()
        .then(() => transporter.verify())
        .then(() => logger.info('[emailService] SMTP transport verified'))
        .catch(err =>
          logger.warn('[emailService] SMTP verify failed (transport kept; will retry on send)', {
            error: err.message,
          })
        );
    }
    return transporter;
  }

  // 3) Nothing configured.
  lastStatus = {
    configured: false,
    provider: 'none',
    reason: 'no_credentials (set SENDGRID_API_KEY, or SMTP_USER + SMTP_PASS)',
  };
  logger.warn(
    '⚠️  Email transport not configured — set SENDGRID_API_KEY or SMTP_USER+SMTP_PASS. Email will be skipped (durably logged where applicable).'
  );
  return null;
}

/**
 * إرسال إشعار اتصال جديد
 * @param {Object} communication - بيانات الاتصال
 * @param {String} recipientEmail - بريد المستقبل
 */
async function sendNewCommunicationEmail(communication, recipientEmail) {
  const transporter = setupEmailTransporter();
  if (!transporter) {
    logger.warn('Email not configured - skipping notification');
    return null;
  }
  try {
    // W1246 — render through the W1242 template system: shared RTL layout,
    // HTML-escaped values (the legacy inline HTML injected user content RAW),
    // automatic plain-text alternative. Same signature + return semantics.
    const { renderTemplate } = require('../services/email/templateRenderer.service');
    const rendered = renderTemplate('NEW_COMMUNICATION', {
      title: communication.title,
      referenceNumber: communication.referenceNumber,
      type: communication.type,
      priority: communication.priority,
      sentDate: communication.sentDate
        ? new Date(communication.sentDate).toLocaleDateString('ar-SA')
        : null,
      senderName: communication.sender && communication.sender.name,
      senderDepartment: communication.sender && communication.sender.department,
      subjectText: communication.subject,
      viewUrl: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/communications-system/view/${communication._id}`
        : null,
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return info;
  } catch (error) {
    logger.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * إرسال إشعار موافقة
 * @param {Object} communication - بيانات الاتصال
 * @param {String} approverEmail - بريد المُوافق
 * @param {Number} stageIndex - رقم المرحلة
 */
async function sendApprovalRequestEmail(communication, approverEmail, stageIndex) {
  const transporter = setupEmailTransporter();
  if (!transporter) return null;
  try {
    const stage = communication.approvalWorkflow.stages[stageIndex];
    // W1246 — registry template (APPROVAL_REQUEST) replaces inline HTML.
    const { renderTemplate } = require('../services/email/templateRenderer.service');
    const base = process.env.FRONTEND_URL || '';
    const rendered = renderTemplate('APPROVAL_REQUEST', {
      title: communication.title,
      referenceNumber: communication.referenceNumber,
      stageName: stage.name,
      priority: communication.priority,
      subjectText: communication.subject,
      approveUrl: `${base}/communications-system/approve/${communication._id}`,
      rejectUrl: `${base}/communications-system/reject/${communication._id}`,
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: approverEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return info;
  } catch (error) {
    logger.error('❌ Error sending approval email:', error);
    throw error;
  }
}

/**
 * إرسال إشعار بتغيير الحالة
 * @param {Object} communication - بيانات الاتصال
 * @param {String} recipientEmail - بريد المستقبل
 * @param {String} oldStatus - الحالة القديمة
 * @param {String} newStatus - الحالة الجديدة
 */
async function sendStatusChangeEmail(communication, recipientEmail, oldStatus, newStatus) {
  const transporter = setupEmailTransporter();
  if (!transporter) return null;
  try {
    const statusLabels = {
      pending: 'قيد الانتظار',
      in_progress: 'قيد التنفيذ',
      under_review: 'قيد المراجعة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    // W1246 — registry template (STATUS_CHANGE) replaces inline HTML.
    const { renderTemplate } = require('../services/email/templateRenderer.service');
    const rendered = renderTemplate('STATUS_CHANGE', {
      title: communication.title,
      referenceNumber: communication.referenceNumber,
      oldStatusLabel: statusLabels[oldStatus] || oldStatus,
      newStatusLabel: statusLabels[newStatus] || newStatus,
      viewUrl: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/communications-system/view/${communication._id}`
        : null,
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    return info;
  } catch (error) {
    logger.error('❌ Error sending status email:', error);
    throw error;
  }
}

module.exports = {
  setupEmailTransporter,
  resetEmailTransporter,
  emailStatus,
  sendNewCommunicationEmail,
  sendApprovalRequestEmail,
  sendStatusChangeEmail,
};
