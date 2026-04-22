/**
 * kpi.registry.js — canonical KPI catalogue for Al-Awael ERP.
 *
 * Phase-8 Commit 1. The foundation for the executive BI dashboard
 * + KPI-deviation alert digest. Each record names ONE operational
 * indicator we already compute somewhere — the registry pins down
 * its identity, owner, units, thresholds, data source, and the
 * compliance frameworks that care about it.
 *
 * Design decisions (recorded here so future edits stay consistent):
 *
 *   1. Registry is pure data (no I/O, no DB). Shape invariants are
 *      enforced at test time (`kpi-registry.test.js`). This file is
 *      safe to require from any layer — services, routes, CLIs.
 *
 *   2. IDs are slash-delimited slugs (`<domain>.<metric>[.<qualifier>]`)
 *      so the set reads like a namespace. Never rename; add a
 *      successor + deprecate the old entry instead — downstream
 *      dashboards/alerts key off the id.
 *
 *   3. Thresholds are directional. `warningThreshold` and
 *      `criticalThreshold` are numbers; which side trips red is
 *      determined by `direction` (`lower_is_better` means red when
 *      value > threshold; `higher_is_better` flips the comparison).
 *
 *   4. `dataSource.path` uses dot/bracket notation over the object
 *      returned by the declared service method. The aggregator
 *      (Commit 2) interprets it; no eval/dynamic-require here.
 *
 *   5. `compliance` tags use the same labels as
 *      docs/runbooks/phase-7-iam.md and the audit-log schema so that
 *      "which KPIs feed CBAHI evidence?" is a pure filter.
 *
 *   6. `owner` is a canonical role from config/rbac.config.js — the
 *      drift test asserts every owner resolves to an existing role.
 */

'use strict';

const DOMAINS = Object.freeze([
  'identity',
  'multi-branch',
  'clinical',
  'rehab',
  'scheduling',
  'finance',
  'hr',
  'quality',
  'crm',
  'documents',
  'communications',
  'gov-integrations',
  'analytics',
  'supply',
]);

const UNITS = Object.freeze([
  'hours',
  'days',
  'percent',
  'count',
  'currency_sar',
  'ratio',
  'score',
]);

const DIRECTIONS = Object.freeze(['higher_is_better', 'lower_is_better']);

const FREQUENCIES = Object.freeze(['hourly', 'daily', 'weekly', 'monthly']);

/**
 * The canonical KPI catalogue. 22 entries spanning seven bounded
 * contexts; all compute from services we ship today.
 */
