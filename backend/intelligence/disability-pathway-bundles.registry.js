'use strict';

/**
 * disability-pathway-bundles.registry.js — W1205 (Blueprint 43, R4 + Part V)
 *
 * Single source of truth for the per-disability-type "therapeutic fingerprint":
 * each beneficiary disability category maps to ONE bundle describing what
 * auto-loads at triage — pathway template + measure search keys + goal-bank
 * search keys + guidance assessments.
 *
 * Pure frozen data — no DB, no I/O. Resolution against LIVE collections
 * (Measure / GoalBank / ClinicalPathwayPlan) happens in
 * services/pathwayBundle.service.js, which REFUSES TO FABRICATE: registry
 * entries that don't resolve against the live library are reported as
 * unresolved, never invented.
 *
 * Keys are EXACTLY the `Beneficiary.disability.type` enum
 * (models/Beneficiary.js): physical | mental | sensory | multiple | learning
 * | speech | other. `pathwayType` values are EXACTLY the
 * ClinicalPathwayPlan.pathwayType enum. `measureTargetPopulations` values are
 * EXACTLY the Measure.targetPopulation enum (domains/goals/models/Measure.js).
 * `goalBankDomains` values are EXACTLY the GoalBank.domain enum.
 * Drift guard: __tests__/pathway-bundles-wave1205.test.js asserts all four.
 */

const BUNDLE_VERSION = 1;

