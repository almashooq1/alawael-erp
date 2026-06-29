/**
 * WhatsApp waitlist auto-notify subscriber (W1539) — closes the M-series gap
 * ═══════════════════════════════════════════════════════════════════════════
 * When an appointment is CANCELLED a slot frees up. This subscriber finds the
 * highest-priority waiting beneficiary for the SAME branch + service and sends
 * their guardian a WhatsApp "a slot opened" note — turning every cancellation
 * into a fill-rate opportunity instead of an idle slot.
 *
 * Producer side already live: `Appointment.post('save')` publishes
 * `appointments.appointment.cancelled` (W970) on the integration bus. This adds
 * a SECOND, independent subscriber on that event (the W1527 enqueue subscriber
 * is the first — the bus dispatches to all handlers for a pattern).
 *
 * Canonical waitlist model: `models/scheduling/WaitlistEntry.js` (registered as
 * `SchedulingWaitlistEntry`) — the scheduling-domain queue with branch_id +
 * service_type + priority_score, which is exactly the slot-fill queue. The two
 * sibling waitlist models (models/WaitlistEntry.js, models/Waitlist.js) are
 * different concerns and intentionally NOT touched here.
 *
 * Safety (high-stakes outbound auto-messaging → layered, mirrors W1511/W1513):
 *   - DEFAULT OFF (ENABLE_WHATSAPP_WAITLIST_NOTIFY). Inert until activated.
 *   - PRECISE match (branch_id + exact service_type): a vocabulary mismatch
 *     yields ZERO matches (no wrong-family notification) rather than a broad
 *     branch-only blast. Safe failure mode > broad reach.
 *   - Consent-gated: WhatsAppConsent.canMessage(phone) must allow.
 *   - Idempotent: only a `waiting` entry is claimed → flipped to `notified`, so
 *     a re-published cancellation never re-notifies the same person.
 *   - Auto-stubs when WhatsApp itself is disabled (no real send in non-prod).
 *   - Per-event try/catch; a handler failure never disturbs other subscribers.
 *
 * @module services/whatsapp/whatsappWaitlistNotifySubscriber
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { getGuardianPhone } = require('./whatsappGuardianResolver');

const ENV_FLAG = 'ENABLE_WHATSAPP_WAITLIST_NOTIFY';
const EVENT = 'appointments.appointment.cancelled';

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

/**
 * Build the Arabic "a slot opened" message. Pure + testable. Service label is
 * included only when known. Capped at the WhatsApp text ceiling.
 */
function waitlistMessage(ctx = {}) {
  const name = ctx.beneficiaryName ? ` لـ${ctx.beneficiaryName}` : '';
  const svc = ctx.serviceType ? ` (${ctx.serviceType})` : '';
  return `بشرى${name}: توفّر موعد${svc} في مركزنا. للحجز يُرجى التواصل معنا في أقرب وقت — قد يُعرض الموعد على غيركم إن تأخّر الرد.`.slice(
    0,
    1024
  );
}

/**
 * Core handler: cancelled appointment → match top waiting entry → consent → send
 * → claim. Deps injected so the full loop is unit + integration testable without
 * DB/network. Returns a discriminated result for assertions + logging.
 * @returns {Promise<{notified:boolean, reason:string, entryId?:string}>}
 */
async function handleAppointmentCancelled(payload, deps = {}) {
  if (!payload || !payload.appointmentId) return { notified: false, reason: 'no_appointment' };

  const Appointment = deps.Appointment || getModel('Appointment');
  const Waitlist = deps.Waitlist || getModel('SchedulingWaitlistEntry');
  if (!Appointment || !Waitlist) return { notified: false, reason: 'model_unavailable' };

  const whatsappService = deps.whatsappService || require('./whatsappService');
  const Consent =
    deps.Consent || getModel('WhatsAppConsent') || require('../../models/WhatsAppConsent');
  const resolver = deps.getGuardianPhone || getGuardianPhone;

  // Load the cancelled appointment to know which (branch, service) slot freed.
  const appt = await Appointment.findById(payload.appointmentId).lean();
  if (!appt || !appt.branchId) return { notified: false, reason: 'no_branch' };
  const serviceType = appt.type || null;

  // Highest-priority waiting entry for the SAME branch + service (exact, safe).
  const query = {
    branch_id: appt.branchId,
    status: 'waiting',
    deleted_at: null,
    ...(serviceType ? { service_type: serviceType } : {}),
  };
  const entry = await Waitlist.findOne(query).sort({ priority_score: -1, registration_date: 1 });
  if (!entry) return { notified: false, reason: 'no_waiting_entry' };

  const resolved = await resolver(String(entry.beneficiary_id));
  if (!resolved || !resolved.phone) return { notified: false, reason: 'no_guardian_phone' };

  const verdict = await Consent.canMessage(resolved.phone);
  if (!verdict || !verdict.allowed) {
    return { notified: false, reason: `consent:${(verdict && verdict.reason) || 'denied'}` };
  }

  const body = waitlistMessage({ beneficiaryName: resolved.beneficiaryName || '', serviceType });
  const r = await whatsappService.sendNotification(resolved.phone, 'توفّر موعد', body);
  if (!(r && r.success)) return { notified: false, reason: 'send_failed' };

  // Idempotent claim: only flip if still 'waiting' (guards against re-publish /
  // a concurrent handler having already notified this entry).
  await Waitlist.updateOne(
    { _id: entry._id, status: 'waiting' },
    { $set: { status: 'notified', notified_at: new Date() } }
  );

  return { notified: true, reason: r.stub ? 'stub' : 'sent', entryId: String(entry._id) };
}

/**
 * Register the subscriber on the bus. Env-gated; returns the unsubscribe fn or
 * null when disabled / no bus.
 */
function wireWhatsappWaitlistNotify(bus, deps = {}) {
  const log = deps.logger || logger;
  if (process.env[ENV_FLAG] !== 'true') {
    log?.info?.(`[whatsapp-waitlist-notify] disabled (set ${ENV_FLAG}=true to enable)`);
    return null;
  }
  if (!bus || typeof bus.subscribe !== 'function') return null;

  const handlerDeps = {
    log,
    ...(deps.whatsappService ? { whatsappService: deps.whatsappService } : {}),
    ...(deps.Consent ? { Consent: deps.Consent } : {}),
    ...(deps.Appointment ? { Appointment: deps.Appointment } : {}),
    ...(deps.Waitlist ? { Waitlist: deps.Waitlist } : {}),
    ...(deps.getGuardianPhone ? { getGuardianPhone: deps.getGuardianPhone } : {}),
  };

  const unsubscribe = bus.subscribe(EVENT, async envelope => {
    try {
      const payload = (envelope && envelope.payload) || envelope || {};
      const r = await handleAppointmentCancelled(payload, handlerDeps);
      if (r.notified) {
        log?.info?.(`[whatsapp-waitlist-notify] notified waitlist entry=${r.entryId}`);
      }
    } catch (err) {
      log?.warn?.('[whatsapp-waitlist-notify] handler failed', { error: err.message });
    }
  });
  log?.info?.(`[whatsapp-waitlist-notify] subscriber wired on ${EVENT}`);
  return unsubscribe;
}

module.exports = {
  wireWhatsappWaitlistNotify,
  handleAppointmentCancelled,
  waitlistMessage,
  getGuardianPhone,
  ENV_FLAG,
  EVENT,
};
