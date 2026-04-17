/**
 * smsService — stub
 *
 * No SMS provider is wired up yet. This stub keeps callers working
 * (e.g. services/hr/notificationService.js) by returning a non-throwing
 * "skipped" result. When a real provider is integrated (Unifonic, Twilio,
 * etc.), replace this module's implementation — callers don't need to change.
 */

'use strict';

const logger = require('../utils/logger');

async function sendSMS({ to, message } = {}) {
  logger.debug?.('[smsService] stub — no provider configured', { to, len: message?.length });
  return { success: false, skipped: true, reason: 'sms_provider_not_configured' };
}

module.exports = sendSMS;
