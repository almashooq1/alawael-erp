'use strict';

/**
 * assessmentRecommendationEngine.service.js — Wave 206
 *
 * The "smart bridge" between disability-assessment scores and a
 * concrete, actionable rehab program. Reads a beneficiary's
 * assessment results, interprets them against the canonical
 * measures library (rehab-measures-library.js), then emits:
 *
 *   1. scoreInterpretations[]  — per-measure tier + Arabic label
 *   2. suggestedGoals[]        — full SMART goal scaffolds keyed
 *                                to evidence (which score triggered it)
 *   3. suggestedPrograms[]     — eligible programs filtered against
 *                                age + ICD + safety flags + indications
 *   4. suggestedSchedule       — weekly modality distribution +
 *                                day-spread heuristic
 *   5. evidenceTrace[]         — every recommendation cites the
 *                                scores that produced it (CBAHI/ministry-
 *                                defensible audit trail)
 *   6. overallConfidence       — high/medium/needs_therapist_review
 *
 * Pure deterministic. No DB, no I/O, no LLM. Idempotent — same
 * input always yields same output. The optional Haiku refiner
 * (assessmentRecommendationLlm.service.js) can later polish the
 * Arabic phrasing, but never changes the structure or evidence.
 *
 * Goal templates are co-located in this module rather than a
 * separate JSON catalog — they are tightly coupled to the
 * measures library tiers and we want a single file to read when
 * a therapist asks "why did the engine recommend X".
 */

const measuresLib = require('../rehabilitation-services/rehab-measures-library');
const programsLib = require('../intelligence/care-plan-programs-library.registry');

// ─── Domain taxonomy ─────────────────────────────────────────────
// 7-axis taxonomy used by both goal-generation and schedule-building.
// Maps onto SmartGoal `domain` and CarePlan section names.
const DOMAINS = Object.freeze({
  MOTOR: 'motor',
  SELF_CARE: 'self_care',
  COMMUNICATION: 'communication',
  COGNITIVE: 'cognitive',
  BEHAVIOR: 'behavior',
  SOCIAL: 'social',
  ADAPTIVE: 'adaptive',
});

const DOMAIN_LABELS_AR = Object.freeze({
  motor: 'الحركي',
  self_care: 'العناية بالذات',
  communication: 'التواصل واللغة',
  cognitive: 'الإدراكي',
  behavior: 'السلوكي',
  social: 'الاجتماعي',
  adaptive: 'السلوك التكيفي',
});

// ─── Goal templates per (measureKey, tier) ──────────────────────
//
// Each template describes a SMART goal with placeholder tokens that
// the engine fills from the actual score. Templates are
// intentionally clinical-grade — they would be safe to print on a
// care plan as-is. The Haiku refiner only polishes phrasing.