const KPIS = Object.freeze([
  // ─── Quality — BC-08 ─────────────────────────────────────────
  {
    id: 'quality.incidents.mttr.critical_hours',
    nameEn: 'Incident MTTR — Critical severity (hours)',
    nameAr: 'متوسط زمن الحل — الحوادث الحرجة (ساعات)',
    domain: 'quality',
    unit: 'hours',
    direction: 'lower_is_better',
    target: 4,
    warningThreshold: 8,
    criticalThreshold: 16,
    dataSource: {
      service: 'incidentsAnalyticsService',
      method: 'bySeverity',
      path: "[?severity=='CRITICAL'].avgTtrHours",
    },
    owner: 'quality_coordinator',
    compliance: ['CBAHI 8.7'],
    frequency: 'daily',
  },
  {
    id: 'quality.incidents.open_critical.count',
    nameEn: 'Open critical incidents',
    nameAr: 'الحوادث الحرجة المفتوحة',
    domain: 'quality',
    unit: 'count',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 1,
    criticalThreshold: 3,
    dataSource: {
      service: 'incidentsAnalyticsService',
      method: 'bySeverity',
      path: "[?severity=='CRITICAL'].open",
    },
    owner: 'quality_coordinator',
    compliance: ['CBAHI 8.7'],
    frequency: 'hourly',
  },
  {
    id: 'quality.incidents.regulatory.count',
    nameEn: 'Regulatory-flagged incidents (MTD)',
    nameAr: 'الحوادث المُبلَّغة للجهات التنظيمية (هذا الشهر)',
    domain: 'quality',
    unit: 'count',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 1,
    criticalThreshold: 5,
    dataSource: {
      service: 'incidentsAnalyticsService',
      method: 'summarize',
      path: 'regulatoryCount',
    },
    owner: 'compliance_officer',
    compliance: ['CBAHI 8.7', 'MOH'],
    frequency: 'daily',
  },

  // ─── CRM — BC-09 ──────────────────────────────────────────────
  {
    id: 'crm.complaints.resolution_rate.pct',
    nameEn: 'Complaints resolution rate',
    nameAr: 'نسبة حل الشكاوى',
    domain: 'crm',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 95,
    warningThreshold: 85,
    criticalThreshold: 70,
    dataSource: {
      service: 'complaintsAnalyticsService',
      method: 'summarize',
      path: 'resolutionRate',
    },
    owner: 'quality_coordinator',
    compliance: ['CBAHI 4.3'],
    frequency: 'weekly',
  },
  {
    id: 'crm.complaints.sla_breach.count',
    nameEn: 'Complaints past SLA',
    nameAr: 'الشكاوى المتجاوزة لاتفاقية مستوى الخدمة',
    domain: 'crm',
    unit: 'count',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 3,
    criticalThreshold: 10,
    dataSource: {
      service: 'complaintsAnalyticsService',
      method: 'slaBreaches',
      path: 'length',
    },
    owner: 'quality_coordinator',
    compliance: ['CBAHI 4.3'],
    frequency: 'daily',
  },

  // ─── Documents — BC-10 ────────────────────────────────────────
  {
    id: 'documents.expired.count',
    nameEn: 'Expired employee documents',
    nameAr: 'مستندات الموظفين منتهية الصلاحية',
    domain: 'documents',
    unit: 'count',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 1,
    criticalThreshold: 5,
    dataSource: {
      service: 'documentExpiryRadarService',
      method: 'buildExpiryPlan',
      path: 'stats.expired',
    },
    owner: 'hr_manager',
    compliance: ['Saudi Labor Law', 'SCFHS'],
    frequency: 'daily',
  },
  {
    id: 'documents.expiring_30d.count',
    nameEn: 'Documents expiring within 30 days',
    nameAr: 'المستندات التي ستنتهي خلال 30 يوماً',
    domain: 'documents',
    unit: 'count',
    direction: 'lower_is_better',
    target: 0,
    warningThreshold: 5,
    criticalThreshold: 20,
    dataSource: {
      service: 'documentExpiryRadarService',
      method: 'buildExpiryPlan',
      path: 'stats.expiring30',
    },
    owner: 'hr_manager',
    compliance: ['Saudi Labor Law', 'SCFHS'],
    frequency: 'weekly',
  },

  // ─── Finance — BC-06 ──────────────────────────────────────────
  {
    id: 'finance.claims.denial_rate.pct',
    nameEn: 'Insurance claims denial rate',
    nameAr: 'نسبة رفض المطالبات التأمينية',
    domain: 'finance',
    unit: 'percent',
    direction: 'lower_is_better',
    target: 5,
    warningThreshold: 10,
    criticalThreshold: 20,
    dataSource: {
      service: 'claimsAnalyticsService',
      method: 'summarize',
      path: 'denialRate',
    },
    owner: 'finance_supervisor',
    compliance: ['CCHI', 'NPHIES'],
    frequency: 'weekly',
  },
  {
    id: 'finance.claims.collection_days.mean',
    nameEn: 'Average days to collection',
    nameAr: 'متوسط أيام التحصيل',
    domain: 'finance',
    unit: 'days',
    direction: 'lower_is_better',
    target: 30,
    warningThreshold: 45,
    criticalThreshold: 60,
    dataSource: {
      service: 'claimsAnalyticsService',
      method: 'summarize',
      path: 'avgCollectionDays',
    },
    owner: 'finance_supervisor',
    compliance: ['SAMA'],
    frequency: 'monthly',
  },
  {
    id: 'finance.revenue.mtd.sar',
    nameEn: 'Revenue month-to-date (SAR)',
    nameAr: 'الإيرادات حتى تاريخ اليوم من الشهر (ريال)',
    domain: 'finance',
    unit: 'currency_sar',
    direction: 'higher_is_better',
    target: null, // business-set, no generic default
    warningThreshold: null,
    criticalThreshold: null,
    dataSource: {
      service: 'revenueService',
      method: 'summarize',
      path: 'mtdRevenue',
    },
    owner: 'finance_supervisor',
    compliance: ['ZATCA'],
    frequency: 'daily',
  },
  {
    id: 'finance.forecast.accuracy.pct',
    nameEn: 'Revenue forecast accuracy (last month)',
    nameAr: 'دقة توقع الإيرادات (الشهر الماضي)',
    domain: 'finance',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 95,
    warningThreshold: 85,
    criticalThreshold: 70,
    dataSource: {
      service: 'revenueForecastService',
      method: 'backtestAccuracy',
      path: 'lastMonthAccuracyPct',
    },
    owner: 'finance_supervisor',
    compliance: [],
    frequency: 'monthly',
  },

  // ─── HR — BC-07 ───────────────────────────────────────────────
  {
    id: 'hr.saudization.ratio.pct',
    nameEn: 'Saudization ratio',
    nameAr: 'نسبة السعودة',
    domain: 'hr',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 40,
    warningThreshold: 30,
    criticalThreshold: 20,
    dataSource: {
      service: 'saudizationAnalyticsService',
      method: 'summarize',
      path: 'saudiPct',
    },
    owner: 'hr_manager',
    compliance: ['Nitaqat', 'Saudi Labor Law'],
    frequency: 'daily',
  },
  {
    id: 'hr.credentials.compliance.pct',
    nameEn: 'Credential compliance rate',
    nameAr: 'نسبة امتثال الرخص المهنية',
    domain: 'hr',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 100,
    warningThreshold: 95,
    criticalThreshold: 85,
    dataSource: {
      service: 'cpeService',
      method: 'summarize',
      path: 'compliantPct',
    },
    owner: 'hr_manager',
    compliance: ['SCFHS'],
    frequency: 'daily',
  },
  {
    id: 'hr.nps.score',
    nameEn: 'Employee NPS',
    nameAr: 'مؤشر رضا الموظفين',
    domain: 'hr',
    unit: 'score',
    direction: 'higher_is_better',
    target: 50,
    warningThreshold: 20,
    criticalThreshold: 0,
    dataSource: {
      service: 'npsService',
      method: 'latestScore',
      path: 'score',
    },
    owner: 'hr_manager',
    compliance: [],
    frequency: 'monthly',
  },

  // ─── Scheduling — BC-05 ───────────────────────────────────────
  {
    id: 'scheduling.utilization.therapist.pct',
    nameEn: 'Therapist utilization',
    nameAr: 'استغلال وقت المعالجين',
    domain: 'scheduling',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 80,
    warningThreshold: 65,
    criticalThreshold: 50,
    dataSource: {
      service: 'therapistUtilizationService',
      method: 'summarize',
      path: 'utilizationPct',
    },
    owner: 'clinical_director',
    compliance: [],
    frequency: 'weekly',
  },
  {
    id: 'scheduling.noshow.rate.pct',
    nameEn: 'Session no-show rate',
    nameAr: 'نسبة التغيب عن الجلسات',
    domain: 'scheduling',
    unit: 'percent',
    direction: 'lower_is_better',
    target: 5,
    warningThreshold: 10,
    criticalThreshold: 20,
    dataSource: {
      service: 'attendanceService',
      method: 'summarize',
      path: 'noShowRate',
    },
    owner: 'clinical_director',
    compliance: [],
    frequency: 'weekly',
  },

  // ─── CRM — waitlist / referrals / retention ───────────────────
  {
    id: 'crm.waitlist.conversion.pct',
    nameEn: 'Waitlist → enrolled conversion',
    nameAr: 'نسبة تحويل قائمة الانتظار إلى تسجيل',
    domain: 'crm',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 60,
    warningThreshold: 45,
    criticalThreshold: 30,
    dataSource: {
      service: 'waitingListService',
      method: 'summarize',
      path: 'conversionRate',
    },
    owner: 'manager',
    compliance: [],
    frequency: 'monthly',
  },
  {
    id: 'crm.retention.churn.pct',
    nameEn: 'Beneficiary churn rate (90d)',
    nameAr: 'نسبة الانسحاب (90 يوماً)',
    domain: 'crm',
    unit: 'percent',
    direction: 'lower_is_better',
    target: 3,
    warningThreshold: 7,
    criticalThreshold: 15,
    dataSource: {
      service: 'retentionService',
      method: 'summarize',
      path: 'churnRate90d',
    },
    owner: 'ceo',
    compliance: [],
    frequency: 'monthly',
  },
  {
    id: 'crm.referrals.accepted.rate.pct',
    nameEn: 'Referral acceptance rate',
    nameAr: 'نسبة قبول الإحالات',
    domain: 'crm',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 75,
    warningThreshold: 60,
    criticalThreshold: 40,
    dataSource: {
      service: 'referralTrackingService',
      method: 'summarize',
      path: 'acceptanceRate',
    },
    owner: 'manager',
    compliance: [],
    frequency: 'monthly',
  },

  // ─── Rehab — BC-04 ────────────────────────────────────────────
  {
    id: 'rehab.outcomes.goal_progress.pct',
    nameEn: 'Care-plan goal progress (MoM average)',
    nameAr: 'متوسط تقدم أهداف الخطة العلاجية (شهر على شهر)',
    domain: 'rehab',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 70,
    warningThreshold: 55,
    criticalThreshold: 40,
    dataSource: {
      service: 'goalProgressService',
      method: 'summarize',
      path: 'averageProgressPct',
    },
    owner: 'clinical_director',
    compliance: ['CBAHI 8.7'],
    frequency: 'monthly',
  },

  // ─── Communications — parent portal ────────────────────────
  {
    id: 'communications.parent_portal.activation.pct',
    nameEn: 'Parent portal activation rate',
    nameAr: 'نسبة تفعيل بوابة أولياء الأمور',
    domain: 'communications',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 80,
    warningThreshold: 60,
    criticalThreshold: 40,
    dataSource: {
      service: 'parentReportService',
      method: 'activationSummary',
      path: 'activatedPct',
    },
    owner: 'admin',
    compliance: [],
    frequency: 'monthly',
  },

  // ─── Onboarding ───────────────────────────────────────────────
  {
    id: 'hr.onboarding.completion.pct',
    nameEn: 'New-hire onboarding completion (30-day)',
    nameAr: 'نسبة إتمام تأهيل الموظفين الجدد (30 يوماً)',
    domain: 'hr',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 95,
    warningThreshold: 80,
    criticalThreshold: 60,
    dataSource: {
      service: 'onboardingAnalyticsService',
      method: 'summarize',
      path: 'completionRate30d',
    },
    owner: 'hr_manager',
    compliance: ['Saudi Labor Law'],
    frequency: 'monthly',
  },
]);

