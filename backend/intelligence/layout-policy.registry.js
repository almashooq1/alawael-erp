'use strict';

/**
 * layout-policy.registry.js — Wave 24.
 *
 * Encodes the Cognitive Load Reduction Framework as a per-dashboard
 * layout policy that the UI consumes at render time and CI validates
 * at build time.
 *
 * Every element has:
 *   • intentAr / intentEn — what decision/action it supports
 *   • tier 1|2|3 — priority
 *   • kind — visual vocabulary (kpi, alert-stream, chart, list, etc.)
 *   • aboveTheFold (tier-1 must be true)
 *   • revealOn (tier-3 must declare)
 *   • optional refKpiId / refAlertSurface / refActionId
 *
 * See `docs/blueprint/32-cognitive-load-framework.md` for the contract.
 */

// ─── Enums ───────────────────────────────────────────────────────

const TIERS = Object.freeze([1, 2, 3]);

const ELEMENT_KINDS = Object.freeze([
  'kpi',
  'alert-stream',
  'chart',
  'list',
  'action-tile',
  'microcopy',
  'status-pill',
]);

const SECTION_KINDS = Object.freeze([
  'critical-signals',
  'operational-pulse',
  'task-group',
  'deep-dive',
]);

const REVEAL_ON = Object.freeze(['always', 'hover', 'click', 'drill', 'drawer', 'modal', 'tab']);

const COMMIT_TRIGGERS = Object.freeze(['blur', 'submit', 'interval', 'never']);

const AUTOSAVE_SCOPES = Object.freeze(['session', 'user', 'role-default']);

// Above-the-fold element budgets per density.
const DENSITY_BUDGETS = Object.freeze({
  low: { tier1: 6, tier1Plus2: 12 },
  medium: { tier1: 8, tier1Plus2: 18 },
  'medium-high': { tier1: 10, tier1Plus2: 24 },
  high: { tier1: 12, tier1Plus2: 28 },
});

// ─── Auto-save default profiles ─────────────────────────────────

const AUTOSAVE_PROFILES = Object.freeze({
  dashboard_filters: {
    draftMs: 500,
    commitTrigger: 'interval',
    commitIntervalMs: 10_000,
    scope: 'user',
  },
  worklist_toggles: {
    draftMs: 0,
    commitTrigger: 'blur',
    commitIntervalMs: null,
    scope: 'user',
  },
  edit_draft: {
    draftMs: 1_000,
    commitTrigger: 'interval',
    commitIntervalMs: 30_000,
    scope: 'user',
  },
  // Sensitive forms — never auto-save; explicit confirm only.
  sensitive_form: {
    draftMs: null,
    commitTrigger: 'submit',
    commitIntervalMs: null,
    scope: 'session',
  },
});

// ─── Dashboards ─────────────────────────────────────────────────

