/**
 * WhatsApp Appointment Reminder service — تذكيرات المواعيد عبر واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Completes the previously-DORMANT `AppointmentReminder` queue: that model has
 * carried a `channel: 'whatsapp'` enum + scheduledAt/status/attempts since it
 * was added, but nothing ever delivered the rows. This service is the missing
 * delivery — it drains pending WhatsApp reminders that are due and sends them
 * through the same hardened primitives every other WhatsApp surface uses
 * (shared guardian resolver → consent gate → whatsappService send), so it adds
 * NO new send/consent logic, only the dispatch loop + an idempotent enqueue.
 *
 * Reducing no-shows is the core operational lever for a day-rehab centre, so the
 * design is deliberately conservative: env-gated (default OFF), consent-gated,
 * idempotent (atomic attempt-claim), and bounded (per-row maxAttempts).
 *
 * @module services/whatsapp/whatsappAppointmentReminder.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { getGuardianPhone } = require('./whatsappGuardianResolver');

const ENV_FLAG = 'ENABLE_WHATSAPP_APPOINTMENT_REMINDERS';
const CHANNEL = 'whatsapp';
const MAX_ATTEMPTS = 3;
// Minutes BEFORE the appointment that each reminder type fires.
const DEFAULT_LEAD_MINUTES = { reminder_24h: 1440, reminder_2h: 120, confirmation: 0 };

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return require(`../../models/${name}`);
  }
}

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

function reminderTitle(type) {
  return type === 'confirmation' ? 'تأكيد الموعد' : 'تذكير بالموعد';
}

// Build the Arabic reminder body for a type. Pure + testable.
function reminderMessage(type, ctx = {}) {
  const name = ctx.beneficiaryName ? ` لـ${ctx.beneficiaryName}` : '';
  const when = ctx.whenLabel ? ` (${ctx.whenLabel})` : '';
  const messages = {
    reminder_24h: `تذكير: لديكم موعد${name} غداً${when}. للتأكيد ردّوا "نعم"، وللإلغاء ردّوا "إلغاء".`,
    reminder_2h: `تذكير: موعدكم${name} بعد ساعتين${when}. نراكم قريباً بإذن الله.`,
    confirmation: `تم تأكيد موعدكم${name}${when}. شكراً لكم.`,
    follow_up: `نتمنى لكم دوام الصحة${name}. لأي استفسار راسلونا هنا.`,
  };
  return (messages[type] || messages.reminder_24h).slice(0, 1024);
}

// Which requested reminder types still need a row (idempotency). Pure.
function missingTypes(requested, existingTypes) {
  const have = new Set(existingTypes || []);
  return [...new Set(requested || [])].filter(t => !have.has(t));
}

/**
 * Enqueue WhatsApp reminders for an upcoming appointment. Idempotent per
 * (appointment, channel, type) — re-enqueuing skips types already queued.
 * The caller supplies the appointment context, so this stays decoupled from the
 * (fragmented) appointment models.
 *
 * @returns {Promise<{created:number, skipped:number}>}
 */
async function enqueueReminders(input = {}, deps = {}) {
  const Reminder = deps.Reminder || getModel('AppointmentReminder');
  const {
    appointmentId,
    beneficiaryId,
    recipientPhone,
    when,
    types = ['reminder_24h', 'reminder_2h'],
    leadMinutes = DEFAULT_LEAD_MINUTES,
  } = input;

  if (!appointmentId || !mongoose.isValidObjectId(appointmentId)) {
    throw httpError('a valid appointmentId is required', 400);
  }
  const at = when ? new Date(when) : null;
  if (!at || Number.isNaN(at.getTime())) {
    throw httpError('a valid appointment time (when) is required', 400);
  }

  const existing = await Reminder.find({ appointment: appointmentId, channel: CHANNEL })
    .select('type')
    .lean();
  const toCreate = missingTypes(
    types,
    existing.map(e => e.type)
  );
  if (!toCreate.length) return { created: 0, skipped: types.length };

  const rows = toCreate.map(type => ({
    appointment: appointmentId,
    beneficiary: beneficiaryId || undefined,
    recipientPhone: recipientPhone || undefined,
    channel: CHANNEL,
    type,
    scheduledAt: new Date(at.getTime() - (leadMinutes[type] || 0) * 60000),
    status: 'pending',
  }));
  const created = await Reminder.insertMany(rows);
  return { created: created.length, skipped: types.length - toCreate.length };
}

