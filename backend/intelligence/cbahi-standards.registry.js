'use strict';

/**
 * cbahi-standards.registry.js — Wave 360.
 *
 * "معايير CBAHI" — pure-data registry of CBAHI standards applicable to
 * day-rehab / disability-rehab centers. CBAHI = المركز السعودي لاعتماد
 * المنشآت الصحية (Central Board for Accreditation of Healthcare Institutions),
 * the Saudi national accreditation body. Accreditation unlocks government
 * contracting + insurance reimbursement at higher tiers.
 *
 * STARTER SET (20 standards across 8 chapters) — covers the highest-impact
 * requirements for the day-rehab vertical. CBAHI publishes ~500+ standards
 * in total across the full hospital manual; this registry curates the
 * subset that materially apply to outpatient + day-rehab + disability
 * service settings. Additional standards can be added without code change
 * (just expand the array + bump W360 baseline in the drift guard).
 *
 * Each standard:
 *   • key      — UPPER_SNAKE_CASE machine identifier (stable across versions)
 *   • chapter  — CBAHI chapter (PSG/MMS/IC/LD/IM/ASC/PCC/EOC)
 *   • code     — CBAHI's official numeric code (or our internal sequencing
 *                where the official code is not publicly enumerated)
 *   • titleEn / titleAr — display labels
 *   • requirement — the actual mandated practice
 *   • evidenceTypes — what artifacts satisfy this standard
 *   • crossLinks — which existing modules this standard connects to
 *                  (we already built it elsewhere — links surface as
 *                  ready-made evidence options in the attestation UI)
 *
 * The registry is FROZEN. Adding standards is a code change that updates
 * the W360 drift guard baseline.
 *
 * Pure data — no DB, no I/O. Same pattern as
 * intelligence/care-planning.registry.js (W41) +
 * intelligence/measure-lifecycle.lib.js (W325 P2).
 */

// ─── Chapters (8 — subset of CBAHI's ~20 chapters that apply here) ──

const CHAPTERS = Object.freeze({
  PSG: { code: 'PSG', titleEn: 'Patient Safety Goals', titleAr: 'أهداف سلامة المريض' },
  MMS: { code: 'MMS', titleEn: 'Medication Management & Safety', titleAr: 'إدارة وسلامة الأدوية' },
  IC: { code: 'IC', titleEn: 'Infection Control', titleAr: 'مكافحة العدوى' },
  LD: { code: 'LD', titleEn: 'Leadership', titleAr: 'القيادة' },
  IM: { code: 'IM', titleEn: 'Information Management', titleAr: 'إدارة المعلومات' },
  ASC: { code: 'ASC', titleEn: 'Assessment of Patients', titleAr: 'تقييم المرضى' },
  PCC: { code: 'PCC', titleEn: 'Patient-Centered Care', titleAr: 'الرعاية المتمحورة حول المريض' },
  EOC: { code: 'EOC', titleEn: 'Environment of Care', titleAr: 'بيئة الرعاية' },
});

const CHAPTER_KEYS = Object.freeze(Object.keys(CHAPTERS));

// ─── Evidence type taxonomy ─────────────────────────────────────────

const EVIDENCE_TYPES = Object.freeze([
  'policy_document',
  'training_record',
  'audit_report',
  'incident_report',
  'capa_record',
  'log_or_register',
  'risk_assessment',
  'minutes_of_meeting',
  'inspection_record',
  'attestation_signed',
  'system_screenshot',
  'photograph',
  'video',
]);

// ─── Standards (20 — chapter-grouped) ────────────────────────────────

