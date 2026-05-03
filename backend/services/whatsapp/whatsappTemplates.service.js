/**
 * WhatsApp Templates Service — خدمة قوالب واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Manages pre-approved WhatsApp Business message templates.
 * Provides a typed library of rehabilitation-domain templates.
 *
 * Template categories:
 *   - session_reminder     : تذكير بموعد الجلسة
 *   - progress_report      : تقرير التقدم الأسبوعي
 *   - homework_assignment  : إرسال واجب منزلي
 *   - appointment_confirm  : تأكيد موعد جديد
 *   - session_cancel       : إلغاء/تأجيل جلسة
 *   - payment_due          : إشعار استحقاق دفعة
 *   - satisfaction_survey  : استطلاع رضا الأسرة
 *   - welcome_new          : ترحيب بمستفيد جديد
 *
 * @module services/whatsapp/whatsappTemplates.service
 */

'use strict';

const logger = require('../../utils/logger');
const whatsappService = require('./whatsappService');

// ─── Template Definitions ──────────────────────────────────────────────────
// These match templates that must be pre-approved in Meta Business Manager.
// The `name` field must exactly match the approved template name.
const TEMPLATES = {
  session_reminder: {
    name: 'rehab_session_reminder',
    language: 'ar',
    description: 'تذكير بموعد الجلسة القادمة',
    /**
     * @param {string} guardianName
     * @param {string} beneficiaryName
     * @param {string} sessionDate - e.g. "الاثنين 5 مايو"
     * @param {string} sessionTime - e.g. "10:00 صباحاً"
     * @param {string} therapistName
     */
    build(guardianName, beneficiaryName, sessionDate, sessionTime, therapistName) {
      return [
        {
          type: 'header',
          parameters: [{ type: 'text', text: guardianName }],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: beneficiaryName },
            { type: 'text', text: sessionDate },
            { type: 'text', text: sessionTime },
            { type: 'text', text: therapistName },
          ],
        },
      ];
    },
  },

  progress_report: {
    name: 'rehab_weekly_progress',
    language: 'ar',
    description: 'تقرير التقدم الأسبوعي',
    /**
     * @param {string} guardianName
     * @param {string} beneficiaryName
     * @param {string} weekLabel - e.g. "الأسبوع الثالث من مايو"
     * @param {string} achievedGoals - e.g. "3 من 5"
     * @param {string} progressPercent - e.g. "75%"
     * @param {string} reportUrl
     */
    build(guardianName, beneficiaryName, weekLabel, achievedGoals, progressPercent, reportUrl) {
      return [
        {
          type: 'header',
          parameters: [{ type: 'text', text: beneficiaryName }],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: weekLabel },
            { type: 'text', text: achievedGoals },
            { type: 'text', text: progressPercent },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: reportUrl }],
        },
      ];
    },
  },

  homework_assignment: {
    name: 'rehab_homework_assigned',
    language: 'ar',
    description: 'إرسال واجب منزلي جديد',
    /**
     * @param {string} guardianName
     * @param {string} beneficiaryName
     * @param {string} homeworkTitle
     * @param {string} dueDate
     * @param {string} instructions
     */
    build(guardianName, beneficiaryName, homeworkTitle, dueDate, instructions) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: beneficiaryName },
            { type: 'text', text: homeworkTitle },
            { type: 'text', text: dueDate },
            { type: 'text', text: instructions },
          ],
        },
      ];
    },
  },

  appointment_confirm: {
    name: 'rehab_appt_confirmed',
    language: 'ar',
    description: 'تأكيد موعد جلسة جديدة',
    build(guardianName, beneficiaryName, date, time, location) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: beneficiaryName },
            { type: 'text', text: date },
            { type: 'text', text: time },
            { type: 'text', text: location || 'المركز الرئيسي' },
          ],
        },
      ];
    },
  },

  session_cancel: {
    name: 'rehab_session_cancelled',
    language: 'ar',
    description: 'إلغاء أو تأجيل جلسة',
    build(guardianName, beneficiaryName, originalDate, reason, rescheduleDate) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: beneficiaryName },
            { type: 'text', text: originalDate },
            { type: 'text', text: reason || 'ظروف طارئة' },
            { type: 'text', text: rescheduleDate || 'سيتم التواصل لتحديد موعد بديل' },
          ],
        },
      ];
    },
  },

  payment_due: {
    name: 'rehab_payment_reminder',
    language: 'ar',
    description: 'إشعار استحقاق دفعة',
    build(guardianName, amount, dueDate, invoiceNumber) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: String(amount) },
            { type: 'text', text: dueDate },
            { type: 'text', text: invoiceNumber },
          ],
        },
      ];
    },
  },

  satisfaction_survey: {
    name: 'rehab_satisfaction_survey',
    language: 'ar',
    description: 'استطلاع رضا الأسرة',
    build(guardianName, beneficiaryName, surveyUrl) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: beneficiaryName },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: surveyUrl }],
        },
      ];
    },
  },

  welcome_new: {
    name: 'rehab_welcome_beneficiary',
    language: 'ar',
    description: 'رسالة ترحيب بمستفيد جديد',
    build(guardianName, beneficiaryName, centerName, portalUrl) {
      return [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: guardianName },
            { type: 'text', text: beneficiaryName },
            { type: 'text', text: centerName || 'مركز التأهيل' },
            { type: 'text', text: portalUrl || '' },
          ],
        },
      ];
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Send Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a typed template message to a phone number.
 * @param {string} templateKey - key in TEMPLATES object
 * @param {string} phone - recipient phone
 * @param {Array} buildArgs - arguments passed to template.build()
 */
