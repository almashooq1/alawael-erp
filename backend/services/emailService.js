/**
 * services/emailService.js — unified email entry point.
 *
 * Exports a callable `sendEmail(mailOptions)` (used by
 * services/hr/notificationService.js and similar callers) and also
 * re-exposes the specialized helpers from utils/emailService for
 * communication workflows.
 */

'use strict';

const utilsEmail = require('../utils/emailService');
const logger = require('../utils/logger');

async function sendEmail({ to, subject, body, html, text, ...rest } = {}) {
  try {
    const transporter = utilsEmail.setupEmailTransporter();
    if (!transporter) {
      logger.debug?.('[emailService] transporter not configured — skipping', { to });
      return { success: false, skipped: true, reason: 'transporter_not_configured' };
    }
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@alawael.sa',
      to,
      subject,
      text: text || body,
      html: html || body,
      ...rest,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.warn?.('[emailService] send failed', { to, error: err.message });
    return { success: false, error: err.message };
  }
}

// Callable module + named helpers
Object.assign(sendEmail, {
  sendEmail,
  setupEmailTransporter: utilsEmail.setupEmailTransporter,
  sendNewCommunicationEmail: utilsEmail.sendNewCommunicationEmail,
  sendApprovalRequestEmail: utilsEmail.sendApprovalRequestEmail,
  sendStatusChangeEmail: utilsEmail.sendStatusChangeEmail,
});

module.exports = sendEmail;