const DISABILITY_PATHWAY_BUNDLES = Object.freeze({
  mental: Object.freeze({
    key: 'mental',
    titleAr: 'مسار الاضطرابات النمائية والذهنية (توحد / إعاقة ذهنية)',
    titleEn: 'Developmental & Intellectual Pathway (ASD / ID)',
    pathwayType: 'AUTISM_EARLY_INTERVENTION',
    guidanceAssessments: Object.freeze(['M-CHAT-R/F', 'CARS-2', 'Vineland-3']),
    measureTargetPopulations: Object.freeze(['autism', 'intellectual_disability', 'down_syndrome']),
    // W1225 — include screening/diagnostic: the canonical autism instruments
    // (M-CHAT-R, CARS-2) are catalogued under those categories, so the
    // original list resolved ZERO measures against the live prod library.
    measureCategories: Object.freeze([
      'developmental',
      'behavioral',
      'adaptive',
      'social',
      'screening',
      'diagnostic',
    ]),
    goalBankDomains: Object.freeze(['BEHAVIORAL', 'SPECIAL_EDU', 'SPEECH']),
    interventionsAr: Object.freeze(['ABA/DTT', 'AAC', 'حمية حسية', 'خطة سلوك']),
    defaultStages: Object.freeze([
      Object.freeze({ code: 'SCREEN', title: 'الفرز والتقييم التطوري', order: 1, targetDays: 14 }),
      Object.freeze({
        code: 'BASELINE',
        title: 'خط الأساس السلوكي والتكيفي',
        order: 2,
        targetDays: 14,
      }),
      Object.freeze({
        code: 'INTERVENTION',
        title: 'التدخل المكثف المبكر',
        order: 3,
        targetDays: 90,
      }),
      Object.freeze({
        code: 'REVIEW',
        title: 'مراجعة الاستجابة وتعديل الخطة',
        order: 4,
        targetDays: 30,
      }),
    ]),
  }),

  physical: Object.freeze({
    key: 'physical',
    titleAr: 'مسار التأهيل الحركي (شلل دماغي / إصابات حركية)',
    titleEn: 'Motor Rehabilitation Pathway (CP / Physical)',
    pathwayType: 'CP_MOTOR_REHAB',
    guidanceAssessments: Object.freeze(['GMFCS', 'MACS', 'GMFM', 'FIM']),
    measureTargetPopulations: Object.freeze(['cerebral_palsy', 'physical_disability']),
    measureCategories: Object.freeze(['motor', 'functional', 'developmental']),
    goalBankDomains: Object.freeze(['PHYSICAL', 'OCCUPATIONAL']),
    interventionsAr: Object.freeze(['علاج طبيعي', 'علاج وظيفي', 'جبائر', 'مقاعد ووضعية']),
    defaultStages: Object.freeze([
      Object.freeze({
        code: 'MOTOR_ASSESS',
        title: 'التقييم الحركي الوظيفي',
        order: 1,
        targetDays: 14,
      }),
      Object.freeze({
        code: 'BASELINE',
        title: 'خط الأساس (GMFM / مدى الحركة)',
        order: 2,
        targetDays: 7,
      }),
      Object.freeze({ code: 'THERAPY', title: 'العلاج الحركي المكثف', order: 3, targetDays: 90 }),
      Object.freeze({
        code: 'EQUIPMENT',
        title: 'الأجهزة المساعدة والوضعية',
        order: 4,
        targetDays: 30,
      }),
      Object.freeze({ code: 'REVIEW', title: 'إعادة القياس والمراجعة', order: 5, targetDays: 30 }),
    ]),
  }),

  speech: Object.freeze({
    key: 'speech',
    titleAr: 'مسار النطق واللغة والتواصل',
    titleEn: 'Speech, Language & Communication Pathway',
    pathwayType: 'SPEECH_LANGUAGE',
    guidanceAssessments: Object.freeze(['تقييم النطق واللغة', 'تقييم البلع (IDDSI)', 'MLU']),
    measureTargetPopulations: Object.freeze(['language_delay', 'autism']),
    // W1225 — +screening/quality_of_life so 'all'-population screens (SDQ,
    // PedsQL) and autism-population screens resolve for speech intakes.
    measureCategories: Object.freeze([
      'speech_language',
      'developmental',
      'screening',
      'quality_of_life',
    ]),
    goalBankDomains: Object.freeze(['SPEECH']),
    interventionsAr: Object.freeze(['علاج نطق', 'AAC', 'حمية بلع IDDSI']),
    defaultStages: Object.freeze([
      Object.freeze({
        code: 'SLP_ASSESS',
        title: 'تقييم النطق واللغة والبلع',
        order: 1,
        targetDays: 14,
      }),
      Object.freeze({
        code: 'BASELINE',
        title: 'خط أساس الوضوح والمفردات',
        order: 2,
        targetDays: 7,
      }),
      Object.freeze({ code: 'THERAPY', title: 'جلسات النطق المنتظمة', order: 3, targetDays: 90 }),
      Object.freeze({ code: 'REVIEW', title: 'مراجعة التقدم اللغوي', order: 4, targetDays: 30 }),
    ]),
  }),

  learning: Object.freeze({
    key: 'learning',
    titleAr: 'مسار صعوبات التعلم',
    titleEn: 'Learning Disability Pathway',
    pathwayType: 'GENERIC_REHAB',
    guidanceAssessments: Object.freeze(['تقييم نفسي-تربوي', 'Vineland-3']),
    measureTargetPopulations: Object.freeze(['learning_disability']),
    // W1225 — +screening/quality_of_life: no live instrument carries the
    // learning_disability population yet, so 'all'-population screens (SDQ,
    // PedsQL) are the realistic intake set for this bundle.
    measureCategories: Object.freeze([
      'academic',
      'cognitive',
      'adaptive',
      'screening',
      'quality_of_life',
    ]),
    goalBankDomains: Object.freeze(['SPECIAL_EDU']),
    interventionsAr: Object.freeze(['تربية خاصة', 'مهارات حياتية', 'دعم أكاديمي']),
    defaultStages: Object.freeze([
      Object.freeze({
        code: 'PSYCHO_ED',
        title: 'التقييم النفسي-التربوي',
        order: 1,
        targetDays: 21,
      }),
      Object.freeze({
        code: 'IEP',
        title: 'بناء الخطة التربوية الفردية',
        order: 2,
        targetDays: 14,
      }),
      Object.freeze({
        code: 'INSTRUCTION',
        title: 'التدخل التربوي المتخصص',
        order: 3,
        targetDays: 90,
      }),
      Object.freeze({ code: 'REVIEW', title: 'مراجعة الأداء الأكاديمي', order: 4, targetDays: 45 }),
    ]),
  }),

  sensory: Object.freeze({
    key: 'sensory',
    titleAr: 'مسار الإعاقات الحسية (سمعية / بصرية)',
    titleEn: 'Sensory Pathway (Hearing / Vision)',
    pathwayType: 'GENERIC_REHAB',
    guidanceAssessments: Object.freeze(['فحص السمع الوظيفي (W724)', 'فحص البصر الوظيفي (W720)']),
    measureTargetPopulations: Object.freeze([]),
    measureCategories: Object.freeze(['sensory', 'screening', 'functional']),
    goalBankDomains: Object.freeze(['OCCUPATIONAL', 'SPEECH']),
    interventionsAr: Object.freeze(['تأهيل سمعي', 'تأهيل بصري', 'إحالة تخصصية']),
    defaultStages: Object.freeze([
      Object.freeze({
        code: 'SENSORY_SCREEN',
        title: 'الفحص الحسي (سمع/بصر)',
        order: 1,
        targetDays: 14,
      }),
      Object.freeze({
        code: 'REFERRAL',
        title: 'الإحالة التخصصية عند الحاجة',
        order: 2,
        targetDays: 21,
      }),
      Object.freeze({ code: 'REHAB', title: 'التأهيل الحسي الوظيفي', order: 3, targetDays: 90 }),
      Object.freeze({ code: 'REVIEW', title: 'مراجعة الاستجابة', order: 4, targetDays: 30 }),
    ]),
  }),

  multiple: Object.freeze({
    key: 'multiple',
    titleAr: 'مسار الإعاقات المتعددة (فريق متعدد التخصصات)',
    titleEn: 'Multiple Disabilities Pathway (MDT)',
    pathwayType: 'GENERIC_REHAB',
    guidanceAssessments: Object.freeze(['ICF شامل', 'Vineland-3', 'GMFM']),
    measureTargetPopulations: Object.freeze([
      'autism',
      'intellectual_disability',
      'cerebral_palsy',
      'physical_disability',
    ]),
    measureCategories: Object.freeze(['developmental', 'functional', 'adaptive']),
    goalBankDomains: Object.freeze([
      'SPEECH',
      'OCCUPATIONAL',
      'PHYSICAL',
      'BEHAVIORAL',
      'SPECIAL_EDU',
    ]),
    interventionsAr: Object.freeze(['خطة متعددة التخصصات', 'اجتماع MDT', 'أولويات أسرية']),
    defaultStages: Object.freeze([
      Object.freeze({
        code: 'MDT_ASSESS',
        title: 'تقييم متعدد التخصصات',
        order: 1,
        targetDays: 21,
      }),
      Object.freeze({
        code: 'MDT_PLAN',
        title: 'خطة موحدة بأولويات الأسرة',
        order: 2,
        targetDays: 14,
      }),
      Object.freeze({ code: 'THERAPY', title: 'تدخلات متوازية منسقة', order: 3, targetDays: 90 }),
      Object.freeze({ code: 'MDT_REVIEW', title: 'مراجعة MDT دورية', order: 4, targetDays: 45 }),
    ]),
  }),

  other: Object.freeze({
    key: 'other',
    titleAr: 'مسار تأهيلي عام',
    titleEn: 'Generic Rehabilitation Pathway',
    pathwayType: 'GENERIC_REHAB',
    guidanceAssessments: Object.freeze(['تقييم ICF عام']),
    measureTargetPopulations: Object.freeze([]),
    measureCategories: Object.freeze([]),
    goalBankDomains: Object.freeze([
      'SPEECH',
      'OCCUPATIONAL',
      'PHYSICAL',
      'BEHAVIORAL',
      'SPECIAL_EDU',
    ]),
    interventionsAr: Object.freeze(['خطة فردية حسب التقييم']),
    defaultStages: Object.freeze([
      Object.freeze({ code: 'ASSESS', title: 'التقييم الشامل', order: 1, targetDays: 14 }),
      Object.freeze({ code: 'PLAN', title: 'بناء الخطة الفردية', order: 2, targetDays: 14 }),
      Object.freeze({ code: 'THERAPY', title: 'التدخل العلاجي', order: 3, targetDays: 90 }),
      Object.freeze({ code: 'REVIEW', title: 'المراجعة الدورية', order: 4, targetDays: 30 }),
    ]),
  }),
});

/**
 * Resolve a bundle for a beneficiary disability type.
 * Unknown / missing types fall back to the 'other' generic bundle —
 * the suggest surface must never 500 on legacy data.
 */
function bundleForDisabilityType(disabilityType) {
  const key = String(disabilityType || '')
    .trim()
    .toLowerCase();
  return DISABILITY_PATHWAY_BUNDLES[key] || DISABILITY_PATHWAY_BUNDLES.other;
}

function listBundles() {
  return Object.values(DISABILITY_PATHWAY_BUNDLES);
}

module.exports = {
  BUNDLE_VERSION,
  DISABILITY_PATHWAY_BUNDLES,
  bundleForDisabilityType,
  listBundles,
};
