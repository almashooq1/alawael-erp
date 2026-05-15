'use strict';

/**
 * cbahi-hc-4th-ed.registry.js — World-Class QMS Phase 29 Commit 6.
 *
 * CBAHI (Saudi Central Board for Accreditation of Healthcare
 * Institutions) — Standards for Hospitals, 4th ed. Adapted to the
 * rehab / day-care context: we encode the chapters + the most-asked
 * standards an actual CBAHI surveyor will pull during an inspection.
 *
 * Chapter codes match the CBAHI manual:
 *   LD = Leadership
 *   QM = Quality management
 *   PR = Patient & family rights
 *   AC = Access & continuity of care
 *   AS = Assessment & rehabilitation
 *   MM = Medication management
 *   IC = Infection control
 *   FS = Facility safety
 *   HR = Human resources
 *   IM = Information management
 *   ESR = Emergency, safety & risk
 */

const CBAHI_STANDARD = Object.freeze({
  code: 'cbahi_hc_4th_ed',
  nameAr: 'معايير سباهي للمستشفيات (الإصدار الرابع)',
  nameEn: 'CBAHI Hospitals 4th ed.',
  version: '4.0',
  publisher: 'Saudi Central Board for Accreditation of Healthcare Institutions',
});

const COMMON_EVIDENCE_TYPES = Object.freeze([
  'policy',
  'procedure',
  'sop',
  'training_record',
  'risk_assessment',
  'measurement',
  'kpi',
  'meeting_minutes',
  'capa',
  'internal_audit',
  'record',
  'rca',
  'fmea',
  'objective_evidence',
]);

