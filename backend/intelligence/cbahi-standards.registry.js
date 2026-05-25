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

  // ═════════════════════════════════════════════════════════════════
  // W367 expansion (2026-05-25) — 25 additional standards bringing the
  // starter set from 20 → 45 across the same 8 chapters.
  // ═════════════════════════════════════════════════════════════════

  // ── PSG additions ─────────────────────────────────────────────
  {
    key: 'PSG_ALLERGY_MANAGEMENT',
    chapter: 'PSG',
    code: 'PSG.2',
    titleEn: 'Allergy + sensitivity management',
    titleAr: 'إدارة الحساسية',
    requirement:
      'Every beneficiary record carries a verified allergy list updated at each visit. High-risk allergies (medication, latex, food, environmental) are flagged at point-of-care.',
    evidenceTypes: ['policy_document', 'system_screenshot', 'audit_report'],
    crossLinks: ['Beneficiary', 'MedicationAdministrationRecord'],
  },
  {
    key: 'PSG_HANDOFF_COMMUNICATION',
    chapter: 'PSG',
    code: 'PSG.3',
    titleEn: 'Structured handoff communication',
    titleAr: 'تواصل التسليم المنظّم',
    requirement:
      'Shift-change + cross-discipline handoffs use a structured tool (SBAR / I-PASS) documented per beneficiary; verbal-only handoffs are not permitted for high-risk cases.',
    evidenceTypes: ['policy_document', 'training_record', 'audit_report'],
    crossLinks: [],
  },
  {
    key: 'PSG_SEIZURE_RESPONSE',
    chapter: 'PSG',
    code: 'PSG.9',
    titleEn: 'Seizure response + escalation pathway',
    titleAr: 'الاستجابة للنوبات الصرعية',
    requirement:
      'Documented pathway for observing, timing, and escalating seizures including rescue medication PRN orders, status-epilepticus (≥5 min) emergency protocol, and parent notification SLA.',
    evidenceTypes: ['policy_document', 'log_or_register', 'training_record'],
    crossLinks: ['SeizureEvent', 'MedicationAdministrationRecord'],
  },

  // ── MMS additions ─────────────────────────────────────────────
  {
    key: 'MMS_STORAGE_TEMPERATURE',
    chapter: 'MMS',
    code: 'MMS.2',
    titleEn: 'Medication storage temperature monitoring',
    titleAr: 'مراقبة درجة حرارة تخزين الأدوية',
    requirement:
      'All medication storage areas (room temp + refrigerated + frozen) have continuous temperature monitoring; out-of-range alarms trigger documented response within 30 minutes.',
    evidenceTypes: ['log_or_register', 'inspection_record', 'system_screenshot'],
    crossLinks: [],
  },
  {
    key: 'MMS_NARCOTIC_INVENTORY',
    chapter: 'MMS',
    code: 'MMS.7',
    titleEn: 'Narcotic + controlled substance inventory',
    titleAr: 'جرد المواد المخدرة والمراقبة',
    requirement:
      'Per-shift narcotic count with two-signature reconciliation. Variance investigations documented + closed within 24h. Disposal witnessed + recorded.',
    evidenceTypes: ['log_or_register', 'attestation_signed', 'audit_report'],
    crossLinks: ['MedicationAdministrationRecord'],
  },
  {
    key: 'MMS_PATIENT_EDUCATION',
    chapter: 'MMS',
    code: 'MMS.8',
    titleEn: 'Medication patient + family education',
    titleAr: 'تثقيف المستفيد والأسرة عن الأدوية',
    requirement:
      'Each newly prescribed medication: documented education to family in Arabic covering dose / schedule / side-effects / interactions / when to call. Re-education on dose changes.',
    evidenceTypes: ['policy_document', 'log_or_register', 'audit_report'],
    crossLinks: ['Consent'],
  },

  // ── IC additions ──────────────────────────────────────────────
  {
    key: 'IC_ISOLATION_PRECAUTIONS',
    chapter: 'IC',
    code: 'IC.2',
    titleEn: 'Isolation precaution protocols',
    titleAr: 'بروتوكولات العزل الوقائية',
    requirement:
      'Documented standard / contact / droplet / airborne precaution criteria; PPE availability at point-of-care; signage in Arabic + English; staff training annual.',
    evidenceTypes: ['policy_document', 'training_record', 'photograph'],
    crossLinks: [],
  },
  {
    key: 'IC_STERILIZATION_REPROCESSING',
    chapter: 'IC',
    code: 'IC.3',
    titleEn: 'Reusable equipment sterilization + reprocessing',
    titleAr: 'تعقيم وإعادة معالجة الأجهزة',
    requirement:
      'Per-cycle biological + chemical indicator records for autoclave + ETO; failed cycles trigger documented reprocessing of affected items + recall procedure.',
    evidenceTypes: ['log_or_register', 'inspection_record', 'audit_report'],
    crossLinks: ['AssistiveDevice'],
  },
  {
    key: 'IC_BLOODBORNE_EXPOSURE',
    chapter: 'IC',
    code: 'IC.4',
    titleEn: 'Bloodborne pathogen exposure response',
    titleAr: 'الاستجابة للتعرض للأمراض المنقولة بالدم',
    requirement:
      'Documented post-exposure protocol with source-testing + prophylaxis decision tree; exposed staff get follow-up at 6 weeks / 3 months / 6 months. PEP within 2 hours of exposure.',
    evidenceTypes: ['policy_document', 'incident_report', 'log_or_register'],
    crossLinks: ['Incident'],
  },

  // ── LD additions ──────────────────────────────────────────────
  {
    key: 'LD_QUALITY_IMPROVEMENT_PROGRAM',
    chapter: 'LD',
    code: 'LD.2',
    titleEn: 'Quality improvement program',
    titleAr: 'برنامج تحسين الجودة',
    requirement:
      'Annual quality plan with measurable indicators per discipline; quarterly indicator dashboards + improvement projects with PDCA documentation.',
    evidenceTypes: ['policy_document', 'minutes_of_meeting', 'audit_report'],
    crossLinks: ['CapaItem'],
  },
  {
    key: 'LD_ETHICS_COMMITTEE',
    chapter: 'LD',
    code: 'LD.3',
    titleEn: 'Clinical ethics committee',
    titleAr: 'لجنة الأخلاقيات السريرية',
    requirement:
      'Standing ethics committee with documented charter, meeting cadence (≥ quarterly), and on-call consultation pathway for case-level ethical questions.',
    evidenceTypes: ['policy_document', 'minutes_of_meeting'],
    crossLinks: [],
  },
  {
    key: 'LD_STAFF_COMPETENCY',
    chapter: 'LD',
    code: 'LD.5',
    titleEn: 'Staff competency assessment',
    titleAr: 'تقييم كفاءة الموظفين',
    requirement:
      'Every clinical staff member has documented initial + annual competency assessment per discipline; remediation plans for failures.',
    evidenceTypes: ['training_record', 'attestation_signed', 'audit_report'],
    crossLinks: [],
  },

  // ── IM additions ──────────────────────────────────────────────
  {
    key: 'IM_DOWNTIME_PROCEDURES',
    chapter: 'IM',
    code: 'IM.6',
    titleEn: 'EHR downtime procedures',
    titleAr: 'إجراءات تعطل النظام الإلكتروني',
    requirement:
      'Documented paper-based fallback procedures + downtime forms; planned downtime drills ≥ annual; post-downtime data entry within 24 hours.',
    evidenceTypes: ['policy_document', 'inspection_record', 'log_or_register'],
    crossLinks: [],
  },
  {
    key: 'IM_DATA_BACKUP_RECOVERY',
    chapter: 'IM',
    code: 'IM.7',
    titleEn: 'Data backup + recovery testing',
    titleAr: 'النسخ الاحتياطي واستعادة البيانات',
    requirement:
      'Daily backup of clinical data with off-site replication. Recovery drills tested ≥ annually with documented RTO + RPO + post-test review.',
    evidenceTypes: ['policy_document', 'system_screenshot', 'audit_report'],
    crossLinks: [],
  },

  // ── ASC additions ─────────────────────────────────────────────
  {
    key: 'ASC_PAIN_ASSESSMENT',
    chapter: 'ASC',
    code: 'ASC.5',
    titleEn: 'Pain assessment + reassessment',
    titleAr: 'تقييم الألم وإعادة التقييم',
    requirement:
      'Validated age-appropriate + cognition-appropriate pain scales (FLACC, Wong-Baker, Numeric, PAINAD); pain reassessment 30 min after intervention.',
    evidenceTypes: ['policy_document', 'log_or_register', 'audit_report'],
    crossLinks: ['Assessment'],
  },
  {
    key: 'ASC_NUTRITIONAL_SCREENING',
    chapter: 'ASC',
    code: 'ASC.6',
    titleEn: 'Nutritional screening + assessment',
    titleAr: 'فحص وتقييم التغذية',
    requirement:
      'Initial screen within defined timeframe; positive screen triggers RD consultation. Dysphagia screening for beneficiaries with neurological disability.',
    evidenceTypes: ['policy_document', 'log_or_register', 'audit_report'],
    crossLinks: ['Assessment', 'CarePlanVersion'],
  },
  {
    key: 'ASC_PSYCHOSOCIAL_ASSESSMENT',
    chapter: 'ASC',
    code: 'ASC.7',
    titleEn: 'Psychosocial assessment',
    titleAr: 'التقييم النفسي والاجتماعي',
    requirement:
      'Family functioning + social-environment + mental-health screen integrated into initial assessment; positive screens link to social worker + counseling referral.',
    evidenceTypes: ['policy_document', 'log_or_register'],
    crossLinks: ['Assessment', 'CarePlanVersion'],
  },

  // ── PCC additions ─────────────────────────────────────────────
  {
    key: 'PCC_PATIENT_RIGHTS',
    chapter: 'PCC',
    code: 'PCC.1',
    titleEn: 'Patient + family rights and responsibilities',
    titleAr: 'حقوق ومسؤوليات المستفيد والأسرة',
    requirement:
      'Posted patient-rights statement in Arabic + English at every public area; documented on admission with signature; staff training annual.',
    evidenceTypes: ['policy_document', 'photograph', 'training_record'],
    crossLinks: ['Consent'],
  },
  {
    key: 'PCC_COMPLAINT_HANDLING',
    chapter: 'PCC',
    code: 'PCC.5',
    titleEn: 'Complaint + grievance handling',
    titleAr: 'معالجة الشكاوى',
    requirement:
      'Documented complaint pathway with acknowledged-within-72h + closed-within-30d SLAs; complaints reviewed for safety implications + linked to CAPA where warranted.',
    evidenceTypes: ['policy_document', 'log_or_register', 'capa_record'],
    crossLinks: ['CapaItem'],
  },
  {
    key: 'PCC_ADVANCE_DIRECTIVES',
    chapter: 'PCC',
    code: 'PCC.6',
    titleEn: 'Advance directives + end-of-life preferences',
    titleAr: 'التوجيهات المسبقة وتفضيلات نهاية الحياة',
    requirement:
      'Adult beneficiaries + guardians of minors offered documented end-of-life preference conversation; preferences in EHR + accessible at point-of-care.',
    evidenceTypes: ['policy_document', 'attestation_signed', 'log_or_register'],
    crossLinks: ['Consent'],
  },

  // ── EOC additions ─────────────────────────────────────────────
  {
    key: 'EOC_WATER_SAFETY',
    chapter: 'EOC',
    code: 'EOC.8',
    titleEn: 'Water + Legionella safety',
    titleAr: 'سلامة المياه ومكافحة بكتيريا الليجيونيلا',
    requirement:
      'Water system risk assessment + temperature + biocide monitoring + Legionella culturing per Saudi regulations.',
    evidenceTypes: ['policy_document', 'log_or_register', 'inspection_record'],
    crossLinks: [],
  },
  {
    key: 'EOC_OXYGEN_MEDICAL_GAS',
    chapter: 'EOC',
    code: 'EOC.9',
    titleEn: 'Medical oxygen + medical gas safety',
    titleAr: 'سلامة الأوكسجين والغازات الطبية',
    requirement:
      'Cylinder storage + transport + change-out procedures; pressure monitoring; staff competency for any beneficiary on supplemental oxygen.',
    evidenceTypes: ['policy_document', 'inspection_record', 'training_record'],
    crossLinks: [],
  },
  {
    key: 'EOC_ELECTRICAL_SAFETY',
    chapter: 'EOC',
    code: 'EOC.10',
    titleEn: 'Electrical safety + biomedical equipment',
    titleAr: 'السلامة الكهربائية والأجهزة الحيوية',
    requirement:
      'Annual electrical-safety inspection of patient-contact equipment; leak-current testing; portable-equipment register with PAT certificates.',
    evidenceTypes: ['inspection_record', 'log_or_register'],
    crossLinks: ['AssistiveDevice'],
  },
  {
    key: 'EOC_BIOMEDICAL_WASTE',
    chapter: 'EOC',
    code: 'EOC.11',
    titleEn: 'Biomedical + sharps waste management',
    titleAr: 'إدارة النفايات الطبية والحادة',
    requirement:
      'Segregated waste streams (general / infectious / sharps / pharmaceutical) with color-coded containers; manifest tracking from point-of-generation to licensed disposal.',
    evidenceTypes: ['policy_document', 'log_or_register', 'inspection_record', 'photograph'],
    crossLinks: [],
  },
  {
    key: 'EOC_CODE_RESPONSE',
    chapter: 'EOC',
    code: 'EOC.12',
    titleEn: 'Emergency code response (medical + security)',
    titleAr: 'استجابة حالات الطوارئ والكودات',
    requirement:
      'Documented code-blue (cardiac arrest), code-pink (infant/child abduction), code-orange (hazmat), code-grey (security/aggressive person) procedures. Drills ≥ 2 per code per year.',
    evidenceTypes: ['policy_document', 'training_record', 'log_or_register'],
    crossLinks: ['SafeguardingConcern'],
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
