'use strict';

/**
 * registryBridge.js — W1270 (جسر EmailManager → سجل القوالب W1242)
 *
 * EmailManager.sendTemplate(to, KEY, data) is the single chokepoint behind
 * every convenience method (sendWelcome/sendOTP/sendAppointmentReminder/
 * sendInvoice/…). This bridge lets that chokepoint render through the
 * professional registry FIRST, with per-key ADAPTERS that translate the
 * legacy data shapes into registry variable contracts.
 *
 * SAFETY CONTRACT (refuse-to-fabricate, never block a send):
 *   tryRegistryRender returns NULL whenever
 *     • the legacy key has no mapping, or
 *     • the adapter can't satisfy the registry contract from the given data
 *       (renderer throws TEMPLATE_VARS_MISSING)
 *   — and the caller falls back to the legacy EmailTemplateEngine untouched.
 *   So adoption is incremental and a malformed payload degrades to exactly
 *   yesterday's behaviour, never to a failed send.
 */

const { renderTemplate } = require('./templateRenderer.service');

const APP_URL = () => process.env.FRONTEND_URL || 'https://alaweal.org';

const arDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('ar-SA');
};

const pick = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  return null;
};

/** legacy EmailManager key → { key: registry key, adapt(data) → vars } */
const BRIDGE = Object.freeze({
  WELCOME: {
    key: 'WELCOME_USER',
    adapt: (d) => ({
      name: pick(d.name, d.fullName, d.username, d.email),
      email: d.email,
      role: pick(d.role, d.roleLabel),
      loginUrl: `${APP_URL()}/login`,
    }),
  },
  // The OTP flow here is the password-reset flow (auth/otp-service
  // sendPasswordResetOTP) — the registry copy is reset-specific by design.
  OTP_CODE: {
    key: 'PASSWORD_RESET',
    adapt: (d) => ({
      name: pick(d.name, d.fullName, d.username, d.email, 'المستخدم'),
      otp: d.otp,
      expiryMinutes: String(pick(d.expiry, d.expiryMinutes, 5)),
    }),
  },
  APPOINTMENT_REMINDER: {
    key: 'APPOINTMENT_REMINDER',
    adapt: (d) => ({
      beneficiaryName: pick(d.beneficiaryName, d.patientName, d.beneficiary && d.beneficiary.name, d.patient && d.patient.name),
      serviceType: pick(d.serviceType, d.service, d.type),
      therapistName: pick(d.therapistName, d.therapist && d.therapist.name, d.doctorName),
      date: pick(d.dateLabel, arDate(pick(d.date, d.scheduledDate, d.appointmentDate))),
      time: pick(d.time, d.timeLabel),
      branchName: pick(d.branchName, d.branch && d.branch.name),
    }),
  },
  APPOINTMENT_CANCELLATION: {
    key: 'APPOINTMENT_CANCELLED',
    adapt: (d) => ({
      beneficiaryName: pick(d.beneficiaryName, d.patientName, d.beneficiary && d.beneficiary.name),
      serviceType: pick(d.serviceType, d.service, d.type),
      date: pick(d.dateLabel, arDate(pick(d.date, d.scheduledDate))),
      time: pick(d.time, d.timeLabel),
      reason: pick(d.reason, d.cancellationReason),
    }),
  },
  SESSION_SUMMARY: {
    key: 'SESSION_SUMMARY_GUARDIAN',
    adapt: (d) => ({
      beneficiaryName: pick(d.beneficiaryName, d.beneficiary && d.beneficiary.name),
      serviceType: pick(d.serviceType, d.type),
      therapistName: pick(d.therapistName, d.therapist && d.therapist.name),
      summary: pick(d.summary, d.notes),
      goalsWorked: pick(d.goalsWorked, Array.isArray(d.goals) ? d.goals.join(' — ') : null),
      homework: d.homework,
    }),
  },
  INVOICE: {
    key: 'INVOICE_ISSUED',
    adapt: (d) => ({
      guardianName: pick(d.customerName, d.guardianName, 'العميل'),
      beneficiaryName: pick(d.beneficiaryName, d.customerName, 'المستفيد'),
      invoiceNumber: pick(d.number, d.invoiceNumber),
      period: d.period,
      amount: pick(d.amountLabel, d.amount, d.total),
      dueDate: pick(d.dueDateLabel, arDate(d.dueDate)),
      invoiceUrl: pick(d.invoiceUrl, `${APP_URL()}/portal/invoices`),
    }),
  },
  PAYMENT_CONFIRMATION: {
    key: 'PAYMENT_RECEIPT',
    adapt: (d) => ({
      guardianName: pick(d.customerName, d.guardianName, d.name, 'العميل'),
      amount: pick(d.amountLabel, d.amount, d.total),
      receiptNumber: pick(d.receiptNumber, d.number, d.reference),
      invoiceNumber: pick(d.invoiceNumber, d.invoice && d.invoice.number),
      method: pick(d.method, d.paymentMethod),
      paidAt: pick(d.paidAtLabel, arDate(pick(d.paidAt, d.date)), arDate(Date.now())),
    }),
  },
  NEW_COMMUNICATION: {
    key: 'NEW_COMMUNICATION',
    adapt: (d) => ({
      title: d.title,
      referenceNumber: pick(d.referenceNumber, d.reference),
      type: d.type,
      priority: d.priority,
      sentDate: pick(d.sentDateLabel, arDate(d.sentDate)),
      senderName: pick(d.senderName, d.sender && d.sender.name),
      senderDepartment: pick(d.senderDepartment, d.sender && d.sender.department),
      subjectText: pick(d.subjectText, d.subject, d.body),
      viewUrl: d.viewUrl,
    }),
  },
  APPROVAL_REQUEST: {
    key: 'APPROVAL_REQUEST',
    adapt: (d) => ({
      title: d.title,
      referenceNumber: pick(d.referenceNumber, d.reference),
      stageName: pick(d.stageName, d.stage && d.stage.name),
      priority: d.priority,
      subjectText: pick(d.subjectText, d.subject, d.body),
      approveUrl: d.approveUrl,
      rejectUrl: d.rejectUrl,
    }),
  },
  STATUS_CHANGE: {
    key: 'STATUS_CHANGE',
    adapt: (d) => ({
      title: d.title,
      referenceNumber: pick(d.referenceNumber, d.reference),
      oldStatusLabel: pick(d.oldStatusLabel, d.oldStatus),
      newStatusLabel: pick(d.newStatusLabel, d.newStatus),
      viewUrl: d.viewUrl,
    }),
  },
});

/**
 * Try rendering a legacy EmailManager template key through the registry.
 * @returns {{key, subject, html, text}|null} null → caller uses legacy engine.
 */
function tryRegistryRender(legacyKey, data = {}) {
  const entry = BRIDGE[legacyKey];
  if (!entry) return null;
  try {
    const vars = entry.adapt(data || {});
    return renderTemplate(entry.key, vars);
  } catch (err) {
    if (err && (err.code === 'TEMPLATE_VARS_MISSING' || err.code === 'TEMPLATE_NOT_FOUND')) {
      return null; // contract unsatisfied → safe legacy fallback
    }
    throw err;
  }
}

module.exports = { BRIDGE, tryRegistryRender };
