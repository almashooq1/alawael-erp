/**
 * dashboard.registry.js — canonical dashboard catalogue for the
 * Al-Awael rehab ERP multi-branch platform.
 *
 * Phase 18 Commit 1.
 *
 * Declares the 4 levels of the dashboard blueprint:
 *
 *   1. executive       — C-suite + board, network-wide
 *   2. branch-ops      — branch manager + shift supervisor, live
 *   3. clinical        — CMO + lead therapists + case managers
 *   4. functional/<x>  — HR / Finance / Quality / CRM heads
 *
 * Each dashboard record lists:
 *   - id, title (bilingual)
 *   - audience (RBAC role codes)
 *   - heroKpiIds (top-strip KPIs — keys into kpi.registry.js)
 *   - widgetIds  (widget codes — keys into widget.catalog.js)
 *   - filters    (canonical filter keys)
 *   - drillPaths (entity → entity chains the aggregator advertises)
 *   - alertSeverityFloor ('info' | 'warning' | 'critical' — minimum
 *     alert severity surfaced on this dashboard)
 *   - refreshIntervalSeconds (client-side poll cadence hint)
 *   - narrativeTemplate (key into dashboard-narrative.service)
 *
 * Design rules (enforced by tests):
 *   - Every heroKpiId resolves to a kpi.registry.js entry.
 *   - Every widgetId resolves to a widget.catalog.js entry.
 *   - Every audience role resolves to rbac.config.js ROLES.
 *   - Dashboard ids are unique slugs; once published, treat as
 *     immutable (add successor + deprecate rather than rename).
 *
 * Pure data. No I/O, no DB. Safe to require from any layer.
 */

'use strict';

const DASHBOARD_LEVELS = Object.freeze(['executive', 'branch-ops', 'clinical', 'functional']);

const ALERT_FLOORS = Object.freeze(['info', 'warning', 'critical']);

const FILTER_KEYS = Object.freeze([
  'branch',
  'branchCluster',
  'region',
  'serviceLine',
  'payer',
  'dateRange',
  'compareTo',
  'shift',
  'program',
  'therapistDiscipline',
  'roomType',
  'transportRoute',
  'diagnosisGroup',
  'ageCohort',
  'caseManager',
  'carePathway',
  'costCenter',
  'department',
  'grade',
  'nationality',
  'contractType',
  'hireCohort',
  'severity',
  'incidentType',
  'rootCause',
  'owner',
  'status',
  'channel',
  'complaintCategory',
]);

