/**
 * rehab-disciplines.registry.js — canonical Rehabilitation-Discipline
 * catalogue for Al-Awael ERP.
 *
 * Phase-9 Commit 1. The foundation for the unified Rehabilitation
 * Program Engine: Individual Rehabilitation Plans (IRP), SMART-goal
 * suggestions, outcome-measure cadence, intervention selection, and
 * discipline-aware red-flags + KPIs. Each record names ONE clinical
 * discipline we deliver today — the registry pins down its identity,
 * owner role, default review cadence, seed program templates, first-
 * line interventions, recognised outcome measures, and the cross-
 * references to existing KPIs and Red-Flags that depend on it.
 *
 * Before this file landed, every discipline lived as a loose string
 * in Program.category, Goal.category, OutcomeMeasure.category,
 * CarePlan.therapeutic.domains.* — eleven slightly different
 * vocabularies for the same concept. This registry is the single
 * source of truth; downstream models lean on it for validation and
 * suggestion.
 *
 * Design decisions (recorded here so future edits stay consistent):
 *
 *   1. Registry is pure data (no I/O, no DB). Shape invariants are
 *      enforced at test time (`rehab-disciplines-registry.test.js`).
 *      Safe to require from any layer — models, services, routes,
 *      seeders, CLIs, workers.
 *
 *   2. IDs are slash-delimited slugs (`rehab.<discipline>`). Codes
 *      are short uppercase tokens (PT, OT, SLP…) used in program
 *      codes, UI badges, and exports. Never rename either; add a
 *      successor + deprecate instead — downstream references key
 *      off both.
 *
 *   3. `ownerRole` and every role inside `leadSpecialistRole` /
 *      `assistantRoles` resolve to entries in `config/rbac.config.js`.
 *      The drift test asserts every role resolves — protects against
 *      silent RBAC drift.
 *
 *   4. `kpiLinks` reference entries in `config/kpi.registry.js`.
 *      `redFlagLinks` reference entries in `config/red-flags.registry.js`.
 *      The drift test asserts every link resolves — this is how a
 *      discipline-scoped dashboard filters "which KPIs matter for PT?"
 *      and "which red-flags fire on SLP caseloads?".
 *
 *   5. `programTemplates` are seed prescriptions, not runtime records.
 *      A seeder can materialize them into `Program` documents on first
 *      boot; clinical leaders edit the running copies, not these.
 *      Keep to 2-4 templates per discipline (the 80-20 starter set).
 *
 *   6. `recommendedInterventions` are the first-line, evidence-informed
 *      techniques a clinician would reach for. Not exhaustive. Codes
 *      follow `<discipline-code>-<category>-<qualifier>` (e.g.
 *      PT-ROM-PASSIVE). Used by the goal-suggestion engine as candidate
 *      pairings when a SMART goal is drafted.
 *
 *   7. `recommendedMeasures` reference well-known instruments by
 *      abbreviation (GMFCS, WeeFIM, VB-MAPP…). The OutcomeMeasure seeder
 *      (later commit) materialises these into Measure documents with
 *      full item schemas; here we only need identity, domain tag, and
 *      the WHO/APTA/AOTA standard body that published them.
 *
 *   8. `defaultReviewCycleDays` is the recommended plan-review cadence
 *      for this discipline (PT/OT/SLP → 90d, Early Intervention → 60d
 *      per CBAHI 8.7 best-practice for 0-3y). `assessmentCadenceDays`
 *      is the recommended re-assessment window. Both feed the scheduler
 *      that raises `operational.care_plan.review.overdue` (future flag).
 *
 *   9. `compliance` tags use the same labels as `kpi.registry.js` and
 *      `red-flags.registry.js` so "which disciplines feed CBAHI 8.7
 *      evidence?" is a pure filter.
 *
 *  10. `goalTemplates` are SMART-shaped starter objectives a clinician
 *      can lift into a care plan and adapt. Each has a metric kind
 *      (PERCENTAGE | FREQUENCY | DURATION | LATENCY | RATE | RUBRIC)
 *      that the progress engine uses to compute trend + mastery.
 */

'use strict';

const { ROLES } = require('./rbac.config');
const { byId: kpiById } = require('./kpi.registry');
const { byId: redFlagById } = require('./red-flags.registry');

// ─── Taxonomy ──────────────────────────────────────────────────────

const DOMAINS = Object.freeze([
  'clinical', // medical/therapeutic
  'educational', // academic / classroom
  'developmental', // early intervention
  'psychosocial', // psych + social-emotional
  'social', // family / social services
  'vocational', // independent living / employment
]);

const DELIVERY_MODES = Object.freeze([
  'individual',
  'group',
  'inclusive_classroom',
  'home_based',
  'telehealth',
  'community_based',
  'hybrid',
]);

const AGE_BANDS = Object.freeze([
  'early_0_3',
  'early_3_6',
  'child_6_12',
  'adolescent_12_18',
  'adult_18_plus',
  'cross_age',
]);

const EVIDENCE_LEVELS = Object.freeze(['A', 'B', 'C', 'expert_opinion']);

const INSTRUMENT_TYPES = Object.freeze([
  'standardized',
  'criterion_referenced',
  'norm_referenced',
  'custom',
]);

const GOAL_METRIC_KINDS = Object.freeze([
  'PERCENTAGE',
  'FREQUENCY',
  'DURATION',
  'LATENCY',
  'RATE',
  'RUBRIC',
  'COMPOSITE',
]);

// ─── Catalogue ─────────────────────────────────────────────────────

/**
 * The canonical Rehabilitation-Discipline catalogue. 11 entries spanning
 * the six disciplinary domains. Every entry is deliverable today or in
 * the scope of Phase-9 commits 2-5.
 */
