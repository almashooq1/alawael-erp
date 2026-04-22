/**
 * report.catalog.js — canonical report catalog for Al-Awael ERP.
 *
 * Phase-10 Commit 1. The foundation for the periodic reporting &
 * communications engine. Each record names ONE report the platform
 * knows how to produce — the catalog pins down its identity, audience,
 * channels, periodicity, confidentiality class, builder reference, and
 * the compliance frameworks that care about it.
 *
 * Design decisions (recorded here so future edits stay consistent):
 *
 *   1. Catalog is pure data (no I/O, no DB). Shape invariants are
 *      enforced at test time (`report-catalog.test.js`). This file is
 *      safe to require from any layer — services, routes, CLIs, the
 *      scheduler.
 *
 *   2. IDs are dot-delimited slugs (`<domain>.<subject>.<qualifier>`)
 *      so the set reads like a namespace. Never rename; add a
 *      successor + flip `enabled: false` on the old entry instead —
 *      downstream dashboards, approvals, and delivery ledger key off
 *      the id.
 *
 *   3. `builder` is a dotted path resolved at runtime by the engine
 *      (`<module>.<function>` where `<module>` lives under
 *      `backend/services/`). Never import builders here — that would
 *      pull half the app into the catalog require graph.
 *
 *   4. `channels`, `audiences`, `confidentiality`, and `periodicity`
 *      come from closed sets exported below. The drift test asserts
 *      every catalog value is a member.
 *
 *   5. `kpiLinks` reference entries in `config/kpi.registry.js` — the
 *      drift test asserts every link resolves. This is how a report
 *      surfaces the KPIs that drive its narrative.
 *
 *   6. `approverRoles` is ONLY consulted when `approvalRequired: true`.
 *      Default roles by confidentiality:
 *        - restricted   : ['quality_manager', 'branch_manager']
 *        - confidential : ['ceo', 'medical_director', 'quality_manager']
 *      Override per-entry when the domain demands it.
 *
 *   7. `locales` declares what the renderer MUST support; the engine
 *      still picks per-recipient. If a recipient's preferred locale is
 *      not in this list the engine falls back to the first locale.
 *
 *   8. `slaHours` is the max allowed time from scheduled dispatch to
 *      successful delivery before escalation kicks in. For on-demand
 *      reports the clock starts when the request hits the engine.
 */

'use strict';

// ─── Closed enums ─────────────────────────────────────────────────

const CATEGORIES = Object.freeze([
  'clinical',
  'rehab',
  'operations',
  'executive',
  'quality',
  'finance',
  'hr',
  'crm',
  'compliance',
]);

const PERIODICITIES = Object.freeze([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
  'on_demand',
]);

const AUDIENCES = Object.freeze([
  'beneficiary',
  'guardian',
  'therapist',
  'supervisor',
  'branch_manager',
  'executive',
  'quality',
  'finance',
  'hr',
]);

const CHANNELS = Object.freeze([
  'email',
  'sms',
  'whatsapp',
  'in_app',
  'pdf_download',
  'portal_inbox',
]);

const CONFIDENTIALITY = Object.freeze(['public', 'internal', 'restricted', 'confidential']);

const FORMATS = Object.freeze(['html', 'pdf', 'xlsx', 'json', 'plain']);

/**
 * Cron expressions for each scheduled periodicity. The scheduler reads
 * these directly — catalog entries only name the periodicity.
 *
 * Times are Riyadh local (Asia/Riyadh); the scheduler module wires tz.
 */
const PERIODICITY_CRON = Object.freeze({
  daily: '0 7 * * *',
  weekly: '0 8 * * MON',
  monthly: '0 9 1 * *',
  quarterly: '0 9 1 1,4,7,10 *',
  semiannual: '0 9 1 1,7 *',
  annual: '0 9 1 1 *',
  on_demand: null,
});

/**
 * Default approver roles by confidentiality class. Can be overridden
 * per catalog entry via `approverRoles`.
 */
