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

async function sendSMS(arg1, arg2) {
  // Accept both shapes: sendSMS({ to, message }) and sendSMS(to, message).
  // The latter is what `routes/parentPortal.routes.js` and other older
  // callers use — keep both working without forcing a rewrite.
  const { to, message } = typeof arg1 === 'string' ? { to: arg1, message: arg2 } : arg1 || {};
  logger.debug?.('[smsService] stub — no provider configured', { to, len: message?.length });
  return { success: false, skipped: true, reason: 'sms_provider_not_configured' };
}

// Callable as a bare function AND as `.send(...)` — both shapes are in
// use across the codebase. Attaching the method to the function object
// avoids breaking either caller pattern when a real provider lands.
sendSMS.send = sendSMS;

module.exports = sendSMS;