const GOAL_TEMPLATES = Object.freeze({
  // ─── GMFCS (Gross Motor Function, levels 1-5) ──────────────
  GMFCS: {
    1: [
      {
        domain: DOMAINS.MOTOR,
        title: 'تعزيز المهارات الحركية المتقدمة والمشاركة الرياضية',
        specific: 'ممارسة نشاط رياضي مكيّف (سباحة/دراجة/ركض) لمدة 30 دقيقة، 3 مرات أسبوعياً',
        measurable: 'عدد جلسات النشاط المُنجَزة + مدة التحمل بدون توقف',
        achievable: 'GMFCS مستوى 1 يدعم النشاط البدني الكامل دون قيود',
        relevant: 'الحفاظ على المكاسب الحركية والوقاية من إصابات الإفراط',
        timeBoundDays: 90,
        domainLabel_ar: 'المهارات الحركية الكبرى',
      },
    ],
    2: [
      {
        domain: DOMAINS.MOTOR,
        title: 'تحسين التحمل القلبي التنفسي والمشي في البيئات المتنوعة',
        specific: 'المشي 200 متر على أرض غير مستوية بدون توقف خلال 5 دقائق',
        measurable: 'المسافة المقطوعة + الزمن + معدل النبض',
        achievable: 'GMFCS مستوى 2 يسمح بالمشي مع تحديات بيئية',
        relevant: 'يدعم الاستقلالية في الانتقال إلى الفصل والمناطق المشتركة',
        timeBoundDays: 90,
        domainLabel_ar: 'المهارات الحركية الكبرى',
      },
    ],
    3: [
      {
        domain: DOMAINS.MOTOR,
        title: 'تحقيق الاستقلالية في التنقل باستخدام جهاز مساعد',
        specific: 'المشي 50 متراً باستخدام عكاز رباعي/مشاية بدون توقف ضمن البيئة الداخلية للمركز',
        measurable: 'المسافة المقطوعة دون توقف + عدد السقطات الأسبوعية',
        achievable: 'GMFCS مستوى 3 يتسق مع استخدام الأجهزة المساعدة',
        relevant: 'ضروري للوصول إلى الفصل ودورة المياه وقاعة العلاج باستقلالية',
        timeBoundDays: 90,
        domainLabel_ar: 'التنقل الوظيفي',
      },
      {
        domain: DOMAINS.SELF_CARE,
        title: 'الاستقلالية في الانتقالات الأساسية',
        specific: 'الانتقال من الكرسي المتحرك إلى المرحاض بأقل من إشراف خلال 60 ثانية',
        measurable: 'مستوى المساعدة وفق سلم FIM 1-7',
        achievable: 'تدريب يومي مع معالج وظيفي',
        relevant: 'يقلل عبء مقدم الرعاية ويعزز الكرامة',
        timeBoundDays: 60,
        domainLabel_ar: 'العناية بالذات',
      },
    ],
    4: [
      {
        domain: DOMAINS.MOTOR,
        title: 'تحسين التحكم بالجذع وقدرة الجلوس المستقل',
        specific: 'الجلوس المستقل لمدة 10 دقائق دون دعم خارجي',
        measurable: 'الوقت المُنقَضي قبل فقدان التوازن',
        achievable: 'GMFCS مستوى 4 — قدرة محدودة لكن قابلة للتحسين',
        relevant: 'يتيح المشاركة في الجلسات والوجبات والأنشطة الاجتماعية',
        timeBoundDays: 120,
        domainLabel_ar: 'التحكم الوضعي',
      },
      {
        domain: DOMAINS.SELF_CARE,
        title: 'تحسين وظيفة اليدين للأنشطة الأساسية',
        specific: 'إمساك الملعقة وإيصال الطعام للفم بنجاح في 70% من المحاولات خلال وجبة الإفطار',
        measurable: 'نسبة المحاولات الناجحة',
        achievable: 'يتسق مع GMFCS-4 ووجود وظيفة يدوية محتفظ بها',
        relevant: 'العناية بالذات هدف عالي القيمة للأسرة',
        timeBoundDays: 90,
        domainLabel_ar: 'الحركة الدقيقة',
      },
    ],
    5: [
      {
        domain: DOMAINS.MOTOR,
        title: 'الحفاظ على وضعية آمنة ومنع التقلصات',
        specific: 'تطبيق برنامج وضعية يومي (3 وضعيات × 30 دقيقة) دون ظهور احمرار في مناطق الضغط',
        measurable: 'سلامة الجلد + مدى الحركة السلبي شهرياً',
        achievable: 'GMFCS-5 يستلزم تدخل وقائي لا تحسيني',
        relevant: 'يمنع المضاعفات الثانوية ويُحافظ على جودة الحياة',
        timeBoundDays: 180,
        domainLabel_ar: 'الرعاية الوقائية',
      },
      {
        domain: DOMAINS.COMMUNICATION,
        title: 'تأسيس نظام تواصل بديل ومعزز (AAC)',
        specific:
          'استخدام جهاز AAC أو نظام صور للتعبير عن 5 حاجات أساسية (طعام/ألم/راحة/مرحاض/تعب)',
        measurable: 'عدد التعبيرات الناجحة يومياً',
        achievable: 'GMFCS-5 لا يمنع التواصل غير اللفظي',
        relevant: 'يستعيد قناة التواصل المفقودة ويقلل السلوكيات التحدّيّة',
        timeBoundDays: 120,
        domainLabel_ar: 'التواصل البديل',
      },
    ],
  },

  // ─── WeeFIM (children, FIM tiers) ──────────────────────────
  WeeFIM: {
    severe: [
      {
        domain: DOMAINS.SELF_CARE,
        title: 'بدء الاستقلالية في مهارة العناية بالذات الأساسية',
        specific: 'إنجاز خطوة واحدة من مهمة الأكل (مسك الملعقة، حمل الكوب) بمساعدة جسدية بسيطة',
        measurable: 'انتقال من مستوى 1-2 إلى 3-4 على WeeFIM',
        achievable: 'مع تدريب مكثف يومي على مدى 12 أسبوعاً',
        relevant: 'الأكل أول خطوة على طريق الاستقلالية الوظيفية',
        timeBoundDays: 90,
        domainLabel_ar: 'العناية بالذات',
      },
    ],
    moderate: [
      {
        domain: DOMAINS.SELF_CARE,
        title: 'الاستقلالية في مهام الحياة اليومية الرئيسية',
        specific: 'إنجاز 50% من خطوات ارتداء الملابس العلوية مستقلاً (إدخال الذراعين، رفع القميص)',
        measurable: 'نسبة الخطوات المُنجَزة دون مساعدة',
        achievable: 'WeeFIM متوسط — قاعدة وظيفية كافية',
        relevant: 'يقلل وقت الاستعداد الصباحي ويعزز التحكم الذاتي',
        timeBoundDays: 90,
        domainLabel_ar: 'العناية بالذات',
      },
    ],
    mild: [
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'تعميم مهارات الحياة اليومية في البيئات المتعددة',
        specific: 'تطبيق روتين الاستحمام المستقل في المنزل + المركز في 80% من الأيام',
        measurable: 'نسبة الأيام مع الاستقلالية الكاملة',
        achievable: 'WeeFIM خفيف — تعميم لا تأسيس',
        relevant: 'يدعم الانتقال من بيئة محكومة إلى بيئات حياتية',
        timeBoundDays: 60,
        domainLabel_ar: 'التعميم البيئي',
      },
    ],
  },

  // ─── CARS-2 (autism severity ST form) ──────────────────────
  CARS2: {
    minimal: [
      {
        domain: DOMAINS.SOCIAL,
        title: 'تعزيز المهارات الاجتماعية في البيئة المجتمعية',
        specific: 'بدء محادثة مع قرين جديد لمرة واحدة كل جلسة مجموعة، 3 جلسات أسبوعياً',
        measurable: 'عدد مبادرات التواصل المسجلة',
        achievable: 'CARS-2 ضمن الحدود الطبيعية — تعزيز لا تأسيس',
        relevant: 'يدعم الانخراط المدرسي والمجتمعي',
        timeBoundDays: 60,
        domainLabel_ar: 'المهارات الاجتماعية',
      },
    ],
    mild_moderate: [
      {
        domain: DOMAINS.COMMUNICATION,
        title: 'توسيع الجمل التعبيرية في الطلب والوصف',
        specific: 'استخدام جمل من 3-4 كلمات لطلب الحاجات في 70% من الفرص خلال الجلسة',
        measurable: 'نسبة الفرص المُنتَهَزة',
        achievable: 'CARS-2 خفيف-متوسط — قاعدة تواصل قائمة',
        relevant: 'التعبير وظيفة محورية لتقليل السلوكيات البديلة',
        timeBoundDays: 90,
        domainLabel_ar: 'التواصل التعبيري',
      },
      {
        domain: DOMAINS.BEHAVIOR,
        title: 'تقليل السلوكيات التكرارية المُعطِّلة',
        specific:
          'تقليل نوبات السلوك التكراري (الرفرفة/الدوران) من 8 إلى 3 نوبات/ساعة خلال أنشطة الفصل',
        measurable: 'تكرار النوبات بالساعة',
        achievable: 'باستخدام تدخل سلوكي (DRO/DRA) وتعديل بيئي',
        relevant: 'يسمح بالمشاركة الأكاديمية والاجتماعية',
        timeBoundDays: 90,
        domainLabel_ar: 'تنظيم السلوك',
      },
      {
        domain: DOMAINS.SOCIAL,
        title: 'تعزيز التواصل البصري والانتباه المشترك',
        specific: 'الحفاظ على تواصل بصري ≥3 ثوان عند مناداة الاسم في 80% من المرات',
        measurable: 'نسبة الاستجابة المُسجَّلة',
        achievable: 'هدف تأسيسي في طيف التوحد متوسط الشدة',
        relevant: 'أساس لكل التعلم الاجتماعي اللاحق',
        timeBoundDays: 60,
        domainLabel_ar: 'الانتباه المشترك',
      },
    ],
    severe: [
      {
        domain: DOMAINS.COMMUNICATION,
        title: 'تأسيس نظام تواصل وظيفي (AAC أو PECS)',
        specific: 'استخدام 10 صور PECS لطلب الحاجات الأساسية بشكل تلقائي خلال اليوم',
        measurable: 'عدد المبادرات اليومية',
        achievable: 'CARS-2 شديد — تواصل بديل ضرورة لا اختيار',
        relevant: 'يستعيد القدرة التواصلية الأساسية',
        timeBoundDays: 120,
        domainLabel_ar: 'التواصل البديل',
      },
      {
        domain: DOMAINS.BEHAVIOR,
        title: 'تقليل السلوكيات التحدّيّة عبر تحليل وظيفي',
        specific: 'تطبيق خطة سلوك مبنية على FBA لتقليل السلوك المستهدف بنسبة 50%',
        measurable: 'تكرار + شدة السلوك المُسجَّل',
        achievable: 'مع برنامج ABA مكثف 40 ساعة/أسبوع',
        relevant: 'سلامة المستفيد والمحيطين',
        timeBoundDays: 180,
        domainLabel_ar: 'تعديل السلوك',
      },
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'تأسيس روتين العناية بالذات الأساسية',
        specific:
          'إكمال خطوة واحدة من 3 مهمات يومية (الأكل، استخدام المرحاض، غسل اليدين) بمساعدة لفظية فقط',
        measurable: 'مستوى المساعدة على سلم Vineland',
        achievable: 'مع تدريب يومي مُجزَّأ ضمن BST',
        relevant: 'الاستقلالية الأساسية تخفف الضغط الأسري',
        timeBoundDays: 180,
        domainLabel_ar: 'العناية بالذات',
      },
    ],
  },

  // ─── Vineland-3 (adaptive behavior, standard score bands) ──
  Vineland3: {
    very_low: [
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'تأسيس مهارة حياة يومية واحدة أساسية',
        specific: 'إنجاز روتين غسل اليدين (4 خطوات) باستقلالية كاملة بعد 60 يوماً من التدريب',
        measurable: 'عدد الخطوات المُنجَزة دون توجيه',
        achievable: 'مع تجزئة المهمة وتسلسل أمامي',
        relevant: 'وظيفية محورية للنظافة الصحية',
        timeBoundDays: 60,
        domainLabel_ar: 'مهارات شخصية',
      },
    ],
    low: [
      {
        domain: DOMAINS.ADAPTIVE,
        title: 'تعزيز الاستقلالية في مهام الحياة المنزلية',
        specific: 'تنفيذ 3 مهام منزلية بسيطة (ترتيب السرير، وضع الصحون) بدون تذكير',
        measurable: 'عدد المهام المُنجَزة + تكرار التذكير',
        achievable: 'Vineland منخفض لكن قاعدة موجودة',
        relevant: 'يدعم الاستقلالية المستقبلية',
        timeBoundDays: 90,
        domainLabel_ar: 'مهارات منزلية',
      },
    ],
    below_average: [
      {
        domain: DOMAINS.SOCIAL,
        title: 'توسيع المشاركة في الأنشطة الجماعية',
        specific: 'المشاركة الفاعلة في 2 من 3 أنشطة جماعية أسبوعياً (لعب، رحلة، فصل)',
        measurable: 'نسبة المشاركة المُسجَّلة',
        achievable: 'يتسق مع مستوى أدنى-من-المتوسط',
        relevant: 'الانخراط الاجتماعي يحسن النواتج طويلة المدى',
        timeBoundDays: 60,
        domainLabel_ar: 'التنشئة الاجتماعية',
      },
    ],
    average_above: [
      {
        domain: DOMAINS.SOCIAL,
        title: 'تعزيز نقاط القوة عبر برنامج إثراء',
        specific: 'المشاركة في نشاط إثرائي اختياري (مهارة، رياضة، فن) لمدة 12 أسبوعاً',
        measurable: 'إكمال البرنامج + تقييم رضا المستفيد',
        achievable: 'Vineland ضمن/فوق المتوسط — فرصة لتطوير',
        relevant: 'يبني الهوية والثقة بالنفس',
        timeBoundDays: 90,
        domainLabel_ar: 'إثراء',
      },
    ],
  },
});

