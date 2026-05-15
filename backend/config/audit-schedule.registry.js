'use strict';

/**
 * audit-schedule.registry.js — World-Class QMS Phase 29 Commit 11.
 *
 * ISO 19011:2018 — Guidelines for auditing management systems.
 * Generates rolling internal-audit schedules. Each scope is audited
 * at least once per cycle; high-risk scopes more often.
 */

const AUDIT_FREQUENCY_MONTHS = Object.freeze({
  critical: 3, // quarterly
  high: 6, // semi-annual
  medium: 12, // annual
  low: 24, // biennial
});

const AUDIT_STATUSES = Object.freeze([
  'planned',
  'scheduled',
  'in_progress',
  'reported',
  'closed',
  'cancelled',
]);

const AUDIT_TYPES = Object.freeze([
  { code: 'internal', nameAr: 'تدقيق داخلي', nameEn: 'Internal' },
  { code: 'surprise', nameAr: 'تدقيق مفاجئ', nameEn: 'Surprise / unannounced' },
  { code: 'follow_up', nameAr: 'متابعة', nameEn: 'Follow-up' },
  { code: 'pre_audit', nameAr: 'تحضير اعتماد', nameEn: 'Accreditation pre-audit' },
]);

const FINDING_TYPES = Object.freeze([
  { code: 'major_nc', nameAr: 'عدم مطابقة كبير', nameEn: 'Major nonconformity' },
  { code: 'minor_nc', nameAr: 'عدم مطابقة بسيط', nameEn: 'Minor nonconformity' },
  { code: 'opportunity', nameAr: 'فرصة للتحسين', nameEn: 'Opportunity for improvement' },
  { code: 'observation', nameAr: 'ملاحظة', nameEn: 'Observation' },
  { code: 'commendation', nameAr: 'إشادة', nameEn: 'Commendation' },
]);

function nextOccurrence(lastDate, riskLevel) {
  const months = AUDIT_FREQUENCY_MONTHS[riskLevel] || AUDIT_FREQUENCY_MONTHS.medium;
  const d = new Date(lastDate || Date.now());
  d.setMonth(d.getMonth() + months);
  return d;
}

module.exports = {
  AUDIT_FREQUENCY_MONTHS,
  AUDIT_STATUSES,
  AUDIT_TYPES,
  FINDING_TYPES,
  nextOccurrence,
};
