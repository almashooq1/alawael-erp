'use strict';

/**
 * control-library.registry.js — Phase 13 Commit 4 (4.0.58).
 *
 * Canonical catalogue of quality & regulatory controls for Saudi
 * rehabilitation day-care centers. Each entry is one testable
 * assertion: "as of date X, the branch operates in conformance
 * with regulatory clause Y". A control is *passed* when fresh
 * evidence satisfies its test method; *failed* when the evidence
 * is missing, expired, or explicitly contradicts the assertion.
 *
 * Pure data + pure helpers. No I/O. Safe to require from any
 * layer. The service layer (controlLibrary.service) seeds these
 * into the `QualityControl` collection on boot and drives
 * control-test runs against them.
 *
 * Regulation coverage:
 *
 *   CBAHI (Saudi Central Board for Accreditation of Healthcare
 *         Institutions)     — patient safety, provision of care,
 *                              workforce, facility, leadership
 *   JCI   (Joint Commission International) — IPSG, ACC, PCC,
 *                              AOP, COP, ASC, MMU, GLD, FMS,
 *                              SQE, PCI, QPS, MCI
 *   MOH   (Saudi Ministry of Health) — licensing + reporting
 *   ISO 9001:2015           — QMS clauses §4–§10
 *   ISO 27001 Annex A       — selected controls relevant to
 *                              health ops (A.5, A.8, A.9, A.12,
 *                              A.16, A.18)
 *   PDPL  (Saudi Personal Data Protection Law) — articles 5-7,
 *         12-16, 21, 35 (consent, minimisation, breach, transfer)
 *   HRSD  (Ministry of Human Resources & Social Development) —
 *         labor law + GOSI + WPS
 *   SFDA  (Saudi Food & Drug Authority) — device/drug handling
 *         where relevant
 *
 * Testability levels:
 *   `automatic`  — a query against app state (e.g. "no staff with
 *                  expired license") runs in the service; pass/
 *                  fail derived directly from the DB
 *   `evidenced`  — requires a human-attested EvidenceItem within
 *                  a validity window
 *   `manual`     — a human tester records the result (yes/no +
 *                  narrative) on a control-test run
 */

// ── vocabulary ─────────────────────────────────────────────────────

const CONTROL_CATEGORIES = Object.freeze([
  'patient_safety',
  'provision_of_care',
  'medication',
  'infection_control',
  'workforce',
  'training',
  'facility_safety',
  'emergency_preparedness',
  'leadership_governance',
  'quality_improvement',
  'data_privacy',
  'information_security',
  'financial_controls',
  'procurement',
  'transport',
  'beneficiary_rights',
]);

const CONTROL_TYPES = Object.freeze(['preventive', 'detective', 'corrective', 'directive']);

const CONTROL_FREQUENCIES = Object.freeze([
  'continuous', // always-on invariant (e.g. access-control)
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'on_event', // triggered by a specific event (e.g. incident)
]);

const CONTROL_CRITICALITY = Object.freeze(['low', 'medium', 'high', 'critical']);

const CONTROL_TEST_METHODS = Object.freeze(['automatic', 'evidenced', 'manual']);

const CONTROL_STATUSES = Object.freeze(['active', 'deprecated', 'not_applicable']);

const TEST_RESULT_OUTCOMES = Object.freeze([
  'pass',
  'fail',
  'partial',
  'not_tested',
  'not_applicable',
]);

// ── The 60-control library ─────────────────────────────────────────
//
// Convention: id = "<framework>.<domain>.<seq>". Each has:
//   id, nameAr, nameEn, category, type, frequency, criticality,
//   testMethod, regulationRefs[], assertion (short sentence),
//   evidencePolicy (retention override if any),
//   autoTestHint? (for `automatic` — tells the service which
//                  adapter to run)
//
// This list is deliberately opinionated for a Saudi rehab day-care.
// Organisations can extend via `extraControls` in org settings
// (Phase 13 C11).