const DASHBOARDS = Object.freeze([
  // ─── Level 1 — Executive ─────────────────────────────────────────
  {
    id: 'executive',
    level: 'executive',
    titleEn: 'Executive Dashboard',
    titleAr: 'لوحة القيادة التنفيذية',
    audience: [
      'super_admin',
      'head_office_admin',
      'ceo',
      'group_gm',
      'group_cfo',
      'group_chro',
      'group_quality_officer',
    ],
    heroKpiIds: [
      'finance.revenue.mtd.sar',
      'finance.ar.dso.days',
      'crm.nps.score',
      'quality.capa.ontime_closure.pct',
      'clinical.red_flags.active.count',
      'gov-integrations.integration_health.index',
    ],
    widgetIds: [
      'W-KPI-CARD',
      'W-TREND',
      'W-HEATMAP',
      'W-WATERFALL',
      'W-STREAM',
      'W-NARRATIVE',
      'W-COMPARE',
    ],
    filters: [
      'branch',
      'branchCluster',
      'region',
      'serviceLine',
      'payer',
      'dateRange',
      'compareTo',
    ],
    drillPaths: [
      'occupancy→branch→program→slot',
      'revenue→branch→payer→invoice→line',
      'goals→branch→therapist→beneficiary→plan',
    ],
    alertSeverityFloor: 'warning',
    refreshIntervalSeconds: 300,
    narrativeTemplate: 'executive.daily',
  },

  // ─── Level 2 — Branch Operations ─────────────────────────────────
  {
    id: 'branch-ops',
    level: 'branch-ops',
    titleEn: 'Branch Operations Dashboard',
    titleAr: 'لوحة عمليات الفرع',
    audience: ['branch_manager', 'manager', 'admin', 'regional_director', 'supervisor'],
    heroKpiIds: [
      'rehab.sessions.adherence.pct',
      'scheduling.noshow.rate.pct',
      'multi-branch.fleet.completion.pct',
      'quality.incidents.open_critical.count',
      'clinical.red_flags.active.count',
    ],
    widgetIds: ['W-KPI-CARD', 'W-QUEUE', 'W-STREAM', 'W-MAP', 'W-GANTT', 'W-ALERT', 'W-NARRATIVE'],
    filters: [
      'branch',
      'shift',
      'program',
      'therapistDiscipline',
      'roomType',
      'transportRoute',
      'dateRange',
    ],
    drillPaths: [
      'therapistUtil→week→session→notes',
      'roomStatus→bookingTimeline→conflicts',
      'transport→route→trip→driver',
    ],
    alertSeverityFloor: 'info',
    refreshIntervalSeconds: 60,
    narrativeTemplate: 'branch-ops.shift',
  },

  // ─── Level 3 — Clinical ──────────────────────────────────────────
  {
    id: 'clinical',
    level: 'clinical',
    titleEn: 'Clinical Dashboard',
    titleAr: 'اللوحة السريرية',
    audience: [
      'clinical_director',
      'doctor',
      'therapy_supervisor',
      'therapist',
      'therapist_slp',
      'therapist_ot',
      'therapist_pt',
      'therapist_psych',
    ],
    heroKpiIds: [
      'rehab.goals.achievement_rate.pct',
      'rehab.care_plan.review.ontime.pct',
      'clinical.red_flags.active.count',
      'rehab.sessions.adherence.pct',
    ],
    widgetIds: [
      'W-KPI-CARD',
      'W-MATRIX-5x5',
      'W-COHORT',
      'W-TREND',
      'W-PARETO',
      'W-STREAM',
      'W-NARRATIVE',
      'W-DRILL-TABLE',
    ],
    filters: [
      'branch',
      'therapistDiscipline',
      'ageCohort',
      'diagnosisGroup',
      'payer',
      'caseManager',
      'carePathway',
      'dateRange',
    ],
    drillPaths: [
      'goalPct→pathway→therapist→beneficiary→goal',
      'readmission→beneficiary→dischargePlan',
      'redFlag→beneficiary360→adapter→rawEvent',
    ],
    alertSeverityFloor: 'warning',
    refreshIntervalSeconds: 900,
    narrativeTemplate: 'clinical.cohort',
  },

  // ─── Level 4 — Functional: HR ────────────────────────────────────
  {
    id: 'functional.hr',
    level: 'functional',
    titleEn: 'HR Functional Dashboard',
    titleAr: 'لوحة الموارد البشرية',
    audience: ['group_chro', 'hr_manager', 'hr_supervisor', 'hr_officer', 'hr'],
    heroKpiIds: [
      'hr.workforce.attrition.pct',
      'documents.expiring_30d.count',
      'hr.onboarding.completion.pct',
      'hr.attendance.adherence.pct',
    ],
    widgetIds: [
      'W-KPI-CARD',
      'W-TREND',
      'W-HEATMAP',
      'W-CALENDAR',
      'W-FUNNEL',
      'W-NARRATIVE',
      'W-DRILL-TABLE',
    ],
    filters: [
      'branch',
      'department',
      'grade',
      'nationality',
      'contractType',
      'hireCohort',
      'dateRange',
    ],
    drillPaths: [
      'attrition→dept→employee',
      'licenseExpiry→employee→renewalPath',
      'overtime→branch→shift→employee',
    ],
    alertSeverityFloor: 'warning',
    refreshIntervalSeconds: 1800,
    narrativeTemplate: 'functional.hr',
  },

  // ─── Level 4 — Functional: Finance ───────────────────────────────
  {
    id: 'functional.finance',
    level: 'functional',
    titleEn: 'Finance Functional Dashboard',
    titleAr: 'لوحة الشؤون المالية',
    audience: ['group_cfo', 'finance_supervisor', 'accountant', 'finance'],
    heroKpiIds: [
      'finance.revenue.mtd.sar',
      'finance.claims.collection_days.mean',
      'finance.ar.dso.days',
      'finance.invoices.aging.concentration.pct',
    ],
    widgetIds: ['W-KPI-CARD', 'W-WATERFALL', 'W-TREND', 'W-QUEUE', 'W-DRILL-TABLE', 'W-NARRATIVE'],
    filters: ['branch', 'costCenter', 'payer', 'serviceLine', 'dateRange', 'compareTo'],
    drillPaths: [
      'dso→payer→invoice→line→cheque',
      'variance→costCenter→lineItem→transaction',
      'arAging→debtor→invoice→collectionAction',
    ],
    alertSeverityFloor: 'warning',
    refreshIntervalSeconds: 1800,
    narrativeTemplate: 'functional.finance',
  },

  // ─── Level 4 — Functional: Quality ───────────────────────────────
  {
    id: 'functional.quality',
    level: 'functional',
    titleEn: 'Quality & Compliance Dashboard',
    titleAr: 'لوحة الجودة والامتثال',
    audience: [
      'group_quality_officer',
      'compliance_officer',
      'regional_quality',
      'quality_coordinator',
      'internal_auditor',
    ],
    heroKpiIds: [
      'quality.incidents.mttr.critical_hours',
      'quality.incidents.open_critical.count',
      'quality.capa.ontime_closure.pct',
      'quality.cbahi.evidence.completeness.pct',
    ],
    widgetIds: [
      'W-KPI-CARD',
      'W-PARETO',
      'W-MATRIX-5x5',
      'W-CALENDAR',
      'W-STREAM',
      'W-NARRATIVE',
      'W-DRILL-TABLE',
    ],
    filters: ['branch', 'severity', 'incidentType', 'rootCause', 'owner', 'status', 'dateRange'],
    drillPaths: [
      'incident→rca→capa→evidence→closure',
      'risk→likelihood×severity→mitigation',
      'audit→framework→evidenceGap',
    ],
    alertSeverityFloor: 'info',
    refreshIntervalSeconds: 900,
    narrativeTemplate: 'functional.quality',
  },

  // ─── Level 4 — Functional: CRM / VoC ─────────────────────────────
  {
    id: 'functional.crm',
    level: 'functional',
    titleEn: 'CRM & Voice-of-Customer Dashboard',
    titleAr: 'لوحة العملاء وصوت المستفيد',
    audience: ['manager', 'admin', 'branch_manager', 'receptionist'],
    heroKpiIds: [
      'crm.nps.score',
      'crm.complaints.sla_breach.count',
      'crm.complaints.resolution_rate.pct',
      'crm.waitlist.conversion.pct',
    ],
    widgetIds: [
      'W-KPI-CARD',
      'W-FUNNEL',
      'W-TREND',
      'W-PARETO',
      'W-STREAM',
      'W-NARRATIVE',
      'W-DRILL-TABLE',
    ],
    filters: ['branch', 'channel', 'complaintCategory', 'ageCohort', 'payer', 'dateRange'],
    drillPaths: [
      'nps→branch→survey→respondent',
      'complaint→category→case→beneficiary',
      'waitlist→stage→dropoff',
    ],
    alertSeverityFloor: 'warning',
    refreshIntervalSeconds: 1800,
    narrativeTemplate: 'functional.crm',
  },
]);

