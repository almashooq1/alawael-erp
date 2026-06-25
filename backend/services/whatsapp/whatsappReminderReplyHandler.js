/**
 * WhatsApp Reminder Reply handler (W1536) — الردّ على تذكير الموعد
 * ═══════════════════════════════════════════════════════════════════════════
 * Makes the reminder loop TWO-WAY: when a family replies to an appointment
 * reminder with a confirmation ("نعم") or cancellation ("إلغاء"), update the
 * appointment accordingly and acknowledge. Closes book → remind → confirm/cancel.
 *
 * All logic lives here (pure classifier + a small, defensive orchestrator) so
 * the webhook only adds ONE env-gated, try/catch-wrapped call — the hot HMAC /
 * branch-isolation path is untouched. Env-gated (ENABLE_WHATSAPP_REMINDER_REPLIES,
 * default OFF). Never throws to the caller.
 *
 * @module services/whatsapp/whatsappReminderReplyHandler
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const ENV_FLAG = 'ENABLE_WHATSAPP_REMINDER_REPLIES';

// Conservative keyword lists — a reminder reply is normally a single word.
const CONFIRM_WORDS = [
  'نعم',
  'اكيد',
  'أكيد',
  'اكد',
  'أكد',
  'تاكيد',
  'تأكيد',
  'مؤكد',
  'موافق',
  'حاضر',
  'تمام',
  'اوكي',
  'أوكي',
  'ايوه',
  'أيوه',
  'yes',
  'ok',
  'okay',
  'confirm',
  'y',
];
const CANCEL_WORDS = [
  'لا',
  'الغاء',
  'إلغاء',
  'الغ',
  'إلغ',
  'اعتذر',
  'أعتذر',
  'اعتذار',
  'معذره',
  'معذرة',
  'cancel',
  'no',
  'n',
];

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// Strip everything but Arabic letters + ASCII letters (drop punctuation/emoji).
function normToken(s) {
  return String(s || '')
    .replace(/[^؀-ۿa-z]/gi, '')
    .toLowerCase();
}

/**
 * Classify a short reply as 'confirm' | 'cancel' | null. Conservative: only the
 * first token or the whole (single-word) message counts, so a long sentence that
 * merely contains "نعم" doesn't auto-confirm. Pure + testable.
 */
function classifyReply(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const first = normToken(raw.split(/\s+/)[0]);
  const whole = normToken(raw);
  const hit = list => list.includes(first) || (whole.length <= 12 && list.includes(whole));
  if (hit(CONFIRM_WORDS)) return 'confirm';
  if (hit(CANCEL_WORDS)) return 'cancel';
  return null;
}

/**
 * Find the reminder the family is most plausibly replying to: a recently
 * sent/pending WhatsApp reminder for this phone or beneficiary. Returns the
 * lean reminder (most recent by scheduledAt) or null.
 */
async function findReplyTargetReminder({ phone, beneficiaryId }, deps = {}) {
  const Reminder = deps.Reminder || getModel('AppointmentReminder');
  if (!Reminder) return null;
  const or = [];
  if (phone) or.push({ recipientPhone: phone });
  if (beneficiaryId) or.push({ beneficiary: beneficiaryId });
  if (!or.length) return null;
  const rows = await Reminder.find({
    channel: 'whatsapp',
    status: { $in: ['sent', 'pending'] },
    $or: or,
  })
    .sort({ scheduledAt: -1 })
    .limit(5)
    .lean();
  return rows[0] || null;
}

/**
 * Handle an inbound reply: confirm/cancel the linked appointment + acknowledge.
 * Deps injected for testability. Returns a result summary; never throws.
 *
 * @returns {Promise<{action:string, matched?:boolean, applied?:boolean, appointmentId?:string}>}
 */
async function handleReminderReply({ phone, text, beneficiaryId }, deps = {}) {
  const action = classifyReply(text);
  if (!action) return { action: 'none' };

  const reminder = await findReplyTargetReminder({ phone, beneficiaryId }, deps);
  if (!reminder || !reminder.appointment) return { action, matched: false };

  const Appointment = deps.Appointment || getModel('Appointment');
  if (!Appointment) return { action, matched: false };
  const appt = await Appointment.findById(reminder.appointment);
  if (!appt) return { action, matched: false };

  // Don't override a terminal state (already cancelled/done/no-show).
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status)) {
    return { action, matched: true, applied: false };
  }

  const whatsappService = deps.whatsappService || require('./whatsappService');
  const log = deps.logger || logger;

  if (action === 'confirm') {
    appt.status = 'CONFIRMED';
    await appt.save();
    await whatsappService
      .sendNotification(phone, 'تأكيد الموعد', 'شكراً لكم، تم تأكيد موعدكم. بانتظاركم.')
      .catch(() => {});
    log?.info?.(`[whatsapp-reminder-reply] confirmed appt=${appt._id}`);
    return { action, matched: true, applied: true, appointmentId: String(appt._id) };
  }

  // cancel — saving with status CANCELLED emits appointment.cancelled, which the
  // W1534 subscriber turns into cancelling this appointment's pending reminders.
  appt.status = 'CANCELLED';
  appt.cancellationReason = 'cancelled_by_family_whatsapp';
  await appt.save();
  await whatsappService
    .sendNotification(
      phone,
      'إلغاء الموعد',
      'تم إلغاء موعدكم بناءً على طلبكم. للحجز من جديد تواصلوا معنا.'
    )
    .catch(() => {});
  log?.info?.(`[whatsapp-reminder-reply] cancelled appt=${appt._id}`);
  return { action, matched: true, applied: true, appointmentId: String(appt._id) };
}

module.exports = {
  handleReminderReply,
  classifyReply,
  findReplyTargetReminder,
  ENV_FLAG,
  CONFIRM_WORDS,
  CANCEL_WORDS,
};
