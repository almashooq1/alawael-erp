/**
 * standard-assessment-service.js
 * خدمة التصحيح التلقائي والتفسير المعياري لأدوات التقييم
 * VABS-3 | CARS-2 | PEP-3 | ICF | Developmental Milestones
 */

'use strict';

const {
  VABSAssessment,
  CARS2Assessment,
  PEP3Assessment,
  ICFAssessment,
  DevelopmentalMilestones,
  AssessmentHistory,
} = require('../models/StandardAssessment');

// ═══════════════════════════════════════════════════════════════════
// جداول التحويل القياسية (Normative Tables - مبسّطة للاستخدام الإكلينيكي)
// ═══════════════════════════════════════════════════════════════════

/**
 * تحويل الدرجة الخام VABS إلى درجة معيارية (SS) بناءً على العمر
 * المعادلة المبسطة: SS = 100 + 15 * ((raw - mean_for_age) / sd_for_age)
 * القيم مأخوذة من جداول VABS-3 التقريبية
 */
const VABS3_NORMS = {
  // [age_group_months]: { mean, sd } لكل مجال
  communication: [
    { min: 0, max: 23, mean: 45, sd: 12 },
    { min: 24, max: 47, mean: 75, sd: 14 },
    { min: 48, max: 71, mean: 98, sd: 13 },
    { min: 72, max: 95, mean: 115, sd: 12 },
    { min: 96, max: 119, mean: 128, sd: 11 },
    { min: 120, max: 143, mean: 138, sd: 10 },
    { min: 144, max: 999, mean: 148, sd: 12 },
  ],
  daily_living: [
    { min: 0, max: 23, mean: 30, sd: 10 },
    { min: 24, max: 47, mean: 55, sd: 12 },
    { min: 48, max: 71, mean: 80, sd: 13 },
    { min: 72, max: 95, mean: 102, sd: 12 },
    { min: 96, max: 119, mean: 118, sd: 11 },
    { min: 120, max: 143, mean: 132, sd: 10 },
    { min: 144, max: 999, mean: 145, sd: 12 },
  ],
  socialization: [
    { min: 0, max: 23, mean: 38, sd: 11 },
    { min: 24, max: 47, mean: 62, sd: 13 },
    { min: 48, max: 71, mean: 88, sd: 12 },
    { min: 72, max: 95, mean: 108, sd: 11 },
    { min: 96, max: 119, mean: 122, sd: 10 },
    { min: 120, max: 143, mean: 134, sd: 10 },
    { min: 144, max: 999, mean: 144, sd: 11 },
  ],
  motor: [
    { min: 0, max: 23, mean: 42, sd: 11 },
    { min: 24, max: 47, mean: 68, sd: 12 },
    { min: 48, max: 71, mean: 88, sd: 11 },
    { min: 72, max: 95, mean: 102, sd: 10 },
    { min: 96, max: 999, mean: 112, sd: 10 },
  ],
};

/**
 * جدول بنود CARS-2 الـ 15 مع تصنيفها
 */
const CARS2_ITEMS = [
  { number: 1, name_ar: 'العلاقات مع الناس', category: 'social' },
  { number: 2, name_ar: 'التقليد', category: 'social' },
  { number: 3, name_ar: 'الاستجابة العاطفية', category: 'social' },
  { number: 4, name_ar: 'استخدام الجسم', category: 'behavioral' },
  { number: 5, name_ar: 'استخدام الأشياء', category: 'behavioral' },
  { number: 6, name_ar: 'التكيف مع التغيير', category: 'behavioral' },
  { number: 7, name_ar: 'الاستجابة البصرية', category: 'sensory' },
  { number: 8, name_ar: 'الاستجابة السمعية', category: 'sensory' },
  { number: 9, name_ar: 'الاستجابة الشمية واللمسية والتذوقية', category: 'sensory' },
  { number: 10, name_ar: 'الخوف والقلق', category: 'behavioral' },
  { number: 11, name_ar: 'التواصل اللفظي', category: 'communication' },
  { number: 12, name_ar: 'التواصل غير اللفظي', category: 'communication' },
  { number: 13, name_ar: 'مستوى النشاط', category: 'behavioral' },
  { number: 14, name_ar: 'مستوى الاستجابة العقلية والاتساق', category: 'behavioral' },
  { number: 15, name_ar: 'الانطباع العام', category: 'behavioral' },
];

// ═══════════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════════

/**
 * تحويل الدرجة المعيارية إلى رتبة مئينية (تقريبي)
 */
function standardScoreToPercentile(ss) {
  const table = [
    { ss: 145, p: 99.9 },
    { ss: 130, p: 98 },
    { ss: 125, p: 95 },
    { ss: 120, p: 91 },
    { ss: 115, p: 84 },
    { ss: 110, p: 75 },
    { ss: 107, p: 68 },
    { ss: 104, p: 61 },
    { ss: 100, p: 50 },
    { ss: 97, p: 42 },
    { ss: 93, p: 32 },
    { ss: 90, p: 25 },
    { ss: 85, p: 16 },
    { ss: 80, p: 9 },
    { ss: 75, p: 5 },
    { ss: 70, p: 2 },
    { ss: 55, p: 0.1 },
  ];
  const closest = table.reduce((prev, curr) =>
    Math.abs(curr.ss - ss) < Math.abs(prev.ss - ss) ? curr : prev
  );
  return closest.p;
}

