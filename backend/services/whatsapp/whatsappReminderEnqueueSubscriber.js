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
const CANCEL_EVENT = 'appointments.appointment.cancelled';

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
  const res = await enqueue({
    appointmentId: payload.appointmentId,
    beneficiaryId: payload.beneficiaryId,
    when,
  });
  return { enqueued: (res && res.created) || 0, reason: 'ok' };
}

/**
 * Handle one appointment.cancelled event → cancel that appointment's still-
 * pending reminders, so the sweeper never reminds a family about an appointment
 * that won't happen. Idempotent (only 'pending' rows are touched).
 * @returns {Promise<{cancelled:number, reason:string}>}
 */
async function handleAppointmentCancelled(payload, deps = {}) {
  if (!payload || !payload.appointmentId) return { cancelled: 0, reason: 'no_appointment' };
  const cancel =
    deps.cancelRemindersForAppointment ||
    require('./whatsappAppointmentReminder.service').cancelRemindersForAppointment;
  const res = await cancel(payload.appointmentId);
  return { cancelled: (res && res.cancelled) || 0, reason: 'ok' };
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
    ...(deps.cancelRemindersForAppointment
      ? { cancelRemindersForAppointment: deps.cancelRemindersForAppointment }
      : {}),
  };

  const unsubBooked = bus.subscribe(EVENT, async envelope => {
    try {
      const payload = (envelope && envelope.payload) || envelope || {};
      const r = await handleAppointmentBooked(payload, handlerDeps);
      if (r.enqueued > 0) {
        log?.info?.(
          `[whatsapp-reminder-enqueue] queued ${r.enqueued} for appt=${payload.appointmentId}`
        );
      }
    } catch (err) {
      log?.warn?.('[whatsapp-reminder-enqueue] booked handler failed', { error: err.message });
    }
  });

  // Cancel pending reminders when the appointment is cancelled.
  const unsubCancelled = bus.subscribe(CANCEL_EVENT, async envelope => {
    try {
      const payload = (envelope && envelope.payload) || envelope || {};
      const r = await handleAppointmentCancelled(payload, handlerDeps);
      if (r.cancelled > 0) {
        log?.info?.(
          `[whatsapp-reminder-enqueue] cancelled ${r.cancelled} reminder(s) for appt=${payload.appointmentId}`
        );
      }
    } catch (err) {
      log?.warn?.('[whatsapp-reminder-enqueue] cancel handler failed', { error: err.message });
    }
  });

  log?.info?.(`[whatsapp-reminder-enqueue] subscriber wired on ${EVENT} + ${CANCEL_EVENT}`);
  return () => {
    if (unsubBooked) unsubBooked();
    if (unsubCancelled) unsubCancelled();
  };
}

module.exports = {
  handleAppointmentBooked,
  handleAppointmentCancelled,
  wireWhatsappReminderAutoEnqueue,
  appointmentDateTime,
  ENV_FLAG,
  EVENT,
  CANCEL_EVENT,
};