const DASHBOARDS = {
  executive: {
    titleAr: 'لوحة الإدارة العليا',
    titleEn: 'Executive Dashboard',
    targetRoleGroups: ['executive_leadership'],
    density: 'low',
    smartDefaults: { dateRange: 'last_30d', branchScope: 'all' },
    autoSave: {
      filters: 'dashboard_filters',
      density_override: 'worklist_toggles',
    },
    sections: [
      {
        id: 'exec-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'مراجعة الإشارات الحرجة فقط',
        taskEn: 'Scan critical signals only',
        elements: [
          {
            id: 'exec-alerts-critical',
            kind: 'alert-stream',
            intentAr: 'رصد الحوادث / المخاطر التي تتطلب قرار تنفيذي فوري',
            intentEn: 'Spot incidents/risks requiring immediate executive decision',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'executive',
          },
        ],
      },
      {
        id: 'exec-pulse',
        kind: 'operational-pulse',
        position: 1,
        taskAr: 'قراءة الوضع التنظيمي العام',
        taskEn: 'Read overall organizational pulse',
        elements: [
          {
            id: 'kpi-active-beneficiaries',
            kind: 'kpi',
            intentAr: 'متابعة حجم العمليات الفعلي',
            intentEn: 'Track real operational scale',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.beneficiary.active_count',
          },
          {
            id: 'kpi-admissions-monthly',
            kind: 'kpi',
            intentAr: 'متابعة الإيرادات المتوقعة',
            intentEn: 'Track expected revenue inflow',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.beneficiary.admissions_monthly',
          },
          {
            id: 'kpi-invoices-overdue',
            kind: 'kpi',
            intentAr: 'متابعة مخاطر التحصيل',
            intentEn: 'Track collection risk',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.invoices.overdue_count',
          },
          {
            id: 'kpi-incidents-critical',
            kind: 'kpi',
            intentAr: 'مراقبة المخاطر السريرية والامتثال',
            intentEn: 'Monitor clinical & compliance risk',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.incidents.critical_open',
          },
        ],
      },
      {
        id: 'exec-deep-dive',
        kind: 'deep-dive',
        position: 2,
        taskAr: 'تحليل الاتجاهات (تكشف عند الطلب)',
        taskEn: 'Trend analysis (on-demand)',
        elements: [
          {
            id: 'trend-12m',
            kind: 'chart',
            intentAr: 'فهم المسار التاريخي قبل قرارات رأس المال',
            intentEn: 'Understand 12-month trajectory before capital decisions',
            tier: 3,
            aboveTheFold: false,
            revealOn: 'drawer',
          },
          {
            id: 'capital-runway',
            kind: 'chart',
            intentAr: 'حساب مدى استمرارية النقد',
            intentEn: 'Cash runway analysis',
            tier: 3,
            aboveTheFold: false,
            revealOn: 'click',
          },
        ],
      },
    ],
  },

  branch: {
    titleAr: 'لوحة مدير الفرع',
    titleEn: 'Branch Manager Dashboard',
    targetRoleGroups: ['branch_manager'],
    density: 'medium-high',
    smartDefaults: { dateRange: 'last_7d', branchScope: ':branchId' },
    autoSave: {
      filters: 'dashboard_filters',
      worklist: 'worklist_toggles',
    },
    sections: [
      {
        id: 'branch-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'معالجة التنبيهات الحرجة في الفرع',
        taskEn: 'Resolve branch-critical alerts',
        elements: [
          {
            id: 'branch-alerts',
            kind: 'alert-stream',
            intentAr: 'تحديد ما يحتاج قراراً فورياً اليوم',
            intentEn: 'Identify what needs a decision today',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'branch',
          },
        ],
      },
      {
        id: 'branch-pulse',
        kind: 'operational-pulse',
        position: 1,
        taskAr: 'قراءة نبض الفرع التشغيلي',
        taskEn: 'Read branch operational pulse',
        elements: [
          {
            id: 'kpi-attendance',
            kind: 'kpi',
            intentAr: 'كشف انخفاض الحضور قبل تفاقمه',
            intentEn: 'Catch attendance drops before they compound',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.attendance.daily_rate',
          },
          {
            id: 'kpi-goals-stalled',
            kind: 'kpi',
            intentAr: 'تحديد الحالات التي تحتاج تدخل سريري',
            intentEn: 'Identify cases needing clinical intervention',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.goals.stalled_count',
          },
          {
            id: 'kpi-therapist-util',
            kind: 'kpi',
            intentAr: 'موازنة عبء العمل',
            intentEn: 'Balance staff workload',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.therapist.utilization',
          },
          {
            id: 'kpi-complaints',
            kind: 'kpi',
            intentAr: 'تصعيد الشكاوى قبل خرق SLA',
            intentEn: 'Escalate complaints before SLA breach',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.complaints.open_count',
          },
        ],
      },
      {
        id: 'branch-tasks',
        kind: 'task-group',
        position: 2,
        taskAr: 'إجراءات سريعة',
        taskEn: 'Quick decisions',
        elements: [
          {
            id: 'action-todays-worklist',
            kind: 'action-tile',
            intentAr: 'فتح مهام اليوم بترتيب الأولوية',
            intentEn: 'Open prioritized worklist for today',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'todays-worklist',
          },
          {
            id: 'action-open-complaints',
            kind: 'action-tile',
            intentAr: 'فتح قائمة الشكاوى المفتوحة',
            intentEn: 'Open active complaints',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'open-complaints',
          },
        ],
      },
      {
        id: 'branch-deep',
        kind: 'deep-dive',
        position: 3,
        taskAr: 'تحليلات أعمق (تكشف عند الطلب)',
        taskEn: 'Deeper analytics (on-demand)',
        elements: [
          {
            id: 'attendance-by-day',
            kind: 'chart',
            intentAr: 'كشف الأنماط الأسبوعية للحضور',
            intentEn: 'Spot weekly attendance patterns',
            tier: 3,
            aboveTheFold: false,
            revealOn: 'drawer',
          },
        ],
      },
    ],
  },

  care: {
    titleAr: 'لوحة الإشراف السريري',
    titleEn: 'Clinical Supervisor Dashboard',
    targetRoleGroups: ['clinical_supervisor'],
    density: 'high',
    smartDefaults: { dateRange: 'today', branchScope: ':branchId', status: 'active' },
    autoSave: {
      filters: 'dashboard_filters',
      worklist: 'worklist_toggles',
      assessment_draft: 'edit_draft',
      signature: 'sensitive_form',
    },
    sections: [
      {
        id: 'care-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'مراجعة العلامات الحمراء السريرية',
        taskEn: 'Review clinical red flags',
        elements: [
          {
            id: 'care-alerts',
            kind: 'alert-stream',
            intentAr: 'تحديد المستفيدين الذين يحتاجون تدخل اليوم',
            intentEn: 'Identify beneficiaries needing intervention today',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'clinical',
          },
        ],
      },
      {
        id: 'care-pulse',
        kind: 'operational-pulse',
        position: 1,
        taskAr: 'نبض الجودة السريرية',
        taskEn: 'Clinical quality pulse',
        elements: [
          {
            id: 'kpi-care-stalled',
            kind: 'kpi',
            intentAr: 'تحديد عدد الأهداف العالقة لإعادة الجدولة',
            intentEn: 'Identify stalled goals to reschedule',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.goals.stalled_count',
          },
          {
            id: 'kpi-care-plan-review',
            kind: 'kpi',
            intentAr: 'كشف خطط الرعاية المتأخرة في المراجعة',
            intentEn: 'Surface care plans with overdue review',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.care_plans.review_overdue',
          },
          {
            id: 'kpi-session-completion',
            kind: 'kpi',
            intentAr: 'متابعة إتمام الجلسات والتوثيق',
            intentEn: 'Track session completion + documentation',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.therapy_sessions.completion',
          },
        ],
      },
      {
        id: 'care-tasks',
        kind: 'task-group',
        position: 2,
        taskAr: 'مهام إشراف اليوم',
        taskEn: "Today's supervision tasks",
        elements: [
          {
            id: 'action-review-care-plans',
            kind: 'action-tile',
            intentAr: 'فتح قائمة الخطط الجاهزة للمراجعة',
            intentEn: 'Open care plans ready for review',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'review-care-plans',
          },
          {
            id: 'action-approve-assessments',
            kind: 'action-tile',
            intentAr: 'فتح التقييمات بانتظار الاعتماد',
            intentEn: 'Open assessments awaiting approval',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'approve-assessments',
          },
        ],
      },
    ],
  },

  finance: {
    titleAr: 'لوحة المالية',
    titleEn: 'Finance Dashboard',
    targetRoleGroups: ['finance'],
    density: 'high',
    smartDefaults: { dateRange: 'this_month', status: 'open' },
    autoSave: {
      filters: 'dashboard_filters',
      invoice_approval: 'sensitive_form',
    },
    sections: [
      {
        id: 'finance-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'تنبيهات تحصيل / مدفوعات حرجة',
        taskEn: 'Critical collection / payment alerts',
        elements: [
          {
            id: 'finance-alerts',
            kind: 'alert-stream',
            intentAr: 'تحديد الفواتير والمطالبات التي تحتاج إجراء فوري',
            intentEn: 'Identify invoices/claims needing immediate action',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'finance',
          },
        ],
      },
      {
        id: 'finance-pulse',
        kind: 'operational-pulse',
        position: 1,
        taskAr: 'نبض التحصيل',
        taskEn: 'Collection pulse',
        elements: [
          {
            id: 'kpi-overdue-invoices',
            kind: 'kpi',
            intentAr: 'حجم المتأخرات الحالي',
            intentEn: 'Current overdue load',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.invoices.overdue_count',
          },
        ],
      },
      {
        id: 'finance-tasks',
        kind: 'task-group',
        position: 2,
        taskAr: 'قرارات مالية اليوم',
        taskEn: "Today's financial decisions",
        elements: [
          {
            id: 'action-approve-invoice',
            kind: 'action-tile',
            intentAr: 'مراجعة الفواتير المعلّقة للاعتماد',
            intentEn: 'Review invoices pending approval',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'approve-invoice',
          },
          {
            id: 'action-zatca-queue',
            kind: 'action-tile',
            intentAr: 'متابعة قائمة الزكاة / ZATCA',
            intentEn: 'Track ZATCA submission queue',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'zatca-queue',
          },
        ],
      },
    ],
  },

  me: {
    titleAr: 'مهامي',
    titleEn: 'My Worklist',
    targetRoleGroups: ['therapist'],
    density: 'high',
    smartDefaults: { dateRange: 'today', assignee: ':userId' },
    autoSave: {
      filters: 'dashboard_filters',
      session_notes_draft: 'edit_draft',
      signed_session: 'sensitive_form',
    },
    sections: [
      {
        id: 'me-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'تنبيهات على حالاتي',
        taskEn: 'Alerts on my cases',
        elements: [
          {
            id: 'my-alerts',
            kind: 'alert-stream',
            intentAr: 'العلامات الحمراء على المستفيدين المُسندين لي',
            intentEn: 'Red flags on my assigned beneficiaries',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'me',
          },
        ],
      },
      {
        id: 'me-tasks',
        kind: 'task-group',
        position: 1,
        taskAr: 'جلسات اليوم',
        taskEn: "Today's sessions",
        elements: [
          {
            id: 'my-sessions-list',
            kind: 'list',
            intentAr: 'بدء الجلسات وتوثيقها',
            intentEn: 'Start sessions and log progress',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
          },
          {
            id: 'action-start-session',
            kind: 'action-tile',
            intentAr: 'بدء الجلسة التالية بنقرة',
            intentEn: 'Start next session in one click',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'start-session',
          },
        ],
      },
      {
        id: 'me-pulse',
        kind: 'operational-pulse',
        position: 2,
        taskAr: 'تقدمي على المستفيدين',
        taskEn: 'My beneficiary progress',
        elements: [
          {
            id: 'kpi-my-session-completion',
            kind: 'kpi',
            intentAr: 'متابعة نسبة إكمال جلساتي',
            intentEn: 'Track my session completion rate',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.therapy_sessions.completion',
          },
        ],
      },
    ],
  },

  reception: {
    titleAr: 'لوحة الاستقبال',
    titleEn: 'Reception Dashboard',
    targetRoleGroups: ['reception'],
    density: 'high',
    smartDefaults: { dateRange: 'today', scope: ':branchId' },
    autoSave: {
      filters: 'dashboard_filters',
      complaint_draft: 'edit_draft',
    },
    sections: [
      {
        id: 'reception-critical',
        kind: 'critical-signals',
        position: 0,
        taskAr: 'حالات اليوم الحرجة',
        taskEn: 'Today-critical situations',
        elements: [
          {
            id: 'reception-alerts',
            kind: 'alert-stream',
            intentAr: 'الغيابات والوصول المتأخر والشكاوى الجديدة',
            intentEn: 'No-shows, late arrivals, fresh complaints',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refAlertSurface: 'reception',
          },
        ],
      },
      {
        id: 'reception-tasks',
        kind: 'task-group',
        position: 1,
        taskAr: 'إجراءات اليوم',
        taskEn: "Today's actions",
        elements: [
          {
            id: 'action-check-in',
            kind: 'action-tile',
            intentAr: 'تسجيل حضور سريع',
            intentEn: 'Quick check-in',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'check-in',
          },
          {
            id: 'action-log-complaint',
            kind: 'action-tile',
            intentAr: 'تسجيل شكوى جديدة',
            intentEn: 'Log new complaint',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refActionId: 'log-complaint',
          },
        ],
      },
      {
        id: 'reception-pulse',
        kind: 'operational-pulse',
        position: 2,
        taskAr: 'نبض اليوم',
        taskEn: "Today's pulse",
        elements: [
          {
            id: 'kpi-attendance-today',
            kind: 'kpi',
            intentAr: 'متابعة نسبة الحضور الحالية',
            intentEn: 'Track current attendance rate',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.attendance.daily_rate',
          },
          {
            id: 'kpi-open-complaints',
            kind: 'kpi',
            intentAr: 'الشكاوى المفتوحة في الفرع',
            intentEn: 'Open complaints in branch',
            tier: 1,
            aboveTheFold: true,
            revealOn: 'always',
            refKpiId: 'kpi.complaints.open_count',
          },
        ],
      },
    ],
  },
};

Object.freeze(DASHBOARDS);

// ─── API ────────────────────────────────────────────────────────

function listDashboardKeys() {
  return Object.keys(DASHBOARDS);
}

function getDashboard(key) {
  return DASHBOARDS[key] || null;
}

function getAutosaveProfile(name) {
  return AUTOSAVE_PROFILES[name] || null;
}

module.exports = {
  DASHBOARDS,
  TIERS,
  ELEMENT_KINDS,
  SECTION_KINDS,
  REVEAL_ON,
  COMMIT_TRIGGERS,
  AUTOSAVE_SCOPES,
  DENSITY_BUDGETS,
  AUTOSAVE_PROFILES,
  listDashboardKeys,
  getDashboard,
  getAutosaveProfile,
};