const DISCIPLINES = Object.freeze([
  // ─── Clinical therapies ──────────────────────────────────────────
  {
    id: 'rehab.physical_therapy',
    code: 'PT',
    nameEn: 'Physical Therapy',
    nameAr: 'العلاج الطبيعي',
    domain: 'clinical',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.THERAPIST_PT,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 90,
    supportedAgeBands: [
      'early_0_3',
      'early_3_6',
      'child_6_12',
      'adolescent_12_18',
      'adult_18_plus',
    ],
    deliveryModes: ['individual', 'group', 'home_based', 'hybrid'],
    icfDomains: ['body-functions', 'body-structures', 'activities-participation'],
    programTemplates: [
      {
        code: 'PT-GROSS-MOTOR',
        nameEn: 'Gross motor development program',
        nameAr: 'برنامج تطوير المهارات الحركية الكبرى',
        deliveryMode: 'individual',
        frequencyPerWeek: 3,
        durationMinutes: 45,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
      {
        code: 'PT-GAIT',
        nameEn: 'Gait training',
        nameAr: 'تدريب المشي',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 45,
        cycleWeeks: 8,
        evidenceLevel: 'A',
      },
      {
        code: 'PT-HYDRO',
        nameEn: 'Hydrotherapy group',
        nameAr: 'العلاج المائي (مجموعات)',
        deliveryMode: 'group',
        frequencyPerWeek: 1,
        durationMinutes: 45,
        cycleWeeks: 12,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'PT-ROM-PASSIVE',
        nameAr: 'مدى حركة سلبي',
        nameEn: 'Passive range of motion',
        technique: 'manual',
        evidenceLevel: 'A',
      },
      {
        code: 'PT-STRENGTH-FUNCTIONAL',
        nameAr: 'تقوية وظيفية',
        nameEn: 'Functional strengthening',
        technique: 'progressive resistance',
        evidenceLevel: 'A',
      },
      {
        code: 'PT-BALANCE-PROPRIO',
        nameAr: 'توازن وإحساس حركي',
        nameEn: 'Balance & proprioception',
        technique: 'perturbation',
        evidenceLevel: 'A',
      },
      {
        code: 'PT-NDT',
        nameAr: 'علاج التطور العصبي',
        nameEn: 'Neurodevelopmental treatment',
        technique: 'NDT/Bobath',
        evidenceLevel: 'B',
      },
      {
        code: 'PT-GAIT-TREAD',
        nameAr: 'تدريب مشي على سير',
        nameEn: 'Treadmill gait training',
        technique: 'body-weight supported',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'GMFCS',
        nameEn: 'Gross Motor Function Classification System',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'motor-function',
      },
      {
        code: 'GMFM-88',
        nameEn: 'Gross Motor Function Measure-88',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'motor-function',
      },
      {
        code: 'BERG',
        nameEn: 'Berg Balance Scale',
        standardBody: 'APTA',
        instrumentType: 'standardized',
        domainTag: 'motor-function',
      },
      {
        code: '6MWT',
        nameEn: 'Six-Minute Walk Test',
        standardBody: 'APTA',
        instrumentType: 'standardized',
        domainTag: 'motor-function',
      },
      {
        code: 'TUG',
        nameEn: 'Timed Up & Go',
        standardBody: 'APTA',
        instrumentType: 'standardized',
        domainTag: 'motor-function',
      },
    ],
    goalTemplates: [
      {
        code: 'PT-GT-SIT-BALANCE',
        nameAr: 'يحافظ على اتزان الجلوس بدون دعم 30 ثانية',
        nameEn: 'Maintain unsupported sitting balance for 30 seconds',
        metric: 'DURATION',
        unit: 'seconds',
        baseline: 5,
        target: 30,
        masteryCriteria: '3 consecutive sessions at target',
      },
      {
        code: 'PT-GT-STAIR-CLIMB',
        nameAr: 'يصعد 10 درجات مع دعم درابزين فقط',
        nameEn: 'Climb 10 stairs with handrail support only',
        metric: 'COMPOSITE',
        unit: 'steps/prompting',
        baseline: 2,
        target: 10,
        masteryCriteria: '80% accuracy across 3 sessions',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct', 'scheduling.utilization.therapist.pct'],
    redFlagLinks: ['clinical.progress.regression.significant', 'safety.fall.repeat.30d'],
    compliance: ['CBAHI 8.7', 'APTA'],
  },

  {
    id: 'rehab.occupational_therapy',
    code: 'OT',
    nameEn: 'Occupational Therapy',
    nameAr: 'العلاج الوظيفي',
    domain: 'clinical',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.THERAPIST_OT,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 90,
    supportedAgeBands: [
      'early_0_3',
      'early_3_6',
      'child_6_12',
      'adolescent_12_18',
      'adult_18_plus',
    ],
    deliveryModes: ['individual', 'group', 'home_based', 'inclusive_classroom', 'telehealth'],
    icfDomains: ['body-functions', 'activities-participation', 'environmental-factors'],
    programTemplates: [
      {
        code: 'OT-SENSORY',
        nameEn: 'Sensory integration program',
        nameAr: 'برنامج التكامل الحسي',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 45,
        cycleWeeks: 16,
        evidenceLevel: 'B',
      },
      {
        code: 'OT-ADL',
        nameEn: 'Activities of daily living training',
        nameAr: 'تدريب مهارات الحياة اليومية',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 45,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
      {
        code: 'OT-HANDWRITING',
        nameEn: 'Handwriting remediation group',
        nameAr: 'تحسين الكتابة (مجموعات)',
        deliveryMode: 'group',
        frequencyPerWeek: 2,
        durationMinutes: 45,
        cycleWeeks: 10,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'OT-SI-ASI',
        nameAr: 'تكامل حسي (Ayres)',
        nameEn: 'Ayres Sensory Integration',
        technique: 'ASI',
        evidenceLevel: 'B',
      },
      {
        code: 'OT-FINE-MOTOR',
        nameAr: 'مهارات حركية دقيقة',
        nameEn: 'Fine motor activities',
        technique: 'graded activities',
        evidenceLevel: 'A',
      },
      {
        code: 'OT-ADL-CHAINING',
        nameAr: 'تدريب متسلسل على المهام اليومية',
        nameEn: 'Task chaining for ADLs',
        technique: 'forward/backward chaining',
        evidenceLevel: 'A',
      },
      {
        code: 'OT-SPLINT',
        nameAr: 'جبائر وضعية',
        nameEn: 'Positional splinting',
        technique: 'orthotic',
        evidenceLevel: 'B',
      },
      {
        code: 'OT-COGNITIVE-ORIENT',
        nameAr: 'علاج إدراكي (CO-OP)',
        nameEn: 'Cognitive Orientation (CO-OP)',
        technique: 'CO-OP',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'WEE-FIM',
        nameEn: 'WeeFIM — Functional Independence for Children',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'functional-independence',
      },
      {
        code: 'COPM',
        nameEn: 'Canadian Occupational Performance Measure',
        standardBody: 'AOTA',
        instrumentType: 'standardized',
        domainTag: 'participation',
      },
      {
        code: 'SFA',
        nameEn: 'School Function Assessment',
        standardBody: 'AOTA',
        instrumentType: 'criterion_referenced',
        domainTag: 'participation',
      },
      {
        code: 'SENSORY-PROFILE-2',
        nameEn: 'Sensory Profile 2',
        standardBody: 'AOTA',
        instrumentType: 'norm_referenced',
        domainTag: 'cognitive',
      },
      {
        code: 'PEDI-CAT',
        nameEn: 'Pediatric Evaluation of Disability Inventory — CAT',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'functional-independence',
      },
    ],
    goalTemplates: [
      {
        code: 'OT-GT-DRESSING',
        nameAr: 'يرتدي قميصاً ذا أزرار باستقلالية تامة',
        nameEn: 'Don a button-up shirt independently',
        metric: 'PERCENTAGE',
        unit: '%',
        baseline: 30,
        target: 100,
        masteryCriteria: '100% independent across 3 consecutive sessions',
      },
      {
        code: 'OT-GT-PINCER',
        nameAr: 'يلتقط حبات صغيرة بقبضة كماشية 8/10',
        nameEn: 'Pincer grasp on small objects 8/10 trials',
        metric: 'RATE',
        unit: 'successes/10',
        baseline: 2,
        target: 8,
        masteryCriteria: '8/10 across 3 sessions',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct', 'scheduling.utilization.therapist.pct'],
    redFlagLinks: [
      'clinical.progress.regression.significant',
      'operational.therapist.caseload.exceeded',
    ],
    compliance: ['CBAHI 8.7', 'AOTA'],
  },

  {
    id: 'rehab.speech_language',
    code: 'SLP',
    nameEn: 'Speech-Language Pathology',
    nameAr: 'النطق واللغة والتخاطب',
    domain: 'clinical',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.THERAPIST_SLP,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 90,
    supportedAgeBands: [
      'early_0_3',
      'early_3_6',
      'child_6_12',
      'adolescent_12_18',
      'adult_18_plus',
    ],
    deliveryModes: ['individual', 'group', 'telehealth', 'inclusive_classroom', 'home_based'],
    icfDomains: ['body-functions', 'activities-participation'],
    programTemplates: [
      {
        code: 'SLP-ARTIC',
        nameEn: 'Articulation therapy',
        nameAr: 'علاج نطقي',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 45,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-LANGUAGE',
        nameEn: 'Language stimulation',
        nameAr: 'تحفيز لغوي',
        deliveryMode: 'individual',
        frequencyPerWeek: 3,
        durationMinutes: 45,
        cycleWeeks: 16,
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-AAC',
        nameEn: 'Augmentative & Alternative Communication',
        nameAr: 'التواصل التعويضي البديل',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 60,
        cycleWeeks: 16,
        evidenceLevel: 'A',
      },
    ],
    recommendedInterventions: [
      {
        code: 'SLP-ARTIC-TRAD',
        nameAr: 'علاج نطقي تقليدي',
        nameEn: 'Traditional articulation therapy',
        technique: 'Van Riper',
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-PROMPT',
        nameAr: 'PROMPT',
        nameEn: 'PROMPT for motor planning',
        technique: 'PROMPT',
        evidenceLevel: 'B',
      },
      {
        code: 'SLP-MLU-EXPAND',
        nameAr: 'توسيع طول الجملة',
        nameEn: 'MLU expansion',
        technique: 'recast/expansion',
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-AAC-CORE',
        nameAr: 'تواصل تعويضي بالمفردات الأساسية',
        nameEn: 'Core-vocabulary AAC',
        technique: 'PODD/TD Snap',
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-FLUENCY-LIDCOMBE',
        nameAr: 'برنامج ليدكومب للتلعثم',
        nameEn: 'Lidcombe program for stuttering',
        technique: 'Lidcombe',
        evidenceLevel: 'A',
      },
      {
        code: 'SLP-FEEDING',
        nameAr: 'علاج صعوبات البلع والتغذية',
        nameEn: 'Feeding / swallowing therapy',
        technique: 'oral motor',
        evidenceLevel: 'B',
      },
    ],
    recommendedMeasures: [
      {
        code: 'REEL-3',
        nameEn: 'Receptive-Expressive Emergent Language-3',
        standardBody: 'ASHA',
        instrumentType: 'standardized',
        domainTag: 'communication',
      },
      {
        code: 'CELF-5-AR',
        nameEn: 'CELF-5 (Arabic adaptation)',
        standardBody: 'ASHA',
        instrumentType: 'standardized',
        domainTag: 'communication',
      },
      {
        code: 'PLS-5',
        nameEn: 'Preschool Language Scales-5',
        standardBody: 'ASHA',
        instrumentType: 'standardized',
        domainTag: 'communication',
      },
      {
        code: 'GFTA-3',
        nameEn: 'Goldman-Fristoe Test of Articulation-3',
        standardBody: 'ASHA',
        instrumentType: 'standardized',
        domainTag: 'communication',
      },
      {
        code: 'VB-MAPP',
        nameEn: 'Verbal Behavior Milestones Assessment',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'communication',
      },
    ],
    goalTemplates: [
      {
        code: 'SLP-GT-/s/-PRODUCT',
        nameAr: 'ينطق الصوت /س/ في موضع البداية بنسبة 80%',
        nameEn: 'Produce /s/ in initial position with 80% accuracy',
        metric: 'PERCENTAGE',
        unit: '%',
        baseline: 20,
        target: 80,
        masteryCriteria: '80% across 3 consecutive sessions',
      },
      {
        code: 'SLP-GT-MLU',
        nameAr: 'يستخدم جمل بطول 4 كلمات في 5 محاولات متتالية',
        nameEn: 'Use 4-word utterances in 5 consecutive opportunities',
        metric: 'FREQUENCY',
        unit: 'utterances',
        baseline: 1,
        target: 5,
        masteryCriteria: 'Spontaneous 4-word MLU in 80% of opportunities',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: ['clinical.progress.regression.significant'],
    compliance: ['CBAHI 8.7', 'ASHA'],
  },

  {
    id: 'rehab.behavioral_therapy',
    code: 'ABA',
    nameEn: 'Applied Behavior Analysis / Behavioral Therapy',
    nameAr: 'تحليل السلوك التطبيقي / تعديل السلوك',
    domain: 'clinical',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.THERAPIST_PSYCH,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST],
    defaultReviewCycleDays: 60,
    assessmentCadenceDays: 90,
    supportedAgeBands: ['early_3_6', 'child_6_12', 'adolescent_12_18'],
    deliveryModes: ['individual', 'home_based', 'inclusive_classroom', 'hybrid'],
    icfDomains: ['body-functions', 'activities-participation', 'environmental-factors'],
    programTemplates: [
      {
        code: 'ABA-COMPREHENSIVE',
        nameEn: 'Comprehensive ABA (early intensive)',
        nameAr: 'تحليل سلوك شامل (تدخل مبكر مكثف)',
        deliveryMode: 'hybrid',
        frequencyPerWeek: 5,
        durationMinutes: 180,
        cycleWeeks: 26,
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-FOCUSED',
        nameEn: 'Focused ABA (specific skill/behavior)',
        nameAr: 'تحليل سلوك مركّز',
        deliveryMode: 'individual',
        frequencyPerWeek: 3,
        durationMinutes: 60,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-PBS',
        nameEn: 'Positive Behavior Support (school-based)',
        nameAr: 'دعم السلوك الإيجابي (مدرسي)',
        deliveryMode: 'inclusive_classroom',
        frequencyPerWeek: 5,
        durationMinutes: 30,
        cycleWeeks: 20,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'ABA-DTT',
        nameAr: 'تدريب بمحاولات منفصلة',
        nameEn: 'Discrete Trial Training',
        technique: 'DTT',
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-NET',
        nameAr: 'تدريب في البيئة الطبيعية',
        nameEn: 'Natural Environment Teaching',
        technique: 'NET',
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-FBA',
        nameAr: 'تحليل وظيفي للسلوك',
        nameEn: 'Functional Behavior Assessment',
        technique: 'FBA',
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-BIP',
        nameAr: 'خطة تدخل سلوكي',
        nameEn: 'Behavior Intervention Plan',
        technique: 'BIP',
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-TOKEN',
        nameAr: 'نظام الرموز',
        nameEn: 'Token economy',
        technique: 'token economy',
        evidenceLevel: 'A',
      },
      {
        code: 'ABA-PECS',
        nameAr: 'نظام التواصل بتبادل الصور',
        nameEn: 'Picture Exchange Communication',
        technique: 'PECS',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'VB-MAPP',
        nameEn: 'Verbal Behavior Milestones',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'communication',
      },
      {
        code: 'ABLLS-R',
        nameEn: 'Assessment of Basic Language & Learning Skills-R',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'cognitive',
      },
      {
        code: 'AFLS',
        nameEn: 'Assessment of Functional Living Skills',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'self-care',
      },
      {
        code: 'VINELAND-3',
        nameEn: 'Vineland Adaptive Behavior Scales-3',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'functional-independence',
      },
      {
        code: 'ABC-DATA',
        nameEn: 'Antecedent-Behavior-Consequence data',
        standardBody: 'custom',
        instrumentType: 'custom',
        domainTag: 'general',
      },
    ],
    goalTemplates: [
      {
        code: 'ABA-GT-MAND',
        nameAr: 'يطلب حاجاته بجملة وظيفية في 8/10 فرص',
        nameEn: 'Mand (request) with functional phrase in 8/10 opportunities',
        metric: 'RATE',
        unit: 'mands/10',
        baseline: 2,
        target: 8,
        masteryCriteria: '8/10 across 3 sessions, 2 environments',
      },
      {
        code: 'ABA-GT-AGGR-REDUCE',
        nameAr: 'تقليل السلوك العدواني إلى أقل من حادثة واحدة في الجلسة',
        nameEn: 'Reduce aggression to < 1 incident per session',
        metric: 'FREQUENCY',
        unit: 'incidents/session',
        baseline: 5,
        target: 1,
        masteryCriteria: '< 1/session for 2 consecutive weeks',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: [
      'behavioral.aggression.frequency.spike_200',
      'clinical.progress.regression.significant',
    ],
    compliance: ['CBAHI 8.7', 'APA'],
  },

  // ─── Developmental ───────────────────────────────────────────────
  {
    id: 'rehab.early_intervention',
    code: 'EI',
    nameEn: 'Early Intervention',
    nameAr: 'التدخل المبكر',
    domain: 'developmental',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.SPECIAL_ED_TEACHER,
    assistantRoles: [
      ROLES.THERAPIST_SLP,
      ROLES.THERAPIST_OT,
      ROLES.THERAPIST_PT,
      ROLES.THERAPY_ASSISTANT,
    ],
    defaultReviewCycleDays: 60,
    assessmentCadenceDays: 90,
    supportedAgeBands: ['early_0_3', 'early_3_6'],
    deliveryModes: ['individual', 'home_based', 'community_based', 'hybrid'],
    icfDomains: [
      'body-functions',
      'body-structures',
      'activities-participation',
      'environmental-factors',
    ],
    programTemplates: [
      {
        code: 'EI-IFSP',
        nameEn: 'Individualized Family Service Plan (0-3y)',
        nameAr: 'خطة خدمات الأسرة الفردية (0-3 سنوات)',
        deliveryMode: 'home_based',
        frequencyPerWeek: 2,
        durationMinutes: 60,
        cycleWeeks: 26,
        evidenceLevel: 'A',
      },
      {
        code: 'EI-TRANSDISC',
        nameEn: 'Transdisciplinary early-intervention group',
        nameAr: 'مجموعة تدخل مبكر متعدد التخصصات',
        deliveryMode: 'group',
        frequencyPerWeek: 3,
        durationMinutes: 90,
        cycleWeeks: 12,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'EI-ROUTINE-BASED',
        nameAr: 'تدخل قائم على الروتين',
        nameEn: 'Routines-based intervention',
        technique: 'RBI',
        evidenceLevel: 'A',
      },
      {
        code: 'EI-FLOOR-TIME',
        nameAr: 'وقت الأرضية (DIR)',
        nameEn: 'DIR / Floortime',
        technique: 'DIR',
        evidenceLevel: 'B',
      },
      {
        code: 'EI-FAMILY-COACH',
        nameAr: 'تدريب الأسرة (coaching)',
        nameEn: 'Family coaching',
        technique: 'coaching model',
        evidenceLevel: 'A',
      },
      {
        code: 'EI-ESDM',
        nameAr: 'نموذج دنفر للتدخل المبكر',
        nameEn: 'Early Start Denver Model',
        technique: 'ESDM',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'M-CHAT-R',
        nameEn: 'Modified Checklist for Autism in Toddlers-Revised',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'pediatric',
      },
      {
        code: 'BAYLEY-4',
        nameEn: 'Bayley Scales of Infant & Toddler Development-4',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'pediatric',
      },
      {
        code: 'DENVER-II',
        nameEn: 'Denver Developmental Screening Test II',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'pediatric',
      },
      {
        code: 'AEPS-3',
        nameEn: 'Assessment Evaluation Programming System-3',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'pediatric',
      },
      {
        code: 'ASQ-3',
        nameEn: 'Ages & Stages Questionnaires-3',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'pediatric',
      },
    ],
    goalTemplates: [
      {
        code: 'EI-GT-JOINT-ATT',
        nameAr: 'يبدأ انتباهاً مشتركاً 5 مرات في جلسة اللعب',
        nameEn: 'Initiate joint attention 5× per play session',
        metric: 'FREQUENCY',
        unit: 'bids/session',
        baseline: 0,
        target: 5,
        masteryCriteria: '5/session across 3 consecutive sessions',
      },
      {
        code: 'EI-GT-PRETEND-PLAY',
        nameAr: 'يؤدي 3 أفعال لعب رمزي تلقائياً',
        nameEn: 'Demonstrate 3 spontaneous pretend-play acts',
        metric: 'COMPOSITE',
        unit: 'acts',
        baseline: 0,
        target: 3,
        masteryCriteria: '3 distinct acts observed over 2 sessions',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct', 'communications.parent_portal.activation.pct'],
    redFlagLinks: ['clinical.progress.regression.significant', 'family.home_carryover.missing.14d'],
    compliance: ['CBAHI 8.7', 'WHO'],
  },

  // ─── Educational ─────────────────────────────────────────────────
  {
    id: 'rehab.academic_skills',
    code: 'ACAD',
    nameEn: 'Academic Skills',
    nameAr: 'المهارات الأكاديمية',
    domain: 'educational',
    ownerRole: ROLES.SPECIAL_ED_SUPERVISOR,
    leadSpecialistRole: ROLES.SPECIAL_ED_TEACHER,
    assistantRoles: [ROLES.TEACHER, ROLES.THERAPY_ASSISTANT],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['early_3_6', 'child_6_12', 'adolescent_12_18'],
    deliveryModes: ['individual', 'group', 'inclusive_classroom', 'hybrid'],
    icfDomains: ['activities-participation', 'environmental-factors'],
    programTemplates: [
      {
        code: 'ACAD-IEP-CORE',
        nameEn: 'Individualized Education Plan — core academics',
        nameAr: 'خطة تعليمية فردية — أساسيات',
        deliveryMode: 'inclusive_classroom',
        frequencyPerWeek: 5,
        durationMinutes: 45,
        cycleWeeks: 36,
        evidenceLevel: 'A',
      },
      {
        code: 'ACAD-READING-INTERVENT',
        nameEn: 'Reading intervention (structured literacy)',
        nameAr: 'تدخل قرائي منظم',
        deliveryMode: 'group',
        frequencyPerWeek: 3,
        durationMinutes: 45,
        cycleWeeks: 20,
        evidenceLevel: 'A',
      },
    ],
    recommendedInterventions: [
      {
        code: 'ACAD-ORTON',
        nameAr: 'منهج أورتون-جيلينغهام',
        nameEn: 'Orton-Gillingham',
        technique: 'multisensory phonics',
        evidenceLevel: 'A',
      },
      {
        code: 'ACAD-DI',
        nameAr: 'تعليم مباشر',
        nameEn: 'Direct Instruction',
        technique: 'DI',
        evidenceLevel: 'A',
      },
      {
        code: 'ACAD-UDL',
        nameAr: 'تصميم شامل للتعلم',
        nameEn: 'Universal Design for Learning',
        technique: 'UDL',
        evidenceLevel: 'B',
      },
      {
        code: 'ACAD-PEER-TUTOR',
        nameAr: 'تعلم بالأقران',
        nameEn: 'Peer tutoring',
        technique: 'classwide peer tutoring',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'WIAT-III',
        nameEn: 'Wechsler Individual Achievement Test-III',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'cognitive',
      },
      {
        code: 'BRIGANCE',
        nameEn: 'Brigance Comprehensive Inventory',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'general',
      },
      {
        code: 'KEYMATH-3',
        nameEn: 'KeyMath-3 Diagnostic Assessment',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'cognitive',
      },
      {
        code: 'CBM',
        nameEn: 'Curriculum-Based Measurement',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'general',
      },
    ],
    goalTemplates: [
      {
        code: 'ACAD-GT-ORAL-READ',
        nameAr: 'يقرأ 60 كلمة صحيحة في الدقيقة من نص الصف',
        nameEn: 'Read 60 correct words per minute from grade-level text',
        metric: 'RATE',
        unit: 'wcpm',
        baseline: 20,
        target: 60,
        masteryCriteria: '60 wcpm across 3 weekly probes',
      },
      {
        code: 'ACAD-GT-MATH-FACTS',
        nameAr: 'يحل 20 عملية جمع ضمن 20 بدقة 90%',
        nameEn: 'Solve 20 addition facts within 20 at 90% accuracy',
        metric: 'PERCENTAGE',
        unit: '%',
        baseline: 40,
        target: 90,
        masteryCriteria: '90% across 3 sessions',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: ['clinical.progress.regression.significant', 'attendance.monthly.rate.low_70'],
    compliance: ['CBAHI 8.7'],
  },

  {
    id: 'rehab.life_skills',
    code: 'LS',
    nameEn: 'Life Skills',
    nameAr: 'المهارات الحياتية',
    domain: 'educational',
    ownerRole: ROLES.SPECIAL_ED_SUPERVISOR,
    leadSpecialistRole: ROLES.SPECIAL_ED_TEACHER,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.TEACHER],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['child_6_12', 'adolescent_12_18', 'adult_18_plus'],
    deliveryModes: ['individual', 'group', 'home_based', 'community_based'],
    icfDomains: ['activities-participation'],
    programTemplates: [
      {
        code: 'LS-DAILY-LIVING',
        nameEn: 'Daily living skills curriculum',
        nameAr: 'منهج مهارات الحياة اليومية',
        deliveryMode: 'group',
        frequencyPerWeek: 3,
        durationMinutes: 60,
        cycleWeeks: 20,
        evidenceLevel: 'B',
      },
      {
        code: 'LS-COMMUNITY-SAFETY',
        nameEn: 'Community & safety skills',
        nameAr: 'مهارات المجتمع والسلامة',
        deliveryMode: 'community_based',
        frequencyPerWeek: 1,
        durationMinutes: 120,
        cycleWeeks: 16,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'LS-TASK-ANALYSIS',
        nameAr: 'تحليل مهمة',
        nameEn: 'Task analysis',
        technique: 'chaining',
        evidenceLevel: 'A',
      },
      {
        code: 'LS-VIDEO-MODEL',
        nameAr: 'نمذجة بالفيديو',
        nameEn: 'Video modeling',
        technique: 'video modeling',
        evidenceLevel: 'A',
      },
      {
        code: 'LS-SELF-MONITOR',
        nameAr: 'مراقبة ذاتية',
        nameEn: 'Self-monitoring',
        technique: 'self-monitoring',
        evidenceLevel: 'A',
      },
      {
        code: 'LS-COMMUNITY-INSTR',
        nameAr: 'تعليم في البيئة المجتمعية',
        nameEn: 'Community-based instruction',
        technique: 'CBI',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'VINELAND-3',
        nameEn: 'Vineland Adaptive Behavior Scales-3',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'functional-independence',
      },
      {
        code: 'ABAS-3',
        nameEn: 'Adaptive Behavior Assessment System-3',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'functional-independence',
      },
      {
        code: 'AFLS',
        nameEn: 'Assessment of Functional Living Skills',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'self-care',
      },
    ],
    goalTemplates: [
      {
        code: 'LS-GT-MONEY-HANDLE',
        nameAr: 'يتعامل مع النقد وإرجاع الباقي في 4 سيناريوهات',
        nameEn: 'Handle money & make change in 4 scenarios',
        metric: 'COMPOSITE',
        unit: 'scenarios',
        baseline: 1,
        target: 4,
        masteryCriteria: '100% accuracy across 4 scenarios, 2 days',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: ['clinical.progress.regression.significant'],
    compliance: ['CBAHI 8.7'],
  },

  {
    id: 'rehab.independent_living',
    code: 'IL',
    nameEn: 'Independent Living',
    nameAr: 'الحياة المستقلة',
    domain: 'vocational',
    ownerRole: ROLES.SPECIAL_ED_SUPERVISOR,
    leadSpecialistRole: ROLES.SPECIAL_ED_TEACHER,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST_OT],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['adolescent_12_18', 'adult_18_plus'],
    deliveryModes: ['individual', 'group', 'home_based', 'community_based'],
    icfDomains: ['activities-participation', 'environmental-factors'],
    programTemplates: [
      {
        code: 'IL-TRANSITION',
        nameEn: 'Transition-to-adulthood planning',
        nameAr: 'خطة الانتقال إلى مرحلة البلوغ',
        deliveryMode: 'individual',
        frequencyPerWeek: 2,
        durationMinutes: 60,
        cycleWeeks: 26,
        evidenceLevel: 'B',
      },
      {
        code: 'IL-HOME-MGMT',
        nameEn: 'Home management',
        nameAr: 'إدارة المنزل',
        deliveryMode: 'home_based',
        frequencyPerWeek: 2,
        durationMinutes: 90,
        cycleWeeks: 16,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'IL-JOB-COACH',
        nameAr: 'مدرب عمل',
        nameEn: 'Job coaching',
        technique: 'supported employment',
        evidenceLevel: 'A',
      },
      {
        code: 'IL-TRAVEL-TRAIN',
        nameAr: 'تدريب على التنقل',
        nameEn: 'Travel training',
        technique: 'community training',
        evidenceLevel: 'A',
      },
      {
        code: 'IL-SOCIAL-STORIES',
        nameAr: 'القصص الاجتماعية',
        nameEn: 'Social Stories',
        technique: 'social stories',
        evidenceLevel: 'B',
      },
    ],
    recommendedMeasures: [
      {
        code: 'VINELAND-3',
        nameEn: 'Vineland Adaptive Behavior Scales-3',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'functional-independence',
      },
      {
        code: 'TPI-2',
        nameEn: 'Transition Planning Inventory-2',
        standardBody: 'custom',
        instrumentType: 'criterion_referenced',
        domainTag: 'general',
      },
    ],
    goalTemplates: [
      {
        code: 'IL-GT-BUS-ROUTE',
        nameAr: 'يستقل خط حافلة مألوف باستقلالية ذهاباً وإياباً',
        nameEn: 'Use familiar bus route round-trip independently',
        metric: 'PERCENTAGE',
        unit: '%',
        baseline: 0,
        target: 100,
        masteryCriteria: '100% independent across 3 occasions',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: ['clinical.progress.regression.significant'],
    compliance: ['CBAHI 8.7'],
  },

  // ─── Psychosocial ────────────────────────────────────────────────
  {
    id: 'rehab.psychosocial_support',
    code: 'PSY',
    nameEn: 'Psychosocial Support',
    nameAr: 'الدعم النفسي والاجتماعي',
    domain: 'psychosocial',
    ownerRole: ROLES.CLINICAL_DIRECTOR,
    leadSpecialistRole: ROLES.THERAPIST_PSYCH,
    assistantRoles: [ROLES.THERAPIST, ROLES.THERAPY_ASSISTANT],
    defaultReviewCycleDays: 90,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['early_3_6', 'child_6_12', 'adolescent_12_18', 'adult_18_plus'],
    deliveryModes: ['individual', 'group', 'telehealth', 'home_based'],
    icfDomains: ['body-functions', 'activities-participation', 'environmental-factors'],
    programTemplates: [
      {
        code: 'PSY-CBT',
        nameEn: 'Cognitive behavioral therapy',
        nameAr: 'العلاج المعرفي السلوكي',
        deliveryMode: 'individual',
        frequencyPerWeek: 1,
        durationMinutes: 50,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
      {
        code: 'PSY-SOCIAL-SKILLS',
        nameEn: 'Social skills group',
        nameAr: 'مجموعة المهارات الاجتماعية',
        deliveryMode: 'group',
        frequencyPerWeek: 1,
        durationMinutes: 60,
        cycleWeeks: 12,
        evidenceLevel: 'A',
      },
    ],
    recommendedInterventions: [
      {
        code: 'PSY-CBT-KIDS',
        nameAr: 'علاج معرفي للأطفال',
        nameEn: 'CBT for children',
        technique: 'CBT',
        evidenceLevel: 'A',
      },
      {
        code: 'PSY-PLAY-THERAPY',
        nameAr: 'علاج باللعب',
        nameEn: 'Play therapy',
        technique: 'play therapy',
        evidenceLevel: 'B',
      },
      {
        code: 'PSY-SST',
        nameAr: 'تدريب مهارات اجتماعية',
        nameEn: 'Social Skills Training',
        technique: 'SST',
        evidenceLevel: 'A',
      },
      {
        code: 'PSY-TRAUMA-CBT',
        nameAr: 'علاج معرفي مركّز على الصدمة',
        nameEn: 'Trauma-focused CBT',
        technique: 'TF-CBT',
        evidenceLevel: 'A',
      },
    ],
    recommendedMeasures: [
      {
        code: 'CBCL',
        nameEn: 'Child Behavior Checklist',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'mental-health',
      },
      {
        code: 'SDQ',
        nameEn: 'Strengths and Difficulties Questionnaire',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'mental-health',
      },
      {
        code: 'PEDS-QL',
        nameEn: 'Pediatric Quality of Life Inventory',
        standardBody: 'NIH',
        instrumentType: 'standardized',
        domainTag: 'quality-of-life',
      },
      {
        code: 'SRS-2',
        nameEn: 'Social Responsiveness Scale-2',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'social-integration',
      },
    ],
    goalTemplates: [
      {
        code: 'PSY-GT-EMOTION-ID',
        nameAr: 'يميّز 6 انفعالات من صور بدقة 80%',
        nameEn: 'Identify 6 emotions from images with 80% accuracy',
        metric: 'PERCENTAGE',
        unit: '%',
        baseline: 30,
        target: 80,
        masteryCriteria: '80% across 3 sessions',
      },
      {
        code: 'PSY-GT-ANXIETY-SUDS',
        nameAr: 'يخفض مؤشر القلق SUDS في المواقف المستهدفة إلى ≤3',
        nameEn: 'Reduce SUDS in target situations to ≤3',
        metric: 'RUBRIC',
        unit: 'SUDS 0-10',
        baseline: 7,
        target: 3,
        masteryCriteria: '≤3 across 3 consecutive exposures',
      },
    ],
    kpiLinks: ['rehab.outcomes.goal_progress.pct'],
    redFlagLinks: [
      'behavioral.aggression.frequency.spike_200',
      'clinical.progress.regression.significant',
    ],
    compliance: ['CBAHI 8.7', 'APA'],
  },

  // ─── Social ──────────────────────────────────────────────────────
  {
    id: 'rehab.family_services',
    code: 'FAM',
    nameEn: 'Family Services',
    nameAr: 'الخدمات الأسرية',
    domain: 'social',
    ownerRole: ROLES.MANAGER,
    leadSpecialistRole: ROLES.THERAPIST_PSYCH,
    assistantRoles: [ROLES.THERAPIST, ROLES.SUPERVISOR],
    defaultReviewCycleDays: 180,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['cross_age'],
    deliveryModes: ['individual', 'group', 'home_based', 'telehealth'],
    icfDomains: ['environmental-factors', 'personal-factors'],
    programTemplates: [
      {
        code: 'FAM-PARENT-TRAIN',
        nameEn: 'Parent training & coaching',
        nameAr: 'تدريب وتأهيل الأسرة',
        deliveryMode: 'individual',
        frequencyPerWeek: 1,
        durationMinutes: 60,
        cycleWeeks: 10,
        evidenceLevel: 'A',
      },
      {
        code: 'FAM-SUPPORT-GROUP',
        nameEn: 'Family support group',
        nameAr: 'مجموعة دعم الأسر',
        deliveryMode: 'group',
        frequencyPerWeek: 1,
        durationMinutes: 90,
        cycleWeeks: 12,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'FAM-PCIT',
        nameAr: 'علاج تفاعلي والدي-طفل',
        nameEn: 'Parent-Child Interaction Therapy',
        technique: 'PCIT',
        evidenceLevel: 'A',
      },
      {
        code: 'FAM-PSY-ED',
        nameAr: 'تثقيف أسري',
        nameEn: 'Psychoeducation',
        technique: 'psychoeducation',
        evidenceLevel: 'A',
      },
      {
        code: 'FAM-RESP-CARE-COORD',
        nameAr: 'تنسيق رعاية الراحة',
        nameEn: 'Respite care coordination',
        technique: 'case management',
        evidenceLevel: 'B',
      },
    ],
    recommendedMeasures: [
      {
        code: 'FES',
        nameEn: 'Family Environment Scale',
        standardBody: 'APA',
        instrumentType: 'norm_referenced',
        domainTag: 'caregiver-burden',
      },
      {
        code: 'FNQ',
        nameEn: 'Family Needs Questionnaire',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'caregiver-burden',
      },
      {
        code: 'CSI',
        nameEn: 'Caregiver Strain Index',
        standardBody: 'custom',
        instrumentType: 'standardized',
        domainTag: 'caregiver-burden',
      },
    ],
    goalTemplates: [
      {
        code: 'FAM-GT-HOME-CARRY',
        nameAr: 'تنفذ الأسرة استراتيجيات الجلسة في المنزل 5 أيام/أسبوع',
        nameEn: 'Family implements session strategies at home 5 days/week',
        metric: 'FREQUENCY',
        unit: 'days/week',
        baseline: 1,
        target: 5,
        masteryCriteria: '5 days/week across 3 consecutive weeks',
      },
    ],
    kpiLinks: ['communications.parent_portal.activation.pct', 'crm.retention.churn.pct'],
    redFlagLinks: [
      'family.home_carryover.missing.14d',
      'family.portal.inactive.90d',
      'family.message.unanswered.48h',
    ],
    compliance: ['CBAHI 4.3'],
  },

  {
    id: 'rehab.social_services',
    code: 'SOC',
    nameEn: 'Social Services',
    nameAr: 'الخدمات الاجتماعية',
    domain: 'social',
    ownerRole: ROLES.MANAGER,
    leadSpecialistRole: ROLES.SUPERVISOR,
    assistantRoles: [ROLES.THERAPY_ASSISTANT, ROLES.THERAPIST],
    defaultReviewCycleDays: 180,
    assessmentCadenceDays: 180,
    supportedAgeBands: ['cross_age'],
    deliveryModes: ['individual', 'group', 'community_based', 'home_based'],
    icfDomains: ['environmental-factors', 'personal-factors'],
    programTemplates: [
      {
        code: 'SOC-CASE-MGMT',
        nameEn: 'Social case management',
        nameAr: 'إدارة حالة اجتماعية',
        deliveryMode: 'individual',
        frequencyPerWeek: 1,
        durationMinutes: 60,
        cycleWeeks: 26,
        evidenceLevel: 'B',
      },
      {
        code: 'SOC-COMMUNITY-INT',
        nameEn: 'Community integration outings',
        nameAr: 'أنشطة دمج مجتمعي',
        deliveryMode: 'community_based',
        frequencyPerWeek: 1,
        durationMinutes: 120,
        cycleWeeks: 12,
        evidenceLevel: 'B',
      },
    ],
    recommendedInterventions: [
      {
        code: 'SOC-CASE-COORD',
        nameAr: 'تنسيق خدمات الحالة',
        nameEn: 'Case coordination',
        technique: 'case management',
        evidenceLevel: 'A',
      },
      {
        code: 'SOC-RESOURCE-NAV',
        nameAr: 'توجيه للموارد الحكومية/الأهلية',
        nameEn: 'Resource navigation',
        technique: 'service linkage',
        evidenceLevel: 'B',
      },
      {
        code: 'SOC-ADVOCACY',
        nameAr: 'مناصرة حقوق الفرد',
        nameEn: 'Rights advocacy',
        technique: 'advocacy',
        evidenceLevel: 'B',
      },
    ],
    recommendedMeasures: [
      {
        code: 'WHODAS-2',
        nameEn: 'WHO Disability Assessment Schedule 2.0',
        standardBody: 'WHO',
        instrumentType: 'standardized',
        domainTag: 'participation',
      },
      {
        code: 'RSA',
        nameEn: 'Rehabilitation Services Assessment',
        standardBody: 'custom',
        instrumentType: 'custom',
        domainTag: 'social-integration',
      },
    ],
    goalTemplates: [
      {
        code: 'SOC-GT-GOV-SERVICES',
        nameAr: 'تستكمل الأسرة التسجيل في 3 خدمات حكومية مستحقة',
        nameEn: 'Family completes registration in 3 eligible government services',
        metric: 'COMPOSITE',
        unit: 'services',
        baseline: 0,
        target: 3,
        masteryCriteria: 'All 3 active and confirmed',
      },
    ],
    kpiLinks: ['crm.retention.churn.pct'],
    redFlagLinks: ['compliance.disability_card.expired', 'family.portal.inactive.90d'],
    compliance: ['CBAHI 4.3', 'MoHRSD'],
  },
]);

// ─── Lookups ────────────────────────────────────────────────────────

function byId(id) {
  return DISCIPLINES.find(d => d.id === id) || null;
}

function byCode(code) {
  if (!code) return null;
  const up = String(code).toUpperCase();
  return DISCIPLINES.find(d => d.code === up) || null;
}

function byDomain(domain) {
  return DISCIPLINES.filter(d => d.domain === domain);
}

function byOwnerRole(role) {
  return DISCIPLINES.filter(d => d.ownerRole === role);
}

function byLeadRole(role) {
  return DISCIPLINES.filter(d => d.leadSpecialistRole === role);
}

function forAgeBand(ageBand) {
  return DISCIPLINES.filter(d => d.supportedAgeBands.includes(ageBand));
}

function forDeliveryMode(mode) {
  return DISCIPLINES.filter(d => d.deliveryModes.includes(mode));
}

function withKpi(kpiId) {
  return DISCIPLINES.filter(d => d.kpiLinks.includes(kpiId));
}

function withRedFlag(flagId) {
  return DISCIPLINES.filter(d => d.redFlagLinks.includes(flagId));
}

function byCompliance(framework) {
  return DISCIPLINES.filter(d => d.compliance.includes(framework));
}

/**
 * Resolve a beneficiary's recommended review-cycle in days given a
 * set of active discipline ids. Returns the minimum cycle across the
 * set (tightest cadence wins). Falls back to 90 if none supplied.
 */
function recommendedReviewCycleDays(disciplineIds = []) {
  if (!Array.isArray(disciplineIds) || disciplineIds.length === 0) return 90;
  const days = disciplineIds
    .map(id => byId(id))
    .filter(Boolean)
    .map(d => d.defaultReviewCycleDays);
  if (days.length === 0) return 90;
  return Math.min(...days);
}

/**
 * Suggest candidate interventions for a given discipline + goal metric
 * kind. Primary lookup for the goal-suggestion engine (later commit).
 */
function suggestInterventions(disciplineId, goalMetric = null) {
  const d = byId(disciplineId);
  if (!d) return [];
  // Metric-agnostic for now; future commits can filter by technique
  // tags once interventions carry metric affinity.
  void goalMetric;
  return d.recommendedInterventions.slice();
}

/**
 * Suggest candidate outcome measures for a given discipline and age
 * band. Filters by age when supported by the discipline; otherwise
 * returns all recommended measures for the discipline.
 */
function suggestMeasures(disciplineId, ageBand = null) {
  const d = byId(disciplineId);
  if (!d) return [];
  if (ageBand && !d.supportedAgeBands.includes(ageBand)) return [];
  return d.recommendedMeasures.slice();
}

// ─── Exports ───────────────────────────────────────────────────────

module.exports = {
  DISCIPLINES,
  DOMAINS,
  DELIVERY_MODES,
  AGE_BANDS,
  EVIDENCE_LEVELS,
  INSTRUMENT_TYPES,
  GOAL_METRIC_KINDS,
  byId,
  byCode,
  byDomain,
  byOwnerRole,
  byLeadRole,
  forAgeBand,
  forDeliveryMode,
  withKpi,
  withRedFlag,
  byCompliance,
  recommendedReviewCycleDays,
  suggestInterventions,
  suggestMeasures,
  // Drift-test helper: validate KPI links resolve
  _resolveKpi: kpiById,
  _resolveRedFlag: redFlagById,
};
