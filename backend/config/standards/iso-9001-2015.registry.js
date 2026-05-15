'use strict';

/**
 * iso-9001-2015.registry.js — World-Class QMS Phase 29 Commit 5.
 *
 * Full clause structure of ISO 9001:2015 (Quality Management Systems
 * — Requirements). Encoded so the traceability matrix can render the
 * standard exactly as the auditor expects, with localised labels.
 *
 * The hierarchy:
 *   • Sections 1-3 are informational (Scope, Normative references,
 *     Terms & definitions) — included for completeness but not
 *     `evidenceRequired`.
 *   • Sections 4-10 are the auditable requirements.
 *
 * Each clause carries:
 *   • code         — '4', '4.1', '4.4.1.a', …  used as the join key
 *                   for the StandardsTraceability collection.
 *   • parentCode   — null for top-level, else the immediate parent.
 *   • nameAr/En
 *   • intent       — what the auditor is looking for, in 1-2 sentences.
 *   • evidenceRequired — boolean.
 *   • commonEvidenceTypes — suggested evidence categories (SOPs,
 *     records, training, internal-audit, management-review, etc.).
 */

const ISO_9001_2015_STANDARD = Object.freeze({
  code: 'iso_9001_2015',
  nameAr: 'الأيزو 9001:2015',
  nameEn: 'ISO 9001:2015',
  version: '2015',
  publisher: 'ISO',
});

const COMMON_EVIDENCE_TYPES = Object.freeze([
  'sop',
  'policy',
  'procedure',
  'work_instruction',
  'record',
  'training_record',
  'internal_audit',
  'management_review',
  'capa',
  'risk_assessment',
  'measurement',
  'kpi',
  'meeting_minutes',
  'job_description',
  'objective_evidence',
]);