/**
 * تحويل الدرجة المعيارية إلى مستوى الأداء التكيفي VABS
 */
function ssToAdaptiveLevel(ss) {
  if (ss >= 130) return 'high';
  if (ss >= 115) return 'moderately_high';
  if (ss >= 86) return 'adequate';
  if (ss >= 71) return 'moderately_low';
  return 'low';
}

/**
 * وصف مستوى الأداء التكيفي بالعربية
 */
const ADAPTIVE_LEVEL_AR = {
  high: 'مرتفع — أداء تكيفي متميز يفوق متوسط المعيار',
  moderately_high: 'مرتفع نسبياً — أداء تكيفي فوق المتوسط',
  adequate: 'مناسب — أداء تكيفي ضمن المدى الطبيعي',
  moderately_low: 'منخفض نسبياً — أداء تكيفي دون المتوسط، يحتاج دعماً',
  low: 'منخفض — أداء تكيفي يدل على إعاقة ملحوظة في السلوك التكيفي',
};

/**
 * تحويل الدرجة الخام إلى عمر تكيفي تقريبي (بالأشهر)
 */
function rawScoreToAgeEquivalent(rawScore, domain) {
  // جدول تحويل مبسط
  const tables = {
    communication: [
      { raw: 10, age: 6 },
      { raw: 20, age: 12 },
      { raw: 32, age: 18 },
      { raw: 45, age: 24 },
      { raw: 60, age: 30 },
      { raw: 75, age: 36 },
      { raw: 90, age: 48 },
      { raw: 100, age: 60 },
      { raw: 115, age: 72 },
      { raw: 125, age: 84 },
      { raw: 135, age: 96 },
      { raw: 145, age: 120 },
    ],
    daily_living: [
      { raw: 8, age: 6 },
      { raw: 15, age: 12 },
      { raw: 25, age: 18 },
      { raw: 38, age: 24 },
      { raw: 52, age: 30 },
      { raw: 65, age: 36 },
      { raw: 82, age: 48 },
      { raw: 98, age: 60 },
      { raw: 110, age: 72 },
      { raw: 120, age: 84 },
      { raw: 130, age: 96 },
      { raw: 140, age: 120 },
    ],
    socialization: [
      { raw: 9, age: 6 },
      { raw: 18, age: 12 },
      { raw: 28, age: 18 },
      { raw: 40, age: 24 },
      { raw: 54, age: 30 },
      { raw: 68, age: 36 },
      { raw: 85, age: 48 },
      { raw: 100, age: 60 },
      { raw: 112, age: 72 },
      { raw: 122, age: 84 },
      { raw: 132, age: 96 },
      { raw: 142, age: 120 },
    ],
    motor: [
      { raw: 12, age: 6 },
      { raw: 22, age: 12 },
      { raw: 32, age: 18 },
      { raw: 44, age: 24 },
      { raw: 56, age: 30 },
      { raw: 68, age: 36 },
      { raw: 80, age: 48 },
      { raw: 90, age: 60 },
      { raw: 100, age: 72 },
      { raw: 108, age: 84 },
    ],
  };

  const table = tables[domain] || tables.communication;
  let ageMonths = table[0].age;
  for (const entry of table) {
    if (rawScore >= entry.raw) ageMonths = entry.age;
    else break;
  }
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months > 0 ? `${years} سنوات ${months} أشهر` : `${years} سنوات`;
}

// ═══════════════════════════════════════════════════════════════════
// ── 1. خدمة VABS-3
// ═══════════════════════════════════════════════════════════════════
class VABS3Service {
  /**
   * حساب الدرجات الخام من البنود
   */
  static calculateRawScores(items) {
    const scores = { communication: 0, daily_living: 0, socialization: 0, motor: 0 };
    for (const item of items) {
      if (!item.dkn && scores[item.domain] !== undefined) {
        scores[item.domain] += item.response || 0;
      }
    }
    return scores;
  }

  /**
   * تحويل الدرجة الخام إلى درجة معيارية
   */
  static rawToStandardScore(rawScore, domain, ageMonths) {
    const norms = VABS3_NORMS[domain] || VABS3_NORMS.communication;
    const norm =
      norms.find(n => ageMonths >= n.min && ageMonths <= n.max) || norms[norms.length - 1];
    const z = (rawScore - norm.mean) / norm.sd;
    const ss = Math.round(100 + 15 * z);
    return Math.max(20, Math.min(160, ss)); // حد أدنى 20، حد أقصى 160
  }

