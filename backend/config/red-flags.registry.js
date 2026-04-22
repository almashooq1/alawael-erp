/**
 * red-flags.registry.js — canonical Red-Flag taxonomy for Al-Awael ERP.
 *
 * Beneficiary-360 Foundation Commit 1. The foundation for the
 * 360 beneficiary profile alert strip, the clinical red-flag engine
 * (next commit), and the compliance evidence pack. Each record names
 * ONE observable condition we either already compute today or will
 * compute in the next commit — the registry pins down its identity,
 * owner, trigger shape, SLA, and the compliance frameworks that care
 * about it.
 *
 * Design decisions (recorded here so future edits stay consistent):
 *
 *   1. Registry is pure data (no I/O, no DB). Shape invariants are
 *      enforced at test time (`red-flags-registry.test.js`). This file
 *      is safe to require from any layer — services, routes, CLIs,
 *      evaluation workers.
 *
 *   2. IDs are slash-delimited slugs (`<domain>.<entity>.<qualifier>`)
 *      so the set reads like a namespace. Never rename; add a
 *      successor + deprecate the old entry instead — downstream
 *      dashboards/alerts/workflows key off the id.
 *
 *   3. Triggers are declarative, not executable. The engine (Commit 2)
 *      interprets `trigger.source` and `trigger.condition.operator`;
 *      no eval, no dynamic require, no arbitrary predicate functions.
 *      Operators come from a closed set.
 *
 *   4. `response.notify` and `response.escalateTo` reference canonical
 *      roles from config/rbac.config.js — the drift test asserts
 *      every role resolves. Same for `owner`.
 *
 *   5. `kpiLinks` reference entries in config/kpi.registry.js — the
 *      drift test asserts every link resolves. This is how a raised
 *      flag can degrade the relevant KPI in the exec dashboard.
 *
 *   6. `compliance` tags use the same labels as the KPI registry and
 *      the audit-log schema so "which flags feed CBAHI evidence?" is
 *      a pure filter.
 *
 *   7. `autoResolve: null` means manual close only (medical safety
 *      flags). `condition_cleared` means the engine re-evaluates and
 *      closes when the observed value no longer trips. `timer` closes
 *      after a fixed duration even if condition persists — reserve
 *      for informational flags.
 *
 *   8. Blocking flags (response.blocking === true) halt downstream
 *      clinical actions (e.g., starting a session). The invariant
 *      test asserts every blocking flag is severity 'critical' — we
 *      don't let 'warning' flags block care.
 */

'use strict';

const { ROLES } = require('./rbac.config');
const { byId: kpiById } = require('./kpi.registry');

const DOMAINS = Object.freeze([
  'clinical',
  'behavioral',
  'operational',
  'attendance',
  'compliance',
  'safety',
  'family',
  'financial',
]);

const SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

const CATEGORIES = Object.freeze([
  'threshold', // numeric crosses a bound
  'event', // specific domain event occurred
  'absence', // expected event did NOT occur in window
  'composite', // combination of the above
]);

const OPERATORS = Object.freeze([
  '<',
  '<=',
  '==',
  '!=',
  '>=',
  '>',
  'crossed', // direction-agnostic threshold crossing
  'exists', // entity/record is present
  'missing', // entity/record is absent in window
  'and',
  'or', // composite only
]);

const AUTORESOLVE_TYPES = Object.freeze(['condition_cleared', 'timer', 'manual']);

/**
 * The canonical Red-Flag catalogue. 26 entries spanning eight
 * beneficiary-360 domains; every entry is raise-able today or
 * becomes raise-able in Beneficiary-360 Commit 2.
 */