// ─── Score → tier mapping helpers ───────────────────────────────

/**
 * Interpret a single score against the measures library.
 * Returns a normalized tier object regardless of measure type.
 *
 * @param {object} score
 *   - measureKey: 'GMFCS' | 'WeeFIM' | 'CARS2' | 'Vineland3' | ...
 *   - level: 1-5 (for ordinal classification)
 *   - totalScore: number (for rating scale)
 *   - form: 'ST' | 'HF' (CARS2)
 *   - domain: 'communication' | ... (Vineland3)
 *   - standardScore: number (Vineland3)
 */
function interpretScore(score) {
  if (!score || !score.measureKey) {
    return { ok: false, reason: 'MISSING_MEASURE_KEY' };
  }
  const measure = measuresLib.getMeasure(score.measureKey);
  if (!measure) {
    return { ok: false, reason: 'UNKNOWN_MEASURE', measureKey: score.measureKey };
  }

  // Ordinal classification: GMFCS, MACS, CFCS, etc.
  if (measure.scoringType === 'ordinal_classification') {
    const level = Number(score.level);
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return { ok: false, reason: 'INVALID_LEVEL', expected: '1-5' };
    }
    const def = (measure.levels || []).find(l => l.level === level);
    return {
      ok: true,
      measureKey: score.measureKey,
      measureNameAr: measure.name_ar,
      tier: String(level),
      tierLabel_ar: def ? def.label_ar : `المستوى ${level}`,
      severity: level <= 2 ? 'mild' : level === 3 ? 'moderate' : 'severe',
      score: level,
    };
  }

  // CARS2 has form-specific bands but no scoringType — detect by id
  if (measure.id === 'CARS2-2010') {
    const total = Number(score.totalScore);
    if (!Number.isFinite(total)) return { ok: false, reason: 'INVALID_TOTAL_SCORE' };
    const form = score.form || 'ST';
    const bands = (measure.interpretation && measure.interpretation[form]) || [];
    const band = bands.find(b => total >= b.range[0] && total <= b.range[1]);
    if (!band) return { ok: false, reason: 'SCORE_OUT_OF_RANGE', total };
    return {
      ok: true,
      measureKey: score.measureKey,
      measureNameAr: measure.name_ar,
      tier: band.tier || band.label_ar,
      tierLabel_ar: band.label_ar,
      severity: deriveSeverityFromTier(band.tier),
      score: total,
    };
  }

  // Rating scale with interpretation bands: WeeFIM, FIM, BergBalance
  if (measure.scoringType === 'rating_scale') {
    const total = Number(score.totalScore);
    if (!Number.isFinite(total)) {
      return { ok: false, reason: 'INVALID_TOTAL_SCORE' };
    }
    const bands = measure.interpretation;
    if (!Array.isArray(bands)) {
      return { ok: false, reason: 'NO_INTERPRETATION_BANDS' };
    }
    const band = bands.find(b => total >= b.range[0] && total <= b.range[1]);
    if (!band) {
      return { ok: false, reason: 'SCORE_OUT_OF_RANGE', total };
    }
    return {
      ok: true,
      measureKey: score.measureKey,
      measureNameAr: measure.name_ar,
      tier: band.tier || band.label_ar,
      tierLabel_ar: band.label_ar,
      severity: deriveSeverityFromTier(band.tier),
      score: total,
    };
  }

  // Standardized (Vineland-3) — needs standard-score band lookup
  if (measure.scoringType === 'standardized') {
    const ss = Number(score.standardScore);
    if (!Number.isFinite(ss)) {
      return { ok: false, reason: 'INVALID_STANDARD_SCORE' };
    }
    const bands = (measure.scores && measure.scores.interpretation) || [];
    const band = bands.find(b => ss >= b.range[0] && ss <= b.range[1]);
    if (!band) {
      return { ok: false, reason: 'SS_OUT_OF_RANGE', standardScore: ss };
    }
    // Map Vineland labels → smartRecommendations keys
    const tier = mapVinelandTier(band.label_ar);
    return {
      ok: true,
      measureKey: score.measureKey,
      measureNameAr: measure.name_ar,
      tier,
      tierLabel_ar: band.label_ar,
      severity: deriveSeverityFromTier(tier),
      score: ss,
      domain: score.domain || null,
    };
  }

  // Binary cutoff (SCQ, CSI)
  if (measure.scoringType === 'binary') {
    const total = Number(score.totalScore);
    if (!Number.isFinite(total)) {
      return { ok: false, reason: 'INVALID_TOTAL_SCORE' };
    }
    const bands = measure.interpretation || [];
    const band = bands.find(b => total >= b.range[0] && total <= b.range[1]);
    return {
      ok: true,
      measureKey: score.measureKey,
      measureNameAr: measure.name_ar,
      tier: band ? band.tier || 'flagged' : 'below_cutoff',
      tierLabel_ar: band ? band.label_ar : 'تحت الحد',
      severity: deriveSeverityFromTier(band ? band.tier : null),
      score: total,
    };
  }

  return { ok: false, reason: 'UNSUPPORTED_SCORING_TYPE', scoringType: measure.scoringType };
}