const CONTROL_LIBRARY = Object.freeze([
  // ── CBAHI / JCI — Patient Safety (IPSG) ─────────────────────────
  {
    id: 'cbahi.ps.01',
    nameAr: 'التحقق من هوية المستفيد قبل كل إجراء',
    nameEn: 'Correct beneficiary identification before every procedure',
    category: 'patient_safety',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'manual',
    regulationRefs: [
      { standard: 'cbahi', clause: 'PS.1' },
      { standard: 'jci', clause: 'IPSG.1' },
    ],
    assertion: 'Two-identifier check (name + ID) documented before any care episode.',
  },
  {
    id: 'cbahi.ps.02',
    nameAr: 'الاتصال الفعّال في التسليم السريري',
    nameEn: 'Effective handover communication (SBAR)',
    category: 'patient_safety',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'IPSG.2' }],
    assertion: 'SBAR handover form present for every shift change.',
  },
  {
    id: 'cbahi.ps.03',
    nameAr: 'منع السقوط',
    nameEn: 'Fall risk assessment on admission',
    category: 'patient_safety',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'jci', clause: 'IPSG.6' }],
    assertion: 'Every beneficiary admission has a fall-risk score recorded.',
    autoTestHint: { check: 'fall_assessment_on_admission' },
  },
  {
    id: 'cbahi.ps.04',
    nameAr: 'التبليغ عن الأحداث الخطرة',
    nameEn: 'Sentinel events reported within 24h',
    category: 'patient_safety',
    type: 'detective',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [
      { standard: 'cbahi', clause: 'PS.9' },
      { standard: 'moh', clause: 'circular-2020-112' },
    ],
    assertion: 'No sentinel incident remained unreported beyond 24h.',
    autoTestHint: { check: 'sentinel_reporting_sla' },
  },

  // ── CBAHI — Provision of Care (PR) ─────────────────────────────
  {
    id: 'cbahi.pr.01',
    nameAr: 'خطة رعاية فردية لكل مستفيد',
    nameEn: 'Individualised Care Plan within 72h of admission',
    category: 'provision_of_care',
    type: 'directive',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'cbahi', clause: 'PR.1' }],
    assertion: 'Every beneficiary has an approved care plan within 72h.',
    autoTestHint: { check: 'care_plan_72h' },
  },
  {
    id: 'cbahi.pr.02',
    nameAr: 'إعادة تقييم دوري كل 90 يوم',
    nameEn: 'Periodic reassessment every 90 days',
    category: 'provision_of_care',
    type: 'detective',
    frequency: 'quarterly',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'cbahi', clause: 'PR.3' }],
    assertion: 'No beneficiary overdue on 90-day reassessment.',
    autoTestHint: { check: 'reassessment_overdue' },
  },
  {
    id: 'cbahi.pr.03',
    nameAr: 'موافقة مستنيرة للخدمات العلاجية',
    nameEn: 'Informed consent for therapeutic services',
    category: 'provision_of_care',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [
      { standard: 'cbahi', clause: 'PR.2' },
      { standard: 'jci', clause: 'PCC.6' },
    ],
    assertion: 'Signed informed-consent form stored for every new service.',
  },
  {
    id: 'cbahi.pr.04',
    nameAr: 'تقييم متعدد التخصصات للاحتياجات',
    nameEn: 'Multidisciplinary needs assessment',
    category: 'provision_of_care',
    type: 'directive',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'AOP.1' }],
    assertion: 'Initial assessment by ≥3 disciplines recorded.',
  },

  // ── CBAHI — Medication & Clinical Ops ──────────────────────────
  {
    id: 'cbahi.med.01',
    nameAr: 'مطابقة الأدوية عند القبول والخروج',
    nameEn: 'Medication reconciliation on admission & discharge',
    category: 'medication',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'IPSG.3' }],
    assertion: 'Medication list reconciled and signed at admission+discharge.',
  },
  {
    id: 'cbahi.med.02',
    nameAr: 'التحكم في الأدوية عالية الخطورة',
    nameEn: 'High-alert medication controls',
    category: 'medication',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'manual',
    regulationRefs: [{ standard: 'jci', clause: 'MMU.7' }],
    assertion: 'Double-check + restricted access logged for high-alert drugs.',
  },

  // ── Infection Control (PCI) ────────────────────────────────────
  {
    id: 'cbahi.pci.01',
    nameAr: 'التزام نظافة اليدين',
    nameEn: 'Hand hygiene compliance',
    category: 'infection_control',
    type: 'preventive',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'manual',
    regulationRefs: [{ standard: 'jci', clause: 'PCI.9' }],
    assertion: 'Hand-hygiene audit ≥80% compliance, monthly.',
  },
  {
    id: 'cbahi.pci.02',
    nameAr: 'عزل الحالات المعدية',
    nameEn: 'Isolation of infectious cases',
    category: 'infection_control',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'manual',
    regulationRefs: [{ standard: 'jci', clause: 'PCI.8' }],
    assertion: 'Suspected infectious cases isolated within 1h of identification.',
  },

  // ── CBAHI — Workforce (HR / SQE) ───────────────────────────────
  {
    id: 'cbahi.hr.01',
    nameAr: 'سريان تراخيص المهنيين الصحيين',
    nameEn: 'Active SCFHS licensure for all clinical staff',
    category: 'workforce',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [
      { standard: 'cbahi', clause: 'HR.2' },
      { standard: 'moh', clause: 'scfhs-regulations' },
    ],
    assertion: 'No clinical staff with expired SCFHS license.',
    autoTestHint: { check: 'scfhs_licenses_valid' },
  },
  {
    id: 'cbahi.hr.02',
    nameAr: 'التطوير المهني المستمر (CPE)',
    nameEn: 'CPE hours within SCFHS requirement',
    category: 'training',
    type: 'directive',
    frequency: 'annual',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'scfhs', clause: 'cpe-policy' }],
    assertion: 'All clinical staff meet annual CPE hour requirement.',
    autoTestHint: { check: 'cpe_compliance' },
  },
  {
    id: 'cbahi.hr.03',
    nameAr: 'التدريب الإلزامي السنوي',
    nameEn: 'Mandatory annual training completion',
    category: 'training',
    type: 'directive',
    frequency: 'annual',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'cbahi', clause: 'HR.4' }],
    assertion: 'Annual training completion rate ≥95% for all staff.',
    autoTestHint: { check: 'mandatory_training_rate' },
  },
  {
    id: 'cbahi.hr.04',
    nameAr: 'تقييم الأداء السنوي',
    nameEn: 'Annual performance appraisal completed',
    category: 'workforce',
    type: 'detective',
    frequency: 'annual',
    criticality: 'medium',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'cbahi', clause: 'HR.6' }],
    assertion: 'Every employee has a documented annual appraisal.',
  },
  {
    id: 'cbahi.hr.05',
    nameAr: 'خلوّ السجل العدلي وفحص المخدرات',
    nameEn: 'Background + drug screening on hire',
    category: 'workforce',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'moh', clause: 'hiring-2021' }],
    assertion: 'All new hires have background + drug-screen evidence on file.',
  },

  // ── Facility & Emergency (FMS) ─────────────────────────────────
  {
    id: 'cbahi.fms.01',
    nameAr: 'تجربة إخلاء الحريق ربع السنوية',
    nameEn: 'Quarterly fire evacuation drill',
    category: 'emergency_preparedness',
    type: 'directive',
    frequency: 'quarterly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [
      { standard: 'cbahi', clause: 'FMS.7' },
      { standard: 'jci', clause: 'FMS.11' },
      { standard: 'civil_defense', clause: 'code-201' },
    ],
    assertion: 'Fire drill conducted and documented each quarter.',
  },
  {
    id: 'cbahi.fms.02',
    nameAr: 'صلاحية رخصة الدفاع المدني',
    nameEn: 'Valid civil defence permit',
    category: 'facility_safety',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'civil_defense', clause: 'license' }],
    assertion: 'Civil defence permit active with ≥30-day buffer before expiry.',
  },
  {
    id: 'cbahi.fms.03',
    nameAr: 'صيانة دورية لمعدات السلامة',
    nameEn: 'Preventive maintenance on life-safety equipment',
    category: 'facility_safety',
    type: 'preventive',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'FMS.5' }],
    assertion: 'Monthly PM records for fire pumps, alarms, emergency lights.',
  },
  {
    id: 'cbahi.fms.04',
    nameAr: 'فحص مركبات النقل',
    nameEn: 'Vehicle safety inspections',
    category: 'transport',
    type: 'preventive',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'moh', clause: 'transport-2022' }],
    assertion: 'All transport vehicles have current monthly inspection log.',
  },
  {
    id: 'cbahi.fms.05',
    nameAr: 'رخصة قيادة سارية لجميع السائقين',
    nameEn: 'All drivers hold valid licenses',
    category: 'transport',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'hrsd', clause: 'traffic' }],
    assertion: 'No driver with expired license.',
    autoTestHint: { check: 'driver_licenses_valid' },
  },

  // ── Leadership & Governance (LD / GLD) ─────────────────────────
  {
    id: 'cbahi.ld.01',
    nameAr: 'مراجعة الإدارة وفق ISO 9.3',
    nameEn: 'Management Review twice yearly (ISO §9.3)',
    category: 'leadership_governance',
    type: 'directive',
    frequency: 'semi_annual',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [
      { standard: 'iso_9001', clause: '9.3' },
      { standard: 'cbahi', clause: 'LD.4' },
    ],
    assertion: 'At least two closed Management Reviews in rolling 12 months.',
    autoTestHint: { check: 'management_review_cadence' },
  },
  {
    id: 'cbahi.ld.02',
    nameAr: 'سياسات مُعتمدة ومُراجعة سنوياً',
    nameEn: 'Policies reviewed and approved annually',
    category: 'leadership_governance',
    type: 'preventive',
    frequency: 'annual',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'cbahi', clause: 'LD.2' }],
    assertion: 'No policy older than 12 months without review.',
  },
  {
    id: 'cbahi.ld.03',
    nameAr: 'سجل المخاطر مُراجع ربع سنوياً',
    nameEn: 'Risk register reviewed quarterly',
    category: 'leadership_governance',
    type: 'detective',
    frequency: 'quarterly',
    criticality: 'medium',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'iso_9001', clause: '6.1' }],
    assertion: 'Risk register has quarterly review evidence.',
  },

  // ── Quality Improvement (QPS) ──────────────────────────────────
  {
    id: 'cbahi.qps.01',
    nameAr: 'إغلاق CAPA خلال الوقت المحدد',
    nameEn: 'CAPAs closed within target SLA',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_9001', clause: '10.2' }],
    assertion: 'CAPA closure rate ≥85% within SLA.',
    autoTestHint: { check: 'capa_closure_sla' },
  },
  {
    id: 'cbahi.qps.02',
    nameAr: 'إجراءات تصحيحية فعالة (verify)',
    nameEn: 'CAPA effectiveness verified post-close',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'iso_9001', clause: '10.2.1.e' }],
    assertion: 'Each closed CAPA has effectiveness-check evidence.',
  },
  {
    id: 'cbahi.qps.03',
    nameAr: 'قياس رضا المستفيدين',
    nameEn: 'Beneficiary satisfaction measured',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'quarterly',
    criticality: 'medium',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_9001', clause: '9.1.2' }],
    assertion: 'Satisfaction survey administered each quarter; NPS ≥ 50.',
    autoTestHint: { check: 'satisfaction_survey_cadence' },
  },
  {
    id: 'cbahi.qps.04',
    nameAr: 'تقصّي أسباب الجذر للأحداث الخطرة',
    nameEn: 'RCA performed on every sentinel event',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'QPS.11' }],
    assertion: 'Every sentinel event has documented RCA + action plan.',
  },
  {
    id: 'cbahi.qps.05',
    nameAr: 'اتجاه مؤشرات الجودة',
    nameEn: 'Quality KPI trends monitored',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'medium',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_9001', clause: '9.1.3' }],
    assertion: 'All mandatory KPIs have ≥6 months of data + trend analysis.',
    autoTestHint: { check: 'kpi_trend_coverage' },
  },
  {
    id: 'cbahi.qps.06',
    nameAr: 'التدقيق الداخلي وفق الخطة السنوية',
    nameEn: 'Internal audits on schedule',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'annual',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_9001', clause: '9.2' }],
    assertion: 'Annual audit plan executed at ≥95%.',
    autoTestHint: { check: 'internal_audit_execution' },
  },

  // ── Beneficiary Rights (PCC) ───────────────────────────────────
  {
    id: 'cbahi.br.01',
    nameAr: 'ميثاق حقوق المستفيد وإعلانه',
    nameEn: 'Beneficiary rights charter posted & acknowledged',
    category: 'beneficiary_rights',
    type: 'directive',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'jci', clause: 'PCC.1' }],
    assertion: 'Rights charter acknowledgement signed by beneficiary / guardian.',
  },
  {
    id: 'cbahi.br.02',
    nameAr: 'آلية الشكاوى وحل الشكوى خلال 14 يوم',
    nameEn: 'Complaint resolution within 14 days',
    category: 'beneficiary_rights',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'cbahi', clause: 'BR.5' }],
    assertion: 'Complaint resolution SLA adherence ≥95%.',
    autoTestHint: { check: 'complaint_sla' },
  },

  // ── Data Privacy (PDPL) ────────────────────────────────────────
  {
    id: 'pdpl.01',
    nameAr: 'موافقة المستفيد على معالجة البيانات',
    nameEn: 'Documented consent for personal-data processing',
    category: 'data_privacy',
    type: 'preventive',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'pdpl', clause: 'art-6' }],
    assertion: 'Every data subject has a recorded consent with purpose + scope.',
  },
  {
    id: 'pdpl.02',
    nameAr: 'الإبلاغ عن انتهاك البيانات خلال 72 ساعة',
    nameEn: 'Data breach reporting within 72h',
    category: 'data_privacy',
    type: 'corrective',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'pdpl', clause: 'art-20' }],
    assertion: 'Any data breach has SDAIA notification evidence within 72h.',
    autoTestHint: { check: 'breach_reporting_72h' },
  },
  {
    id: 'pdpl.03',
    nameAr: 'حقوق أصحاب البيانات (access/delete)',
    nameEn: 'Data-subject access & erasure requests honoured',
    category: 'data_privacy',
    type: 'corrective',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'pdpl', clause: 'art-4' }],
    assertion: 'All DSAR requests answered within statutory window.',
    autoTestHint: { check: 'dsar_response_sla' },
  },
  {
    id: 'pdpl.04',
    nameAr: 'احتفاظ بالبيانات وفق السياسة',
    nameEn: 'Retention policy enforced on personal data',
    category: 'data_privacy',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'pdpl', clause: 'art-18' }],
    assertion: 'No personal-data record retained beyond destroyAfter without legal hold.',
    autoTestHint: { check: 'retention_enforcement' },
  },

  // ── ISO 27001 Annex A ──────────────────────────────────────────
  {
    id: 'iso27001.a.9',
    nameAr: 'التحكم في الوصول للأنظمة',
    nameEn: 'Access control (least privilege)',
    category: 'information_security',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_27001', clause: 'A.9.2' }],
    assertion: 'RBAC reviewed; no orphan accounts; privileged access logged.',
    autoTestHint: { check: 'rbac_review' },
  },
  {
    id: 'iso27001.a.12.4',
    nameAr: 'تسجيل الأحداث ومراقبتها',
    nameEn: 'Event logging + monitoring',
    category: 'information_security',
    type: 'detective',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_27001', clause: 'A.12.4' }],
    assertion: 'Audit logs tamper-evident with ≥ 90-day retention.',
    autoTestHint: { check: 'audit_log_retention' },
  },
  {
    id: 'iso27001.a.16',
    nameAr: 'إدارة حوادث أمن المعلومات',
    nameEn: 'Information security incident management',
    category: 'information_security',
    type: 'corrective',
    frequency: 'on_event',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'iso_27001', clause: 'A.16.1' }],
    assertion: 'Every security incident has documented response + lessons learned.',
  },

  // ── ISO 9001 — Quality Management ──────────────────────────────
  {
    id: 'iso9001.7.5',
    nameAr: 'ضبط المعلومات الموثقة',
    nameEn: 'Control of documented information',
    category: 'quality_improvement',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'iso_9001', clause: '7.5' }],
    assertion: 'All controlled documents versioned + current approval on file.',
  },
  {
    id: 'iso9001.8.4',
    nameAr: 'ضبط الموردين الخارجيين',
    nameEn: 'Control of externally-provided processes',
    category: 'procurement',
    type: 'preventive',
    frequency: 'annual',
    criticality: 'medium',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'iso_9001', clause: '8.4' }],
    assertion: 'Critical suppliers have annual evaluation on file.',
  },
  {
    id: 'iso9001.9.1',
    nameAr: 'قياس ومراقبة الأداء',
    nameEn: 'Performance monitoring & analysis',
    category: 'quality_improvement',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'medium',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'iso_9001', clause: '9.1' }],
    assertion: 'KPI scorecard generated monthly with data.',
    autoTestHint: { check: 'kpi_monthly_scorecard' },
  },

  // ── HRSD / Labor Law / Payroll ─────────────────────────────────
  {
    id: 'hrsd.01',
    nameAr: 'نظام حماية الأجور (WPS)',
    nameEn: 'WPS salary file submitted on time',
    category: 'financial_controls',
    type: 'preventive',
    frequency: 'monthly',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'hrsd', clause: 'wps' }],
    assertion: 'Monthly WPS file submitted within statutory window.',
    autoTestHint: { check: 'wps_timeliness' },
  },
  {
    id: 'hrsd.02',
    nameAr: 'اشتراكات التأمينات الاجتماعية (GOSI)',
    nameEn: 'GOSI contributions current',
    category: 'financial_controls',
    type: 'preventive',
    frequency: 'monthly',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'gosi', clause: 'core' }],
    assertion: 'No employee with unpaid GOSI contributions past due.',
    autoTestHint: { check: 'gosi_current' },
  },
  {
    id: 'hrsd.03',
    nameAr: 'الإقامات وتصاريح العمل سارية',
    nameEn: 'Iqamas and work permits valid',
    category: 'workforce',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'hrsd', clause: 'iqama' }],
    assertion: 'No expatriate employee with expired Iqama.',
    autoTestHint: { check: 'iqama_validity' },
  },
  {
    id: 'hrsd.04',
    nameAr: 'نسبة السعودة (نطاقات)',
    nameEn: 'Saudization band (Nitaqat)',
    category: 'workforce',
    type: 'directive',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'hrsd', clause: 'nitaqat' }],
    assertion: 'Saudization band is Platinum or Green.',
    autoTestHint: { check: 'saudization_band' },
  },

  // ── Finance / ZATCA / SOCPA ────────────────────────────────────
  {
    id: 'zatca.01',
    nameAr: 'الفاتورة الإلكترونية (Phase 2)',
    nameEn: 'E-invoicing Phase-2 compliant',
    category: 'financial_controls',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'zatca', clause: 'fatoora-phase-2' }],
    assertion: 'Every invoice has ZATCA-accepted QR + signing certificate.',
    autoTestHint: { check: 'einvoice_compliance' },
  },
  {
    id: 'socpa.01',
    nameAr: 'الفصل بين الواجبات',
    nameEn: 'Segregation of duties on financial transactions',
    category: 'financial_controls',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'socpa', clause: 'sod' }],
    assertion: 'No user can both initiate and approve the same payment.',
    autoTestHint: { check: 'sod_enforcement' },
  },
  {
    id: 'socpa.02',
    nameAr: 'تقارير مالية ربع سنوية',
    nameEn: 'Quarterly financial statements produced',
    category: 'financial_controls',
    type: 'detective',
    frequency: 'quarterly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'socpa', clause: 'reporting' }],
    assertion: 'Quarterly P&L + balance sheet + cash flow produced.',
  },

  // ── MOH specific ───────────────────────────────────────────────
  {
    id: 'moh.01',
    nameAr: 'صلاحية ترخيص المنشأة الصحية',
    nameEn: 'MOH facility license valid',
    category: 'leadership_governance',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'critical',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'moh', clause: 'facility-license' }],
    assertion: 'Facility license active with ≥60-day buffer to expiry.',
  },
  {
    id: 'moh.02',
    nameAr: 'تقرير الإحصاء السنوي',
    nameEn: 'Annual MOH statistical report submitted',
    category: 'leadership_governance',
    type: 'directive',
    frequency: 'annual',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'moh', clause: 'annual-report' }],
    assertion: 'Annual statistical report filed with MOH.',
  },
  {
    id: 'moh.03',
    nameAr: 'إحالة الحالات الحرجة',
    nameEn: 'Critical case referral pathway documented',
    category: 'provision_of_care',
    type: 'directive',
    frequency: 'on_event',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'moh', clause: 'referral-2022' }],
    assertion: 'Referral forms used for every critical transfer.',
  },

  // ── SFDA (for rehab equipment / durable medical devices) ───────
  {
    id: 'sfda.01',
    nameAr: 'تسجيل الأجهزة الطبية',
    nameEn: 'Medical devices registered with SFDA',
    category: 'facility_safety',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'sfda', clause: 'device-registration' }],
    assertion: 'All medical devices in use have SFDA registration evidence.',
  },
  {
    id: 'sfda.02',
    nameAr: 'معايرة الأجهزة السنوية',
    nameEn: 'Annual calibration of measurement devices',
    category: 'facility_safety',
    type: 'preventive',
    frequency: 'annual',
    criticality: 'medium',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'sfda', clause: 'calibration' }],
    assertion: 'Calibration certificates on file for every measurement device.',
  },

  // ── Nitaqat-adjacent / workforce wellness ─────────────────────
  {
    id: 'cbahi.hr.06',
    nameAr: 'فحص طبي دوري للعاملين',
    nameEn: 'Periodic occupational health exams',
    category: 'workforce',
    type: 'preventive',
    frequency: 'annual',
    criticality: 'medium',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'cbahi', clause: 'HR.7' }],
    assertion: 'Every clinical employee has annual medical exam record.',
  },

  // ── Financial-controls extras (procurement + expense) ──────────
  {
    id: 'fin.01',
    nameAr: 'موافقة متعددة المستويات للمشتريات',
    nameEn: 'Multi-level procurement approval',
    category: 'procurement',
    type: 'preventive',
    frequency: 'continuous',
    criticality: 'high',
    testMethod: 'automatic',
    regulationRefs: [{ standard: 'socpa', clause: 'sod' }],
    assertion: 'Purchases above threshold require ≥2 approvals.',
    autoTestHint: { check: 'procurement_approval_thresholds' },
  },
  {
    id: 'fin.02',
    nameAr: 'تسوية بنكية شهرية',
    nameEn: 'Monthly bank reconciliation',
    category: 'financial_controls',
    type: 'detective',
    frequency: 'monthly',
    criticality: 'high',
    testMethod: 'evidenced',
    regulationRefs: [{ standard: 'socpa', clause: 'reconciliation' }],
    assertion: 'Every bank account has a monthly reconciliation signed.',
  },
]);

// ── Helpers ────────────────────────────────────────────────────────

function findById(id) {
  return CONTROL_LIBRARY.find(c => c.id === id) || null;
}

function filterByRegulation(standard) {
  return CONTROL_LIBRARY.filter(c => c.regulationRefs.some(r => r.standard === standard));
}

function filterByCategory(category) {
  return CONTROL_LIBRARY.filter(c => c.category === category);
}

function summarizeByFramework() {
  const frameworks = new Map();
  for (const c of CONTROL_LIBRARY) {
    for (const r of c.regulationRefs) {
      if (!frameworks.has(r.standard)) frameworks.set(r.standard, 0);
      frameworks.set(r.standard, frameworks.get(r.standard) + 1);
    }
  }
  return Object.fromEntries(frameworks);
}

module.exports = {
  CONTROL_CATEGORIES,
  CONTROL_TYPES,
  CONTROL_FREQUENCIES,
  CONTROL_CRITICALITY,
  CONTROL_TEST_METHODS,
  CONTROL_STATUSES,
  TEST_RESULT_OUTCOMES,
  CONTROL_LIBRARY,
  findById,
  filterByRegulation,
  filterByCategory,
  summarizeByFramework,
};