const RED_FLAGS = Object.freeze([
  // ─── Clinical — medication, diagnosis, development ────────────
  {
    id: 'clinical.allergy.severe.medication_conflict',
    nameEn: 'Severe allergy — new medication conflicts with known reaction',
    nameAr: 'حساسية شديدة — دواء جديد يتعارض مع تفاعل موثّق',
    domain: 'clinical',
    severity: 'critical',
    category: 'event',
    trigger: {
      source: {
        service: 'medicationService',
        method: 'onPrescribe',
        path: 'drug.rxNormId',
      },
      condition: {
        operator: '==',
        value: 'allergen.match',
      },
    },
    response: {
      blocking: true,
      notify: [ROLES.CLINICAL_DIRECTOR, ROLES.DOCTOR, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'clinical.medication-review.urgent',
    },
    slaHours: 1,
    cooldownHours: 0,
    autoResolve: null,
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 7.3', 'SFDA'],
    kpiLinks: [],
  },
  {
    id: 'clinical.progress.regression.significant',
    nameEn: 'Significant regression — goal score drop vs 30-day baseline',
    nameAr: 'تراجع ملحوظ — انخفاض درجة الهدف مقارنة بخط الأساس 30 يوم',
    domain: 'clinical',
    severity: 'critical',
    category: 'threshold',
    trigger: {
      source: {
        service: 'goalProgressService',
        method: 'deltaVsBaseline',
        path: 'deltaPct',
      },
      condition: {
        operator: '<=',
        value: -20,
        windowDays: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'clinical.multidisciplinary-review',
    },
    slaHours: 72,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
  },
  {
    id: 'clinical.seizure.cluster.48h',
    nameEn: 'Seizure cluster — more than 2 events in 48 hours',
    nameAr: 'تجمّع نوبات صرع — أكثر من نوبتين خلال 48 ساعة',
    domain: 'clinical',
    severity: 'critical',
    category: 'threshold',
    trigger: {
      source: {
        service: 'incidentService',
        method: 'countByTypeForBeneficiary',
        path: 'counts.seizure',
      },
      condition: {
        operator: '>',
        value: 2,
        windowDays: 2,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.DOCTOR, ROLES.CLINICAL_DIRECTOR, ROLES.QUALITY_COORDINATOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'clinical.neurology-referral',
    },
    slaHours: 4,
    cooldownHours: 12,
    autoResolve: null,
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 7.3', 'CBAHI 8.7'],
    kpiLinks: ['quality.incidents.open_critical.count'],
  },
  {
    id: 'clinical.pediatric.weight.drop_5pct',
    nameEn: 'Pediatric weight drop — 5% or more over 90 days',
    nameAr: 'انخفاض وزن الأطفال — 5% أو أكثر خلال 90 يوم',
    domain: 'clinical',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'vitalsService',
        method: 'beneficiaryTrend',
        path: 'weight.deltaPct90d',
      },
      condition: {
        operator: '<=',
        value: -5,
        windowDays: 90,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.DOCTOR, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.DOCTOR,
      taskTemplate: 'clinical.dietitian-consult',
    },
    slaHours: 168,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: [],
  },
  {
    id: 'clinical.vaccination.overdue.60d',
    nameEn: 'Vaccination overdue — more than 60 days past schedule',
    nameAr: 'تطعيم متأخر — تجاوز الموعد بأكثر من 60 يوم',
    domain: 'clinical',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'vaccinationService',
        method: 'dueStatusForBeneficiary',
        path: 'overdueCount',
      },
      condition: {
        operator: '>=',
        value: 1,
        windowDays: 60,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.DOCTOR, ROLES.RECEPTIONIST],
      escalateTo: ROLES.DOCTOR,
      taskTemplate: 'clinical.vaccination-outreach',
    },
    slaHours: 336,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['MOH'],
    kpiLinks: [],
  },
  {
    id: 'clinical.consent.treatment.missing_pre_session',
    nameEn: 'Treatment consent missing — session scheduled without active consent',
    nameAr: 'موافقة علاج مفقودة — جلسة مجدولة بدون موافقة سارية',
    domain: 'clinical',
    severity: 'critical',
    category: 'absence',
    trigger: {
      source: {
        service: 'consentService',
        method: 'activeForBeneficiary',
        path: 'treatmentActive',
      },
      condition: {
        operator: '==',
        value: false,
      },
    },
    response: {
      blocking: true,
      notify: [ROLES.RECEPTIONIST, ROLES.THERAPY_SUPERVISOR, ROLES.COMPLIANCE_OFFICER],
      escalateTo: ROLES.COMPLIANCE_OFFICER,
      taskTemplate: 'compliance.consent-collection',
    },
    slaHours: 0,
    cooldownHours: 0,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['CBAHI 4.3', 'PDPL'],
    kpiLinks: [],
  },
  {
    id: 'clinical.puberty.consent_review.due',
    nameEn: 'Puberty transition — consent review required at age 13',
    nameAr: 'انتقال البلوغ — مراجعة الموافقات مطلوبة عند سن 13',
    domain: 'clinical',
    severity: 'info',
    category: 'event',
    trigger: {
      source: {
        service: 'beneficiaryService',
        method: 'ageTransitionTo',
        path: 'age',
      },
      condition: {
        operator: '==',
        value: 13,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR, ROLES.COMPLIANCE_OFFICER],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'compliance.consent-refresh',
    },
    slaHours: 720,
    cooldownHours: 8760,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['PDPL'],
    kpiLinks: [],
  },
  {
    id: 'clinical.goal.stalled.21d',
    nameEn: 'Goal stalled — no recorded progress in the last 21 days',
    nameAr: 'هدف متعثر — لا يوجد تقدم مسجّل خلال آخر 21 يوماً',
    domain: 'clinical',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'goalProgressService',
        method: 'daysSinceLastProgress',
        path: 'daysSince',
      },
      condition: {
        operator: '>=',
        value: 21,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'clinical.goal-review',
    },
    slaHours: 168,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.goals.stalled.pct', 'rehab.goals.velocity.mean_days'],
  },
  {
    id: 'clinical.goal.regression.consecutive_2',
    nameEn: 'Goal regression — 2 consecutive sessions rated REGRESSED',
    nameAr: 'تراجع في الهدف — جلستان متتاليتان بتقييم تراجع',
    domain: 'clinical',
    severity: 'critical',
    category: 'event',
    trigger: {
      source: {
        service: 'goalProgressService',
        method: 'consecutiveRatings',
        path: 'regressedStreak',
      },
      condition: {
        operator: '>=',
        value: 2,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPIST, ROLES.THERAPY_SUPERVISOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'clinical.goal-regression-review',
    },
    slaHours: 48,
    cooldownHours: 72,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.outcomes.goal_progress.pct', 'rehab.goals.stalled.pct'],
  },
  {
    id: 'clinical.outcome_measure.decline.pct_15',
    nameEn: 'Outcome-measure score decline — 15% or more vs baseline',
    nameAr: 'انخفاض درجة مقياس النتائج — 15% أو أكثر مقارنة بخط الأساس',
    domain: 'clinical',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'outcomeMeasureService',
        method: 'deltaVsBaseline',
        path: 'deltaPct',
      },
      condition: {
        operator: '<=',
        value: -15,
        windowDays: 180,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'clinical.reassessment-review',
    },
    slaHours: 168,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
  },

  // ─── Behavioral ───────────────────────────────────────────────
  {
    id: 'behavioral.aggression.frequency.spike_200',
    nameEn: 'Aggression frequency spike — 200% or more vs 30-day baseline',
    nameAr: 'ارتفاع تكرار السلوك العدواني — 200% أو أكثر مقارنة بخط الأساس',
    domain: 'behavioral',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'behaviorTrackingService',
        method: 'frequencyDelta',
        path: 'aggressionDeltaPct',
      },
      condition: {
        operator: '>=',
        value: 200,
        windowDays: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPIST_PSYCH, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPIST_PSYCH,
      taskTemplate: 'clinical.bcba-consult',
    },
    slaHours: 72,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: [],
  },

  // ─── Attendance ───────────────────────────────────────────────
  {
    id: 'attendance.monthly.rate.low_70',
    nameEn: 'Monthly attendance rate — below 70%',
    nameAr: 'نسبة الحضور الشهرية — أقل من 70%',
    domain: 'attendance',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'attendanceService',
        method: 'beneficiaryMonthlyRate',
        path: 'attendanceRate',
      },
      condition: {
        operator: '<',
        value: 70,
        windowDays: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.RECEPTIONIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'operations.attendance-outreach',
    },
    slaHours: 168,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: [],
    kpiLinks: ['scheduling.noshow.rate.pct'],
  },
  {
    id: 'attendance.missed.streak_3_consecutive',
    nameEn: 'Missed sessions — 3 or more consecutive',
    nameAr: 'جلسات متغيّبة — 3 متتالية أو أكثر',
    domain: 'attendance',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'attendanceService',
        method: 'consecutiveMissedForBeneficiary',
        path: 'streakCount',
      },
      condition: {
        operator: '>=',
        value: 3,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.RECEPTIONIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'operations.family-outreach',
    },
    slaHours: 24,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.MANAGER,
    compliance: [],
    kpiLinks: ['scheduling.noshow.rate.pct'],
  },

  // ─── Operational ──────────────────────────────────────────────
  {
    id: 'operational.contract.expiring.30d',
    nameEn: 'Service contract — expires in 30 days or less',
    nameAr: 'عقد الخدمة — ينتهي خلال 30 يوم أو أقل',
    domain: 'operational',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'contractService',
        method: 'beneficiaryContracts',
        path: 'daysToExpiry',
      },
      condition: {
        operator: '<=',
        value: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.ACCOUNTANT, ROLES.MANAGER],
      escalateTo: ROLES.MANAGER,
      taskTemplate: 'finance.contract-renewal',
    },
    slaHours: 168,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.MANAGER,
    compliance: [],
    kpiLinks: [],
  },
  {
    id: 'operational.care_plan.unsigned.14d',
    nameEn: 'Care plan — unsigned more than 14 days after issue',
    nameAr: 'الخطة العلاجية — غير موقّعة لأكثر من 14 يوم بعد الإصدار',
    domain: 'operational',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'carePlanService',
        method: 'unsignedOlderThan',
        path: 'count',
      },
      condition: {
        operator: '>=',
        value: 1,
        windowDays: 14,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR, ROLES.RECEPTIONIST],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'operations.careplan-signature',
    },
    slaHours: 72,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: [],
  },
  {
    id: 'operational.therapist.caseload.exceeded',
    nameEn: 'Therapist caseload — exceeds evidence-based threshold',
    nameAr: 'عبء حالات المعالج — يتجاوز الحد المبني على الأدلة',
    domain: 'operational',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'caseloadService',
        method: 'activeCountForTherapist',
        path: 'activeCases',
      },
      condition: {
        operator: 'crossed',
        value: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR, ROLES.HR_MANAGER],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'hr.caseload-rebalance',
    },
    slaHours: 168,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: [],
    kpiLinks: ['scheduling.utilization.therapist.pct'],
  },
  {
    id: 'operational.therapist.license.expiring_60d',
    nameEn: 'Therapist SCFHS license — expires in 60 days or less',
    nameAr: 'ترخيص المعالج (الهيئة) — ينتهي خلال 60 يوم أو أقل',
    domain: 'operational',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'cpeService',
        method: 'licensesExpiringInDays',
        path: 'count',
      },
      condition: {
        operator: '>=',
        value: 1,
        windowDays: 60,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.HR_MANAGER, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.HR_MANAGER,
      taskTemplate: 'hr.license-renewal-reminder',
    },
    slaHours: 168,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.HR_MANAGER,
    compliance: ['SCFHS'],
    kpiLinks: ['hr.credentials.compliance.pct'],
  },
  {
    id: 'operational.care_plan.review.overdue',
    nameEn: 'Care-plan review overdue — nextReviewDate has passed',
    nameAr: 'مراجعة الخطة العلاجية متأخرة — تجاوز موعد المراجعة',
    domain: 'operational',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'carePlanReviewService',
        method: 'daysPastReviewDate',
        path: 'daysPast',
      },
      condition: {
        operator: '>=',
        value: 1,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'operational.care-plan-review',
    },
    slaHours: 336,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.care_plan.review.ontime.pct'],
  },
  {
    id: 'operational.care_plan.authorization.expiring_30d',
    nameEn: 'Care-plan authorization expiring within 30 days',
    nameAr: 'اعتماد الخطة العلاجية ينتهي خلال 30 يوماً',
    domain: 'operational',
    severity: 'info',
    category: 'threshold',
    trigger: {
      source: {
        service: 'carePlanAuthorizationService',
        method: 'daysUntilExpiry',
        path: 'daysUntil',
      },
      condition: {
        operator: '<=',
        value: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.RECEPTIONIST, ROLES.FINANCE_SUPERVISOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.FINANCE_SUPERVISOR,
      taskTemplate: 'operational.authorization-renewal',
    },
    slaHours: 720,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.FINANCE_SUPERVISOR,
    compliance: ['CCHI'],
    kpiLinks: [],
  },
  {
    id: 'operational.care_plan.documentation.incomplete_7d',
    nameEn: 'Care-plan progress documentation < 80% over last 7 days',
    nameAr: 'توثيق تقدم الخطة العلاجية أقل من 80% خلال آخر 7 أيام',
    domain: 'operational',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'sessionDocumentationService',
        method: 'coverageForCarePlan',
        path: 'coveragePct',
      },
      condition: {
        operator: '<',
        value: 80,
        windowDays: 7,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'operational.documentation-audit',
    },
    slaHours: 168,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.THERAPY_SUPERVISOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: ['rehab.progress.documented.pct'],
  },

  // ─── Compliance ───────────────────────────────────────────────
  {
    id: 'compliance.consent.required.missing',
    nameEn: 'Required consent missing — blocks non-emergency clinical action',
    nameAr: 'موافقة إلزامية مفقودة — توقف الإجراءات السريرية غير الطارئة',
    domain: 'compliance',
    severity: 'critical',
    category: 'absence',
    trigger: {
      source: {
        service: 'consentService',
        method: 'missingRequiredForBeneficiary',
        path: 'missingCount',
      },
      condition: {
        operator: '>=',
        value: 1,
      },
    },
    response: {
      blocking: true,
      notify: [ROLES.COMPLIANCE_OFFICER, ROLES.RECEPTIONIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.COMPLIANCE_OFFICER,
      taskTemplate: 'compliance.consent-collection',
    },
    slaHours: 0,
    cooldownHours: 0,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['CBAHI 4.3', 'PDPL'],
    kpiLinks: [],
  },
  {
    id: 'compliance.custody.order.stale',
    nameEn: 'Custody/guardianship order — not refreshed in 365 days',
    nameAr: 'حكم الولاية — لم يُجدَّد خلال 365 يوم',
    domain: 'compliance',
    severity: 'warning',
    category: 'absence',
    trigger: {
      source: {
        service: 'guardianService',
        method: 'custodyOrderStatus',
        path: 'daysSinceRefresh',
      },
      condition: {
        operator: '>=',
        value: 365,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.COMPLIANCE_OFFICER, ROLES.RECEPTIONIST],
      escalateTo: ROLES.COMPLIANCE_OFFICER,
      taskTemplate: 'compliance.custody-refresh',
    },
    slaHours: 168,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['PDPL'],
    kpiLinks: [],
  },
  {
    id: 'compliance.disability_card.expired',
    nameEn: 'Disability card — expired per Saudi Disability Authority',
    nameAr: 'بطاقة الإعاقة — منتهية الصلاحية (هيئة ذوي الإعاقة)',
    domain: 'compliance',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'beneficiaryService',
        method: 'disabilityCardStatus',
        path: 'daysToExpiry',
      },
      condition: {
        operator: '<=',
        value: 0,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.COMPLIANCE_OFFICER, ROLES.ACCOUNTANT, ROLES.RECEPTIONIST],
      escalateTo: ROLES.COMPLIANCE_OFFICER,
      taskTemplate: 'compliance.disability-card-renewal',
    },
    slaHours: 336,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['Saudi Disability Authority'],
    kpiLinks: [],
  },
  {
    id: 'compliance.pdpl.dsar.sla_breach',
    nameEn: 'PDPL data subject access request — past 30-day SLA',
    nameAr: 'طلب الوصول لبيانات شخصية (نظام حماية البيانات) — تجاوز 30 يوم',
    domain: 'compliance',
    severity: 'critical',
    category: 'threshold',
    trigger: {
      source: {
        service: 'pdplService',
        method: 'openDsarForBeneficiary',
        path: 'daysOpen',
      },
      condition: {
        operator: '>',
        value: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.COMPLIANCE_OFFICER, ROLES.IT_ADMIN, ROLES.CEO],
      escalateTo: ROLES.COMPLIANCE_OFFICER,
      taskTemplate: 'compliance.dsar-fulfilment',
    },
    slaHours: 24,
    cooldownHours: 24,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.COMPLIANCE_OFFICER,
    compliance: ['PDPL'],
    kpiLinks: [],
  },

  // ─── Family engagement ────────────────────────────────────────
  {
    id: 'family.portal.inactive.90d',
    nameEn: 'Guardian portal — no login for 90 days',
    nameAr: 'بوابة ولي الأمر — لم يتم الدخول خلال 90 يوم',
    domain: 'family',
    severity: 'info',
    category: 'absence',
    trigger: {
      source: {
        service: 'portalActivityService',
        method: 'guardianLastLogin',
        path: 'daysSinceLogin',
      },
      condition: {
        operator: '>=',
        value: 90,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.RECEPTIONIST],
      escalateTo: ROLES.MANAGER,
      taskTemplate: 'family.portal-reactivation',
    },
    slaHours: 336,
    cooldownHours: 720,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.MANAGER,
    compliance: [],
    kpiLinks: ['communications.parent_portal.activation.pct'],
  },
  {
    id: 'family.home_carryover.missing.14d',
    nameEn: 'Home carry-over log — no parent entry in 14 days',
    nameAr: 'سجل النشاط المنزلي — لا مدخلات من ولي الأمر خلال 14 يوم',
    domain: 'family',
    severity: 'info',
    category: 'absence',
    trigger: {
      source: {
        service: 'homeCarryoverService',
        method: 'lastEntryForBeneficiary',
        path: 'daysSinceEntry',
      },
      condition: {
        operator: '>=',
        value: 14,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.THERAPY_SUPERVISOR,
      taskTemplate: 'family.carryover-reminder',
    },
    slaHours: 168,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: [],
    kpiLinks: [],
  },
  {
    id: 'family.message.unanswered.48h',
    nameEn: 'Family message — unanswered for more than 48 hours',
    nameAr: 'رسالة ولي الأمر — بدون رد لأكثر من 48 ساعة',
    domain: 'family',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'messagingService',
        method: 'openThreadsForBeneficiary',
        path: 'maxHoursOpen',
      },
      condition: {
        operator: '>',
        value: 48,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.RECEPTIONIST, ROLES.THERAPY_SUPERVISOR],
      escalateTo: ROLES.MANAGER,
      taskTemplate: 'family.message-escalation',
    },
    slaHours: 12,
    cooldownHours: 48,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.MANAGER,
    compliance: ['CBAHI 4.3'],
    kpiLinks: [],
  },

  // ─── Financial ────────────────────────────────────────────────
  {
    id: 'financial.invoice.overdue.60d',
    nameEn: 'Invoice overdue — more than 60 days unpaid',
    nameAr: 'فاتورة متأخرة — غير مسدّدة لأكثر من 60 يوم',
    domain: 'financial',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'invoiceService',
        method: 'overdueForBeneficiary',
        path: 'maxDaysOverdue',
      },
      condition: {
        operator: '>',
        value: 60,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.ACCOUNTANT, ROLES.FINANCE_SUPERVISOR],
      escalateTo: ROLES.FINANCE_SUPERVISOR,
      taskTemplate: 'finance.collections-outreach',
    },
    slaHours: 168,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.FINANCE_SUPERVISOR,
    compliance: [],
    kpiLinks: ['finance.claims.collection_days.mean'],
  },
  {
    id: 'financial.insurance.coverage.exhausted',
    nameEn: 'Insurance coverage — policy limit reached',
    nameAr: 'تغطية التأمين — تم الوصول لحد الوثيقة',
    domain: 'financial',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'insuranceService',
        method: 'coverageUsageForBeneficiary',
        path: 'remainingCoveragePct',
      },
      condition: {
        operator: '<=',
        value: 5,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.ACCOUNTANT, ROLES.FINANCE_SUPERVISOR, ROLES.MANAGER],
      escalateTo: ROLES.FINANCE_SUPERVISOR,
      taskTemplate: 'finance.coverage-replan',
    },
    slaHours: 72,
    cooldownHours: 336,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.FINANCE_SUPERVISOR,
    compliance: ['CCHI'],
    kpiLinks: [],
  },

  // ─── Safety ───────────────────────────────────────────────────
  {
    id: 'safety.incident.critical.open',
    nameEn: 'Critical safety incident — open on beneficiary',
    nameAr: 'حادثة سلامة حرجة — مفتوحة على المستفيد',
    domain: 'safety',
    severity: 'critical',
    category: 'event',
    trigger: {
      source: {
        service: 'incidentService',
        method: 'openByBeneficiary',
        path: "[?severity=='CRITICAL'].length",
      },
      condition: {
        operator: '>=',
        value: 1,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.QUALITY_COORDINATOR, ROLES.CLINICAL_DIRECTOR, ROLES.COMPLIANCE_OFFICER],
      escalateTo: ROLES.QUALITY_COORDINATOR,
      taskTemplate: 'quality.incident-review',
    },
    slaHours: 4,
    cooldownHours: 12,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.QUALITY_COORDINATOR,
    compliance: ['CBAHI 8.7', 'MOH'],
    kpiLinks: ['quality.incidents.open_critical.count'],
  },
  {
    id: 'safety.medication.interaction.detected',
    nameEn: 'Drug-drug interaction detected on active medication list',
    nameAr: 'تفاعل دوائي مُكتشف ضمن قائمة الأدوية النشطة',
    domain: 'safety',
    severity: 'critical',
    category: 'event',
    trigger: {
      source: {
        service: 'medicationService',
        method: 'interactionCheckForBeneficiary',
        path: 'hasInteraction',
      },
      condition: {
        operator: '==',
        value: true,
      },
    },
    response: {
      blocking: true,
      notify: [ROLES.DOCTOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.DOCTOR,
      taskTemplate: 'clinical.medication-review.urgent',
    },
    slaHours: 2,
    cooldownHours: 0,
    autoResolve: null,
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 7.3', 'SFDA'],
    kpiLinks: [],
  },
  {
    id: 'safety.fall.repeat.30d',
    nameEn: 'Repeat falls — more than 2 fall incidents in 30 days',
    nameAr: 'تكرار السقوط — أكثر من حادثتين خلال 30 يوم',
    domain: 'safety',
    severity: 'warning',
    category: 'threshold',
    trigger: {
      source: {
        service: 'incidentService',
        method: 'countByTypeForBeneficiary',
        path: 'counts.fall',
      },
      condition: {
        operator: '>',
        value: 2,
        windowDays: 30,
      },
    },
    response: {
      blocking: false,
      notify: [ROLES.THERAPIST_PT, ROLES.QUALITY_COORDINATOR, ROLES.CLINICAL_DIRECTOR],
      escalateTo: ROLES.CLINICAL_DIRECTOR,
      taskTemplate: 'clinical.fall-risk-assessment',
    },
    slaHours: 48,
    cooldownHours: 168,
    autoResolve: { type: 'condition_cleared', afterHours: null },
    owner: ROLES.CLINICAL_DIRECTOR,
    compliance: ['CBAHI 8.7'],
    kpiLinks: [],
  },
]);