function mapVinelandTier(label_ar) {
  if (label_ar.includes('منخفض جداً')) return 'very_low';
  if (label_ar.includes('منخفض')) return 'low';
  if (label_ar.includes('أدنى من المتوسط')) return 'below_average';
  return 'average_above';
}

function deriveSeverityFromTier(tier) {
  if (!tier) return 'unknown';
  const s = String(tier).toLowerCase();
  if (['severe', 'high', 'very_low', '4', '5'].includes(s)) return 'severe';
  if (['moderate', 'mild_moderate', 'low', '3', 'medium_fall_risk'].includes(s)) return 'moderate';
  if (['mild', 'modified', 'below_average', '2'].includes(s)) return 'mild';
  if (['independent', 'minimal', 'average_above', '1', 'low_fall_risk'].includes(s))
    return 'minimal';
  return 'unknown';
}

// ─── Goal generation ────────────────────────────────────────────

function buildGoalsFromInterpretation(interp) {
  if (!interp.ok) return [];
  const templates =
    (GOAL_TEMPLATES[interp.measureKey] && GOAL_TEMPLATES[interp.measureKey][interp.tier]) || [];
  return templates.map(t => ({
    ...t,
    baseline: `${interp.measureNameAr}: ${interp.tierLabel_ar} (الدرجة: ${interp.score})`,
    confidence: confidenceFromInterpretation(interp),
    evidence: [
      {
        measureKey: interp.measureKey,
        tier: interp.tier,
        tierLabel_ar: interp.tierLabel_ar,
        score: interp.score,
      },
    ],
  }));
}

