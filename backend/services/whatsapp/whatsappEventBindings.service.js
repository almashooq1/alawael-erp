/**
 * WhatsApp Event Bindings — ربط أحداث النواة بقوالب واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Scope #5 (W727): the declarative link between CORE domain events and the
 * pre-approved WhatsApp templates in `whatsappTemplates.service.js`.
 *
 * The template library (W- earlier) already knows HOW to render each message.
 * This module answers WHICH template fires for WHICH core event, and HOW to
 * map the event payload into that template's typed arguments — so a single
 * `dispatchForEvent(eventType, ctx)` call turns a domain event into a
 * delivered WhatsApp message.
 *
 * Design:
 *   • Pure registry (`EVENT_BINDINGS`) — eventType → { templateKey, map(ctx) }.
 *   • `map(ctx)` returns the *named-args object* the template's send-helper
 *     expects (NOT positional) — keeps the binding readable + drift-testable.
 *   • `dispatchForEvent` is consent- and enablement-aware: it refuses to send
 *     when WhatsApp is disabled, the recipient has no phone, or the recipient
 *     has not opted in (`ctx.recipient.whatsappOptIn === false`).
 *   • No coupling to the integration bus here — callers (domain services,
 *     schedulers, or a thin bus subscriber) invoke `dispatchForEvent`. This
 *     keeps the live event bus wiring a deliberate, env-gated opt-in rather
 *     than an implicit side effect of every event.
 *
 * @module services/whatsapp/whatsappEventBindings.service
 */

'use strict';

const logger = require('../../utils/logger');
const templates = require('./whatsappTemplates.service');
const whatsappService = require('./whatsappService');

// ─── Event → Template binding registry ──────────────────────────────────────
// Each binding maps a canonical core event to exactly one template, plus a
// pure `map(ctx)` that projects the event context onto the template's
// named-args object. `senderFn` is the template send-helper name (must exist
// on whatsappTemplates.service). `consentRequired` gates non-transactional
// (marketing-ish) messages behind explicit opt-in.
const EVENT_BINDINGS = Object.freeze({
  // Upcoming-session reminder (fired by the session reminder scheduler).
  'session.reminder': Object.freeze({
    templateKey: 'session_reminder',
    senderFn: 'sendSessionReminder',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      sessionDate: ctx.sessionDate,
      sessionTime: ctx.sessionTime,
      therapistName: ctx.therapistName,
    }),
  }),

  // A newly booked / confirmed appointment.
  'appointment.confirmed': Object.freeze({
    templateKey: 'appointment_confirm',
    senderFn: 'sendAppointmentConfirmation',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      date: ctx.date,
      time: ctx.time,
      location: ctx.location,
    }),
  }),

  // A cancelled / rescheduled session.
  'session.cancelled': Object.freeze({
    templateKey: 'session_cancel',
    senderFn: 'sendSessionCancellation',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      originalDate: ctx.originalDate,
      reason: ctx.reason,
      rescheduleDate: ctx.rescheduleDate,
    }),
  }),

  // Weekly progress report ready for the family.
  'report.ready': Object.freeze({
    templateKey: 'progress_report',
    senderFn: 'sendProgressReport',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      weekLabel: ctx.weekLabel,
      achievedGoals: ctx.achievedGoals,
      progressPercent: ctx.progressPercent,
      reportUrl: ctx.reportUrl,
    }),
  }),

  // A home programme / homework assignment was sent to the family.
  'homework.assigned': Object.freeze({
    templateKey: 'homework_assignment',
    senderFn: 'sendHomeworkAssignment',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      homeworkTitle: ctx.homeworkTitle,
      dueDate: ctx.dueDate,
      instructions: ctx.instructions,
    }),
  }),

  // A new invoice was raised (canonical `invoice.created`).
  'invoice.created': Object.freeze({
    templateKey: 'payment_due',
    senderFn: 'sendPaymentReminder',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      amount: ctx.amount,
      dueDate: ctx.dueDate,
      invoiceNumber: ctx.invoiceNumber,
    }),
  }),

  // A payment is due (scheduler-driven reminder, same template as above).
  'payment.due': Object.freeze({
    templateKey: 'payment_due',
    senderFn: 'sendPaymentReminder',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      amount: ctx.amount,
      dueDate: ctx.dueDate,
      invoiceNumber: ctx.invoiceNumber,
    }),
  }),

  // A new beneficiary was registered → welcome the family.
  'beneficiary.registered': Object.freeze({
    templateKey: 'welcome_new',
    senderFn: 'sendWelcomeMessage',
    consentRequired: false,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      centerName: ctx.centerName,
      portalUrl: ctx.portalUrl,
    }),
  }),

  // A family-satisfaction survey was requested (consent-gated — engagement).
  'survey.requested': Object.freeze({
    templateKey: 'satisfaction_survey',
    senderFn: 'sendSatisfactionSurvey',
    consentRequired: true,
    map: ctx => ({
      guardianName: ctx.guardianName,
      beneficiaryName: ctx.beneficiaryName,
      surveyUrl: ctx.surveyUrl,
    }),
  }),
});

// ─── Introspection ──────────────────────────────────────────────────────────

/** List every bound event → template pairing (for admin UI / docs). */
function listBindings() {
  return Object.entries(EVENT_BINDINGS).map(([eventType, b]) => ({
    eventType,
    templateKey: b.templateKey,
    templateName: templates.TEMPLATES[b.templateKey]?.name || null,
    consentRequired: b.consentRequired,
  }));
}

/** Whether a given core event has a WhatsApp template bound. */
function hasBinding(eventType) {
  return Object.prototype.hasOwnProperty.call(EVENT_BINDINGS, eventType);
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Resolve the template bound to `eventType` and deliver it via WhatsApp.
 *
 * @param {string} eventType  canonical core event name (key of EVENT_BINDINGS)
 * @param {object} ctx        event context. `ctx.recipient` carries delivery
 *   metadata: { phone, whatsappOptIn }. All other fields feed the template map.
 * @returns {Promise<{ delivered:boolean, reason?:string, result?:any }>}
 */
async function dispatchForEvent(eventType, ctx = {}) {
  const binding = EVENT_BINDINGS[eventType];
  if (!binding) {
    return { delivered: false, reason: 'no_binding' };
  }

  if (!whatsappService.isEnabled || !whatsappService.isEnabled()) {
    return { delivered: false, reason: 'whatsapp_disabled' };
  }

  const recipient = ctx.recipient || {};
  const phone = recipient.phone || ctx.phone;
  if (!phone) {
    return { delivered: false, reason: 'no_phone' };
  }

  // Consent gate: non-transactional templates require explicit opt-in.
  // Transactional templates only refuse on an EXPLICIT opt-out.
  if (binding.consentRequired && recipient.whatsappOptIn !== true) {
    return { delivered: false, reason: 'consent_required' };
  }
  if (recipient.whatsappOptIn === false) {
    return { delivered: false, reason: 'opted_out' };
  }

  const sender = templates[binding.senderFn];
  if (typeof sender !== 'function') {
    return { delivered: false, reason: 'sender_unavailable' };
  }

  try {
    const args = binding.map(ctx);
    const result = await sender(phone, args);
    logger.info(`[WhatsApp Events] dispatched ${eventType} → ${binding.templateKey}`);
    return { delivered: true, result };
  } catch (err) {
    logger.error(`[WhatsApp Events] dispatch ${eventType} failed: ${err.message}`);
    return { delivered: false, reason: 'send_failed', error: err.message };
  }
}

module.exports = {
  EVENT_BINDINGS,
  listBindings,
  hasBinding,
  dispatchForEvent,
};
