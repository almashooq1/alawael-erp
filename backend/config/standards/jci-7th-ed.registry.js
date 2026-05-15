'use strict';

/**
 * jci-7th-ed.registry.js — World-Class QMS Phase 29 Commit 6.
 *
 * Joint Commission International — Accreditation Standards for
 * Hospitals (7th edition, 2021). Focused on the patient-centred and
 * organisation-management chapters that apply to rehab/day-care
 * centres. Not exhaustive — the JCI book itself runs to 300+ specific
 * standards across 16 chapters; we encode the chapter headers + the
 * highest-frequency standards an accreditor will actually ask for.
 *
 * The registry is structurally identical to the ISO 9001 one so the
 * generic traceability service can drive both interchangeably.
 */

const JCI_STANDARD = Object.freeze({
  code: 'jci_7th_ed',
  nameAr: 'الاعتماد الدولي للمستشفيات JCI',
  nameEn: 'Joint Commission International — 7th ed.',
  version: '2021',
  publisher: 'Joint Commission International',
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
  'objective_evidence',
  'fmea',
  'rca',
]);

// Chapter headers + key standards. Code format is the JCI's own
// 3-letter chapter prefix + the standard number (IPSG.1, ACC.2.1, …).

const JCI_CLAUSES = Object.freeze([
  // ── Section I — Patient-Centred standards ──────────────────────
  {
    code: 'IPSG',
    parentCode: null,
    nameAr: 'الأهداف الدولية لسلامة المرضى',
    nameEn: 'International Patient Safety Goals',
    evidenceRequired: true,
  },
  {
    code: 'IPSG.1',
    parentCode: 'IPSG',
    nameAr: 'التعرّف على هوية المرضى بدقة',
    nameEn: 'Identify Patients Correctly',
    evidenceRequired: true,
    intent: 'Two-identifier rule used at every clinical encounter.',
    commonEvidenceTypes: ['policy', 'training_record', 'measurement'],
  },
  {
    code: 'IPSG.2',
    parentCode: 'IPSG',
    nameAr: 'تحسين التواصل الفعّال',
    nameEn: 'Improve Effective Communication',
    evidenceRequired: true,
    intent: 'Verbal/telephone-order verification + critical-result reporting.',
    commonEvidenceTypes: ['policy', 'training_record'],
  },
  {
    code: 'IPSG.3',
    parentCode: 'IPSG',
    nameAr: 'تحسين سلامة الأدوية عالية الخطورة',
    nameEn: 'Improve Safety of High-Alert Medications',
    evidenceRequired: true,
    intent: 'List of high-alert meds, double-check process.',
    commonEvidenceTypes: ['policy', 'measurement'],
  },
  {
    code: 'IPSG.4',
    parentCode: 'IPSG',
    nameAr: 'ضمان جراحة آمنة',
    nameEn: 'Ensure Safe Surgery',
    evidenceRequired: true,
    intent: 'Time-out, site marking, surgical safety checklist.',
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: 'IPSG.5',
    parentCode: 'IPSG',
    nameAr: 'الحد من العدوى المرتبطة بالرعاية',
    nameEn: 'Reduce Healthcare-Associated Infections',
    evidenceRequired: true,
    intent: 'Hand-hygiene compliance + WHO 5 moments.',
    commonEvidenceTypes: ['policy', 'measurement', 'training_record'],
  },
  {
    code: 'IPSG.6',
    parentCode: 'IPSG',
    nameAr: 'الحد من خطر الإصابة بالسقوط',
    nameEn: 'Reduce Risk of Patient Harm from Falls',
    evidenceRequired: true,
    intent: 'Falls-risk assessment + mitigation plan.',
    commonEvidenceTypes: ['policy', 'measurement'],
  },

  {
    code: 'ACC',
    parentCode: null,
    nameAr: 'الوصول إلى الرعاية والاستمرارية',
    nameEn: 'Access to Care and Continuity of Care',
    evidenceRequired: true,
  },
  {
    code: 'ACC.1',
    parentCode: 'ACC',
    nameAr: 'فحص واستقبال المرضى',
    nameEn: 'Screening + admission process',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },
  {
    code: 'ACC.2',
    parentCode: 'ACC',
    nameAr: 'استمرارية الرعاية بين الفِرق',
    nameEn: 'Continuity of care across providers',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'meeting_minutes'],
  },
  {
    code: 'ACC.3',
    parentCode: 'ACC',
    nameAr: 'خروج المريض',
    nameEn: 'Discharge planning',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },

  {
    code: 'PCC',
    parentCode: null,
    nameAr: 'الرعاية المرتكزة على المريض',
    nameEn: 'Patient-Centred Care',
    evidenceRequired: true,
  },
  {
    code: 'PCC.1',
    parentCode: 'PCC',
    nameAr: 'حقوق المرضى والأسر',
    nameEn: 'Patient + family rights',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'training_record'],
  },
  {
    code: 'PCC.2',
    parentCode: 'PCC',
    nameAr: 'الموافقة المستنيرة',
    nameEn: 'Informed consent',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'record'],
  },
  {
    code: 'PCC.3',
    parentCode: 'PCC',
    nameAr: 'الإجراءات أمام الشكاوى',
    nameEn: 'Complaint-handling process',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'capa'],
  },

  {
    code: 'AOP',
    parentCode: null,
    nameAr: 'تقييم المرضى',
    nameEn: 'Assessment of Patients',
    evidenceRequired: true,
  },
  {
    code: 'AOP.1',
    parentCode: 'AOP',
    nameAr: 'تقييم البداية الشامل',
    nameEn: 'Initial assessment',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'record'],
  },
  {
    code: 'AOP.2',
    parentCode: 'AOP',
    nameAr: 'إعادة التقييم',
    nameEn: 'Reassessment',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure'],
  },

  {
    code: 'COP',
    parentCode: null,
    nameAr: 'تقديم الرعاية',
    nameEn: 'Care of Patients',
    evidenceRequired: true,
  },
  {
    code: 'COP.1',
    parentCode: 'COP',
    nameAr: 'رعاية موحّدة',
    nameEn: 'Uniform care for all',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'COP.2',
    parentCode: 'COP',
    nameAr: 'إنذار مبكر وإنعاش',
    nameEn: 'Early warning + resuscitation',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'training_record'],
  },

  {
    code: 'ASC',
    parentCode: null,
    nameAr: 'التخدير والجراحة',
    nameEn: 'Anesthesia and Surgical Care',
    evidenceRequired: false,
  },

  {
    code: 'MMU',
    parentCode: null,
    nameAr: 'إدارة الأدوية واستخدامها',
    nameEn: 'Medication Management and Use',
    evidenceRequired: true,
  },
  {
    code: 'MMU.1',
    parentCode: 'MMU',
    nameAr: 'تنظيم وإدارة الأدوية',
    nameEn: 'Pharmacy organisation + medication management',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'MMU.4',
    parentCode: 'MMU',
    nameAr: 'وصف الأدوية الآمن',
    nameEn: 'Safe prescribing',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'training_record'],
  },
  {
    code: 'MMU.7',
    parentCode: 'MMU',
    nameAr: 'مراقبة آثار الأدوية',
    nameEn: 'Monitoring medication effects',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'measurement'],
  },

  {
    code: 'PFE',
    parentCode: null,
    nameAr: 'تثقيف المريض والأسرة',
    nameEn: 'Patient and Family Education',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'record'],
  },

  // ── Section II — Healthcare-Organization-Management standards ───
  {
    code: 'QPS',
    parentCode: null,
    nameAr: 'تحسين الجودة وسلامة المرضى',
    nameEn: 'Quality Improvement and Patient Safety',
    evidenceRequired: true,
  },
  {
    code: 'QPS.1',
    parentCode: 'QPS',
    nameAr: 'برنامج تحسين الجودة على مستوى المنظمة',
    nameEn: 'Organisation-wide QI/PS program',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'management_review'],
  },
  {
    code: 'QPS.2',
    parentCode: 'QPS',
    nameAr: 'اختيار المؤشرات وقياسها',
    nameEn: 'Selection + measurement of indicators',
    evidenceRequired: true,
    commonEvidenceTypes: ['kpi', 'measurement'],
  },
  {
    code: 'QPS.3',
    parentCode: 'QPS',
    nameAr: 'تحليل البيانات',
    nameEn: 'Data analysis (incl. statistical tools)',
    evidenceRequired: true,
    commonEvidenceTypes: ['measurement', 'meeting_minutes'],
  },
  {
    code: 'QPS.7',
    parentCode: 'QPS',
    nameAr: 'الإبلاغ عن الحوادث الجسيمة',
    nameEn: 'Sentinel-event reporting + RCA',
    evidenceRequired: true,
    commonEvidenceTypes: ['rca', 'capa'],
  },

  {
    code: 'PCI',
    parentCode: null,
    nameAr: 'الوقاية من العدوى ومكافحتها',
    nameEn: 'Prevention and Control of Infections',
    evidenceRequired: true,
  },
  {
    code: 'PCI.1',
    parentCode: 'PCI',
    nameAr: 'برنامج مكافحة العدوى',
    nameEn: 'IPC program',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'measurement'],
  },
  {
    code: 'PCI.5',
    parentCode: 'PCI',
    nameAr: 'نظافة الأيدي',
    nameEn: 'Hand hygiene compliance',
    evidenceRequired: true,
    commonEvidenceTypes: ['measurement', 'training_record'],
  },

  {
    code: 'GLD',
    parentCode: null,
    nameAr: 'الحوكمة والقيادة',
    nameEn: 'Governance, Leadership, and Direction',
    evidenceRequired: true,
  },
  {
    code: 'GLD.1',
    parentCode: 'GLD',
    nameAr: 'هيكل الحوكمة',
    nameEn: 'Governance structure',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'meeting_minutes'],
  },
  {
    code: 'GLD.4',
    parentCode: 'GLD',
    nameAr: 'القيادة على مستوى الإدارات',
    nameEn: 'Department / service leadership',
    evidenceRequired: true,
    commonEvidenceTypes: ['job_description'],
  },

  {
    code: 'FMS',
    parentCode: null,
    nameAr: 'إدارة المنشأة والسلامة',
    nameEn: 'Facility Management and Safety',
    evidenceRequired: true,
  },
  {
    code: 'FMS.4',
    parentCode: 'FMS',
    nameAr: 'السلامة العامة + المخاطر',
    nameEn: 'Safety + security',
    evidenceRequired: true,
    commonEvidenceTypes: ['risk_assessment', 'procedure'],
  },
  {
    code: 'FMS.7',
    parentCode: 'FMS',
    nameAr: 'سلامة الحرائق',
    nameEn: 'Fire safety',
    evidenceRequired: true,
    commonEvidenceTypes: ['procedure', 'training_record'],
  },
  {
    code: 'FMS.8',
    parentCode: 'FMS',
    nameAr: 'الأجهزة الطبية والمعايرة',
    nameEn: 'Medical equipment + calibration',
    evidenceRequired: true,
    commonEvidenceTypes: ['record'],
  },

  {
    code: 'SQE',
    parentCode: null,
    nameAr: 'مؤهلات الموظفين وتعليمهم',
    nameEn: 'Staff Qualifications and Education',
    evidenceRequired: true,
  },
  {
    code: 'SQE.5',
    parentCode: 'SQE',
    nameAr: 'تقييم كفاءة الموظفين',
    nameEn: 'Staff competency assessment',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record'],
  },
  {
    code: 'SQE.8',
    parentCode: 'SQE',
    nameAr: 'تعليم وتدريب مستمر',
    nameEn: 'Continuing education',
    evidenceRequired: true,
    commonEvidenceTypes: ['training_record'],
  },

  {
    code: 'MOI',
    parentCode: null,
    nameAr: 'إدارة المعلومات',
    nameEn: 'Management of Information',
    evidenceRequired: true,
  },
  {
    code: 'MOI.1',
    parentCode: 'MOI',
    nameAr: 'برنامج إدارة المعلومات',
    nameEn: 'Information management program',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy'],
  },
  {
    code: 'MOI.6',
    parentCode: 'MOI',
    nameAr: 'أمن وسرية البيانات الصحية',
    nameEn: 'Security + confidentiality of health information',
    evidenceRequired: true,
    commonEvidenceTypes: ['policy', 'procedure'],
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
  STANDARD: JCI_STANDARD,
  CLAUSES: JCI_CLAUSES,
  CLAUSE_STATUSES,
  STATUS_LABELS,
  COMMON_EVIDENCE_TYPES,
  summariseCoverage,
};