function confidenceFromInterpretation(interp) {
  // Higher severity = higher confidence the goal is needed.
  // Standardized measures (Vineland) → highest. Ordinal → high.
  // Binary screening → medium.
  if (!interp.ok) return 'needs_therapist_review';
  if (interp.severity === 'severe') return 'high';
  if (interp.severity === 'moderate') return 'high';
  if (interp.severity === 'mild') return 'medium';
  if (interp.severity === 'minimal') return 'medium';
  return 'needs_therapist_review';
}

function deduplicateGoals(goals) {
  // Two goals share a title → merge evidence + take highest confidence
  const byTitle = new Map();
  for (const g of goals) {
    const key = `${g.domain}::${g.title}`;
    const existing = byTitle.get(key);
    if (!existing) {
      byTitle.set(key, { ...g, evidence: [...g.evidence] });
      continue;
    }
    existing.evidence.push(...g.evidence);
    if (confidenceRank(g.confidence) > confidenceRank(existing.confidence)) {
      existing.confidence = g.confidence;
    }
  }
  return [...byTitle.values()];
}

function confidenceRank(c) {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1;
}

// ─── Program selection ──────────────────────────────────────────

// Map measure tier → relevant ICD-10 indications.
// Used to filter the programs library for the beneficiary.
const TIER_TO_INDICATIONS = Object.freeze({
  // CARS2 severity → autism spectrum codes
  'CARS2::minimal': [],
  'CARS2::mild_moderate': ['F84.0', 'F84.9'],
  'CARS2::severe': ['F84.0', 'F84.9'],
  // Vineland → intellectual / developmental
  'Vineland3::very_low': ['F70', 'F71', 'F84.0'],
  'Vineland3::low': ['F70', 'F84.0'],
  // GMFCS → cerebral palsy
  'GMFCS::1': ['G80'],
  'GMFCS::2': ['G80'],
  'GMFCS::3': ['G80'],
  'GMFCS::4': ['G80'],
  'GMFCS::5': ['G80'],
});