// ─── Lookups ────────────────────────────────────────────────────

function byId(id) {
  return RED_FLAGS.find(f => f.id === id) || null;
}

function byDomain(domain) {
  return RED_FLAGS.filter(f => f.domain === domain);
}

function bySeverity(severity) {
  return RED_FLAGS.filter(f => f.severity === severity);
}

function byCategory(category) {
  return RED_FLAGS.filter(f => f.category === category);
}

function byOwner(role) {
  return RED_FLAGS.filter(f => f.owner === role);
}

function byCompliance(framework) {
  return RED_FLAGS.filter(f => f.compliance.includes(framework));
}

/**
 * Returns all flags that block downstream clinical actions once
 * raised. Safety-critical subset — consumed by session-start and
 * medication-prescription guards in Commit 2.
 */
function blocking() {
  return RED_FLAGS.filter(f => f.response.blocking === true);
}

/**
 * Returns flags whose SLA would be breached at or before `withinHours`.
 * Used by the daily digest (Commit 3) to order the evidence pack.
 */
function withSlaAtOrUnder(hours) {
  return RED_FLAGS.filter(f => f.slaHours <= hours);
}

/**
 * Returns the KPI registry entries linked from this flag, already
 * resolved. Callers MUST handle `null` entries — kpiById returns
 * null for unknown ids (e.g., during migrations).
 */
function resolveKpiLinks(flag) {
  if (!flag || !Array.isArray(flag.kpiLinks)) return [];
  return flag.kpiLinks.map(id => kpiById(id)).filter(Boolean);
}

module.exports = {
  RED_FLAGS,
  DOMAINS,
  SEVERITIES,
  CATEGORIES,
  OPERATORS,
  AUTORESOLVE_TYPES,
  byId,
  byDomain,
  bySeverity,
  byCategory,
  byOwner,
  byCompliance,
  blocking,
  withSlaAtOrUnder,
  resolveKpiLinks,
};