  /**
   * توليد توصيات تلقائية بناءً على الدرجات
   */
  static generateRecommendations(standardScores) {
    const recommendations = [];
    const domains = {
      communication: {
        name: 'التواصل',
        goals: [
          'تطوير مهارات الاستماع والفهم',
          'توسيع المفردات اللغوية',
          'تحسين مهارات التعبير اللفظي',
          'تدريب على استخدام الجمل المركبة',
        ],
      },
      daily_living: {
        name: 'مهارات الحياة اليومية',
        goals: [
          'تدريب على مهارات العناية الشخصية',
          'تعزيز الاستقلالية في الوجبات',
          'تطوير مهارات ارتداء الملابس',
          'تدريب على المهارات المنزلية البسيطة',
        ],
      },
      socialization: {
        name: 'التنشئة الاجتماعية',
        goals: [
          'تطوير مهارات التفاعل مع الأقران',
          'تعزيز اللعب التبادلي',
          'تحسين مهارات الصداقة',
          'تدريب على اتباع القواعد الاجتماعية',
        ],
      },
      motor: {
        name: 'المهارات الحركية',
        goals: [
          'تطوير الحركة الكبيرة (توازن وتنسيق)',
          'تعزيز الحركة الدقيقة',
          'تدريب على مهارات الكتابة',
          'تطوير التآزر البصري-الحركي',
        ],
      },
    };

    for (const [domain, info] of Object.entries(domains)) {
      const ss = standardScores[domain];
      if (!ss) continue;

      const level = ssToAdaptiveLevel(ss);
      if (level === 'moderately_low' || level === 'low') {
        recommendations.push({
          domain,
          priority: level === 'low' ? 'high' : 'medium',
          recommendation_ar: `يحتاج تدخلاً تأهيلياً في مجال ${info.name} (الدرجة المعيارية: ${ss})`,
          suggested_goals: info.goals.slice(0, level === 'low' ? 4 : 2),
        });
      } else if (level === 'adequate') {
        recommendations.push({
          domain,
          priority: 'low',
          recommendation_ar: `مجال ${info.name} ضمن المدى الطبيعي — يُنصح بالمحافظة والتعزيز`,
          suggested_goals: info.goals.slice(0, 1),
        });
      }
    }
    return recommendations;
  }