const CBAHI_CLAUSES = Object.freeze([
  { code: 'LD', parentCode: null, nameAr: 'القيادة', nameEn: 'Leadership', evidenceRequired: true },
  {
    code: 'LD.1',
    parentCode: 'LD',
    nameAr: 'الرؤية والرسالة والقيم',
    nameEn: 'Vision, mission, values',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'LD.5',
    parentCode: 'LD',
    nameAr: 'إدارة الموارد البشرية والمالية',
    nameEn: 'HR + financial resources',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'LD.11',
    parentCode: 'LD',
    nameAr: 'مراجعة الإدارة الدورية',
    nameEn: 'Periodic management review',
    evidenceRequired: true,
    commonEvidenceTypes: ['management_review', 'meeting_minutes'],
  },

  {
    code: 'QM',
    parentCode: null,
    nameAr: 'إدارة الجودة',
    nameEn: 'Quality management',
    evidenceRequired: true,
  },
  {
    code: 'QM.1',
    parentCode: 'QM',
    nameAr: 'خطة الجودة وسلامة المرضى',
    nameEn: 'QI/PS plan',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'QM.5',
    parentCode: 'QM',
    nameAr: 'المؤشرات الرئيسية للأداء',
    nameEn: 'Key performance indicators',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'measurement'],
  },
  {
    code: 'QM.8',
    parentCode: 'QM',
    nameAr: 'الإبلاغ عن الحوادث',
    nameEn: 'Incident reporting + RCA',
    evidenceRequired: true,
    commonEvidenceTypes: ['rca', 'capa'],
  },
  {
    code: 'QM.10',
    parentCode: 'QM',
    nameAr: 'تدقيق داخلي',
    nameEn: 'Internal audit',
    evidenceRequired: true,
    commonEvidenceTypes: ['internal_audit'],
  },

  {
    code: 'PR',
    parentCode: null,
    nameAr: 'حقوق المريض والأسرة',
    nameEn: 'Patient & family rights',
    evidenceRequired: true,
  },
  {
    code: 'PR.1',
    parentCode: 'PR',
    nameAr: 'وثيقة حقوق المريض',
    nameEn: 'Patient bill of rights',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'training_record'],
  },
  {
    code: 'PR.5',
    parentCode: 'PR',
    nameAr: 'الموافقة المستنيرة',
    nameEn: 'Informed consent',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: 'PR.9',
    parentCode: 'PR',
    nameAr: 'الشكاوى والاقتراحات',
    nameEn: 'Complaints + suggestions',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'measurement'],
  },

  {
    code: 'AC',
    parentCode: null,
    nameAr: 'الوصول للرعاية واستمراريتها',
    nameEn: 'Access + continuity of care',
    evidenceRequired: true,
  },
  {
    code: 'AC.2',
    parentCode: 'AC',
    nameAr: 'إجراءات الاستقبال',
    nameEn: 'Admission procedures',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: 'AC.7',
    parentCode: 'AC',
    nameAr: 'إحالة وتنسيق الرعاية',
    nameEn: 'Referral + care coordination',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: 'AC.10',
    parentCode: 'AC',
    nameAr: 'تخطيط الخروج',
    nameEn: 'Discharge planning',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },

  {
    code: 'AS',
    parentCode: null,
    nameAr: 'التقييم والتأهيل',
    nameEn: 'Assessment + rehabilitation',
    evidenceRequired: true,
  },
  {
    code: 'AS.1',
    parentCode: 'AS',
    nameAr: 'التقييم الشامل عند الاستقبال',
    nameEn: 'Comprehensive admission assessment',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: 'AS.5',
    parentCode: 'AS',
    nameAr: 'الخطة العلاجية الفردية (IEP/ITP)',
    nameEn: 'Individual treatment plan',
    evidenceRequired: true,
    commonEvidenceTypes: ['record', 'procedure'],
  },
  {
    code: 'AS.8',
    parentCode: 'AS',
    nameAr: 'تقييم الأهل ومقدّمي الرعاية',
    nameEn: 'Caregiver assessment + education',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },

  {
    code: 'MM',
    parentCode: null,
    nameAr: 'إدارة الأدوية',
    nameEn: 'Medication management',
    evidenceRequired: true,
  },
  {
    code: 'MM.3',
    parentCode: 'MM',
    nameAr: 'صرف الأدوية الآمن',
    nameEn: 'Safe dispensing',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'measurement'],
  },
  {
    code: 'MM.7',
    parentCode: 'MM',
    nameAr: 'مراقبة آثار الأدوية',
    nameEn: 'Monitoring effects + ADR reporting',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'measurement'],
  },

  {
    code: 'IC',
    parentCode: null,
    nameAr: 'مكافحة العدوى',
    nameEn: 'Infection control',
    evidenceRequired: true,
  },
  {
    code: 'IC.1',
    parentCode: 'IC',
    nameAr: 'برنامج مكافحة العدوى',
    nameEn: 'IPC program',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'measurement'],
  },
  {
    code: 'IC.5',
    parentCode: 'IC',
    nameAr: 'نظافة الأيدي',
    nameEn: 'Hand hygiene',
    evidenceRequired: true,
    commonEvidenceTypes: ['measurement', 'training_record'],
  },

  {
    code: 'FS',
    parentCode: null,
    nameAr: 'سلامة المنشأة',
    nameEn: 'Facility safety',
    evidenceRequired: true,
  },
  {
    code: 'FS.3',
    parentCode: 'FS',
    nameAr: 'الجاهزية للطوارئ',
    nameEn: 'Emergency preparedness',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'training_record'],
  },
  {
    code: 'FS.6',
    parentCode: 'FS',
    nameAr: 'سلامة الحرائق',
    nameEn: 'Fire safety',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'training_record'],
  },
  {
    code: 'FS.10',
    parentCode: 'FS',
    nameAr: 'صيانة الأجهزة الطبية',
    nameEn: 'Medical equipment maintenance + calibration',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },

  {
    code: 'HR',
    parentCode: null,
    nameAr: 'الموارد البشرية',
    nameEn: 'Human resources',
    evidenceRequired: true,
  },
  {
    code: 'HR.2',
    parentCode: 'HR',
    nameAr: 'التوظيف والتحقق من المؤهلات',
    nameEn: 'Recruitment + credential verification',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },
  {
    code: 'HR.5',
    parentCode: 'HR',
    nameAr: 'تقييم الكفاءة',
    nameEn: 'Competency assessment',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record'],
  },
  {
    code: 'HR.8',
    parentCode: 'HR',
    nameAr: 'التدريب المستمر',
    nameEn: 'Continuing education',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record'],
  },

  {
    code: 'IM',
    parentCode: null,
    nameAr: 'إدارة المعلومات',
    nameEn: 'Information management',
    evidenceRequired: true,
  },
  {
    code: 'IM.1',
    parentCode: 'IM',
    nameAr: 'سياسة إدارة المعلومات',
    nameEn: 'Information management policy',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'IM.5',
    parentCode: 'IM',
    nameAr: 'سرية وأمن المعلومات',
    nameEn: 'Confidentiality + security',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'procedure'],
  },

  {
    code: 'ESR',
    parentCode: null,
    nameAr: 'الطوارئ والسلامة والمخاطر',
    nameEn: 'Emergency, safety + risk',
    evidenceRequired: true,
  },
  {
    code: 'ESR.3',
    parentCode: 'ESR',
    nameAr: 'تقييم المخاطر الاستباقي',
    nameEn: 'Proactive risk assessment (FMEA)',
    evidenceRequired: true,
    commonEvidenceTypes: ['fmea', 'risk_assessment'],
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
  return { coverage: evidenced / total, byStatus, evidencedClauses: evidenced };
}

module.exports = {
  STANDARD: CBAHI_STANDARD,
  CLAUSES: CBAHI_CLAUSES,
  CLAUSE_STATUSES,
  STATUS_LABELS,
  COMMON_EVIDENCE_TYPES,
  summariseCoverage,
};
