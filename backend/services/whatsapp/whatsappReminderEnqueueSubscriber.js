/**
 * WhatsApp Reminder auto-enqueue subscriber (W1527)
 * ═══════════════════════════════════════════════════════════════════════════
 * Makes the W1525 reminder system self-driving: on `appointments.appointment.
 * booked` (a live producer — Appointment.post('save') publishes it), queue the
 * WhatsApp reminders for that appointment automatically. No booking-code change
 * — purely event-driven, mirroring the post-session / complaint subscribers.
 *
 * Env-gated (ENABLE_WHATSAPP_REMINDER_AUTO_ENQUEUE, default OFF) and independent
 * of the delivery flag (ENABLE_WHATSAPP_APPOINTMENT_REMINDERS): you enqueue and
 * deliver as two separately-toggleable stages. enqueueReminders is idempotent,
 * so a re-published booking event never double-queues.
 *
 * @module services/whatsapp/whatsappReminderEnqueueSubscriber
 */

'use strict';

const logger = require('../../utils/logger');

const ENV_FLAG = 'ENABLE_WHATSAPP_REMINDER_AUTO_ENQUEUE';
const EVENT = 'appointments.appointment.booked';

// Combine the event's `date` (Date) + `startTime` ("HH:MM") into the full
// appointment datetime. Returns a Date or null. Pure + testable.
function appointmentDateTime(date, startTime) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (typeof startTime === 'string' && /^\d{1,2}:\d{2}/.test(startTime)) {
    const [h, m] = startTime.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/**
 * Handle one appointment.booked event → enqueue reminders. Deps injected for
 * testability. Skips past/invalid appointments (no point reminding).
 * @returns {Promise<{enqueued:number, reason:string}>}
 */
async function handleAppointmentBooked(payload, deps = {}) {
  if (!payload || !payload.appointmentId) return { enqueued: 0, reason: 'no_appointment' };

  const when = appointmentDateTime(payload.date, payload.startTime);
  if (!when) return { enqueued: 0, reason: 'no_time' };
  const now = deps.now || Date.now();
  if (when.getTime() <= now) return { enqueued: 0, reason: 'not_future' };

  const enqueue =
    deps.enqueueReminders || require('./whatsappAppointmentReminder.service').enqueueReminders;

  // W1537: risk-aware intensity — when enabled, the no-show predictor decides the
  // reminder set (reliable family → one reminder). null → default two-touch.
  const riskTypes =
    deps.riskAwareReminderTypes ||
    require('./whatsappReminderRiskPolicy').riskAwareReminderTypes;
  const types = await riskTypes(payload.appointmentId, { logger: deps.log });

  const res = await enqueue({
    appointmentId: payload.appointmentId,
    beneficiaryId: payload.beneficiaryId,
    when,
    ...(types ? { types } : {}),
  });
  return { enqueued: (res && res.created) || 0, reason: 'ok' };
}

/**
 * Register the subscriber on the bus. Env-gated; returns the unsubscribe fn or
 * null when disabled / no bus.
 */
function wireWhatsappReminderAutoEnqueue(bus, deps = {}) {
  const log = deps.logger || logger;
  if (process.env[ENV_FLAG] !== 'true') {
    log?.info?.(`[whatsapp-reminder-enqueue] disabled (set ${ENV_FLAG}=true to enable)`);
    return null;
  }
  if (!bus || typeof bus.subscribe !== 'function') return null;

  const handlerDeps = {
    log,
    ...(deps.enqueueReminders ? { enqueueReminders: deps.enqueueReminders } : {}),
  };

  const unsubscribe = bus.subscribe(EVENT, async envelope => {
    try {
      const payload = (envelope && envelope.payload) || envelope || {};
      const r = await handleAppointmentBooked(payload, handlerDeps);
      if (r.enqueued > 0) {
        log?.info?.(
          `[whatsapp-reminder-enqueue] queued ${r.enqueued} for appt=${payload.appointmentId}`
        );
      }
    } catch (err) {
      log?.warn?.('[whatsapp-reminder-enqueue] handler failed', { error: err.message });
    }
  });
  log?.info?.(`[whatsapp-reminder-enqueue] subscriber wired on ${EVENT}`);
  return unsubscribe;
}

module.exports = {
  handleAppointmentBooked,
  wireWhatsappReminderAutoEnqueue,
  appointmentDateTime,
  ENV_FLAG,
  EVENT,
};
