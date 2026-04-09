/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Backward-Compatible Email Service Wrapper
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides backward compatibility for code that imports:
 *   - require('../services/email-integration.service')
 *   - require('../services/emailService')
 *   - require('../services/email.service')
 *   - require('../services/email-integrations.service')
 *   - require('../utils/emailService')
 *
 * Maps all old method names to the new unified EmailManager.
 *
 * Usage: Replace old imports with:
 *   const emailService = require('../services/email');
 *
 * Or keep using old paths — this wrapper handles the mapping.
 */

const { emailManager } = require('./email');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 🔄 LEGACY API ADAPTER
// ═══════════════════════════════════════════════════════════════

const legacyEmailService = {
  // ── From email-integration.service.js ──────────────────────

  /** @deprecated Use emailManager.initialize() */
  async initialize(options) {
    logger.debug('[email-compat] → initialize() → emailManager.initialize()');
    return emailManager.initialize(options);
  },

  /** @deprecated Use emailManager.send() */
  async sendEmail(options) {
    logger.debug('[email-compat] → sendEmail() → emailManager.send()');
    return emailManager.send(options);
  },

  /** @deprecated Use emailManager.sendTemplate() */
  async sendTemplateEmail(to, template, data, options) {
    logger.debug('[email-compat] → sendTemplateEmail() → emailManager.sendTemplate()');
    return emailManager.sendTemplate(to, template, data, options);
  },

  /** @deprecated Use emailManager.sendBulk() */
  async sendBulkEmails(recipients, templateOrOptions) {
    logger.debug('[email-compat] → sendBulkEmails() → emailManager.sendBulk()');
    return emailManager.sendBulk(recipients, templateOrOptions);
  },

  /** @deprecated Use emailManager.sendWelcome() */
  async sendWelcomeEmail(user) {
    return emailManager.sendWelcome(user);
  },

  /** @deprecated Use emailManager.sendPasswordReset() */
  async sendPasswordResetEmail(user, token) {
    return emailManager.sendPasswordReset(user, token);
  },

  /** @deprecated Use emailManager.sendEmailVerification() */
  async sendVerificationEmail(user, token) {
    return emailManager.sendEmailVerification(user, token);
  },

  /** @deprecated Use emailManager.sendOTP() */
  async sendOTPEmail(user, otp) {
    return emailManager.sendOTP(user, otp);
  },

  /** @deprecated Use emailManager.send2FAEnabled() */
  async send2FAEnabledEmail(email, username) {
    return emailManager.send2FAEnabled(email, username);
  },

  /** @deprecated Use emailManager.send2FADisabled() */
  async send2FADisabledEmail(email, username) {
    return emailManager.send2FADisabled(email, username);
  },

  /** @deprecated Use emailManager.sendLoginAlert() */
  async sendLoginAlertEmail(user, loginInfo) {
    return emailManager.sendLoginAlert(user, loginInfo);
  },

  /** @deprecated Use emailManager.sendAccountLocked() */
  async sendAccountLockedEmail(user, details) {
    return emailManager.sendAccountLocked(user, details);
  },

  /** @deprecated Use emailManager.sendAppointmentReminder() */
  async sendAppointmentReminderEmail(appointment) {
    return emailManager.sendAppointmentReminder(appointment);
  },

  /** @deprecated Use emailManager.sendAppointmentConfirmation() */
  async sendAppointmentConfirmationEmail(appointment) {
    return emailManager.sendAppointmentConfirmation(appointment);
  },

  /** @deprecated Use emailManager.sendSessionSummary() */
  async sendSessionSummaryEmail(session) {
    return emailManager.sendSessionSummary(session);
  },

  /** @deprecated Use emailManager.sendInvoice() */
  async sendInvoiceEmail(invoice, customer) {
    return emailManager.sendInvoice(invoice, customer);
  },

  /** @deprecated Use emailManager.sendPaymentConfirmation() */
  async sendPaymentConfirmationEmail(payment) {
    return emailManager.sendPaymentConfirmation(payment);
  },

  /** @deprecated Use emailManager.sendReport() */
  async sendReportEmail(report, email) {
    return emailManager.sendReport(report, email);
  },

  /** @deprecated Use emailManager.sendNotification() */
  async sendNotificationEmail(to, notification) {
    return emailManager.sendNotification(to, notification);
  },

  // ── From emailService.js ──────────────────────────────────

  /** @deprecated Use emailManager.send() */
  async send(opts) {
    return emailManager.send(opts);
  },

  /** @deprecated Use emailManager.verify() */
  async verifyTransport() {
    return emailManager.verify();
  },

  /** @deprecated Use emailManager.getStats() */
  async getStatus() {
    return emailManager.getStats();
  },

  // ── Utility ───────────────────────────────────────────────

  /** Get the underlying EmailManager instance */
  get manager() {
    return emailManager;
  },

  /** Get the template engine */
  get templateEngine() {
    return emailManager.templateEngine;
  },
};

module.exports = legacyEmailService;
