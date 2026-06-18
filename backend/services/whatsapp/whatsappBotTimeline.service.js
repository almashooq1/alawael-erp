'use strict';

/**
 * whatsappBotTimeline.service.js — W1408 (WhatsApp bot → unified-core linkage).
 *
 * Links the menu-bot's meaningful, beneficiary-attributable events into the
 * unified beneficiary CareTimeline (the platform's "core nervous system"), so a
 * WhatsApp complaint / emergency report / satisfaction / callback request shows
 * up on the beneficiary's longitudinal timeline alongside clinical + admin
 * events.
 *
 * MECHANISM — deliberately a DIRECT `timelineService.addEvent(...)` call from
 * the dispatcher, NOT a model post-save hook or bus subscriber. The codebase's
 * core-linkage history (see memory: W933 / core-linkage-silent-failures) shows
 * post-save hooks added after `mongoose.model()` compile + bus subscribers that
 * never persist are a recurring "runtime-dead" trap. A direct service call is
 * explicit, testable, and can't silently no-op. `addEvent` is a proven public
 * API (the timeline REST route uses it).
 *
 * NO SHARED-MODEL EDIT: maps each bot side effect to an EXISTING CareTimeline
 * `eventType` (the eventType enum is a hot, parallel-owned file — we avoid
 * touching it). The bot origin + specifics live in `title_ar` + `metadata`.
 *
 * SCOPE: only fires when the inbound phone resolves to an AUTHORIZED-guardian
 * beneficiary (reuses whatsappBotRecords.resolveGuardian) — so timeline rows are
 * correctly attributed + branch-scoped, never written for an unlinked phone.
 * Registration (no beneficiary yet) and read-only lookups are deliberately not
 * timelined. Defensive throughout — a failure never blocks the bot reply.
 *
 * @module services/whatsapp/whatsappBotTimeline.service
 */

const logger = require('../../utils/logger');
const reg = require('../../intelligence/whatsapp-bot-flow.registry');

// side-effect kind → CareTimeline event descriptor (existing eventTypes only).
// kinds NOT listed (registration / lookups / none) are not timelined.
const TIMELINE_MAP = Object.freeze({
  [reg.SIDE_EFFECT.CREATE_COMPLAINT]: {
    eventType: 'note_added',
    category: 'communication',
    severity: 'warning',
    title_ar: 'شكوى عبر بوت واتساب',
    title: 'Complaint via WhatsApp bot',
  },
  [reg.SIDE_EFFECT.EMERGENCY_ESCALATION]: {
    eventType: 'red_flag_raised',
    category: 'clinical',
    severity: 'critical',
    title_ar: 'بلاغ عاجل عبر بوت واتساب',
    title: 'Urgent report via WhatsApp bot',
  },
  [reg.SIDE_EFFECT.CALLBACK_REQUEST]: {
    eventType: 'family_contact',
    category: 'communication',
    severity: 'info',
    title_ar: 'طلب تواصل بشري عبر بوت واتساب',
    title: 'Human callback requested via WhatsApp bot',
  },
  [reg.SIDE_EFFECT.SUBMIT_SATISFACTION]: {
    eventType: 'nps_response_recorded',
    category: 'communication',
    severity: 'info',
    title_ar: 'تقييم رضا عبر بوت واتساب',
    title: 'Satisfaction rating via WhatsApp bot',
  },
  [reg.SIDE_EFFECT.CREATE_APPOINTMENT_REQUEST]: {
    eventType: 'note_added',
    category: 'administrative',
    severity: 'info',
    title_ar: 'طلب موعد عبر بوت واتساب',
    title: 'Appointment request via WhatsApp bot',
  },
});

/** PURE: map a side effect to its timeline descriptor, or null if not timelined. */
function timelineEventFor(sideEffect) {
  if (!sideEffect || !sideEffect.kind) return null;
  return TIMELINE_MAP[sideEffect.kind] || null;
}

function getTimelineService() {
  try {
    return require('../../domains/timeline/services/TimelineService').timelineService;
  } catch (err) {
    logger.warn(`[WhatsApp BotTimeline] timelineService unavailable: ${err.message}`);
    return null;
  }
}

/**
 * Record a bot side effect on the beneficiary's CareTimeline — only when the
 * phone resolves to an authorized-guardian beneficiary. Returns
 * `{ ok:true, eventId }` / `{ ok:false, reason }`. Never throws.
 *
 * @param {{kind:string, collected:object}} sideEffect
 * @param {string} phone - inbound WhatsApp phone
 * @param {string} [senderName]
 */
async function recordBotTimelineEvent(sideEffect, phone, senderName) {
  const desc = timelineEventFor(sideEffect);
  if (!desc) return { ok: false, reason: 'not_timelined' };

  let guardian;
  try {
    guardian = await require('./whatsappBotRecords.service').resolveGuardian(phone);
  } catch (err) {
    logger.warn(`[WhatsApp BotTimeline] resolve failed: ${err.message}`);
    return { ok: false, reason: 'resolve_error' };
  }
  if (!guardian || !guardian.beneficiaryId) return { ok: false, reason: 'no_beneficiary' };

  const timelineService = getTimelineService();
  if (!timelineService) return { ok: false, reason: 'service_unavailable' };

  try {
    const event = await timelineService.addEvent({
      beneficiaryId: guardian.beneficiaryId,
      eventType: desc.eventType,
      category: desc.category,
      severity: desc.severity,
      title: desc.title,
      title_ar: desc.title_ar,
      performedByName: senderName || undefined,
      occurredAt: new Date(),
      metadata: { source: 'whatsapp_bot', sideEffectKind: sideEffect.kind, phone },
      ...(guardian.branchId ? { branchId: guardian.branchId } : {}),
    });
    return { ok: true, eventId: event && String(event._id) };
  } catch (err) {
    logger.warn(`[WhatsApp BotTimeline] addEvent failed (${sideEffect.kind}): ${err.message}`);
    return { ok: false, reason: 'add_error' };
  }
}

module.exports = {
  TIMELINE_MAP,
  timelineEventFor,
  recordBotTimelineEvent,
};