// ─── Lookups ─────────────────────────────────────────────────────

function byId(id) {
  return DASHBOARDS.find(d => d.id === id) || null;
}

function byLevel(level) {
  return DASHBOARDS.filter(d => d.level === level);
}

/**
 * Return the dashboards visible to a user holding the given role.
 * A dashboard is visible if its `audience` array contains the role.
 * Pure set operation — no side effects, no I/O.
 */
function visibleTo(role) {
  if (!role || typeof role !== 'string') return [];
  return DASHBOARDS.filter(d => d.audience.includes(role));
}

/**
 * Collect all distinct KPI ids referenced by the dashboard catalogue
 * (helper for the aggregator pre-warm + drift tests).
 */
function referencedKpiIds() {
  const set = new Set();
  for (const d of DASHBOARDS) for (const k of d.heroKpiIds) set.add(k);
  return Array.from(set);
}

/**
 * Collect all distinct widget codes referenced by the dashboards.
 */
function referencedWidgetIds() {
  const set = new Set();
  for (const d of DASHBOARDS) for (const w of d.widgetIds) set.add(w);
  return Array.from(set);
}

module.exports = {
  DASHBOARDS,
  DASHBOARD_LEVELS,
  ALERT_FLOORS,
  FILTER_KEYS,
  byId,
  byLevel,
  visibleTo,
  referencedKpiIds,
  referencedWidgetIds,
};
