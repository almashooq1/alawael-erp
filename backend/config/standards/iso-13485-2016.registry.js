'use strict';

/**
 * iso-13485-2016.registry.js — World-Class QMS Phase 29 follow-up.
 *
 * ISO 13485:2016 — Medical devices — QMS Requirements for regulatory
 * purposes. Mirrors ISO 9001:2015 §4-§8 but adds device-specific
 * teeth (sterile barrier, post-market surveillance, traceability).
 *
 * Structurally identical to iso-9001-2015 so the generic
 * StandardsTraceability service can drive it as a drop-in plug-in.
 */

const ISO_13485_STANDARD = Object.freeze({
  code: 'iso_13485_2016',
  nameAr: 'الأيزو 13485:2016 (الأجهزة الطبية)',
  nameEn: 'ISO 13485:2016 — Medical devices QMS',
  version: '2016',
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

const ISO_13485_CLAUSES = Object.freeze([
  {
    code: '4',
    parentCode: null,
    nameAr: 'نظام إدارة الجودة',
    nameEn: 'Quality management system',
    evidenceRequired: true,
  },
  {
    code: '4.1',
    parentCode: '4',
    nameAr: 'متطلبات عامة',
    nameEn: 'General requirements',
    evidenceRequired: true,
    intent: 'QMS established + documented; processes determined; risk approach applied.',
    commonEvidenceTypes: ['policy', 'procedure'],
  },
  {
    code: '4.2',
    parentCode: '4',
    nameAr: 'متطلبات التوثيق',
    nameEn: 'Documentation requirements',
    evidenceRequired: true,
    intent: 'Quality Manual + Medical Device File (or DMR) per product family.',
    commonEvidenceTypes: ['policy', 'procedure'],
  },
  {
    code: '4.2.3',
    parentCode: '4.2',
    nameAr: 'ملف الجهاز الطبي',
    nameEn: 'Medical device file',
    evidenceRequired: true,
    intent: 'For each device/family: spec, manufacturing process, M&M, install/service procedures.',
    commonEvidenceTypes: ['record', 'sop'],
  },

  {
    code: '5',
    parentCode: null,
    nameAr: 'مسؤولية الإدارة',
    nameEn: 'Management responsibility',
    evidenceRequired: true,
  },
  {
    code: '5.1',
    parentCode: '5',
    nameAr: 'الالتزام الإداري',
    nameEn: 'Management commitment',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'meeting_minutes'],
  },
  {
    code: '5.3',
    parentCode: '5',
    nameAr: 'سياسة الجودة',
    nameEn: 'Quality policy',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: '5.6',
    parentCode: '5',
    nameAr: 'مراجعة الإدارة',
    nameEn: 'Management review',
    evidenceRequired: true,
    intent: 'Periodic review of QMS suitability + effectiveness incl. post-market data.',
    commonEvidenceTypes: ['management_review'],
  },

  {
    code: '6',
    parentCode: null,
    nameAr: 'إدارة الموارد',
    nameEn: 'Resource management',
    evidenceRequired: true,
  },
  {
    code: '6.2',
    parentCode: '6',
    nameAr: 'الموارد البشرية',
    nameEn: 'Human resources (competence)',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record', 'job_description'],
  },
  {
    code: '6.3',
    parentCode: '6',
    nameAr: 'البنية التحتية',
    nameEn: 'Infrastructure',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '6.4.1',
    parentCode: '6',
    nameAr: 'بيئة العمل',
    nameEn: 'Work environment',
    evidenceRequired: true,
    intent: 'Conditions for product conformity (cleanrooms, ESD, lighting…).',
    commonEvidenceTypes: ['procedure', 'measurement'],
  },
  {
    code: '6.4.2',
    parentCode: '6',
    nameAr: 'التحكم في التلوث',
    nameEn: 'Contamination control',
    evidenceRequired: true,
    intent: 'Sterile / particulate / microbial controls for relevant devices.',
    commonEvidenceTypes: ['procedure'],
  },

  {
    code: '7',
    parentCode: null,
    nameAr: 'تحقيق المنتج',
    nameEn: 'Product realization',
    evidenceRequired: true,
  },
  {
    code: '7.1',
    parentCode: '7',
    nameAr: 'تخطيط تحقيق المنتج',
    nameEn: 'Planning of product realization',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'risk_assessment'],
  },
  {
    code: '7.2',
    parentCode: '7',
    nameAr: 'العلاقة مع العميل',
    nameEn: 'Customer-related processes',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.3',
    parentCode: '7',
    nameAr: 'التصميم والتطوير',
    nameEn: 'Design and development',
    evidenceRequired: true,
    intent: 'Design plan, inputs, outputs, review, V&V, transfer, changes, files.',
    commonEvidenceTypes: ['procedure', 'record', 'risk_assessment'],
  },
  {
    code: '7.3.9',
    parentCode: '7.3',
    nameAr: 'إدارة تغييرات التصميم',
    nameEn: 'Control of design and development changes',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.4',
    parentCode: '7',
    nameAr: 'الشراء',
    nameEn: 'Purchasing',
    evidenceRequired: true,
    intent: 'Supplier qualification + monitoring + acceptance of purchased product.',
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.5',
    parentCode: '7',
    nameAr: 'الإنتاج وتقديم الخدمة',
    nameEn: 'Production and service provision',
    evidenceRequired: true,
    commonEvidenceTypes: ['sop', 'work_instruction', 'record'],
  },
  {
    code: '7.5.2',
    parentCode: '7.5',
    nameAr: 'نظافة المنتج',
    nameEn: 'Cleanliness of product',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '7.5.5',
    parentCode: '7.5',
    nameAr: 'متطلبات خاصة للأجهزة المعقمة',
    nameEn: 'Particular requirements for sterile medical devices',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.5.6',
    parentCode: '7.5',
    nameAr: 'التحقق من العمليات',
    nameEn: 'Validation of processes for production and service',
    evidenceRequired: true,
    intent: 'IQ/OQ/PQ for processes whose output cannot be verified by subsequent inspection.',
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.5.8',
    parentCode: '7.5',
    nameAr: 'التمييز',
    nameEn: 'Identification',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '7.5.9',
    parentCode: '7.5',
    nameAr: 'إمكانية التتبع',
    nameEn: 'Traceability',
    evidenceRequired: true,
    intent: 'Lot / serial level traceability per regulatory requirement.',
    commonEvidenceTypes: ['record', 'procedure'],
  },
  {
    code: '7.5.11',
    parentCode: '7.5',
    nameAr: 'حفظ المنتج',
    nameEn: 'Preservation of product',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '7.6',
    parentCode: '7',
    nameAr: 'مراقبة وقياس المعدات',
    nameEn: 'Control of monitoring and measuring equipment',
    evidenceRequired: true,
    intent: 'Calibration, traceability to national standards, software validation.',
    commonEvidenceTypes: ['record'],
  },

  {
    code: '8',
    parentCode: null,
    nameAr: 'القياس والتحليل والتحسين',
    nameEn: 'Measurement, analysis and improvement',
    evidenceRequired: true,
  },
  {
    code: '8.2.1',
    parentCode: '8',
    nameAr: 'التغذية الراجعة',
    nameEn: 'Feedback',
    evidenceRequired: true,
    intent: 'Process for gathering customer + post-market feedback feeding into the risk file.',
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.2.2',
    parentCode: '8',
    nameAr: 'معالجة الشكاوى',
    nameEn: 'Complaint handling',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '8.2.3',
    parentCode: '8',
    nameAr: 'الإبلاغ للجهات التنظيمية',
    nameEn: 'Reporting to regulatory authorities',
    evidenceRequired: true,
    intent:
      'Adverse event + recall reporting procedures aligned to applicable jurisdictions (FDA, SFDA, MDR).',
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '8.2.4',
    parentCode: '8',
    nameAr: 'التدقيق الداخلي',
    nameEn: 'Internal audit',
    evidenceRequired: true,
    commonEvidenceTypes: ['internal_audit'],
  },
  {
    code: '8.2.5',
    parentCode: '8',
    nameAr: 'مراقبة وقياس العمليات',
    nameEn: 'Monitoring and measurement of processes',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'measurement'],
  },
  {
    code: '8.2.6',
    parentCode: '8',
    nameAr: 'مراقبة وقياس المنتج',
    nameEn: 'Monitoring and measurement of product',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },
  {
    code: '8.3',
    parentCode: '8',
    nameAr: 'التحكم في المنتج غير المطابق',
    nameEn: 'Control of nonconforming product',
    evidenceRequired: true,
    commonEvidenceTypes: ['capa', 'record'],
  },
  {
    code: '8.4',
    parentCode: '8',
    nameAr: 'تحليل البيانات',
    nameEn: 'Analysis of data',
    evidenceRequired: true,
    commonEvidenceTypes: ['measurement', 'kpi'],
  },
  {
    code: '8.5.1',
    parentCode: '8',
    nameAr: 'التحسين',
    nameEn: 'Improvement',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'management_review'],
  },
  {
    code: '8.5.2',
    parentCode: '8',
    nameAr: 'الإجراءات التصحيحية',
    nameEn: 'Corrective action',
    evidenceRequired: true,
    commonEvidenceTypes: ['capa'],
  },
  {
    code: '8.5.3',
    parentCode: '8',
    nameAr: 'الإجراءات الوقائية',
    nameEn: 'Preventive action',
    evidenceRequired: true,
    commonEvidenceTypes: ['capa'],
  },
]);

const CLAUSE_STATUSES = Object.freeze([
  'not_started',
  'in_progress',
  'evidence_attached',
  'audit_passed',
  'lapsed',
  'not_applicable',
]);

const STATUS_LABELS = Object.freeze({
  not_started: { nameAr: 'لم يبدأ', nameEn: 'Not started' },
  in_progress: { nameAr: 'قيد التنفيذ', nameEn: 'In progress' },
  evidence_attached: { nameAr: 'دليل مرفق', nameEn: 'Evidence attached' },
  audit_passed: { nameAr: 'تم التدقيق', nameEn: 'Audit passed' },
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
  return { coverage: evidenced / total, byStatus, evidencedClauses: evidenced };
}

module.exports = {
  STANDARD: ISO_13485_STANDARD,
  CLAUSES: ISO_13485_CLAUSES,
  CLAUSE_STATUSES,
  STATUS_LABELS,
  COMMON_EVIDENCE_TYPES,
  summariseCoverage,
};
