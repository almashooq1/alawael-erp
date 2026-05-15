'use strict';

/**
 * iso-14971-2019.registry.js — World-Class QMS Phase 29 follow-up.
 *
 * ISO 14971:2019 — Medical devices — Application of risk management.
 * Sequential lifecycle steps (Annex A) — every numbered clause carries
 * a deliverable that has to be on file before a device can ship.
 */

const ISO_14971_STANDARD = Object.freeze({
  code: 'iso_14971_2019',
  nameAr: 'الأيزو 14971:2019 (إدارة مخاطر الأجهزة الطبية)',
  nameEn: 'ISO 14971:2019 — Medical-device risk management',
  version: '2019',
  publisher: 'ISO',
});

const COMMON_EVIDENCE_TYPES = Object.freeze([
  'policy',
  'procedure',
  'risk_assessment',
  'fmea',
  'record',
  'training_record',
  'measurement',
  'meeting_minutes',
  'capa',
]);

const ISO_14971_CLAUSES = Object.freeze([
  {
    code: '4',
    parentCode: null,
    nameAr: 'متطلبات عامة',
    nameEn: 'General requirements',
    evidenceRequired: true,
  },
  {
    code: '4.1',
    parentCode: '4',
    nameAr: 'عملية إدارة المخاطر',
    nameEn: 'Risk management process',
    evidenceRequired: true,
    intent: 'Documented, continuous process across device lifecycle.',
    commonEvidenceTypes: ['policy', 'procedure'],
  },
  {
    code: '4.2',
    parentCode: '4',
    nameAr: 'مسؤولية الإدارة',
    nameEn: 'Management responsibilities',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'meeting_minutes'],
  },
  {
    code: '4.3',
    parentCode: '4',
    nameAr: 'كفاءة الفريق',
    nameEn: 'Competence of personnel',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record'],
  },
  {
    code: '4.4',
    parentCode: '4',
    nameAr: 'خطة إدارة المخاطر',
    nameEn: 'Risk management plan',
    evidenceRequired: true,
    intent: 'Per-device plan defining scope, criteria, responsibilities, review.',
    commonEvidenceTypes: ['risk_assessment'],
  },
  {
    code: '4.5',
    parentCode: '4',
    nameAr: 'ملف إدارة المخاطر',
    nameEn: 'Risk management file',
    evidenceRequired: true,
    intent: 'Master file gathering every risk-management artefact.',
    commonEvidenceTypes: ['record'],
  },

  {
    code: '5',
    parentCode: null,
    nameAr: 'تحليل المخاطر',
    nameEn: 'Risk analysis',
    evidenceRequired: true,
  },
  {
    code: '5.1',
    parentCode: '5',
    nameAr: 'إجراء تحليل المخاطر',
    nameEn: 'Risk-analysis process',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '5.2',
    parentCode: '5',
    nameAr: 'استخدام مقصود',
    nameEn: 'Intended use and reasonably foreseeable misuse',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },
  {
    code: '5.3',
    parentCode: '5',
    nameAr: 'تحديد الخصائص ذات الصلة بالسلامة',
    nameEn: 'Identification of characteristics related to safety',
    evidenceRequired: true,
    intent: 'List of characteristics that could affect safety (Annex A.2.5).',
    commonEvidenceTypes: ['record'],
  },
  {
    code: '5.4',
    parentCode: '5',
    nameAr: 'تحديد الأخطار',
    nameEn: 'Identification of hazards and hazardous situations',
    evidenceRequired: true,
    commonEvidenceTypes: ['risk_assessment', 'fmea'],
  },
  {
    code: '5.5',
    parentCode: '5',
    nameAr: 'تقدير المخاطر',
    nameEn: 'Risk estimation',
    evidenceRequired: true,
    intent: 'Estimate severity + probability for each hazardous situation.',
    commonEvidenceTypes: ['risk_assessment', 'fmea'],
  },

  {
    code: '6',
    parentCode: null,
    nameAr: 'تقييم المخاطر',
    nameEn: 'Risk evaluation',
    evidenceRequired: true,
    intent: 'Decide whether the estimated risk is acceptable against criteria.',
    commonEvidenceTypes: ['risk_assessment'],
  },

  {
    code: '7',
    parentCode: null,
    nameAr: 'مراقبة المخاطر',
    nameEn: 'Risk control',
    evidenceRequired: true,
  },
  {
    code: '7.1',
    parentCode: '7',
    nameAr: 'تحليل خيارات مراقبة المخاطر',
    nameEn: 'Risk-control option analysis',
    evidenceRequired: true,
    intent:
      'Three-tier hierarchy: inherent safety by design > protective measures > information for safety.',
    commonEvidenceTypes: ['risk_assessment'],
  },
  {
    code: '7.2',
    parentCode: '7',
    nameAr: 'تنفيذ إجراءات مراقبة المخاطر',
    nameEn: 'Implementation of risk-control measures',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: '7.3',
    parentCode: '7',
    nameAr: 'تقييم المخاطر المتبقية',
    nameEn: 'Residual risk evaluation',
    evidenceRequired: true,
    commonEvidenceTypes: ['risk_assessment'],
  },
  {
    code: '7.4',
    parentCode: '7',
    nameAr: 'تحليل المنفعة/الخطر',
    nameEn: 'Benefit-risk analysis',
    evidenceRequired: true,
    intent: 'If residual risk not acceptable, justify with overall medical benefit.',
    commonEvidenceTypes: ['risk_assessment', 'meeting_minutes'],
  },
  {
    code: '7.5',
    parentCode: '7',
    nameAr: 'مخاطر جديدة',
    nameEn: 'Risks arising from risk control measures',
    evidenceRequired: true,
    commonEvidenceTypes: ['risk_assessment'],
  },
  {
    code: '7.6',
    parentCode: '7',
    nameAr: 'اكتمال مراقبة المخاطر',
    nameEn: 'Completeness of risk control',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },

  {
    code: '8',
    parentCode: null,
    nameAr: 'تقييم المخاطر المتبقية الإجمالية',
    nameEn: 'Evaluation of overall residual risk',
    evidenceRequired: true,
    intent: 'After all controls applied — accept or refuse the device for use.',
    commonEvidenceTypes: ['risk_assessment', 'meeting_minutes'],
  },

  {
    code: '9',
    parentCode: null,
    nameAr: 'مراجعة إدارة المخاطر',
    nameEn: 'Risk-management review',
    evidenceRequired: true,
    intent: 'Before commercial distribution — review the file is complete + valid.',
    commonEvidenceTypes: ['meeting_minutes', 'record'],
  },

  {
    code: '10',
    parentCode: null,
    nameAr: 'أنشطة الإنتاج وما بعد الإنتاج',
    nameEn: 'Production and post-production activities',
    evidenceRequired: true,
  },
  {
    code: '10.1',
    parentCode: '10',
    nameAr: 'عام',
    nameEn: 'General',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: '10.2',
    parentCode: '10',
    nameAr: 'جمع المعلومات',
    nameEn: 'Information collection',
    evidenceRequired: true,
    intent: 'PMS feedback, complaint trends, similar-device data.',
    commonEvidenceTypes: ['procedure', 'measurement'],
  },
  {
    code: '10.3',
    parentCode: '10',
    nameAr: 'مراجعة المعلومات',
    nameEn: 'Information review',
    evidenceRequired: true,
    commonEvidenceTypes: ['meeting_minutes'],
  },
  {
    code: '10.4',
    parentCode: '10',
    nameAr: 'إجراءات',
    nameEn: 'Actions',
    evidenceRequired: true,
    intent: 'Updated risk file + CAPA if new hazards emerge.',
    commonEvidenceTypes: ['capa', 'risk_assessment'],
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
  STANDARD: ISO_14971_STANDARD,
  CLAUSES: ISO_14971_CLAUSES,
  CLAUSE_STATUSES,
  STATUS_LABELS,
  COMMON_EVIDENCE_TYPES,
  summariseCoverage,
};