async function sendTemplate(templateKey, phone, buildArgs = []) {
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown template: ${templateKey}`);

  const components = template.build(...buildArgs);
  logger.info(`[WhatsApp Templates] Sending ${templateKey} → ${phone}`);
  return whatsappService.sendTemplate(phone, template.name, template.language, components);
}

/** Send session reminder */
async function sendSessionReminder(
  phone,
  { guardianName, beneficiaryName, sessionDate, sessionTime, therapistName }
) {
  return sendTemplate('session_reminder', phone, [
    guardianName,
    beneficiaryName,
    sessionDate,
    sessionTime,
    therapistName,
  ]);
}

/** Send weekly progress report notification */
async function sendProgressReport(
  phone,
  { guardianName, beneficiaryName, weekLabel, achievedGoals, progressPercent, reportUrl }
) {
  return sendTemplate('progress_report', phone, [
    guardianName,
    beneficiaryName,
    weekLabel,
    achievedGoals,
    progressPercent,
    reportUrl || '',
  ]);
}

/** Send homework assignment */
async function sendHomeworkAssignment(
  phone,
  { guardianName, beneficiaryName, homeworkTitle, dueDate, instructions }
) {
  return sendTemplate('homework_assignment', phone, [
    guardianName,
    beneficiaryName,
    homeworkTitle,
    dueDate,
    instructions,
  ]);
}

/** Send appointment confirmation */
async function sendAppointmentConfirmation(
  phone,
  { guardianName, beneficiaryName, date, time, location }
) {
  return sendTemplate('appointment_confirm', phone, [
    guardianName,
    beneficiaryName,
    date,
    time,
    location,
  ]);
}

/** Send session cancellation */
async function sendSessionCancellation(
  phone,
  { guardianName, beneficiaryName, originalDate, reason, rescheduleDate }
) {
  return sendTemplate('session_cancel', phone, [
    guardianName,
    beneficiaryName,
    originalDate,
    reason,
    rescheduleDate,
  ]);
}

/** Send payment reminder */
async function sendPaymentReminder(phone, { guardianName, amount, dueDate, invoiceNumber }) {
  return sendTemplate('payment_due', phone, [guardianName, amount, dueDate, invoiceNumber]);
}

/** Send satisfaction survey */
async function sendSatisfactionSurvey(phone, { guardianName, beneficiaryName, surveyUrl }) {
  return sendTemplate('satisfaction_survey', phone, [guardianName, beneficiaryName, surveyUrl]);
}

/** Send welcome message to new family */
async function sendWelcomeMessage(phone, { guardianName, beneficiaryName, centerName, portalUrl }) {
  return sendTemplate('welcome_new', phone, [guardianName, beneficiaryName, centerName, portalUrl]);
}

/** Get all template definitions (for admin UI) */
function listTemplates() {
  return Object.entries(TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
    language: t.language,
    description: t.description,
  }));
}

module.exports = {
  sendTemplate,
  sendSessionReminder,
  sendProgressReport,
  sendHomeworkAssignment,
  sendAppointmentConfirmation,
  sendSessionCancellation,
  sendPaymentReminder,
  sendSatisfactionSurvey,
  sendWelcomeMessage,
  listTemplates,
  TEMPLATES,
};
