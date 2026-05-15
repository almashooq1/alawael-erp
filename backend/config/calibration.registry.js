'use strict';

/**
 * calibration.registry.js — World-Class QMS Phase 29 Commit 9.
 *
 * ISO/IEC 17025 + ISO 9001 §7.1.5 — Monitoring and measuring resources.
 * Tracks calibratable equipment with traceability to national /
 * international measurement standards.
 */

const CAL_STATUSES = Object.freeze([
  'active', // in service + within calibration period
  'awaiting_calibration', // due now / scheduled
  'in_calibration', // out for cal at provider / internal
  'failed', // last cal failed — quarantine + investigate
  'out_of_service', // taken out of service (broken / awaiting repair)
  'retired', // permanently retired
]);

const CAL_FREQUENCY_UNITS = Object.freeze(['days', 'weeks', 'months', 'years']);

const EQUIPMENT_TYPES = Object.freeze([
  { code: 'scale', nameAr: 'ميزان', nameEn: 'Scale / balance' },
  { code: 'thermometer', nameAr: 'ميزان حرارة', nameEn: 'Thermometer' },
  { code: 'sphygmomanometer', nameAr: 'جهاز ضغط', nameEn: 'Sphygmomanometer' },
  { code: 'glucometer', nameAr: 'جهاز سكر', nameEn: 'Glucometer' },
  { code: 'oximeter', nameAr: 'مقياس أكسجين', nameEn: 'Pulse oximeter' },
  { code: 'pipette', nameAr: 'ماصة', nameEn: 'Pipette' },
  { code: 'centrifuge', nameAr: 'طاردة', nameEn: 'Centrifuge' },
  { code: 'autoclave', nameAr: 'معقّمة', nameEn: 'Autoclave' },
  { code: 'incubator', nameAr: 'حاضنة', nameEn: 'Incubator' },
  { code: 'refrigerator', nameAr: 'ثلاجة طبية', nameEn: 'Medical refrigerator' },
  { code: 'ecg', nameAr: 'تخطيط القلب', nameEn: 'ECG' },
  { code: 'other', nameAr: 'أخرى', nameEn: 'Other' },
]);

const CAL_OUTCOMES = Object.freeze(['pass', 'pass_with_adjustment', 'fail']);

const REMINDER_LEAD_DAYS_DEFAULT = [30, 14, 7, 1];

function computeNextDueDate(lastCalibratedAt, freq, unit) {
  if (!lastCalibratedAt) return null;
  const d = new Date(lastCalibratedAt);
  const n = Number(freq);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'days') d.setDate(d.getDate() + n);
  else if (unit === 'weeks') d.setDate(d.getDate() + n * 7);
  else if (unit === 'months') d.setMonth(d.getMonth() + n);
  else if (unit === 'years') d.setFullYear(d.getFullYear() + n);
  else return null;
  return d;
}

function daysUntilDue(due, now = new Date()) {
  if (!due) return null;
  return Math.ceil((new Date(due) - now) / 86400000);
}

module.exports = {
  CAL_STATUSES,
  CAL_FREQUENCY_UNITS,
  EQUIPMENT_TYPES,
  CAL_OUTCOMES,
  REMINDER_LEAD_DAYS_DEFAULT,
  computeNextDueDate,
  daysUntilDue,
};