const ISO_9001_2015_CLAUSES = Object.freeze([
  // Informational sections (1-3) — included for completeness but
  // `evidenceRequired = false`. The auditor doesn't ask for evidence
  // against them, they're just headers.
  {
    code: '4',
    parentCode: null,
    nameAr: 'سياق المنظمة',
    nameEn: 'Context of the organization',
    evidenceRequired: true,
  },
  {
    code: '4.1',
    parentCode: '4',
    nameAr: 'فهم المنظمة وسياقها',
    nameEn: 'Understanding the organization and its context',
    intent: 'External / internal issues relevant to the QMS purpose + strategic direction.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'meeting_minutes', 'risk_assessment'],
  },
  {
    code: '4.2',
    parentCode: '4',
    nameAr: 'فهم احتياجات الأطراف المعنية وتوقعاتها',
    nameEn: 'Understanding needs and expectations of interested parties',
    intent:
      'Identify relevant interested parties (regulators, funders, families) and their requirements.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'meeting_minutes'],
  },
  {
    code: '4.3',
    parentCode: '4',
    nameAr: 'تحديد نطاق نظام الجودة',
    nameEn: 'Determining the scope of the QMS',
    intent: 'Documented scope with applicability / exclusions justified.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: '4.4',
    parentCode: '4',
    nameAr: 'نظام إدارة الجودة وعملياته',
    nameEn: 'QMS and its processes',
    intent: 'Process approach: identify processes, inputs, outputs, interactions, criteria, KPIs.',
    evidenceRequired: true,
    commonEvidenceTypes: ['sop', 'procedure', 'kpi'],
  },

  { code: '5', parentCode: null, nameAr: 'القيادة', nameEn: 'Leadership', evidenceRequired: true },
  {
    code: '5.1',
    parentCode: '5',
    nameAr: 'القيادة والالتزام',
    nameEn: 'Leadership and commitment',
    intent: 'Top management actively engaged; customer focus demonstrated.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'management_review', 'meeting_minutes'],
  },
  {
    code: '5.2',
    parentCode: '5',
    nameAr: 'سياسة الجودة',
    nameEn: 'Quality policy',
    intent: 'Documented policy aligned with strategy + communicated.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'training_record'],
  },
  {
    code: '5.3',
    parentCode: '5',
    nameAr: 'الأدوار والمسؤوليات والصلاحيات',
    nameEn: 'Organizational roles, responsibilities and authorities',
    intent: 'Roles assigned + communicated + understood.',
    evidenceRequired: true,
    commonEvidenceTypes: ['job_description', 'policy'],
  },

  { code: '6', parentCode: null, nameAr: 'التخطيط', nameEn: 'Planning', evidenceRequired: true },
  {
    code: '6.1',
    parentCode: '6',
    nameAr: 'إجراءات معالجة المخاطر والفرص',
    nameEn: 'Actions to address risks and opportunities',
    intent: 'Risk-based thinking applied; risks + opportunities identified + actioned.',
    evidenceRequired: true,
    commonEvidenceTypes: ['risk_assessment', 'capa'],
  },
  {
    code: '6.2',
    parentCode: '6',
    nameAr: 'أهداف الجودة والتخطيط لتحقيقها',
    nameEn: 'Quality objectives and planning to achieve them',
    intent: 'SMART objectives at relevant functions + plans documented.',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'policy'],
  },
  {
    code: '6.3',
    parentCode: '6',
    nameAr: 'التخطيط للتغييرات',
    nameEn: 'Planning of changes',
    intent: 'Changes carried out in a planned, controlled manner.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'procedure'],
  },

  { code: '7', parentCode: null, nameAr: 'الدعم', nameEn: 'Support', evidenceRequired: true },
  {
    code: '7.1',
    parentCode: '7',
    nameAr: 'الموارد',
    nameEn: 'Resources',
    intent:
      'People, infrastructure, environment, measurement, knowledge resources determined and provided.',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },
  {
    code: '7.1.5',
    parentCode: '7.1',
    nameAr: 'موارد المراقبة والقياس',
    nameEn: 'Monitoring and measuring resources',
    intent:
      'Calibration / verification of measuring equipment; traceability to national / international standards.',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },
  {
    code: '7.2',
    parentCode: '7',
    nameAr: 'الكفاءة',
    nameEn: 'Competence',
    intent: 'Personnel competence determined, ensured, documented.',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record', 'job_description'],
  },
  {
    code: '7.3',
    parentCode: '7',
    nameAr: 'الوعي',
    nameEn: 'Awareness',
    intent: 'Staff aware of quality policy, objectives, and their contribution.',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record', 'meeting_minutes'],
  },
  {
    code: '7.4',
    parentCode: '7',
    nameAr: 'التواصل',
    nameEn: 'Communication',
    intent: 'Internal + external communication relevant to QMS determined.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'procedure'],
  },
  {
    code: '7.5',
    parentCode: '7',
    nameAr: 'المعلومات الموثقة',
    nameEn: 'Documented information',
    intent: 'Document control + record retention.',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'sop'],
  },

  { code: '8', parentCode: null, nameAr: 'التشغيل', nameEn: 'Operation', evidenceRequired: true },
  {
    code: '8.1',
    parentCode: '8',
    nameAr: 'تخطيط ومراقبة التشغيل',
    nameEn: 'Operational planning and control',
    intent: 'Processes needed to meet service requirements are planned + controlled.',
    evidenceRequired: true,
    commonEvidenceTypes: ['sop', 'work_instruction'],
  },
  {
    code: '8.2',
    parentCode: '8',
    nameAr: 'متطلبات المنتجات والخدمات',
    nameEn: 'Requirements for products and services',
    intent: 'Customer communication, requirement determination + review.',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.3',
    parentCode: '8',
    nameAr: 'تصميم وتطوير المنتجات والخدمات',
    nameEn: 'Design and development of products and services',
    intent: 'Design planning, inputs, controls, outputs, changes — controlled and recorded.',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.4',
    parentCode: '8',
    nameAr: 'مراقبة العمليات والمنتجات والخدمات المُورَّدة خارجياً',
    nameEn: 'Control of externally provided processes, products and services',
    intent: 'Suppliers / outsourced services evaluated, monitored, re-evaluated.',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.5',
    parentCode: '8',
    nameAr: 'تقديم المنتج / الخدمة',
    nameEn: 'Production and service provision',
    intent:
      'Service delivered under controlled conditions; identification, traceability, customer property, preservation.',
    evidenceRequired: true,
    commonEvidenceTypes: ['sop', 'work_instruction', 'record'],
  },
  {
    code: '8.5.6',
    parentCode: '8.5',
    nameAr: 'مراقبة التغييرات',
    nameEn: 'Control of changes',
    intent: 'Changes to production / service reviewed + controlled.',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.6',
    parentCode: '8',
    nameAr: 'الإفراج عن المنتج والخدمة',
    nameEn: 'Release of products and services',
    intent: 'Planned arrangements verified before release; release records kept.',
    evidenceRequired: true,
    commonEvidenceTypes: ['record', 'procedure'],
  },
  {
    code: '8.7',
    parentCode: '8',
    nameAr: 'مراقبة المخرجات غير المطابقة',
    nameEn: 'Control of nonconforming outputs',
    intent: 'NC outputs identified + controlled to prevent unintended use.',
    evidenceRequired: true,
    commonEvidenceTypes: ['capa', 'record'],
  },

  {
    code: '9',
    parentCode: null,
    nameAr: 'تقييم الأداء',
    nameEn: 'Performance evaluation',
    evidenceRequired: true,
  },
  {
    code: '9.1',
    parentCode: '9',
    nameAr: 'المراقبة والقياس والتحليل والتقييم',
    nameEn: 'Monitoring, measurement, analysis and evaluation',
    intent: 'What, how, when to monitor + measure; analyse data + evaluate effectiveness.',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'measurement'],
  },
  {
    code: '9.1.2',
    parentCode: '9.1',
    nameAr: 'رضا العملاء',
    nameEn: 'Customer satisfaction',
    intent: 'Monitor customer perception; methods (surveys, feedback) + frequency defined.',
    evidenceRequired: true,
    commonEvidenceTypes: ['measurement'],
  },
  {
    code: '9.2',
    parentCode: '9',
    nameAr: 'التدقيق الداخلي',
    nameEn: 'Internal audit',
    intent: 'Internal audits planned, conducted, reported; findings + corrective actions recorded.',
    evidenceRequired: true,
    commonEvidenceTypes: ['internal_audit', 'capa'],
  },
  {
    code: '9.3',
    parentCode: '9',
    nameAr: 'مراجعة الإدارة',
    nameEn: 'Management review',
    intent: 'Top management reviews QMS at planned intervals; inputs + outputs documented.',
    evidenceRequired: true,
    commonEvidenceTypes: ['management_review', 'meeting_minutes'],
  },

  {
    code: '10',
    parentCode: null,
    nameAr: 'التحسين',
    nameEn: 'Improvement',
    evidenceRequired: true,
  },
  {
    code: '10.1',
    parentCode: '10',
    nameAr: 'عام',
    nameEn: 'General',
    intent: 'Determine + select opportunities for improvement.',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: '10.2',
    parentCode: '10',
    nameAr: 'عدم المطابقة والإجراءات التصحيحية',
    nameEn: 'Nonconformity and corrective action',
    intent:
      'React to NCs, evaluate need for action, implement, review effectiveness, update risks.',
    evidenceRequired: true,
    commonEvidenceTypes: ['capa'],
  },
  {
    code: '10.3',
    parentCode: '10',
    nameAr: 'التحسين المستمر',
    nameEn: 'Continual improvement',
    intent: 'Suitability + adequacy + effectiveness of QMS continually improved.',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'management_review'],
  },
]);