const STANDARDS = Object.freeze([
  // ── Patient Safety Goals (PSG) ──────────────────────────────────
  {
    key: 'PSG_PATIENT_ID_TWO_IDENTIFIERS',
    chapter: 'PSG',
    code: 'PSG.1',
    titleEn: 'Use of at least two patient identifiers',
    titleAr: 'استخدام معرّفَين على الأقل لكل مستفيد',
    requirement:
      'Every beneficiary is identified by at least two identifiers (full name + national ID / beneficiary number / DOB) before any service, medication, or procedure.',
    evidenceTypes: ['policy_document', 'training_record', 'audit_report'],
    crossLinks: ['Beneficiary', 'MedicationAdministrationRecord'],
  },
  {
    key: 'PSG_FALL_RISK_ASSESSMENT',
    chapter: 'PSG',
    code: 'PSG.6',
    titleEn: 'Fall risk assessment + reassessment',
    titleAr: 'تقييم خطر السقوط + إعادة التقييم',
    requirement:
      'On admission and at defined intervals, beneficiaries are screened for fall risk using a validated tool; high-risk cases get a documented mitigation plan.',
    evidenceTypes: ['policy_document', 'log_or_register', 'risk_assessment', 'training_record'],
    crossLinks: ['Assessment', 'CarePlanVersion'],
  },
  {
    key: 'PSG_RESTRAINT_SECLUSION_DOCUMENTED',
    chapter: 'PSG',
    code: 'PSG.7',
    titleEn: 'Restraint & seclusion documentation',
    titleAr: 'توثيق التقييد والعزل',
    requirement:
      'Every restraint / seclusion event is documented with timing, technique, supervisor notification, parent notification, debrief, and injury review (CBAHI + MOHRSD).',
    evidenceTypes: ['policy_document', 'log_or_register', 'audit_report'],
    crossLinks: ['RestraintSeclusionEvent'],
  },
  {
    key: 'PSG_SAFEGUARDING_INTAKE',
    chapter: 'PSG',
    code: 'PSG.8',
    titleEn: 'Safeguarding intake-to-closure pathway',
    titleAr: 'مسار حماية المستفيد من البلاغ إلى الإغلاق',
    requirement:
      'Documented pathway for receiving, triaging, investigating, and closing safeguarding concerns, with mandatory external reporting hooks (هيئة حقوق الإنسان / النيابة العامة).',
    evidenceTypes: ['policy_document', 'log_or_register', 'training_record', 'audit_report'],
    crossLinks: ['SafeguardingConcern'],
  },

  // ── Medication Management & Safety (MMS) ──────────────────────
  {
    key: 'MMS_HIGH_ALERT_DOUBLE_CHECK',
    chapter: 'MMS',
    code: 'MMS.4',
    titleEn: 'High-alert medication double-check',
    titleAr: 'التحقق المزدوج للأدوية عالية الخطورة',
    requirement:
      'High-alert medications (insulin, anticonvulsants, anticoagulants, opioids) require an independent double-check by a second qualified staff member at preparation + administration.',
    evidenceTypes: ['policy_document', 'log_or_register', 'training_record'],
    crossLinks: ['MedicationAdministrationRecord'],
  },
  {
    key: 'MMS_PRN_INDICATION_DOCUMENTED',
    chapter: 'MMS',
    code: 'MMS.5',
    titleEn: 'PRN medication indication + outcome',
    titleAr: 'دواعي الأدوية حسب الحاجة + النتيجة',
    requirement:
      'PRN doses are administered only against a documented indication; outcome is recorded within 30 minutes of administration.',
    evidenceTypes: ['log_or_register', 'audit_report'],
    crossLinks: ['MedicationAdministrationRecord', 'SeizureEvent'],
  },
  {
    key: 'MMS_CONTROLLED_SUBSTANCE_WITNESS',
    chapter: 'MMS',
    code: 'MMS.6',
    titleEn: 'Controlled substance witnessed administration',
    titleAr: 'مراقبة إعطاء المواد المراقبة',
    requirement:
      'Controlled substances require a witness signature on every administration; counts are reconciled per shift.',
    evidenceTypes: ['policy_document', 'log_or_register', 'inspection_record'],
    crossLinks: ['MedicationAdministrationRecord'],
  },

  // ── Infection Control (IC) ─────────────────────────────────────
  {
    key: 'IC_HAND_HYGIENE_PROGRAM',
    chapter: 'IC',
    code: 'IC.1',
    titleEn: 'Hand hygiene program',
    titleAr: 'برنامج نظافة اليدين',
    requirement:
      'Documented hand-hygiene policy, training, periodic compliance audits, alcohol-based rub at each point-of-care.',
    evidenceTypes: ['policy_document', 'training_record', 'audit_report', 'photograph'],
    crossLinks: [],
  },
  {
    key: 'IC_OUTBREAK_REPORTING',
    chapter: 'IC',
    code: 'IC.5',
    titleEn: 'Outbreak detection + reporting',
    titleAr: 'كشف التفشي والإبلاغ',
    requirement:
      'Cluster of communicable illness triggers a documented investigation + notification to local MOH within 24 hours.',
    evidenceTypes: ['policy_document', 'incident_report', 'log_or_register'],
    crossLinks: ['Incident'],
  },

  // ── Leadership (LD) ────────────────────────────────────────────
  {
    key: 'LD_GOVERNANCE_STRUCTURE',
    chapter: 'LD',
    code: 'LD.1',
    titleEn: 'Defined governance structure',
    titleAr: 'هيكل حوكمة محدد',
    requirement:
      'Center has a documented organizational chart, named accountable executives, and meeting cadence for quality + safety oversight.',
    evidenceTypes: ['policy_document', 'minutes_of_meeting'],
    crossLinks: [],
  },
  {
    key: 'LD_CAPA_PROGRAM',
    chapter: 'LD',
    code: 'LD.4',
    titleEn: 'CAPA program — Corrective + Preventive Actions',
    titleAr: 'برنامج الإجراءات التصحيحية والوقائية',
    requirement:
      'Documented CAPA program: every audit/RCA/FMEA finding produces a CAPA item with owner, due date, verification, closure.',
    evidenceTypes: ['policy_document', 'capa_record', 'audit_report'],
    crossLinks: ['CapaItem'],
  },

  // ── Information Management (IM) ────────────────────────────────
  {
    key: 'IM_RECORD_RETENTION_PDPL',
    chapter: 'IM',
    code: 'IM.2',
    titleEn: 'Health record retention + PDPL',
    titleAr: 'الاحتفاظ بالسجلات الصحية وحماية البيانات',
    requirement:
      'Health records retained ≥ 10 years (adults) / ≥ child age 21 (minors). PII access logged. PDPL consent documented for each data-use scenario.',
    evidenceTypes: ['policy_document', 'system_screenshot', 'attestation_signed'],
    crossLinks: ['Consent', 'AuditLog'],
  },
  {
    key: 'IM_RECORD_TIMELINESS',
    chapter: 'IM',
    code: 'IM.4',
    titleEn: 'Record documentation timeliness',
    titleAr: 'توقيت توثيق السجلات',
    requirement:
      'Clinical entries are completed within 24 hours of service delivery; late entries are flagged with date/time of original event vs. entry.',
    evidenceTypes: ['policy_document', 'audit_report', 'system_screenshot'],
    crossLinks: ['TherapySession', 'CarePlanVersion'],
  },

  // ── Assessment of Patients (ASC) ───────────────────────────────
  {
    key: 'ASC_INITIAL_ASSESSMENT_BAND',
    chapter: 'ASC',
    code: 'ASC.1',
    titleEn: 'Initial assessment within defined timeframe',
    titleAr: 'التقييم الأولي خلال إطار زمني محدد',
    requirement:
      'Every newly enrolled beneficiary receives a multidisciplinary initial assessment within the policy-defined timeframe (typically 14 days).',
    evidenceTypes: ['policy_document', 'audit_report'],
    crossLinks: ['Assessment', 'CarePlanVersion'],
  },
  {
    key: 'ASC_REASSESSMENT_INTERVAL',
    chapter: 'ASC',
    code: 'ASC.3',
    titleEn: 'Reassessment at defined intervals',
    titleAr: 'إعادة التقييم في فترات محددة',
    requirement:
      'Each domain measure is reassessed at the interval defined in the measure lifecycle library (default 90 days). Overdue reassessments are surfaced + actioned.',
    evidenceTypes: ['log_or_register', 'audit_report', 'system_screenshot'],
    crossLinks: ['MeasurementMaster', 'CarePlanVersion'],
  },

  // ── Patient-Centered Care (PCC) ────────────────────────────────
  {
    key: 'PCC_INFORMED_CONSENT',
    chapter: 'PCC',
    code: 'PCC.2',
    titleEn: 'Informed consent for treatment',
    titleAr: 'الموافقة المستنيرة على العلاج',
    requirement:
      'Documented informed consent for each defined consent type, with Arabic-language explanation, signatory + date, withdrawal mechanism.',
    evidenceTypes: ['policy_document', 'attestation_signed', 'audit_report'],
    crossLinks: ['Consent'],
  },
  {
    key: 'PCC_FAMILY_INVOLVEMENT',
    chapter: 'PCC',
    code: 'PCC.4',
    titleEn: 'Family involvement in care planning',
    titleAr: 'إشراك الأسرة في تخطيط الرعاية',
    requirement:
      'Family/guardian receives the care plan in Arabic-language, plain-language form. Family role + home program are documented in each plan version.',
    evidenceTypes: ['policy_document', 'log_or_register', 'audit_report'],
    crossLinks: ['CarePlanVersion'],
  },

  // ── Environment of Care (EOC) ──────────────────────────────────
  {
    key: 'EOC_FIRE_DRILLS',
    chapter: 'EOC',
    code: 'EOC.3',
    titleEn: 'Fire drills + emergency egress',
    titleAr: 'تدريبات الحريق وممرات الإخلاء',
    requirement:
      'Documented fire drills ≥ 4 per year, evacuation route signage in Arabic + English + braille where applicable.',
    evidenceTypes: ['policy_document', 'inspection_record', 'log_or_register', 'photograph'],
    crossLinks: [],
  },
  {
    key: 'EOC_MEDICAL_EQUIPMENT_PPM',
    chapter: 'EOC',
    code: 'EOC.5',
    titleEn: 'Medical equipment preventive maintenance',
    titleAr: 'الصيانة الوقائية للأجهزة الطبية',
    requirement:
      'All medical equipment (including loaned assistive devices) is on a documented preventive-maintenance schedule with calibration where applicable.',
    evidenceTypes: ['log_or_register', 'inspection_record', 'system_screenshot'],
    crossLinks: ['AssistiveDevice'],
  },
  {
    key: 'EOC_ACCESSIBLE_FACILITIES',
    chapter: 'EOC',
    code: 'EOC.7',
    titleEn: 'Accessibility for persons with disabilities',
    titleAr: 'إمكانية الوصول لذوي الإعاقة',
    requirement:
      'Building entry/exit, restrooms, treatment rooms accessible per Saudi accessibility code (ramp slopes, door widths, restroom grab bars, signage, accessible parking).',
    evidenceTypes: ['inspection_record', 'photograph', 'attestation_signed'],
    crossLinks: [],
  },
]);

const STANDARD_BY_KEY = Object.freeze(
  STANDARDS.reduce((acc, s) => {
    acc[s.key] = s;
    return acc;
  }, {})
);

const STANDARDS_BY_CHAPTER = Object.freeze(
  STANDARDS.reduce((acc, s) => {
    if (!acc[s.chapter]) acc[s.chapter] = [];
    acc[s.chapter].push(s);
    return acc;
  }, {})
);

// ─── Helpers ──────────────────────────────────────────────────────

function findStandard(key) {
  return STANDARD_BY_KEY[key] || null;
}

function listChapter(chapterKey) {
  return STANDARDS_BY_CHAPTER[chapterKey] || [];
}

function allKeys() {
  return STANDARDS.map(s => s.key);
}

module.exports = {
  CHAPTERS,
  CHAPTER_KEYS,
  EVIDENCE_TYPES,
  STANDARDS,
  STANDARD_BY_KEY,
  STANDARDS_BY_CHAPTER,
  findStandard,
  listChapter,
  allKeys,
};