function gatherIndications(interpretations, beneficiaryIndications = []) {
  const set = new Set(beneficiaryIndications);
  for (const interp of interpretations) {
    if (!interp.ok) continue;
    const key = `${interp.measureKey}::${interp.tier}`;
    for (const code of TIER_TO_INDICATIONS[key] || []) {
      set.add(code);
    }
  }
  return [...set];
}

function selectPrograms({ interpretations, beneficiary }) {
  const indications = gatherIndications(interpretations, beneficiary.indications || []);
  const age = beneficiary.age || null;
  const safetyFlags = beneficiary.safetyFlags || [];

  // Determine which domains need program coverage based on goal output
  const goalDomains = new Set();
  for (const interp of interpretations) {
    if (!interp.ok) continue;
    const templates =
      (GOAL_TEMPLATES[interp.measureKey] && GOAL_TEMPLATES[interp.measureKey][interp.tier]) || [];
    for (const t of templates) goalDomains.add(t.domain);
  }

  // For each domain we have goals for, look up matching programs
  const domainToProgramDomain = {
    motor: ['gross_motor', 'fine_motor'],
    self_care: ['adl'],
    communication: ['expressive_language', 'receptive_language'],
    cognitive: ['cognitive', 'academic'],
    behavior: ['behavior'],
    social: ['social'],
    adaptive: ['adl', 'social'],
  };

  const selected = new Map();
  for (const goalDomain of goalDomains) {
    const programDomains = domainToProgramDomain[goalDomain] || [];
    for (const pd of programDomains) {
      const programs = programsLib.listPrograms({
        domain: pd,
        ageBand: age,
        indication: undefined,
      });
      for (const p of programs) {
        // Indication match (any of the gathered indications must hit)
        if (p.indications.length > 0) {
          const hit = indications.some(i => p.indications.includes(i));
          if (!hit) continue;
        }
        // Safety contraindication check
        const contra = programsLib.checkContraindications(p.id, safetyFlags);
        if (!contra.ok) continue;
        if (selected.has(p.id)) continue;

        // Sessions per week heuristic: high severity → max, mild → min
        const severityRank = computeSeverityRankForDomain(goalDomain, interpretations);
        const sessionsPerWeek = sessionsForSeverity(p, severityRank);

        selected.set(p.id, {
          programId: p.id,
          name: p.name,
          nameAr: p.nameAr,
          modality: p.modality,
          domains: p.domains,
          minSessionsPerWeek: p.minSessionsPerWeek,
          maxSessionsPerWeek: p.maxSessionsPerWeek,
          recommendedSessionsPerWeek: sessionsPerWeek,
          sessionDurationMinRange: p.sessionDurationMinRange,
          evidenceLevel: p.evidenceLevel,
          coverageDomain: goalDomain,
          rationale: buildProgramRationale(p, goalDomain, interpretations),
          evidence: interpretations
            .filter(i => i.ok)
            .map(i => ({ measureKey: i.measureKey, tier: i.tier, tierLabel_ar: i.tierLabel_ar })),
        });
      }
    }
  }

  return [...selected.values()];
}