  /**
   * التصحيح الكامل والتلقائي لتقييم VABS-3
   */
  static async scoreAssessment(assessmentId) {
    const assessment = await VABSAssessment.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const ageMonths = assessment.chronological_age_months;

    // حساب الدرجات الخام
    const rawScores = this.calculateRawScores(assessment.items);

    // تحويل إلى درجات معيارية
    const standardScores = {};
    const percentileRanks = {};
    const ageEquivalents = {};
    const adaptiveLevels = {};

    for (const domain of ['communication', 'daily_living', 'socialization', 'motor']) {
      const ss = this.rawToStandardScore(rawScores[domain], domain, ageMonths);
      standardScores[domain] = ss;
      percentileRanks[domain] = standardScoreToPercentile(ss);
      ageEquivalents[domain] = rawScoreToAgeEquivalent(rawScores[domain], domain);
      adaptiveLevels[domain] = ssToAdaptiveLevel(ss);
    }

    // الدرجة المركبة (متوسط الأربعة مجالات)
    const composite = Math.round(
      (standardScores.communication +
        standardScores.daily_living +
        standardScores.socialization +
        standardScores.motor) /
        4
    );
    standardScores.adaptive_behavior_composite = composite;
    percentileRanks.composite = standardScoreToPercentile(composite);

    const compositeLevel = ssToAdaptiveLevel(composite);
    const compositeInterp = {
      level: compositeLevel,
      description_ar: ADAPTIVE_LEVEL_AR[compositeLevel],
      strengths: Object.entries(adaptiveLevels)
        .filter(([, v]) => v === 'high' || v === 'moderately_high')
        .map(([k]) => k),
      needs: Object.entries(adaptiveLevels)
        .filter(([, v]) => v === 'low' || v === 'moderately_low')
        .map(([k]) => k),
    };

    // توصيات تلقائية
    const autoRecommendations = this.generateRecommendations(standardScores);

    // تحديث التقييم
    await VABSAssessment.findByIdAndUpdate(assessmentId, {
      raw_scores: rawScores,
      standard_scores: standardScores,
      percentile_ranks: percentileRanks,
      age_equivalents: ageEquivalents,
      adaptive_levels: adaptiveLevels,
      composite_interpretation: compositeInterp,
      auto_recommendations: autoRecommendations,
      status: 'completed',
    });

    return {
      raw_scores: rawScores,
      standard_scores: standardScores,
      percentile_ranks: percentileRanks,
      age_equivalents: ageEquivalents,
      adaptive_levels: adaptiveLevels,
      composite_interpretation: compositeInterp,
      auto_recommendations: autoRecommendations,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ── 2. خدمة CARS-2
// ═══════════════════════════════════════════════════════════════════
class CARS2Service {
  /**
   * حساب الدرجة الكلية وتصنيف مستوى التوحد
   */
  static calculateAndClassify(items, formUsed) {
    const totalScore = items.reduce((sum, item) => sum + (item.score || 0), 0);

    let classification;
    let classificationAr;

    if (formUsed === 'ST') {
      if (totalScore < 30) {
        classification = 'no_autism';
        classificationAr = 'لا توحد — لا تظهر علامات التوحد بشكل ملحوظ';
      } else if (totalScore <= 36) {
        classification = 'mild_moderate';
        classificationAr = 'توحد خفيف إلى متوسط — تظهر علامات التوحد بشكل معتدل';
      } else {
        classification = 'severe';
        classificationAr = 'توحد شديد — تظهر علامات التوحد بشكل واضح وشديد';
      }
    } else {
      // HF form
      if (totalScore < 27.5) {
        classification = 'no_autism';
        classificationAr = 'لا توحد (النموذج عالي الأداء)';
      } else if (totalScore <= 34) {
        classification = 'mild_moderate';
        classificationAr = 'توحد خفيف إلى متوسط (النموذج عالي الأداء)';
      } else {
        classification = 'severe';
        classificationAr = 'توحد شديد (النموذج عالي الأداء)';
      }
    }

    // درجة T التقريبية (M=50, SD=10)
    const mean = formUsed === 'ST' ? 33 : 28;
    const sd = 6;
    const tScore = Math.round(50 + 10 * ((totalScore - mean) / sd));

    return {
      totalScore,
      classification,
      classificationAr,
      tScore: Math.max(20, Math.min(80, tScore)),
      percentile: standardScoreToPercentile(tScore + 50), // تحويل تقريبي
    };
  }

  /**
   * تحليل الأنماط (أي الجوانب أكثر تأثراً)
   */
  static analyzePatterns(items) {
    const categories = { sensory: [], social: [], behavioral: [], communication: [] };

    for (const item of items) {
      const itemDef = CARS2_ITEMS.find(d => d.number === item.item_number);
      if (itemDef) {
        categories[itemDef.category].push(item.score);
      }
    }

    const avg = arr => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    const allScored = items
      .map(item => ({
        ...item,
        name_ar: CARS2_ITEMS.find(d => d.number === item.item_number)?.name_ar,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    let profileDesc = 'يُظهر المستفيد ';
    const concerns = [];
    if (avg(categories.sensory) >= 2.5) concerns.push('صعوبات حسية بارزة');
    if (avg(categories.social) >= 2.5) concerns.push('تحديات اجتماعية ملحوظة');
    if (avg(categories.communication) >= 2.5) concerns.push('تأخر في مهارات التواصل');
    if (avg(categories.behavioral) >= 2.5) concerns.push('أنماط سلوكية نمطية');
    profileDesc += concerns.length > 0 ? concerns.join('، ') : 'أعراض تحت الحد الإكلينيكي';

    return {
      sensory_items_avg: Math.round(avg(categories.sensory) * 10) / 10,
      social_items_avg: Math.round(avg(categories.social) * 10) / 10,
      behavioral_items_avg: Math.round(avg(categories.behavioral) * 10) / 10,
      communication_items_avg: Math.round(avg(categories.communication) * 10) / 10,
      highest_concern_items: allScored.map(i => ({
        item_number: i.item_number,
        item_name_ar: i.name_ar,
        score: i.score,
      })),
      profile_description_ar: profileDesc,
    };
  }

  /**
   * توليد توصيات بناءً على التصنيف
   */
  static generateRecommendations(classification, patternAnalysis) {
    const baseRecs = {
      no_autism: {
        diagnosis:
          'النتائج لا تدعم تشخيص اضطراب طيف التوحد. يُنصح بتقييمات تكميلية لاستبعاد اضطرابات أخرى.',
        areas: ['مراقبة النمو والتطور الطبيعي', 'دعم مهارات اللغة والتواصل إذا لزم'],
        assessments: ['VABS-3 لتقييم السلوك التكيفي', 'تقييم النطق واللغة'],
        family: 'تقديم إرشادات الوالدية الإيجابية ومتابعة التطور الطبيعي',
      },
      mild_moderate: {
        diagnosis:
          'النتائج تدعم تشخيص اضطراب طيف التوحد بمستوى خفيف إلى متوسط. يُوصى بتقييم تشخيصي متخصص.',
        areas: [
          'برنامج ABA (التحليل السلوكي التطبيقي)',
          'علاج النطق واللغة مع التركيز على التواصل الوظيفي',
          'تدريب المهارات الاجتماعية',
          'دعم التكامل الحسي',
        ],
        assessments: ['ADOS-2', 'ADI-R', 'تقييم متكامل من فريق متعدد التخصصات'],
        family: 'تدريب الوالدين على استراتيجيات ABA ودعم التواصل في البيت',
      },
      severe: {
        diagnosis:
          'النتائج تدعم تشخيص اضطراب طيف التوحد بمستوى شديد. يُوصى فوراً بتقييم تشخيصي متخصص وبدء التدخل المكثف.',
        areas: [
          'برنامج ABA مكثف (20-40 ساعة/أسبوع)',
          'علاج النطق وبرنامج PECS أو AAC',
          'علاج وظيفي للتكامل الحسي',
          'برنامج TEACCH للبيئة المنظمة',
          'تدريب المهارات الحياتية الأساسية',
        ],
        assessments: ['ADOS-2 فوراً', 'تقييم طبي شامل', 'تقييم نيوروسيكولوجي'],
        family: 'تدريب مكثف للوالدين، دعم أسري متكامل، مجموعات دعم الأسرة',
      },
    };

    const rec = baseRecs[classification] || baseRecs.no_autism;
    return {
      diagnosis_recommendation: rec.diagnosis,
      intervention_priority_areas: rec.areas,
      suggested_assessments: rec.assessments,
      family_guidance: rec.family,
    };
  }

  /**
   * التصحيح الكامل والتلقائي لتقييم CARS-2
   */
  static async scoreAssessment(assessmentId) {
    const assessment = await CARS2Assessment.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const { totalScore, classification, classificationAr, tScore, percentile } =
      this.calculateAndClassify(assessment.items, assessment.form_used);

    const patternAnalysis = this.analyzePatterns(assessment.items);
    const recommendations = this.generateRecommendations(classification, patternAnalysis);

    await CARS2Assessment.findByIdAndUpdate(assessmentId, {
      total_score: totalScore,
      classification,
      classification_ar: classificationAr,
      t_score: tScore,
      percentile,
      pattern_analysis: patternAnalysis,
      recommendations,
      status: 'completed',
    });

    return {
      totalScore,
      classification,
      classificationAr,
      tScore,
      percentile,
      patternAnalysis,
      recommendations,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ── 3. خدمة PEP-3
// ═══════════════════════════════════════════════════════════════════
class PEP3Service {
  /**
   * تحويل استجابة PEP-3 إلى درجة
   */
  static responseToScore(response) {
    const map = { pass: 2, emerging: 1, fail: 0 };
    return map[response] || 0;
  }

  /**
   * حساب الدرجات الخام لكل اختبار فرعي
   */
  static calculateRawScores(items) {
    const scores = {
      cognitive_verbal: 0,
      expressive_language: 0,
      receptive_language: 0,
      fine_motor: 0,
      gross_motor: 0,
      visual_motor_imitation: 0,
      affective_expression: 0,
      social_reciprocity: 0,
      motor_characteristics: 0,
      verbal_nonverbal: 0,
    };
    for (const item of items) {
      if (scores[item.subtest] !== undefined) {
        scores[item.subtest] += this.responseToScore(item.response);
      }
    }
    return scores;
  }

  /**
   * تحديد نقاط القوة والمهارات الناشئة ومناطق الاحتياج
   */
  static buildPerformanceProfile(items, rawScores) {
    const SUBTEST_NAMES = {
      cognitive_verbal: 'الإدراك اللفظي',
      expressive_language: 'اللغة التعبيرية',
      receptive_language: 'اللغة الاستقبالية',
      fine_motor: 'الحركة الدقيقة',
      gross_motor: 'الحركة الكبيرة',
      visual_motor_imitation: 'التقليد البصري الحركي',
      affective_expression: 'التعبير الوجداني',
      social_reciprocity: 'التبادل الاجتماعي',
      motor_characteristics: 'الخصائص الحركية',
      verbal_nonverbal: 'التواصل اللفظي وغير اللفظي',
    };

    // تحديد البنود الناشئة
    const emergingBySubtest = {};
    for (const item of items) {
      if (item.response === 'emerging') {
        if (!emergingBySubtest[item.subtest]) emergingBySubtest[item.subtest] = [];
        emergingBySubtest[item.subtest].push(item.item_description_ar);
      }
    }

    const subtestMaxScores = {
      cognitive_verbal: 30,
      expressive_language: 25,
      receptive_language: 20,
      fine_motor: 20,
      gross_motor: 15,
      visual_motor_imitation: 20,
      affective_expression: 15,
      social_reciprocity: 15,
      motor_characteristics: 10,
      verbal_nonverbal: 10,
    };

    const strengths = [];
    const emergingSkills = [];
    const areasOfNeed = [];

    for (const [subtest, maxScore] of Object.entries(subtestMaxScores)) {
      const raw = rawScores[subtest] || 0;
      const percentage = (raw / maxScore) * 100;

      if (percentage >= 75) {
        strengths.push({
          subtest,
          description_ar: `قوة في مجال ${SUBTEST_NAMES[subtest]} (${Math.round(percentage)}% من الدرجة الكلية)`,
        });
      } else if (percentage >= 40) {
        const activities = emergingBySubtest[subtest] || [];
        emergingSkills.push({
          subtest,
          description_ar: `مهارات ناشئة في ${SUBTEST_NAMES[subtest]} — تحتاج تدريباً مركزاً`,
          suggested_activities: activities.slice(0, 3),
        });
      } else {
        areasOfNeed.push({
          subtest,
          description_ar: `منطقة احتياج في ${SUBTEST_NAMES[subtest]} — تتطلب تدخلاً مباشراً`,
          priority: percentage < 20 ? 'high' : 'medium',
        });
      }
    }

    return { strengths, emerging_skills: emergingSkills, areas_of_need: areasOfNeed };
  }

  /**
   * توليد توصيات تعليمية تأهيلية
   */
  static generateEducationalRecommendations(performanceProfile) {
    const recommendations = [];

    const strategyMap = {
      cognitive_verbal: {
        strategy: 'استخدام التعلم البصري والمواد الملموسة، والتعليم المتدرج من البسيط للمركب',
        materials: ['بطاقات المفاهيم المصورة', 'مكعبات التصنيف', 'ألعاب الذاكرة'],
        home: ['ألعاب التصنيف والتطابق في البيت', 'قراءة القصص التفاعلية'],
      },
      expressive_language: {
        strategy: 'استراتيجية النمذجة اللغوية والتوسع التدريجي في الجمل',
        materials: ['بطاقات PECS', 'ألواح التواصل', 'تطبيقات النطق'],
        home: ['التعليق اللغوي على الأنشطة اليومية', 'تشجيع الطلب اللفظي'],
      },
      receptive_language: {
        strategy: 'التعليمات المبسطة مع دعم بصري، والتدريج التدريجي للأوامر',
        materials: ['لوحات التعليمات المصورة', 'بطاقات التسلسل'],
        home: ['اتباع التعليمات ذات الخطوتين في الروتين اليومي'],
      },
      fine_motor: {
        strategy: 'أنشطة علاج وظيفي مركزة على تقوية قبضة اليد والتآزر الدقيق',
        materials: ['صلصال العلاج', 'مقصات التعلم', 'خرز التعلم'],
        home: ['أنشطة اليدين الحرة (رسم، قص، تلوين)', 'تزرير الملابس'],
      },
      gross_motor: {
        strategy: 'برنامج علاج فيزيائي للتوازن والتنسيق',
        materials: ['كرة التوازن', 'زلاجات التعلم', 'ألعاب الحركة'],
        home: ['رياضة يومية منظمة', 'العاب الحركة في الهواء الطلق'],
      },
    };

    for (const area of performanceProfile.areas_of_need) {
      const map = strategyMap[area.subtest];
      if (map) {
        recommendations.push({
          area: area.subtest,
          teaching_strategy_ar: map.strategy,
          suggested_materials: map.materials,
          home_activities: map.home,
        });
      }
    }
    return recommendations;
  }

  /**
   * التصحيح الكامل لتقييم PEP-3
   */
  static async scoreAssessment(assessmentId) {
    const assessment = await PEP3Assessment.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const rawScores = this.calculateRawScores(assessment.items);
    const performanceProfile = this.buildPerformanceProfile(assessment.items, rawScores);
    const educationalRecommendations = this.generateEducationalRecommendations(performanceProfile);

    // أعمار تطورية تقريبية
    const developmentalAges = {};
    const ageMonths = assessment.chronological_age_months;
    for (const domain of [
      'cognitive_verbal',
      'expressive_language',
      'receptive_language',
      'fine_motor',
      'gross_motor',
      'visual_motor_imitation',
    ]) {
      developmentalAges[domain] = rawScoreToAgeEquivalent(
        rawScores[domain] * 2,
        domain.includes('motor') ? 'motor' : 'communication'
      );
    }

    await PEP3Assessment.findByIdAndUpdate(assessmentId, {
      raw_scores: rawScores,
      developmental_ages: developmentalAges,
      performance_profile: performanceProfile,
      educational_recommendations: educationalRecommendations,
      status: 'completed',
    });

    return { rawScores, developmentalAges, performanceProfile, educationalRecommendations };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ── 4. خدمة معالم التطور
// ═══════════════════════════════════════════════════════════════════

/**
 * معالم التطور المعيارية حسب العمر (مبنية على CDC & WHO)
 */
const DEVELOPMENTAL_MILESTONES_BANK = [
  // ── الحركة الكبيرة
  {
    domain: 'gross_motor',
    expected_age_months: 3,
    milestone_ar: 'رفع الرأس عند وضع البطن',
    milestone_en: 'Lifts head when on tummy',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 6,
    milestone_ar: 'الجلوس بمساعدة',
    milestone_en: 'Sits with support',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 9,
    milestone_ar: 'الجلوس بدون مساعدة',
    milestone_en: 'Sits without support',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 12,
    milestone_ar: 'الوقوف بمساعدة',
    milestone_en: 'Pulls to stand',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 15,
    milestone_ar: 'المشي باستقلالية',
    milestone_en: 'Walks independently',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 24,
    milestone_ar: 'صعود الدرج بمساعدة',
    milestone_en: 'Climbs stairs with help',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 36,
    milestone_ar: 'القفز بكلتا القدمين',
    milestone_en: 'Jumps with both feet',
  },
  {
    domain: 'gross_motor',
    expected_age_months: 48,
    milestone_ar: 'القفز على قدم واحدة',
    milestone_en: 'Hops on one foot',
  },
  // ── الحركة الدقيقة
  {
    domain: 'fine_motor',
    expected_age_months: 3,
    milestone_ar: 'إمساك الأشياء بشكل انعكاسي',
    milestone_en: 'Reflexive grasp',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 6,
    milestone_ar: 'مد اليد للأشياء ومسكها',
    milestone_en: 'Reaches and grasps objects',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 9,
    milestone_ar: 'قبضة الإبهام والسبابة (القبضة الدقيقة)',
    milestone_en: 'Pincer grasp',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 12,
    milestone_ar: 'إسقاط الأشياء في وعاء',
    milestone_en: 'Drops objects into container',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 18,
    milestone_ar: 'تراص مكعبين',
    milestone_en: 'Stacks 2 blocks',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 24,
    milestone_ar: 'تراص 6 مكعبات',
    milestone_en: 'Stacks 6 blocks',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 36,
    milestone_ar: 'رسم خط أفقي وعمودي',
    milestone_en: 'Draws horizontal/vertical lines',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 48,
    milestone_ar: 'رسم دائرة',
    milestone_en: 'Draws a circle',
  },
  {
    domain: 'fine_motor',
    expected_age_months: 60,
    milestone_ar: 'رسم مربع وإنسان',
    milestone_en: 'Draws square and person',
  },
  // ── اللغة الاستقبالية
  {
    domain: 'language_receptive',
    expected_age_months: 6,
    milestone_ar: 'الاستجابة للاسم',
    milestone_en: 'Responds to name',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 9,
    milestone_ar: 'فهم "لا"',
    milestone_en: 'Understands "no"',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 12,
    milestone_ar: 'اتباع تعليمة بسيطة مع إيماءة',
    milestone_en: 'Follows 1-step directions with gesture',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 18,
    milestone_ar: 'الإشارة لأجزاء الجسم عند الطلب',
    milestone_en: 'Points to body parts',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 24,
    milestone_ar: 'اتباع تعليمتين متتاليتين',
    milestone_en: 'Follows 2-step directions',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 36,
    milestone_ar: 'فهم المفاهيم: كبير/صغير، داخل/خارج',
    milestone_en: 'Understands concepts: big/small, in/out',
  },
  {
    domain: 'language_receptive',
    expected_age_months: 48,
    milestone_ar: 'اتباع ثلاث تعليمات متتالية',
    milestone_en: 'Follows 3-step directions',
  },
  // ── اللغة التعبيرية
  {
    domain: 'language_expressive',
    expected_age_months: 6,
    milestone_ar: 'مناغاة (با با، ما ما)',
    milestone_en: 'Babbles (ba ba, ma ma)',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 12,
    milestone_ar: 'أول كلمة حقيقية',
    milestone_en: 'First real word',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 18,
    milestone_ar: '5-10 كلمات وظيفية',
    milestone_en: '5-10 functional words',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 24,
    milestone_ar: 'جمل من كلمتين',
    milestone_en: '2-word phrases',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 36,
    milestone_ar: 'جمل من 3-4 كلمات',
    milestone_en: '3-4 word sentences',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 48,
    milestone_ar: 'يروي قصة بسيطة',
    milestone_en: 'Tells a simple story',
  },
  {
    domain: 'language_expressive',
    expected_age_months: 60,
    milestone_ar: 'يتحدث بوضوح يفهمه الغرباء',
    milestone_en: 'Speech understood by strangers',
  },
  // ── الإدراك
  {
    domain: 'cognitive',
    expected_age_months: 6,
    milestone_ar: 'البحث عن لعبة محجوبة جزئياً',
    milestone_en: 'Searches for partially hidden object',
  },
  {
    domain: 'cognitive',
    expected_age_months: 12,
    milestone_ar: 'البحث عن لعبة مخفية تماماً',
    milestone_en: 'Finds fully hidden object',
  },
  {
    domain: 'cognitive',
    expected_age_months: 18,
    milestone_ar: 'اللعب التخيلي البسيط',
    milestone_en: 'Simple pretend play',
  },
  {
    domain: 'cognitive',
    expected_age_months: 24,
    milestone_ar: 'تصنيف الأشياء حسب الشكل واللون',
    milestone_en: 'Sorts by shape and color',
  },
  {
    domain: 'cognitive',
    expected_age_months: 36,
    milestone_ar: 'العد حتى 10',
    milestone_en: 'Counts to 10',
  },
  {
    domain: 'cognitive',
    expected_age_months: 48,
    milestone_ar: 'يعرف الأرقام 1-10',
    milestone_en: 'Recognizes numbers 1-10',
  },
  {
    domain: 'cognitive',
    expected_age_months: 60,
    milestone_ar: 'يعرف الحروف الأبجدية',
    milestone_en: 'Knows alphabet',
  },
  // ── الاجتماعي العاطفي
  {
    domain: 'social_emotional',
    expected_age_months: 2,
    milestone_ar: 'الابتسامة الاجتماعية',
    milestone_en: 'Social smile',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 6,
    milestone_ar: 'الابتسامة التلقائية للأشخاص المألوفين',
    milestone_en: 'Smiles spontaneously at familiar people',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 9,
    milestone_ar: 'الخوف من الغرباء',
    milestone_en: 'Stranger anxiety',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 12,
    milestone_ar: 'الانتباه المشترك',
    milestone_en: 'Joint attention',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 18,
    milestone_ar: 'اللعب الموازي',
    milestone_en: 'Parallel play',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 36,
    milestone_ar: 'اللعب التعاوني مع الأقران',
    milestone_en: 'Cooperative play with peers',
  },
  {
    domain: 'social_emotional',
    expected_age_months: 48,
    milestone_ar: 'المشاركة وأخذ الدور',
    milestone_en: 'Sharing and turn-taking',
  },
  // ── العناية بالذات
  {
    domain: 'self_care',
    expected_age_months: 12,
    milestone_ar: 'يمسك الكأس بيديه',
    milestone_en: 'Holds cup with both hands',
  },
  {
    domain: 'self_care',
    expected_age_months: 18,
    milestone_ar: 'يستخدم الملعقة (مع سكب)',
    milestone_en: 'Uses spoon (with spilling)',
  },
  {
    domain: 'self_care',
    expected_age_months: 24,
    milestone_ar: 'يخلع الملابس البسيطة',
    milestone_en: 'Removes simple clothing',
  },
  {
    domain: 'self_care',
    expected_age_months: 30,
    milestone_ar: 'يشير لاستخدام المرحاض',
    milestone_en: 'Indicates toilet needs',
  },
  {
    domain: 'self_care',
    expected_age_months: 36,
    milestone_ar: 'التحكم في الإخراج نهاراً',
    milestone_en: 'Daytime toilet training',
  },
  {
    domain: 'self_care',
    expected_age_months: 48,
    milestone_ar: 'يغسل يديه وحده',
    milestone_en: 'Washes hands independently',
  },
  {
    domain: 'self_care',
    expected_age_months: 60,
    milestone_ar: 'يلبس ملابسه مع بعض المساعدة',
    milestone_en: 'Dresses with minimal help',
  },
];

class DevelopmentalMilestonesService {
  /**
   * إنشاء سجل معالم التطور الأساسي لمستفيد جديد
   */
  static createInitialMilestones() {
    return DEVELOPMENTAL_MILESTONES_BANK.map(m => ({
      ...m,
      status: 'not_assessed',
    }));
  }

  /**
   * حساب ملخص التطور ودرجة النمو التطوري
   */
  static calculateDevelopmentalSummary(milestones, chronologicalAgeMonths) {
    const domains = [
      'gross_motor',
      'fine_motor',
      'language_receptive',
      'language_expressive',
      'cognitive',
      'social_emotional',
      'self_care',
      'play',
    ];
    const domainSummary = {};

    for (const domain of domains) {
      const domainMilestones = milestones.filter(m => m.domain === domain);
      const achievedAges = domainMilestones
        .filter(m => m.status === 'achieved')
        .map(m => m.expected_age_months);

      const highestAchievedAge = achievedAges.length > 0 ? Math.max(...achievedAges) : 0;
      domainSummary[domain] = highestAchievedAge;
    }

    const developmentalAgeMonths = Math.round(
      Object.values(domainSummary).reduce((s, v) => s + v, 0) / domains.length
    );

    const dq =
      chronologicalAgeMonths > 0
        ? Math.round((developmentalAgeMonths / chronologicalAgeMonths) * 100)
        : 0;

    let profileDescription = '';
    if (dq >= 90) profileDescription = 'تطور طبيعي ضمن المعدل المتوقع';
    else if (dq >= 75) profileDescription = 'تأخر بسيط في بعض المجالات التطورية';
    else if (dq >= 50) profileDescription = 'تأخر متوسط يستدعي تدخلاً تأهيلياً';
    else profileDescription = 'تأخر شديد يستدعي تدخلاً مكثفاً وشاملاً';

    const domainsOnTrack = [];
    const domainsDelayed = [];

    for (const domain of domains) {
      const devAge = domainSummary[domain];
      const diff = chronologicalAgeMonths - devAge;
      if (diff <= 6) {
        domainsOnTrack.push(domain);
      } else {
        let severity;
        if (diff <= 12) severity = 'mild';
        else if (diff <= 24) severity = 'moderate';
        else severity = 'severe';
        domainsDelayed.push({ domain, delay_months: diff, severity });
      }
    }

    return {
      overall_developmental_age_months: developmentalAgeMonths,
      developmental_quotient: dq,
      profile_description_ar: profileDescription,
      domains_on_track: domainsOnTrack,
      domains_delayed: domainsDelayed,
    };
  }

  /**
   * تحديث ملخص معالم التطور وإضافة لقطة تقدم
   */
  static async updateAndSnapshot(beneficiaryId, chronologicalAgeMonths) {
    const record = await DevelopmentalMilestones.findOne({ beneficiary_id: beneficiaryId });
    if (!record) throw new Error('سجل معالم التطور غير موجود');

    const summary = this.calculateDevelopmentalSummary(record.milestones, chronologicalAgeMonths);

    // إضافة لقطة تقدم جديدة
    const domainsScores = {};
    for (const domain of [
      'gross_motor',
      'fine_motor',
      'language_receptive',
      'language_expressive',
      'cognitive',
      'social_emotional',
      'self_care',
      'play',
    ]) {
      const achieved = record.milestones.filter(
        m => m.domain === domain && m.status === 'achieved'
      ).length;
      const total = record.milestones.filter(m => m.domain === domain).length;
      domainsScores[domain] = total > 0 ? Math.round((achieved / total) * 100) : 0;
    }

    const overallScore = Math.round(Object.values(domainsScores).reduce((s, v) => s + v, 0) / 8);

    await DevelopmentalMilestones.findByIdAndUpdate(record._id, {
      developmental_summary: summary,
      last_updated: new Date(),
      $push: {
        progress_snapshots: {
          snapshot_date: new Date(),
          domains_scores: domainsScores,
          overall_score: overallScore,
        },
      },
    });

    return { summary, domainsScores, overallScore };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ── 5. خدمة سجل تاريخ التقييمات
// ═══════════════════════════════════════════════════════════════════
class AssessmentHistoryService {
  static async recordAssessment(data) {
    const history = new AssessmentHistory({
      ...data,
      next_assessment_due: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 أشهر افتراضياً
    });
    return await history.save();
  }

  static async getBeneficiaryHistory(beneficiaryId) {
    return await AssessmentHistory.find({ beneficiary_id: beneficiaryId })
      .sort({ assessment_date: -1 })
      .populate('assessor_id', 'name role');
  }

  static async getUpcomingAssessments(branchId, daysAhead = 30) {
    const future = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    return await AssessmentHistory.find({
      next_assessment_due: { $lte: future, $gte: new Date() },
    })
      .populate('beneficiary_id', 'name disability_type')
      .populate('assessor_id', 'name')
      .sort({ next_assessment_due: 1 });
  }
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════
module.exports = {
  VABS3Service,
  CARS2Service,
  PEP3Service,
  DevelopmentalMilestonesService,
  AssessmentHistoryService,
  DEVELOPMENTAL_MILESTONES_BANK,
};