// ── Lifecycle for each clause record ───────────────────────────────

const CLAUSE_STATUSES = Object.freeze([
  'not_started',
  'in_progress',
  'evidence_attached',
  'audit_passed',
  'lapsed', // evidence expired or audit failed
  'not_applicable',
]);

const STATUS_LABELS = Object.freeze({
  not_started: { nameAr: 'لم يبدأ', nameEn: 'Not started' },
  in_progress: { nameAr: 'قيد التنفيذ', nameEn: 'In progress' },
  evidence_attached: { nameAr: 'دليل مرفق', nameEn: 'Evidence attached' },
  audit_passed: { nameAr: 'تم التدقيق بنجاح', nameEn: 'Audit passed' },
  lapsed: { nameAr: 'منتهٍ', nameEn: 'Lapsed' },
  not_applicable: { nameAr: 'غير منطبق', nameEn: 'Not applicable' },
});

function summariseCoverage(records) {
  const total = records.length;
  if (total === 0) return { coverage: 0, byStatus: {}, evidencedClauses: 0 };
  const byStatus = {};
  for (const s of CLAUSE_STATUSES) byStatus[s] = 0;
  for (const r of records) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const evidenced = byStatus.evidence_attached + byStatus.audit_passed;
  return {
    coverage: total ? evidenced / total : 0,
    byStatus,
    evidencedClauses: evidenced,
  };
}

module.exports = {
  STANDARD: ISO_9001_2015_STANDARD,
  CLAUSES: ISO_9001_2015_CLAUSES,
  CLAUSE_STATUSES,
  STATUS_LABELS,
  COMMON_EVIDENCE_TYPES,
  summariseCoverage,
};