function computeSeverityRankForDomain(domain, interpretations) {
  // 0 = mild, 1 = moderate, 2 = severe
  let max = 0;
  for (const interp of interpretations) {
    if (!interp.ok) continue;
    if (interp.severity === 'severe') max = Math.max(max, 2);
    else if (interp.severity === 'moderate') max = Math.max(max, 1);
  }
  return max;
}

function sessionsForSeverity(program, severityRank) {
  const lo = program.minSessionsPerWeek;
  const hi = program.maxSessionsPerWeek;
  if (severityRank === 2) return hi;
  if (severityRank === 1) return Math.max(lo, Math.round((lo + hi) / 2));
  return lo;
}

function buildProgramRationale(program, domain, interpretations) {
  const drivers = interpretations
    .filter(i => i.ok && i.severity !== 'minimal')
    .map(i => `${i.measureNameAr}: ${i.tierLabel_ar}`)
    .slice(0, 3);
  if (!drivers.length) {
    return `يدعم محور "${DOMAIN_LABELS_AR[domain] || domain}" كبرنامج صيانة وقائي`;
  }
  return `موصى به لمحور "${DOMAIN_LABELS_AR[domain] || domain}" بناءً على: ${drivers.join('، ')}`;
}

// ─── Weekly schedule heuristic ──────────────────────────────────

function buildWeeklySchedule(programs) {
  const totalSessions = programs.reduce((s, p) => s + (p.recommendedSessionsPerWeek || 0), 0);
  // Round half-sessions up (parent training is 0.5/week)
  const totalRounded = Math.ceil(totalSessions);
  const byModality = {};
  for (const p of programs) {
    byModality[p.modality] = (byModality[p.modality] || 0) + p.recommendedSessionsPerWeek;
  }

  // 5-day school week distribution: sun..thu
  const days = ['sun', 'mon', 'tue', 'wed', 'thu'];
  const dayLabels_ar = {
    sun: 'الأحد',
    mon: 'الإثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
  };
  const distribution = days.map(d => ({ day: d, day_ar: dayLabels_ar[d], sessions: [] }));

  // Round-robin distribute, alternating modalities to avoid fatigue
  const queue = [];
  for (const p of programs) {
    const count = Math.ceil(p.recommendedSessionsPerWeek);
    for (let i = 0; i < count; i++) {
      queue.push({
        programId: p.programId,
        modality: p.modality,
        nameAr: p.nameAr,
        durationMin: p.sessionDurationMinRange ? p.sessionDurationMinRange[0] : 45,
      });
    }
  }

  // Sort queue so modalities alternate
  queue.sort((a, b) => a.modality.localeCompare(b.modality));
  const alternated = interleaveByModality(queue);

  let dayIdx = 0;
  for (const session of alternated) {
    distribution[dayIdx % days.length].sessions.push(session);
    dayIdx++;
  }

  return {
    totalSessionsPerWeek: totalRounded,
    byModality,
    distribution,
  };
}