/**
 * Deliver every WhatsApp reminder that is due (scheduledAt ≤ now) and still
 * actionable (pending, or failed under maxAttempts). Each row is atomically
 * claimed (attempt increment) so concurrent sweeps never double-send. Phone is
 * the row's recipientPhone, else resolved from the beneficiary's guardian.
 * consent-denied / no-phone → 'cancelled' (terminal, no retry); transient send
 * errors → 'failed' (retried until maxAttempts).
 *
 * @returns {Promise<{due:number, sent:number, failed:number, skipped:number}>}
 */
async function dispatchDueReminders(opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const limit = Math.min(Number(opts.limit) || 200, 500);
  const deps = opts.deps || {};
  const Reminder = deps.Reminder || getModel('AppointmentReminder');
  const Consent = deps.Consent || getModel('WhatsAppConsent');
  const whatsappService = deps.whatsappService || require('./whatsappService');
  const resolveGuardian = deps.getGuardianPhone || getGuardianPhone;
  const log = deps.logger || logger;

  const due = await Reminder.find({
    channel: CHANNEL,
    scheduledAt: { $lte: now },
    status: { $in: ['pending', 'failed'] },
    attempts: { $lt: MAX_ATTEMPTS },
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of due) {
    // Atomic claim: increment attempts only if still actionable.
    const claimed = await Reminder.findOneAndUpdate(
      { _id: row._id, status: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (!claimed) {
      skipped += 1;
      continue;
    }

    try {
      let phone = claimed.recipientPhone;
      let beneficiaryName = null;
      if (!phone && claimed.beneficiary) {
        const g = await resolveGuardian(claimed.beneficiary);
        phone = g && g.phone;
        beneficiaryName = g && g.beneficiaryName;
      }
      if (!phone) {
        await Reminder.updateOne(
          { _id: claimed._id },
          { status: 'cancelled', failureReason: 'no_phone' }
        );
        skipped += 1;
        continue;
      }

      const verdict = await Consent.canMessage(phone);
      if (!verdict || !verdict.allowed) {
        await Reminder.updateOne(
          { _id: claimed._id },
          {
            status: 'cancelled',
            failureReason: `consent:${(verdict && verdict.reason) || 'denied'}`,
          }
        );
        skipped += 1;
        continue;
      }

      const body = claimed.message || reminderMessage(claimed.type, { beneficiaryName });
      const r = await whatsappService.sendNotification(phone, reminderTitle(claimed.type), body);
      if (r && r.success) {
        await Reminder.updateOne({ _id: claimed._id }, { status: 'sent', sentAt: new Date() });
        sent += 1;
      } else {
        await Reminder.updateOne(
          { _id: claimed._id },
          { status: 'failed', failureReason: 'send_failed' }
        );
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      await Reminder.updateOne(
        { _id: claimed._id },
        { status: 'failed', failureReason: String((err && err.message) || err).slice(0, 500) }
      ).catch(() => {});
      log?.warn?.(`[wa-reminder] dispatch failed ${row._id}: ${err.message}`);
    }
  }

  return { due: due.length, sent, failed, skipped };
}

/**
 * Cancel the still-pending WhatsApp reminders for an appointment — used when the
 * appointment is cancelled (or rescheduled) so the sweeper never sends "your
 * appointment is tomorrow" for an appointment that won't happen. Only 'pending'
 * rows are touched; already sent/failed/cancelled rows are left as-is.
 * @returns {Promise<{cancelled:number}>}
 */
async function cancelRemindersForAppointment(appointmentId, deps = {}) {
  if (!appointmentId || !mongoose.isValidObjectId(appointmentId)) return { cancelled: 0 };
  const Reminder = deps.Reminder || getModel('AppointmentReminder');
  const res = await Reminder.updateMany(
    { appointment: appointmentId, channel: CHANNEL, status: 'pending' },
    { $set: { status: 'cancelled', failureReason: 'appointment_cancelled' } }
  );
  return { cancelled: (res && (res.modifiedCount ?? res.nModified)) || 0 };
}

async function getReminderStats(opts = {}) {
  const Reminder = (opts.deps && opts.deps.Reminder) || getModel('AppointmentReminder');
  const rows = await Reminder.aggregate([
    { $match: { channel: CHANNEL } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const stats = { pending: 0, sent: 0, delivered: 0, failed: 0, cancelled: 0 };
  for (const r of rows) if (r && r._id in stats) stats[r._id] = r.count;
  return stats;
}

module.exports = {
  enqueueReminders,
  cancelRemindersForAppointment,
  dispatchDueReminders,
  getReminderStats,
  // Pure helpers exported for the drift guard.
  reminderMessage,
  reminderTitle,
  missingTypes,
  ENV_FLAG,
  CHANNEL,
  MAX_ATTEMPTS,
  DEFAULT_LEAD_MINUTES,
};