// ─── Lookups ────────────────────────────────────────────────────

function byId(id) {
  return KPIS.find(k => k.id === id) || null;
}

function byDomain(domain) {
  return KPIS.filter(k => k.domain === domain);
}

function byOwner(role) {
  return KPIS.filter(k => k.owner === role);
}

function byCompliance(framework) {
  return KPIS.filter(k => k.compliance.includes(framework));
}

/**
 * Classify a raw numeric `value` against a KPI's thresholds.
 * Returns `'green' | 'amber' | 'red' | 'unknown'`. Null thresholds
 * (business-set indicators like revenue targets) degrade to
 * `'unknown'` — the aggregator surfaces these as "watch" entries
 * without tripping alarms.
 */
function classify(kpi, value) {
  if (value == null || Number.isNaN(Number(value))) return 'unknown';
  if (kpi.warningThreshold == null || kpi.criticalThreshold == null) return 'unknown';
  const v = Number(value);
  if (kpi.direction === 'lower_is_better') {
    if (v >= kpi.criticalThreshold) return 'red';
    if (v >= kpi.warningThreshold) return 'amber';
    return 'green';
  }
  // higher_is_better
  if (v <= kpi.criticalThreshold) return 'red';
  if (v <= kpi.warningThreshold) return 'amber';
  return 'green';
}

module.exports = {
  KPIS,
  DOMAINS,
  UNITS,
  DIRECTIONS,
  FREQUENCIES,
  byId,
  byDomain,
  byOwner,
  byCompliance,
  classify,
};