const DEFAULT_APPROVERS = Object.freeze({
  public: [],
  internal: [],
  restricted: ['quality_manager', 'branch_manager'],
  confidential: ['ceo', 'medical_director', 'quality_manager'],
});

// ─── The catalog ──────────────────────────────────────────────────

/**
 * 30 canonical reports. Each entry is frozen; the catalog array is
 * frozen; consumers can rely on structural stability.
 */
const REPORTS = Object.freeze(
  [
    // ─── 1. Clinical — Beneficiary-facing ──────────────────────────
    {
      id: 'ben.progress.weekly',
      nameEn: 'Weekly Beneficiary Progress Summary',
      nameAr: 'تقرير التقدم الأسبوعي للمستفيد',
      category: 'clinical',
      periodicity: 'weekly',
      audiences: ['guardian', 'therapist'],
      channels: ['email', 'whatsapp', 'portal_inbox', 'in_app'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf', 'html'],
      builder: 'rehabReportBuilders.buildFamilyUpdate',
      template: 'parent-family-update',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['rehab.goal.progress_velocity'],
      owner: 'therapist_lead',
      compliance: ['CBAHI', 'MOH'],
      slaHours: 24,
      escalateTo: 'supervisor',
      enabled: true,
    },
    {
      id: 'ben.progress.monthly',
      nameEn: 'Monthly Beneficiary Progress Summary',
      nameAr: 'تقرير التقدم الشهري للمستفيد',
      category: 'clinical',
      periodicity: 'monthly',
      audiences: ['guardian', 'supervisor'],
      channels: ['email', 'portal_inbox', 'pdf_download'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf', 'html'],
      builder: 'rehabReportBuilders.buildFamilyUpdate',
      template: 'parent-family-update-monthly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['rehab.goal.progress_velocity', 'rehab.goal.mastery_rate'],
      owner: 'therapist_lead',
      compliance: ['CBAHI', 'MOH'],
      slaHours: 48,
      escalateTo: 'supervisor',
      enabled: true,
    },
    {
      id: 'ben.attendance.weekly',
      nameEn: 'Weekly Attendance Adherence',
      nameAr: 'التزام الحضور الأسبوعي',
      category: 'operations',
      periodicity: 'weekly',
      audiences: ['guardian'],
      channels: ['whatsapp', 'sms', 'in_app'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['plain', 'html'],
      builder: 'attendanceReportBuilder.buildAdherence',
      template: 'attendance-weekly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 180 },
      kpiLinks: ['scheduling.session.punctuality'],
      owner: 'branch_manager',
      compliance: ['MOH'],
      slaHours: 24,
      escalateTo: 'supervisor',
      enabled: true,
    },
    {
      id: 'ben.goal.achievement',
      nameEn: 'Goal Achievement Report',
      nameAr: 'تقرير تحقيق الأهداف',
      category: 'rehab',
      periodicity: 'monthly',
      audiences: ['guardian', 'therapist', 'supervisor'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf', 'html'],
      builder: 'rehabReportBuilders.buildDisciplineReportCard',
      template: 'discipline-report-card',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 730 },
      kpiLinks: ['rehab.goal.mastery_rate', 'rehab.goal.progress_velocity'],
      owner: 'therapist_lead',
      compliance: ['CBAHI'],
      slaHours: 48,
      escalateTo: 'supervisor',
      enabled: true,
    },
    {
      id: 'ben.irp.snapshot',
      nameEn: 'Individual Rehabilitation Plan Snapshot',
      nameAr: 'لقطة الخطة التأهيلية الفردية',
      category: 'clinical',
      periodicity: 'on_demand',
      audiences: ['supervisor', 'quality'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'rehabReportBuilders.buildIrpSnapshot',
      template: 'irp-snapshot',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 2555 }, // 7 years
      kpiLinks: ['clinical.care_plan.review_adherence'],
      owner: 'medical_director',
      compliance: ['CBAHI', 'MOH', 'PDPL'],
      slaHours: 4,
      escalateTo: 'medical_director',
      enabled: true,
    },
    {
      id: 'ben.discharge.summary',
      nameEn: 'Discharge Summary',
      nameAr: 'ملخص الخروج من البرنامج',
      category: 'clinical',
      periodicity: 'on_demand',
      audiences: ['guardian', 'supervisor', 'quality'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'rehabReportBuilders.buildDischargeSummary',
      template: 'discharge-summary',
      approvalRequired: true,
      approverRoles: ['medical_director', 'quality_manager'],
      retention: { days: 2555 },
      kpiLinks: ['rehab.goal.mastery_rate'],
      owner: 'medical_director',
      compliance: ['CBAHI', 'MOH', 'PDPL'],
      slaHours: 24,
      escalateTo: 'medical_director',
      enabled: true,
    },
    {
      id: 'ben.review.compliance',
      nameEn: 'Care-Plan Review Compliance',
      nameAr: 'التزام مراجعة الخطة العلاجية',
      category: 'compliance',
      periodicity: 'weekly',
      audiences: ['supervisor', 'quality'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf'],
      builder: 'rehabReportBuilders.buildReviewComplianceReport',
      template: 'review-compliance',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['clinical.care_plan.review_adherence'],
      owner: 'quality_manager',
      compliance: ['CBAHI'],
      slaHours: 48,
      escalateTo: 'quality_manager',
      enabled: true,
    },

    // ─── 2. Therapist & Operations ─────────────────────────────────
    {
      id: 'therapist.productivity.weekly',
      nameEn: 'Therapist Productivity — Weekly',
      nameAr: 'إنتاجية المعالجين — أسبوعي',
      category: 'operations',
      periodicity: 'weekly',
      audiences: ['supervisor', 'branch_manager'],
      channels: ['email', 'in_app', 'portal_inbox'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf'],
      builder: 'therapistReportBuilder.buildProductivity',
      template: 'therapist-productivity',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['scheduling.session.punctuality', 'scheduling.session.cancellation_rate'],
      owner: 'branch_manager',
      compliance: ['CBAHI'],
      slaHours: 24,
      escalateTo: 'branch_manager',
      enabled: true,
    },
    {
      id: 'therapist.caseload.monthly',
      nameEn: 'Therapist Caseload — Monthly',
      nameAr: 'حجم الحالات للمعالجين — شهري',
      category: 'operations',
      periodicity: 'monthly',
      audiences: ['supervisor'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['pdf', 'xlsx'],
      builder: 'therapistReportBuilder.buildCaseload',
      template: 'therapist-caseload',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: [],
      owner: 'branch_manager',
      compliance: [],
      slaHours: 48,
      escalateTo: 'branch_manager',
      enabled: true,
    },
    {
      id: 'session.volume.daily',
      nameEn: 'Session Volume — Daily',
      nameAr: 'حجم الجلسات — يومي',
      category: 'operations',
      periodicity: 'daily',
      audiences: ['branch_manager'],
      channels: ['email', 'in_app'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'sessionReportBuilder.buildVolume',
      template: 'session-volume-daily',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 90 },
      kpiLinks: ['scheduling.session.cancellation_rate'],
      owner: 'branch_manager',
      compliance: [],
      slaHours: 6,
      escalateTo: 'supervisor',
      enabled: true,
    },
    {
      id: 'branch.occupancy.weekly',
      nameEn: 'Branch Occupancy — Weekly',
      nameAr: 'إشغال الفرع — أسبوعي',
      category: 'operations',
      periodicity: 'weekly',
      audiences: ['branch_manager', 'executive'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf'],
      builder: 'branchReportBuilder.buildOccupancy',
      template: 'branch-occupancy',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['multi-branch.occupancy.rate'],
      owner: 'branch_manager',
      compliance: [],
      slaHours: 24,
      escalateTo: 'executive',
      enabled: true,
    },
    {
      id: 'branch.kpi.monthly',
      nameEn: 'Branch KPI Pack — Monthly',
      nameAr: 'حزمة مؤشرات الفرع — شهري',
      category: 'executive',
      periodicity: 'monthly',
      audiences: ['branch_manager', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['pdf', 'xlsx'],
      builder: 'kpiReportBuilder.buildBranchKpiPack',
      template: 'branch-kpi-pack',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 1095 }, // 3 years
      kpiLinks: [
        'multi-branch.occupancy.rate',
        'scheduling.session.punctuality',
        'finance.collections.dso_days',
      ],
      owner: 'branch_manager',
      compliance: ['CBAHI'],
      slaHours: 48,
      escalateTo: 'executive',
      enabled: true,
    },
    {
      id: 'fleet.punctuality.weekly',
      nameEn: 'Fleet Punctuality — Weekly',
      nameAr: 'انضباط الأسطول — أسبوعي',
      category: 'operations',
      periodicity: 'weekly',
      audiences: ['branch_manager', 'supervisor'],
      channels: ['email', 'in_app'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'fleetReportBuilder.buildPunctuality',
      template: 'fleet-punctuality',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 180 },
      kpiLinks: ['multi-branch.fleet.punctuality'],
      owner: 'branch_manager',
      compliance: [],
      slaHours: 24,
      escalateTo: 'branch_manager',
      enabled: true,
    },

    // ─── 3. Executive ──────────────────────────────────────────────
    {
      id: 'exec.kpi.digest.daily',
      nameEn: 'Executive KPI Digest — Daily',
      nameAr: 'ملخص مؤشرات الإدارة اليومي',
      category: 'executive',
      periodicity: 'daily',
      audiences: ['executive'],
      channels: ['email', 'in_app'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'kpiReportBuilder.buildExecDigest',
      template: 'exec-kpi-digest',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 90 },
      kpiLinks: [],
      owner: 'ceo',
      compliance: [],
      slaHours: 3,
      escalateTo: 'ceo',
      enabled: true,
    },
    {
      id: 'exec.kpi.board.quarterly',
      nameEn: 'Board KPI Pack — Quarterly',
      nameAr: 'حزمة مؤشرات مجلس الإدارة الربع سنوية',
      category: 'executive',
      periodicity: 'quarterly',
      audiences: ['executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'kpiReportBuilder.buildBoardPack',
      template: 'exec-board-pack',
      approvalRequired: true,
      approverRoles: ['ceo'],
      retention: { days: 2555 },
      kpiLinks: [],
      owner: 'ceo',
      compliance: ['CBAHI', 'MOH'],
      slaHours: 72,
      escalateTo: 'ceo',
      enabled: true,
    },
    {
      id: 'exec.programs.semiannual',
      nameEn: 'Programs Review — Semi-Annual',
      nameAr: 'مراجعة البرامج نصف السنوية',
      category: 'executive',
      periodicity: 'semiannual',
      audiences: ['executive', 'quality'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'executiveReportBuilder.buildProgramsReview',
      template: 'exec-programs-review',
      approvalRequired: true,
      approverRoles: ['ceo', 'medical_director', 'quality_manager'],
      retention: { days: 2555 },
      kpiLinks: ['rehab.goal.mastery_rate', 'clinical.care_plan.review_adherence'],
      owner: 'ceo',
      compliance: ['CBAHI', 'MOH'],
      slaHours: 120,
      escalateTo: 'ceo',
      enabled: true,
    },
    {
      id: 'exec.annual.report',
      nameEn: 'Annual Report',
      nameAr: 'التقرير السنوي',
      category: 'executive',
      periodicity: 'annual',
      audiences: ['executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'executiveReportBuilder.buildAnnualReport',
      template: 'exec-annual-report',
      approvalRequired: true,
      approverRoles: ['ceo'],
      retention: { days: 2555 },
      kpiLinks: [],
      owner: 'ceo',
      compliance: ['CBAHI', 'MOH'],
      slaHours: 168,
      escalateTo: 'ceo',
      enabled: true,
    },

    // ─── 4. Quality ────────────────────────────────────────────────
    {
      id: 'quality.incidents.weekly',
      nameEn: 'Quality Incidents Digest — Weekly',
      nameAr: 'ملخص حوادث الجودة — أسبوعي',
      category: 'quality',
      periodicity: 'weekly',
      audiences: ['quality', 'branch_manager'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf'],
      builder: 'qualityReportBuilder.buildIncidentsDigest',
      template: 'quality-incidents-weekly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['quality.incidents.mttr.critical_hours'],
      owner: 'quality_manager',
      compliance: ['CBAHI'],
      slaHours: 24,
      escalateTo: 'quality_manager',
      enabled: true,
    },
    {
      id: 'quality.incidents.monthly',
      nameEn: 'Quality Incidents Pack — Monthly',
      nameAr: 'حزمة حوادث الجودة — شهري',
      category: 'quality',
      periodicity: 'monthly',
      audiences: ['quality', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'qualityReportBuilder.buildIncidentsPack',
      template: 'quality-incidents-monthly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 1095 },
      kpiLinks: ['quality.incidents.mttr.critical_hours'],
      owner: 'quality_manager',
      compliance: ['CBAHI'],
      slaHours: 48,
      escalateTo: 'quality_manager',
      enabled: true,
    },
    {
      id: 'quality.cbahi.evidence.quarterly',
      nameEn: 'CBAHI Evidence Pack — Quarterly',
      nameAr: 'حزمة شواهد سباهي الربع سنوية',
      category: 'compliance',
      periodicity: 'quarterly',
      audiences: ['quality', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'qualityReportBuilder.buildCbahiEvidence',
      template: 'quality-cbahi-evidence',
      approvalRequired: true,
      approverRoles: ['quality_manager', 'ceo'],
      retention: { days: 2555 },
      kpiLinks: ['quality.cbahi.evidence.completeness'],
      owner: 'quality_manager',
      compliance: ['CBAHI'],
      slaHours: 168,
      escalateTo: 'quality_manager',
      enabled: true,
    },
    {
      id: 'quality.red_flags.daily',
      nameEn: 'Red-Flags Digest — Daily',
      nameAr: 'ملخص العلامات الحمراء اليومي',
      category: 'quality',
      periodicity: 'daily',
      audiences: ['quality', 'supervisor'],
      channels: ['in_app', 'email'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'qualityReportBuilder.buildRedFlagsDigest',
      template: 'quality-red-flags-daily',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 90 },
      kpiLinks: [],
      owner: 'quality_manager',
      compliance: ['CBAHI', 'PDPL'],
      slaHours: 4,
      escalateTo: 'quality_manager',
      enabled: true,
    },

    // ─── 5. Finance ────────────────────────────────────────────────
    {
      id: 'finance.claims.weekly',
      nameEn: 'Insurance Claims — Weekly',
      nameAr: 'مطالبات التأمين — أسبوعي',
      category: 'finance',
      periodicity: 'weekly',
      audiences: ['finance'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf', 'xlsx'],
      builder: 'financeReportBuilder.buildClaimsPack',
      template: 'finance-claims-weekly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 1095 },
      kpiLinks: ['finance.claims.denial_rate'],
      owner: 'finance_manager',
      compliance: ['ZATCA'],
      slaHours: 24,
      escalateTo: 'finance_manager',
      enabled: true,
    },
    {
      id: 'finance.collections.monthly',
      nameEn: 'Collections — Monthly',
      nameAr: 'التحصيلات — شهري',
      category: 'finance',
      periodicity: 'monthly',
      audiences: ['finance', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf', 'xlsx'],
      builder: 'financeReportBuilder.buildCollectionsPack',
      template: 'finance-collections-monthly',
      approvalRequired: true,
      approverRoles: ['cfo'],
      retention: { days: 2555 },
      kpiLinks: ['finance.collections.dso_days'],
      owner: 'cfo',
      compliance: ['ZATCA'],
      slaHours: 72,
      escalateTo: 'cfo',
      enabled: true,
    },
    {
      id: 'finance.revenue.quarterly',
      nameEn: 'Revenue Review — Quarterly',
      nameAr: 'مراجعة الإيرادات الربع سنوية',
      category: 'finance',
      periodicity: 'quarterly',
      audiences: ['finance', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf'],
      builder: 'financeReportBuilder.buildRevenueReview',
      template: 'finance-revenue-quarterly',
      approvalRequired: true,
      approverRoles: ['cfo', 'ceo'],
      retention: { days: 2555 },
      kpiLinks: [],
      owner: 'cfo',
      compliance: ['ZATCA'],
      slaHours: 96,
      escalateTo: 'cfo',
      enabled: true,
    },
    {
      id: 'finance.invoices.aging.weekly',
      nameEn: 'Invoice Aging — Weekly',
      nameAr: 'أعمار الفواتير — أسبوعي',
      category: 'finance',
      periodicity: 'weekly',
      audiences: ['finance'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'xlsx'],
      builder: 'financeReportBuilder.buildAgingReport',
      template: 'finance-invoices-aging',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['finance.invoices.aging_ratio'],
      owner: 'finance_manager',
      compliance: ['ZATCA'],
      slaHours: 24,
      escalateTo: 'finance_manager',
      enabled: true,
    },

    // ─── 6. HR ─────────────────────────────────────────────────────
    {
      id: 'hr.turnover.monthly',
      nameEn: 'HR Turnover — Monthly',
      nameAr: 'دوران الموظفين — شهري',
      category: 'hr',
      periodicity: 'monthly',
      audiences: ['hr', 'executive'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'confidential',
      locales: ['ar', 'en'],
      formats: ['pdf', 'xlsx'],
      builder: 'hrReportBuilder.buildTurnover',
      template: 'hr-turnover-monthly',
      approvalRequired: true,
      approverRoles: ['hr_manager', 'ceo'],
      retention: { days: 1825 }, // 5 years
      kpiLinks: ['hr.turnover.voluntary_rate'],
      owner: 'hr_manager',
      compliance: ['GOSI', 'MoL'],
      slaHours: 72,
      escalateTo: 'hr_manager',
      enabled: true,
    },
    {
      id: 'hr.attendance.weekly',
      nameEn: 'Employee Attendance — Weekly',
      nameAr: 'حضور الموظفين — أسبوعي',
      category: 'hr',
      periodicity: 'weekly',
      audiences: ['hr', 'supervisor'],
      channels: ['email', 'in_app'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'xlsx'],
      builder: 'hrReportBuilder.buildAttendanceAdherence',
      template: 'hr-attendance-weekly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['hr.attendance.adherence'],
      owner: 'hr_manager',
      compliance: ['MoL'],
      slaHours: 24,
      escalateTo: 'hr_manager',
      enabled: true,
    },
    {
      id: 'hr.cpe.compliance.monthly',
      nameEn: 'CPE Compliance — Monthly',
      nameAr: 'امتثال التعليم المستمر — شهري',
      category: 'compliance',
      periodicity: 'monthly',
      audiences: ['hr', 'quality'],
      channels: ['portal_inbox', 'pdf_download'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['pdf', 'xlsx'],
      builder: 'hrReportBuilder.buildCpeCompliance',
      template: 'hr-cpe-compliance',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 1825 },
      kpiLinks: ['hr.cpe.compliance_rate'],
      owner: 'hr_manager',
      compliance: ['SCFHS'],
      slaHours: 48,
      escalateTo: 'quality_manager',
      enabled: true,
    },

    // ─── 7. CRM / Parent Engagement ───────────────────────────────
    {
      id: 'crm.parent.engagement.monthly',
      nameEn: 'Parent Engagement — Monthly',
      nameAr: 'تفاعل أولياء الأمور — شهري',
      category: 'crm',
      periodicity: 'monthly',
      audiences: ['branch_manager', 'supervisor'],
      channels: ['email', 'portal_inbox'],
      confidentiality: 'internal',
      locales: ['ar', 'en'],
      formats: ['html', 'pdf'],
      builder: 'crmReportBuilder.buildParentEngagement',
      template: 'crm-parent-engagement',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['crm.parent.engagement_score'],
      owner: 'branch_manager',
      compliance: [],
      slaHours: 48,
      escalateTo: 'branch_manager',
      enabled: true,
    },
    {
      id: 'crm.complaints.weekly',
      nameEn: 'Complaints Digest — Weekly',
      nameAr: 'ملخص الشكاوى — أسبوعي',
      category: 'crm',
      periodicity: 'weekly',
      audiences: ['quality', 'branch_manager'],
      channels: ['email', 'in_app'],
      confidentiality: 'restricted',
      locales: ['ar', 'en'],
      formats: ['html'],
      builder: 'crmReportBuilder.buildComplaintsDigest',
      template: 'crm-complaints-weekly',
      approvalRequired: false,
      approverRoles: [],
      retention: { days: 365 },
      kpiLinks: ['crm.complaints.resolution_time'],
      owner: 'quality_manager',
      compliance: ['CBAHI'],
      slaHours: 24,
      escalateTo: 'quality_manager',
      enabled: true,
    },
  ].map(r => Object.freeze({ ...r, kpiLinks: Object.freeze([...r.kpiLinks]) }))
);

// ─── Helpers ──────────────────────────────────────────────────────

/** O(n) — keep a Map for hot paths if callers care. */
function byId(id) {
  return REPORTS.find(r => r.id === id) || null;
}

function byPeriodicity(periodicity) {
  return REPORTS.filter(r => r.periodicity === periodicity && r.enabled);
}

function byAudience(audience) {
  return REPORTS.filter(r => r.audiences.includes(audience) && r.enabled);
}

function byChannel(channel) {
  return REPORTS.filter(r => r.channels.includes(channel) && r.enabled);
}

function byCategory(category) {
  return REPORTS.filter(r => r.category === category && r.enabled);
}

function byConfidentiality(level) {
  return REPORTS.filter(r => r.confidentiality === level && r.enabled);
}

function byCompliance(framework) {
  return REPORTS.filter(r => (r.compliance || []).includes(framework) && r.enabled);
}

function enabled() {
  return REPORTS.filter(r => r.enabled);
}

/**
 * Resolve approvers for a catalog entry. Falls back to the default
 * approver list for the confidentiality class when the entry declares
 * none but `approvalRequired` is true.
 */
function resolveApprovers(report) {
  if (!report.approvalRequired) return [];
  if (Array.isArray(report.approverRoles) && report.approverRoles.length) {
    return [...report.approverRoles];
  }
  return [...(DEFAULT_APPROVERS[report.confidentiality] || [])];
}

/**
 * Light classification for observability: counts per periodicity /
 * audience / confidentiality.
 */
function classify() {
  const out = {
    total: REPORTS.length,
    enabled: 0,
    byPeriodicity: {},
    byAudience: {},
    byCategory: {},
    byConfidentiality: {},
    approvalRequired: 0,
  };
  for (const r of REPORTS) {
    if (r.enabled) out.enabled++;
    if (r.approvalRequired) out.approvalRequired++;
    out.byPeriodicity[r.periodicity] = (out.byPeriodicity[r.periodicity] || 0) + 1;
    out.byCategory[r.category] = (out.byCategory[r.category] || 0) + 1;
    out.byConfidentiality[r.confidentiality] = (out.byConfidentiality[r.confidentiality] || 0) + 1;
    for (const a of r.audiences) {
      out.byAudience[a] = (out.byAudience[a] || 0) + 1;
    }
  }
  return out;
}

module.exports = {
  REPORTS,
  CATEGORIES,
  PERIODICITIES,
  AUDIENCES,
  CHANNELS,
  CONFIDENTIALITY,
  FORMATS,
  PERIODICITY_CRON,
  DEFAULT_APPROVERS,
  byId,
  byPeriodicity,
  byAudience,
  byChannel,
  byCategory,
  byConfidentiality,
  byCompliance,
  enabled,
  resolveApprovers,
  classify,
};
