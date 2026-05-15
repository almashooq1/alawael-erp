'use strict';

/**
 * quality-narrative.registry.js — World-Class QMS Phase 29 Commit 15.
 *
 * Generates plain-language quality narratives for dashboards and
 * executive reports. Uses an injectable LLM client — falls back to a
 * deterministic rule-based generator so the system is fully functional
 * without an LLM key + the narrative stays auditable.
 *
 * PII redaction is mandatory: any narrative we render runs through a
 * conservative redactor before either path (LLM or rule-based) sees it.
 */

const PII_PATTERNS = Object.freeze([
  // Saudi national ID (10 digits starting with 1 or 2)
  { name: 'saudi_id', regex: /\b[12]\d{9}\b/g, replacement: '[ID]' },
  // SA IBAN (SA + 2 + 18 digits)
  { name: 'iban', regex: /\bSA\d{22}\b/g, replacement: '[IBAN]' },
  // Email addresses
  { name: 'email', regex: /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },
  // KSA phone numbers
  { name: 'ksa_phone', regex: /\b(?:\+?966|0)?5\d{8}\b/g, replacement: '[PHONE]' },
  // Generic long numeric IDs (≥9 digits) — covers MRN-style IDs
  { name: 'long_numeric', regex: /\b\d{9,}\b/g, replacement: '[NUM]' },
]);

function redact(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const p of PII_PATTERNS) {
    out = out.replace(p.regex, p.replacement);
  }
  return out;
}

const NARRATIVE_KINDS = Object.freeze([
  'executive_summary',
  'monthly_report',
  'incident_brief',
  'audit_finding_summary',
  'risk_outlook',
  'capa_status',
]);

/**
 * Deterministic rule-based generator. Used as a fallback when no LLM
 * is wired and as a structural template the LLM follows. Returns
 * straight strings — Arabic + English variants supplied.
 */
function generateRuleBased({ kind, payload }) {
  switch (kind) {
    case 'executive_summary': {
      const p = payload || {};
      const totals = p.totals || {};
      const open = totals.openIncidents || 0;
      const overdueCapa = totals.overdueCapa || 0;
      const risk = p.riskBand || 'unknown';
      return {
        en: `Executive summary: ${open} open incidents, ${overdueCapa} overdue CAPAs, predictive-risk band: ${risk}.`,
        ar: `ملخص تنفيذي: ${open} حادثة مفتوحة، ${overdueCapa} إجراء تصحيحي متأخر، نطاق المخاطر التنبؤي: ${risk}.`,
      };
    }
    case 'monthly_report': {
      const p = payload || {};
      const period = p.period || 'الفترة الحالية';
      return {
        en: `Monthly QMS performance for ${period}. Total incidents: ${p.incidents || 0}, complaints: ${p.complaints || 0}, audits: ${p.audits || 0}.`,
        ar: `أداء نظام الجودة الشهري لـ ${period}. الحوادث: ${p.incidents || 0}، الشكاوى: ${p.complaints || 0}، التدقيقات: ${p.audits || 0}.`,
      };
    }
    case 'incident_brief': {
      const p = payload || {};
      return {
        en: `Incident ${p.incidentNumber || ''} — severity ${p.severity || 'n/a'}. Status: ${p.status || 'open'}.`,
        ar: `حادثة ${p.incidentNumber || ''} — درجة ${p.severity || 'غير محددة'}. الحالة: ${p.status || 'مفتوحة'}.`,
      };
    }
    case 'audit_finding_summary': {
      const p = payload || {};
      const majors = p.majorNc || 0;
      const minors = p.minorNc || 0;
      return {
        en: `Audit ${p.auditNumber || ''}: ${majors} major NCs, ${minors} minor NCs, ${p.opportunities || 0} OFIs.`,
        ar: `تدقيق ${p.auditNumber || ''}: ${majors} عدم مطابقة كبير، ${minors} عدم مطابقة بسيط، ${p.opportunities || 0} فرصة للتحسين.`,
      };
    }
    case 'risk_outlook': {
      const p = payload || {};
      return {
        en: `Forward 30-day risk outlook: predictive risk score ${p.score ?? '?'}, band ${p.band || '?'}. Top drivers: ${(p.topDrivers || []).join(', ')}.`,
        ar: `توقعات المخاطر لـ 30 يوم: نتيجة ${p.score ?? '؟'}، نطاق ${p.band || '؟'}. أبرز العوامل: ${(p.topDrivers || []).join(', ')}.`,
      };
    }
    case 'capa_status': {
      const p = payload || {};
      return {
        en: `CAPA backlog: ${p.open || 0} open, ${p.overdue || 0} overdue, ${p.verifiedThisMonth || 0} verified this month.`,
        ar: `قائمة CAPA: ${p.open || 0} مفتوح، ${p.overdue || 0} متأخر، ${p.verifiedThisMonth || 0} متحقق منها هذا الشهر.`,
      };
    }
    default:
      return { en: '', ar: '' };
  }
}

module.exports = {
  PII_PATTERNS,
  redact,
  NARRATIVE_KINDS,
  generateRuleBased,
};
