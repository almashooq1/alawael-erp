'use strict';

/**
 * drilldown.registry.js — Wave 21.
 *
 * Single source of truth for the drill-down chain on every KPI.
 * Each entry binds a KPI to:
 *   • Five drill levels (executive → branch → unit → entity-list → record)
 *   • Upstream drivers (for the root-cause chain — Wave 22)
 *   • Ownership chain (role → fallback)
 *   • Suggested actions (with deepLink + estimatedMin + severity)
 *   • Related Insight generators (the "Explanation" tab)
 *
 * Drift test (`__tests__/drilldown-kpi-coverage.test.js`) fails CI if
 * a KPI is added to `config/kpi.registry.js` without a matching entry
 * here. See `docs/blueprint/29-drilldown-architecture.md` for the
 * full design contract.
 *
 * Levels are ordered shallow→deep:
 *   0: executive
 *   1: branch
 *   2: unit
 *   3: entity-list
 *   4: record
 *
 * The `levels` array can be sparse (skip levels that don't make
 * sense for a KPI — e.g. an executive-only metric like "active
 * branches" stops at level 1).
 */

const LEVELS = Object.freeze(['executive', 'branch', 'unit', 'entity-list', 'record']);

const CATEGORIES = Object.freeze([
  'clinical',
  'financial',
  'hr',
  'operational',
  'quality',
  'compliance',
]);

const ACTION_SEVERITIES = Object.freeze(['must', 'should', 'may']);

const DEFAULT_OWNER_FALLBACK_CHAIN = Object.freeze({
  clinical: ['care_manager', 'medical_director', 'branch_manager', 'super_admin'],
  financial: ['finance_manager', 'finance_director', 'branch_manager', 'super_admin'],
  hr: ['hr_manager', 'hr_director', 'branch_manager', 'super_admin'],
  operational: ['operations_manager', 'branch_manager', 'super_admin'],
  quality: ['quality_manager', 'quality_director', 'super_admin'],
  compliance: ['compliance_officer', 'dpo', 'super_admin'],
});

// ─── Registry ───────────────────────────────────────────────────