function interleaveByModality(queue) {
  // Group by modality, then round-robin pick
  const byMod = new Map();
  for (const s of queue) {
    if (!byMod.has(s.modality)) byMod.set(s.modality, []);
    byMod.get(s.modality).push(s);
  }
  const result = [];
  let remaining = queue.length;
  while (remaining > 0) {
    for (const arr of byMod.values()) {
      if (arr.length === 0) continue;
      result.push(arr.shift());
      remaining--;
    }
  }
  return result;
}

// ─── Overall confidence ─────────────────────────────────────────

function computeOverallConfidence({ interpretations, programs, goals }) {
  const validInterps = interpretations.filter(i => i.ok);
  if (validInterps.length === 0) return 'needs_therapist_review';
  if (goals.length === 0) return 'needs_therapist_review';
  // At least one severity-driven recommendation
  const hasSevereOrModerate = validInterps.some(
    i => i.severity === 'severe' || i.severity === 'moderate'
  );
  if (hasSevereOrModerate && programs.length >= 2 && goals.length >= 3) return 'high';
  if (validInterps.length >= 2 && goals.length >= 2) return 'medium';
  return 'needs_therapist_review';
}

// ─── Evidence trace ─────────────────────────────────────────────

function buildEvidenceTrace({ interpretations, goals, programs }) {
  const trace = [];
  for (const g of goals) {
    trace.push({
      kind: 'goal',
      ref: g.title,
      domain: g.domain,
      triggeredBy: g.evidence.map(e => `${e.measureKey}=${e.tierLabel_ar}`),
    });
  }
  for (const p of programs) {
    trace.push({
      kind: 'program',
      ref: p.programId,
      modality: p.modality,
      triggeredBy: p.evidence.map(e => `${e.measureKey}=${e.tierLabel_ar}`),
    });
  }
  return trace;
}

// ─── Main entry point ───────────────────────────────────────────

/**
 * Generate a complete recommendation bundle from assessment scores.
 *
 * @param {object} input
 *   - beneficiary: { age, indications[], safetyFlags[] }
 *   - scores: array of score objects (see interpretScore)
 *
 * @returns {object} recommendation bundle (never throws)
 */
function recommend(input) {
  const safe = input && typeof input === 'object' ? input : {};
  const beneficiary =
    safe.beneficiary && typeof safe.beneficiary === 'object' ? safe.beneficiary : {};
  const scores = Array.isArray(safe.scores) ? safe.scores : [];

  // 1. Interpret every score
  const interpretations = scores.map(interpretScore);

  // 2. Build goals from each ok interpretation
  const rawGoals = interpretations.flatMap(buildGoalsFromInterpretation);
  const goals = deduplicateGoals(rawGoals);

  // 3. Select programs based on indications + safety + age
  const programs = selectPrograms({ interpretations, beneficiary });

  // 4. Build weekly schedule
  const schedule = programs.length > 0 ? buildWeeklySchedule(programs) : null;

  // 5. Flags (contraindications, insufficient evidence, etc.)
  const flags = computeFlags({ interpretations, beneficiary });

  // 6. Confidence + trace
  const overallConfidence = computeOverallConfidence({ interpretations, programs, goals });
  const evidenceTrace = buildEvidenceTrace({ interpretations, goals, programs });

  return {
    beneficiaryProfile: {
      age: beneficiary.age || null,
      indications: beneficiary.indications || [],
      primaryDomains: [...new Set(goals.map(g => g.domain))],
    },
    scoreInterpretations: interpretations,
    suggestedGoals: goals,
    suggestedPrograms: programs,
    suggestedSchedule: schedule,
    flags,
    overallConfidence,
    evidenceTrace,
    generatedAt: new Date().toISOString(),
    engineVersion: 'w206.1',
  };
}

function computeFlags({ interpretations, beneficiary }) {
  const flags = {
    invalidScores: [],
    safetyConflicts: beneficiary.safetyFlags || [],
    missingAge: !beneficiary.age,
  };
  for (const interp of interpretations) {
    if (!interp.ok) {
      flags.invalidScores.push({
        measureKey: interp.measureKey || 'unknown',
        reason: interp.reason,
      });
    }
  }
  return flags;
}

module.exports = {
  recommend,
  interpretScore,
  buildGoalsFromInterpretation,
  deduplicateGoals,
  selectPrograms,
  buildWeeklySchedule,
  computeOverallConfidence,
  DOMAINS,
  DOMAIN_LABELS_AR,
  GOAL_TEMPLATES,
  TIER_TO_INDICATIONS,
};