const REGISTRY = {
  // Beneficiary KPIs
  'kpi.beneficiary.active_count': {
    titleAr: 'عدد المستفيدين النشطين',
    titleEn: 'Active beneficiaries',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/care' },
      { level: 'entity-list', path: '/beneficiaries?branch=:branchId&status=active' },
      { level: 'record', path: '/beneficiary-portal/:beneficiaryId' },
    ],
    drivers: ['kpi.beneficiary.admissions_monthly', 'kpi.beneficiary.discharges_monthly'],
    owner: { role: 'branch_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'open-beneficiary',
        titleAr: 'افتح ملف المستفيد',
        titleEn: 'Open beneficiary file',
        deepLink: '/beneficiary-portal/:beneficiaryId',
        estimatedMin: 5,
        severity: 'may',
      },
    ],
    relatedGeneratorIds: ['care-gap.v1', 'trend-deviation.v1'],
  },

  'kpi.beneficiary.admissions_monthly': {
    titleAr: 'القبول الشهري',
    titleEn: 'Monthly admissions',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'entity-list', path: '/beneficiaries?branch=:branchId&filter=admitted_this_month' },
      { level: 'record', path: '/beneficiary-portal/:beneficiaryId' },
    ],
    drivers: ['kpi.referrals.intake_monthly', 'kpi.waitlist.size'],
    owner: { role: 'branch_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'review-waitlist',
        titleAr: 'راجع قائمة الانتظار',
        titleEn: 'Review waitlist',
        deepLink: '/waitlist?branch=:branchId',
        estimatedMin: 15,
        severity: 'should',
      },
    ],
    relatedGeneratorIds: ['trend-deviation.v1', 'anomaly.v1'],
  },

  'kpi.beneficiary.discharges_monthly': {
    titleAr: 'الخروج الشهري',
    titleEn: 'Monthly discharges',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      {
        level: 'entity-list',
        path: '/beneficiaries?branch=:branchId&filter=discharged_this_month',
      },
      { level: 'record', path: '/beneficiary-portal/:beneficiaryId' },
    ],
    drivers: ['kpi.goals.achieved_rate', 'kpi.beneficiary.discharge_reasons'],
    owner: { role: 'care_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'review-discharge',
        titleAr: 'راجع تقرير الخروج',
        titleEn: 'Review discharge report',
        deepLink: '/beneficiary-portal/:beneficiaryId?tab=discharge',
        estimatedMin: 10,
        severity: 'should',
      },
    ],
    relatedGeneratorIds: ['trend-deviation.v1'],
  },

  // Attendance
  'kpi.attendance.daily_rate': {
    titleAr: 'معدل الحضور اليومي',
    titleEn: 'Daily attendance rate',
    category: 'operational',
    terminalLevel: 'record',
    slice: 'explanation',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/attendance' },
      { level: 'entity-list', path: '/attendance?branch=:branchId&date=:date&status=absent' },
      { level: 'record', path: '/beneficiary-portal/:beneficiaryId?tab=attendance' },
    ],
    drivers: [
      'kpi.transport.late_pickup_rate',
      'kpi.transport.vehicle_availability',
      'kpi.attendance.no_show_count',
    ],
    owner: { role: 'operations_manager', fallbackChain: 'operational' },
    actions: [
      {
        id: 'check-transport',
        titleAr: 'افحص حالة النقل',
        titleEn: 'Check transport status',
        deepLink: '/transport/dispatch?branch=:branchId',
        estimatedMin: 10,
        severity: 'should',
      },
      {
        id: 'contact-guardians',
        titleAr: 'تواصل مع أولياء أمور الغائبين',
        titleEn: 'Contact absent beneficiaries’ guardians',
        deepLink: '/attendance/absent-followup?branch=:branchId&date=:date',
        estimatedMin: 20,
        severity: 'must',
      },
    ],
    relatedGeneratorIds: ['anomaly.v1', 'trend-deviation.v1'],
  },

  // Goals / Care plans
  'kpi.goals.stalled_count': {
    titleAr: 'الأهداف المتعثرة',
    titleEn: 'Stalled goals',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/care' },
      { level: 'entity-list', path: '/beneficiaries?branch=:branchId&filter=goals_stalled' },
      { level: 'record', path: '/beneficiary-portal/:beneficiaryId?tab=goals' },
    ],
    drivers: [
      'kpi.attendance.daily_rate',
      'kpi.therapy_sessions.completion',
      'kpi.therapist.utilization',
    ],
    owner: { role: 'care_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'review-goal',
        titleAr: 'راجع الهدف',
        titleEn: 'Review goal',
        deepLink: '/smart-goals/:goalId',
        estimatedMin: 15,
        severity: 'should',
      },
      {
        id: 'reschedule-intervention',
        titleAr: 'أعد جدولة التدخل',
        titleEn: 'Reschedule intervention',
        deepLink: '/appointments/new?beneficiary=:beneficiaryId',
        estimatedMin: 10,
        severity: 'should',
      },
      {
        id: 'escalate-care',
        titleAr: 'تصعيد لمدير الرعاية',
        titleEn: 'Escalate to care manager',
        deepLink: '/care/escalations/new?subject=goal&id=:goalId',
        estimatedMin: 5,
        severity: 'may',
      },
    ],
    relatedGeneratorIds: ['care-gap.v1', 'anomaly.v1'],
  },

  'kpi.care_plans.review_overdue': {
    titleAr: 'خطط الرعاية متأخرة المراجعة',
    titleEn: 'Care plans with overdue review',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'next-action',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/care' },
      { level: 'entity-list', path: '/care-plans?branch=:branchId&filter=review_overdue' },
      { level: 'record', path: '/care-plans/:carePlanId' },
    ],
    drivers: ['kpi.therapist.utilization', 'kpi.care_plans.average_review_cycle'],
    owner: { role: 'care_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'open-care-plan',
        titleAr: 'افتح خطة الرعاية',
        titleEn: 'Open care plan',
        deepLink: '/care-plans/:carePlanId',
        estimatedMin: 20,
        severity: 'must',
      },
    ],
    relatedGeneratorIds: ['care-gap.v1'],
  },

  // Therapy sessions / therapist utilization
  'kpi.therapy_sessions.completion': {
    titleAr: 'نسبة إتمام الجلسات',
    titleEn: 'Therapy session completion rate',
    category: 'clinical',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/care' },
      { level: 'entity-list', path: '/sessions?branch=:branchId&status=incomplete' },
      { level: 'record', path: '/sessions/:sessionId' },
    ],
    drivers: ['kpi.therapist.utilization', 'kpi.attendance.daily_rate'],
    owner: { role: 'care_manager', fallbackChain: 'clinical' },
    actions: [
      {
        id: 'review-incomplete',
        titleAr: 'راجع الجلسات غير المكتملة',
        titleEn: 'Review incomplete sessions',
        deepLink: '/sessions?branch=:branchId&status=incomplete',
        estimatedMin: 15,
        severity: 'should',
      },
    ],
    relatedGeneratorIds: ['anomaly.v1', 'trend-deviation.v1'],
  },

  'kpi.therapist.utilization': {
    titleAr: 'استغلال المعالجين',
    titleEn: 'Therapist utilization',
    category: 'hr',
    terminalLevel: 'record',
    slice: 'breakdown',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/hr' },
      { level: 'entity-list', path: '/hr/employees?branch=:branchId&role=therapist' },
      { level: 'record', path: '/hr/employees/:employeeId' },
    ],
    drivers: ['kpi.therapist.caseload', 'kpi.therapist.absenteeism'],
    owner: { role: 'hr_manager', fallbackChain: 'hr' },
    actions: [
      {
        id: 'rebalance-caseload',
        titleAr: 'أعد توزيع الحالات',
        titleEn: 'Rebalance caseload',
        deepLink: '/care/assignments?branch=:branchId',
        estimatedMin: 30,
        severity: 'should',
      },
    ],
    relatedGeneratorIds: ['trend-deviation.v1', 'branch-underperform.v1'],
  },

  // Finance
  'kpi.invoices.overdue_count': {
    titleAr: 'الفواتير المتأخرة',
    titleEn: 'Overdue invoices',
    category: 'financial',
    terminalLevel: 'record',
    slice: 'next-action',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/finance' },
      { level: 'entity-list', path: '/finance/invoices?branch=:branchId&status=overdue' },
      { level: 'record', path: '/finance/invoices/:invoiceId' },
    ],
    drivers: ['kpi.invoices.collection_cycle_days', 'kpi.invoices.payer_response_time'],
    owner: { role: 'finance_manager', fallbackChain: 'financial' },
    actions: [
      {
        id: 'send-reminder',
        titleAr: 'أرسل تذكير سداد',
        titleEn: 'Send payment reminder',
        deepLink: '/finance/invoices/:invoiceId?action=remind',
        estimatedMin: 5,
        severity: 'must',
      },
      {
        id: 'escalate-finance',
        titleAr: 'تصعيد لمدير المالية',
        titleEn: 'Escalate to finance manager',
        deepLink: '/finance/escalations/new?invoice=:invoiceId',
        estimatedMin: 10,
        severity: 'should',
      },
    ],
    relatedGeneratorIds: ['trend-deviation.v1', 'anomaly.v1'],
  },

  // Quality / CRM
  'kpi.complaints.open_count': {
    titleAr: 'الشكاوى المفتوحة',
    titleEn: 'Open complaints',
    category: 'quality',
    terminalLevel: 'record',
    slice: 'next-action',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/quality' },
      { level: 'entity-list', path: '/crm/complaints?branch=:branchId&status=open' },
      { level: 'record', path: '/crm/complaints/:complaintId' },
    ],
    drivers: ['kpi.complaints.sla_breach_rate', 'kpi.complaints.first_response_time'],
    owner: { role: 'quality_manager', fallbackChain: 'quality' },
    actions: [
      {
        id: 'assign-owner',
        titleAr: 'عيّن مالك الشكوى',
        titleEn: 'Assign complaint owner',
        deepLink: '/crm/complaints/:complaintId?action=assign',
        estimatedMin: 5,
        severity: 'must',
      },
      {
        id: 'contact-complainant',
        titleAr: 'تواصل مع المشتكي',
        titleEn: 'Contact complainant',
        deepLink: '/crm/complaints/:complaintId?action=contact',
        estimatedMin: 15,
        severity: 'must',
      },
    ],
    relatedGeneratorIds: ['trend-deviation.v1', 'anomaly.v1'],
  },

  'kpi.incidents.critical_open': {
    titleAr: 'الحوادث الحرجة المفتوحة',
    titleEn: 'Open critical incidents',
    category: 'quality',
    terminalLevel: 'record',
    slice: 'next-action',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/quality' },
      {
        level: 'entity-list',
        path: '/quality/incidents?branch=:branchId&severity=critical&status=open',
      },
      { level: 'record', path: '/quality/incidents/:incidentId' },
    ],
    drivers: ['kpi.incidents.reporting_rate', 'kpi.capa.open_count'],
    owner: { role: 'quality_director', fallbackChain: 'quality' },
    actions: [
      {
        id: 'open-incident',
        titleAr: 'افتح الحادثة',
        titleEn: 'Open incident',
        deepLink: '/quality/incidents/:incidentId',
        estimatedMin: 30,
        severity: 'must',
      },
      {
        id: 'start-rca',
        titleAr: 'ابدأ تحليل السبب الجذري',
        titleEn: 'Start root-cause analysis',
        deepLink: '/quality/rca/new?incident=:incidentId',
        estimatedMin: 60,
        severity: 'must',
      },
    ],
    relatedGeneratorIds: ['anomaly.v1'],
  },

  // Compliance
  'kpi.documents.expiring_30d': {
    titleAr: 'الوثائق منتهية خلال 30 يوم',
    titleEn: 'Documents expiring within 30 days',
    category: 'compliance',
    terminalLevel: 'record',
    slice: 'next-action',
    levels: [
      { level: 'executive', path: '/dashboards/executive' },
      { level: 'branch', path: '/dashboards/branch/:branchId' },
      { level: 'unit', path: '/dashboards/branch/:branchId/compliance' },
      { level: 'entity-list', path: '/documents?branch=:branchId&filter=expiring_30d' },
      { level: 'record', path: '/documents/:documentId' },
    ],
    drivers: ['kpi.documents.renewal_lead_time'],
    owner: { role: 'compliance_officer', fallbackChain: 'compliance' },
    actions: [
      {
        id: 'request-renewal',
        titleAr: 'اطلب تجديد الوثيقة',
        titleEn: 'Request document renewal',
        deepLink: '/documents/:documentId?action=renew',
        estimatedMin: 10,
        severity: 'must',
      },
    ],
    relatedGeneratorIds: ['care-gap.v1'],
  },
};

Object.freeze(REGISTRY);

// ─── Public API ─────────────────────────────────────────────────

function getKpiDrillMetadata(kpiId) {
  return REGISTRY[kpiId] || null;
}

function listRegisteredKpis() {
  return Object.keys(REGISTRY);
}

function getRegistry() {
  return REGISTRY;
}

module.exports = {
  REGISTRY,
  LEVELS,
  CATEGORIES,
  ACTION_SEVERITIES,
  DEFAULT_OWNER_FALLBACK_CHAIN,
  getKpiDrillMetadata,
  listRegisteredKpis,
  getRegistry,
};
