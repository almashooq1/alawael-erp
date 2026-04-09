/**
 * smart-assessment-engine.js
 * ═══════════════════════════════════════════════════════════════
 * محرك التقييم الذكي — Smart Clinical Assessment Engine
 *
 * المهام:
 *   1. التصحيح التلقائي لجميع المقاييس مع الجداول المعيارية
 *   2. حساب الدرجات المعيارية والرتب المئينية والأعمار المعادلة
 *   3. تحليل الأنماط والعلاقات بين المجالات
 *   4. إطلاق التنبيهات السريرية (علامات الإنذار)
 *   5. مقارنة التقييمات المتعاقبة
 *   6. تصنيف الشدة والتوصيات الأولية
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

// ─── Normative Tables (مقتطفات من الجداول المعيارية) ──────────

/**
 * M-CHAT-R/F Scoring
 */
const MCHAT_CRITICAL_ITEMS = [2, 5, 9, 12, 15, 17, 18, 20]; // adjusted to 1-20 index
const MCHAT_RISK_MAP = {
  // بعض البنود الإجابة "لا" تعني خطر، وأخرى "نعم" تعني خطر
  // البنود العكسية (نعم = خطر)
  reversed_items: [2, 5, 12],
  // البنود العادية (لا = خطر)
  normal_items: [1, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20],
};

/**
 * CARS-2 Normative Data
 */
const CARS2_SCORING = {
  ST: {
    // Standard Form
    no_autism: { min: 15, max: 29.5 },
    mild_moderate: { min: 30, max: 36.5 },
    severe: { min: 37, max: 60 },
  },
  HF: {
    // High Functioning
    no_autism: { min: 15, max: 27.5 },
    mild_moderate: { min: 28, max: 34 },
    severe: { min: 34.5, max: 60 },
  },
};

/**
 * Vineland-3 Standard Score Levels (M=100, SD=15)
 */
const VINELAND_LEVELS = {
  high: { min: 130, max: 999, label_ar: 'مرتفع', color: '#4CAF50' },
  moderately_high: { min: 115, max: 129, label_ar: 'مرتفع نسبياً', color: '#8BC34A' },
  adequate: { min: 86, max: 114, label_ar: 'ملائم', color: '#2196F3' },
  moderately_low: { min: 71, max: 85, label_ar: 'منخفض نسبياً', color: '#FF9800' },
  low: { min: 0, max: 70, label_ar: 'منخفض', color: '#F44336' },
};

/**
 * Approximate normative conversions for standard scores (M=100, SD=15)
 * Maps Z-score ranges to percentile ranks
 */
const Z_TO_PERCENTILE = [
  { z: -3.0, pct: 0.1 },
  { z: -2.5, pct: 0.6 },
  { z: -2.0, pct: 2.3 },
  { z: -1.5, pct: 6.7 },
  { z: -1.0, pct: 15.9 },
  { z: -0.5, pct: 30.9 },
  { z: 0.0, pct: 50.0 },
  { z: 0.5, pct: 69.1 },
  { z: 1.0, pct: 84.1 },
  { z: 1.5, pct: 93.3 },
  { z: 2.0, pct: 97.7 },
  { z: 2.5, pct: 99.4 },
  { z: 3.0, pct: 99.9 },
];

/**
 * BRIEF-2 T-Score Classification
 */
const BRIEF2_CLASSIFICATION = {
  normal: { min: 0, max: 59, label_ar: 'ضمن الحدود الطبيعية' },
  mildly_elevated: { min: 60, max: 64, label_ar: 'مرتفع قليلاً' },
  clinically_elevated: { min: 65, max: 69, label_ar: 'مرتفع سريرياً' },
  highly_elevated: { min: 70, max: 999, label_ar: 'مرتفع جداً (دلالة سريرية)' },
};

/**
 * SRS-2 T-Score Severity
 */
const SRS2_SEVERITY = {
  within_normal: { min: 0, max: 59, label_ar: 'ضمن الحدود الطبيعية' },
  mild: { min: 60, max: 65, label_ar: 'صعوبات خفيفة' },
  moderate: { min: 66, max: 75, label_ar: 'صعوبات متوسطة' },
  severe: { min: 76, max: 999, label_ar: 'صعوبات شديدة' },
};

/**
 * Portage developmental milestones per age band (count per domain)
 */
const PORTAGE_MILESTONES_COUNT = {
  infant_stimulation: { '0-1': 45 },
  socialization: { '0-1': 12, '1-2': 13, '2-3': 14, '3-4': 14, '4-5': 15, '5-6': 14 },
  language: { '0-1': 15, '1-2': 20, '2-3': 22, '3-4': 22, '4-5': 23, '5-6': 23 },
  self_help: { '0-1': 14, '1-2': 16, '2-3': 18, '3-4': 20, '4-5': 20, '5-6': 12 },
  cognitive: { '0-1': 14, '1-2': 18, '2-3': 20, '3-4': 20, '4-5': 17, '5-6': 18 },
  motor: { '0-1': 18, '1-2': 24, '2-3': 16, '3-4': 13, '4-5': 15, '5-6': 14 },
};

/**
 * Zarit Burden Interpretation
 */
const ZARIT_LEVELS = {
  little_or_no: { min: 0, max: 20, label_ar: 'عبء قليل أو معدوم' },
  mild_moderate: { min: 21, max: 40, label_ar: 'عبء خفيف إلى متوسط' },
  moderate_severe: { min: 41, max: 60, label_ar: 'عبء متوسط إلى شديد' },
  severe: { min: 61, max: 88, label_ar: 'عبء شديد' },
};

/**
 * Sensory Profile 2 — Dunn's Quadrant Classification
 * (approximate normative cutoffs for child form)
 */
const SENSORY_QUADRANT_NORMS = {
  seeking: {
    much_less: [0, 27],
    less: [28, 34],
    just_like: [35, 55],
    more: [56, 62],
    much_more: [63, 100],
  },
  avoiding: {
    much_less: [0, 22],
    less: [23, 29],
    just_like: [30, 49],
    more: [50, 56],
    much_more: [57, 100],
  },
  sensitivity: {
    much_less: [0, 20],
    less: [21, 27],
    just_like: [28, 47],
    more: [48, 54],
    much_more: [55, 100],
  },
  registration: {
    much_less: [0, 24],
    less: [25, 31],
    just_like: [32, 52],
    more: [53, 59],
    much_more: [60, 100],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════════

class SmartAssessmentEngine {
  // ──────────────────────────────────────────────────────────────
  // M-CHAT-R/F Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreMCHAT(items) {
    if (!items || items.length !== 20) throw new Error('يجب تقييم 20 بنداً');

    let riskCount = 0;
    let criticalFailed = 0;
    const scoredItems = items.map((item, idx) => {
      const num = idx + 1;
      const isReversed = MCHAT_RISK_MAP.reversed_items.includes(num);
      // For reversed items: "yes" = at risk; For normal: "no" = at risk
      const atRisk = isReversed ? item.response === true : item.response === false;
      if (atRisk) {
        riskCount++;
        if (MCHAT_CRITICAL_ITEMS.includes(num)) criticalFailed++;
      }
      return {
        ...item,
        item_number: num,
        is_at_risk: atRisk,
        is_critical: MCHAT_CRITICAL_ITEMS.includes(num),
      };
    });

    let risk_level, risk_level_ar, referral_type, urgency;
    if (riskCount <= 2) {
      risk_level = 'low';
      risk_level_ar = 'خطر منخفض';
      referral_type = 'none';
      urgency = 'routine';
    } else if (riskCount <= 7) {
      risk_level = 'medium';
      risk_level_ar = 'خطر متوسط — يُنصح بإجراء المتابعة R/F';
      referral_type = 'developmental_eval';
      urgency = 'priority';
    } else {
      risk_level = 'high';
      risk_level_ar = 'خطر مرتفع — تحويل فوري للتقييم الشامل';
      referral_type = 'comprehensive';
      urgency = 'urgent';
    }

    const suggested_assessments = [];
    if (risk_level !== 'low') {
      suggested_assessments.push('ADOS-2', 'ADI-R');
      if (riskCount >= 5) suggested_assessments.push('Vineland-3', 'Bayley-4');
    }

    return {
      items: scoredItems,
      total_risk_score: riskCount,
      critical_items_failed: criticalFailed,
      risk_level,
      risk_level_ar,
      auto_recommendations: {
        referral_needed: riskCount >= 3,
        referral_type,
        urgency,
        suggested_assessments,
        family_guidance_ar: this._getMCHATGuidance(risk_level),
      },
    };
  }

  static _getMCHATGuidance(level) {
    const guidance = {
      low: 'نتائج الفحص ضمن الحدود الطبيعية. يُنصح بإعادة الفحص عند عمر 24 شهراً إذا لم يتم بعد.',
      medium:
        'يُنصح بإجراء مقابلة المتابعة (Follow-Up Interview) مع الوالدين لتوضيح الإجابات. في حال استمرار النتيجة المرتفعة، يُحوّل للتقييم النمائي الشامل.',
      high: 'يجب التحويل الفوري لتقييم شامل (تشخيصي + نمائي). لا تنتظر المتابعة — ابدأ التدخل المبكر فوراً مع استمرار عملية التشخيص بالتوازي.',
    };
    return guidance[level] || '';
  }

  // ──────────────────────────────────────────────────────────────
  // CARS-2 Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreCARS2(items, formType = 'ST') {
    if (!items || items.length !== 15) throw new Error('يجب تقييم 15 بنداً');

    const totalScore = items.reduce((sum, item) => sum + item.score, 0);
    const cutoffs = CARS2_SCORING[formType] || CARS2_SCORING.ST;

    let classification, classification_ar;
    if (totalScore <= cutoffs.no_autism.max) {
      classification = 'no_autism';
      classification_ar = 'لا يوجد توحد — ضمن الحدود الطبيعية';
    } else if (totalScore <= cutoffs.mild_moderate.max) {
      classification = 'mild_moderate';
      classification_ar = 'أعراض توحد خفيفة إلى متوسطة';
    } else {
      classification = 'severe';
      classification_ar = 'أعراض توحد شديدة';
    }

    // Pattern analysis — group items by domain
    const sensoryItems = [1, 4, 9].map(n => items.find(i => i.item_number === n)?.score || 0);
    const socialItems = [2, 3, 6, 11].map(n => items.find(i => i.item_number === n)?.score || 0);
    const behavioralItems = [5, 8, 13, 14].map(
      n => items.find(i => i.item_number === n)?.score || 0
    );
    const commItems = [7, 10, 12].map(n => items.find(i => i.item_number === n)?.score || 0);

    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

    const highestItems = [...items]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(i => ({ item_number: i.item_number, item_name_ar: i.item_name_ar, score: i.score }));

    return {
      total_score: totalScore,
      classification,
      classification_ar,
      pattern_analysis: {
        sensory_items_avg: Math.round(avg(sensoryItems) * 100) / 100,
        social_items_avg: Math.round(avg(socialItems) * 100) / 100,
        behavioral_items_avg: Math.round(avg(behavioralItems) * 100) / 100,
        communication_items_avg: Math.round(avg(commItems) * 100) / 100,
        highest_concern_items: highestItems,
        profile_description_ar: this._describeCARS2Profile(
          avg(sensoryItems),
          avg(socialItems),
          avg(behavioralItems),
          avg(commItems)
        ),
      },
      recommendations: this._generateCARS2Recommendations(classification, {
        sensory: avg(sensoryItems),
        social: avg(socialItems),
        behavioral: avg(behavioralItems),
        communication: avg(commItems),
      }),
    };
  }

  static _describeCARS2Profile(sensory, social, behavioral, communication) {
    const areas = [
      { name: 'الحسية', score: sensory },
      { name: 'الاجتماعية', score: social },
      { name: 'السلوكية', score: behavioral },
      { name: 'التواصلية', score: communication },
    ].sort((a, b) => b.score - a.score);

    let desc = `أكثر المجالات تأثراً: ${areas[0].name} (${areas[0].score.toFixed(1)})`;
    if (areas[0].score >= 3) desc += ` — يحتاج تدخل مكثف`;
    desc += `. أقل المجالات تأثراً: ${areas[areas.length - 1].name} (${areas[areas.length - 1].score.toFixed(1)})`;
    return desc;
  }

  static _generateCARS2Recommendations(classification, domainAvgs) {
    const recs = {
      diagnosis_recommendation: '',
      intervention_priority_areas: [],
      suggested_assessments: [],
      family_guidance: '',
    };

    if (classification === 'no_autism') {
      recs.diagnosis_recommendation =
        'النتائج لا تدعم تشخيص اضطراب طيف التوحد. يُنصح بإعادة التقييم بعد 6 أشهر إذا استمرت المخاوف.';
      recs.family_guidance =
        'النتائج مطمئنة. استمروا في تتبع النمو واستشيروا المختص إذا ظهرت مخاوف جديدة.';
    } else if (classification === 'mild_moderate') {
      recs.diagnosis_recommendation =
        'النتائج تتوافق مع أعراض توحد خفيفة-متوسطة. يُنصح بإجراء ADOS-2 و ADI-R للتأكيد التشخيصي.';
      recs.suggested_assessments = ['ADOS-2', 'Vineland-3', 'PEP-3'];
      recs.family_guidance =
        'يُنصح ببدء برنامج تدخل مبكر يشمل العلاج السلوكي (ABA) والتواصل. سنقوم بوضع خطة تأهيلية فردية.';
    } else {
      recs.diagnosis_recommendation =
        'النتائج تشير لأعراض توحد شديدة. يجب البدء الفوري في التدخل المكثف مع استكمال التقييم التشخيصي.';
      recs.suggested_assessments = ['ADOS-2', 'ADI-R', 'Vineland-3', 'Stanford-Binet 5'];
      recs.family_guidance =
        'يحتاج طفلكم لبرنامج تأهيلي مكثف. سنبدأ فوراً خطة تدخل شاملة تشمل ABA وعلاج النطق والعلاج الوظيفي.';
    }

    // Priority areas based on domain scores
    const threshold = 2.5;
    if (domainAvgs.social >= threshold)
      recs.intervention_priority_areas.push('مهارات اجتماعية وتفاعل');
    if (domainAvgs.communication >= threshold) recs.intervention_priority_areas.push('تواصل ولغة');
    if (domainAvgs.sensory >= threshold)
      recs.intervention_priority_areas.push('معالجة حسية وتكامل حسي');
    if (domainAvgs.behavioral >= threshold)
      recs.intervention_priority_areas.push('سلوك تكيفي وتعديل سلوك');

    return recs;
  }

  // ──────────────────────────────────────────────────────────────
  // Vineland-3 Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreVineland3(rawScores, chronologicalAgeMonths) {
    // Convert raw scores to standard scores using approximate normative data
    // In production, this would use full normative tables
    const domains = ['communication', 'daily_living', 'socialization', 'motor'];
    const result = {
      standard_scores: {},
      percentile_ranks: {},
      adaptive_levels: {},
      age_equivalents: {},
    };

    let compositeSum = 0;
    let domainCount = 0;

    for (const domain of domains) {
      const raw = rawScores[domain];
      if (raw == null) continue;

      // Approximate standard score calculation
      // Real implementation needs full normative tables by age
      const expectedRaw = this._getExpectedVinelandRaw(domain, chronologicalAgeMonths);
      const stdScore = this._rawToStandardScore(raw, expectedRaw, 15);
      const clampedStd = Math.max(20, Math.min(160, stdScore));

      result.standard_scores[domain] = clampedStd;
      result.percentile_ranks[domain] = this._standardToPercentile(clampedStd, 100, 15);
      result.adaptive_levels[domain] = this._getVinelandLevel(clampedStd);
      result.age_equivalents[domain] = this._estimateAgeEquivalent(
        raw,
        domain,
        chronologicalAgeMonths
      );

      compositeSum += clampedStd;
      domainCount++;
    }

    if (domainCount > 0) {
      const compositeScore = Math.round(compositeSum / domainCount);
      result.standard_scores.adaptive_behavior_composite = compositeScore;
      result.percentile_ranks.composite = this._standardToPercentile(compositeScore, 100, 15);
    }

    // Auto-recommendations
    result.auto_recommendations = this._generateVinelandRecommendations(result);

    return result;
  }

  static _getExpectedVinelandRaw(domain, ageMonths) {
    // Simplified expected raw by age — real implementation uses normative tables
    const rates = {
      communication: 2.5,
      daily_living: 2.2,
      socialization: 2.0,
      motor: 1.8,
    };
    return Math.round((ageMonths / 12) * (rates[domain] || 2.0) * 10);
  }

  static _rawToStandardScore(raw, expectedRaw, sd) {
    const zScore = (raw - expectedRaw) / (expectedRaw * 0.15 || 1);
    return Math.round(100 + zScore * sd);
  }

  static _standardToPercentile(stdScore, mean, sd) {
    const z = (stdScore - mean) / sd;
    // Find closest Z in table
    let closest = Z_TO_PERCENTILE[0];
    for (const entry of Z_TO_PERCENTILE) {
      if (Math.abs(entry.z - z) < Math.abs(closest.z - z)) closest = entry;
    }
    return Math.round(closest.pct * 10) / 10;
  }

  static _getVinelandLevel(stdScore) {
    for (const [level, range] of Object.entries(VINELAND_LEVELS)) {
      if (stdScore >= range.min && stdScore <= range.max) return level;
    }
    return 'low';
  }

  static _estimateAgeEquivalent(raw, domain, chronologicalAge) {
    const expectedRaw = this._getExpectedVinelandRaw(domain, chronologicalAge);
    const ratio = raw / (expectedRaw || 1);
    const eqMonths = Math.round(chronologicalAge * ratio);
    const years = Math.floor(eqMonths / 12);
    const months = eqMonths % 12;
    return `${years} سنة ${months > 0 ? `و ${months} شهر` : ''}`.trim();
  }

  static _generateVinelandRecommendations(result) {
    const recs = [];
    const scores = result.standard_scores;
    const priorities = { high: [], medium: [], low: [] };

    for (const [domain, score] of Object.entries(scores)) {
      if (domain === 'adaptive_behavior_composite') continue;
      const domainNames = {
        communication: 'التواصل',
        daily_living: 'الحياة اليومية',
        socialization: 'التنشئة الاجتماعية',
        motor: 'المهارات الحركية',
      };
      const name = domainNames[domain] || domain;

      if (score <= 70) {
        priorities.high.push(name);
        recs.push({
          domain,
          priority: 'high',
          recommendation_ar: `${name}: أداء منخفض بشكل ملحوظ (${score}). يتطلب تدخلاً مكثفاً وأهدافاً يومية مع تعديل بيئي شامل.`,
          suggested_goals: this._suggestVinelandGoals(domain, 'low'),
        });
      } else if (score <= 85) {
        priorities.medium.push(name);
        recs.push({
          domain,
          priority: 'medium',
          recommendation_ar: `${name}: أداء منخفض نسبياً (${score}). يحتاج لبرنامج تأهيلي منظم مع مراقبة دورية.`,
          suggested_goals: this._suggestVinelandGoals(domain, 'moderately_low'),
        });
      } else {
        priorities.low.push(name);
      }
    }

    return recs;
  }

  static _suggestVinelandGoals(domain, level) {
    const goalBank = {
      communication: {
        low: [
          'زيادة المفردات التعبيرية إلى 50 كلمة خلال 3 أشهر',
          'استخدام جمل من كلمتين بنسبة 80%',
          'الاستجابة للتعليمات البسيطة خلال 5 ثوانٍ',
        ],
        moderately_low: [
          'تحسين المحادثة التبادلية (3 تبادلات)',
          'استخدام أسئلة بمعدل 5 أسئلة يومياً',
          'فهم التعليمات المكونة من خطوتين',
        ],
      },
      daily_living: {
        low: [
          'ارتداء الملابس بمساعدة جزئية خلال 10 دقائق',
          'غسل اليدين باستقلالية',
          'استخدام الملعقة والشوكة بشكل وظيفي',
        ],
        moderately_low: [
          'ارتداء الملابس باستقلالية كاملة',
          'تحضير وجبة بسيطة بإشراف',
          'استخدام المرحاض باستقلالية كاملة',
        ],
      },
      socialization: {
        low: [
          'الاستجابة لاسمه خلال 3 ثوانٍ بنسبة 80%',
          'المشاركة في لعب تبادلي مع قرين واحد',
          'التعبير عن المشاعر الأساسية (سعيد/حزين/غاضب)',
        ],
        moderately_low: [
          'المشاركة في نشاط جماعي لمدة 15 دقيقة',
          'اتباع القواعد الاجتماعية(الانتظار بالدور)',
          'تكوين صداقة واحدة على الأقل',
        ],
      },
      motor: {
        low: [
          'المشي باستقلالية على سطح مستوٍ',
          'إمساك القلم بقبضة ثلاثية',
          'رمي الكرة باتجاه هدف من مسافة 2 متر',
        ],
        moderately_low: [
          'صعود ونزول الدرج بالتناوب',
          'القص بالمقص على خط مستقيم',
          'ركض مسافة 10 أمتار دون سقوط',
        ],
      },
    };
    return goalBank[domain]?.[level] || [];
  }

  // ──────────────────────────────────────────────────────────────
  // BRIEF-2 Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreBRIEF2(items) {
    const scales = {};
    const scaleItems = {};

    // Group items by scale
    for (const item of items) {
      if (!scaleItems[item.scale]) scaleItems[item.scale] = [];
      scaleItems[item.scale].push(item.response);
    }

    // Calculate raw scores per scale
    for (const [scale, responses] of Object.entries(scaleItems)) {
      const raw = responses.reduce((sum, r) => sum + r, 0);
      // Convert to T-score (approximate — real needs normative table by age/gender)
      const scaleMean = responses.length * 1.5; // expected mean ~1.5 per item
      const scaleSD = responses.length * 0.4;
      const z = (raw - scaleMean) / (scaleSD || 1);
      const tScore = Math.round(50 + z * 10);
      const clampedT = Math.max(30, Math.min(90, tScore));
      const percentile = this._tScoreToPercentile(clampedT);

      scales[scale] = {
        raw,
        t_score: clampedT,
        percentile,
        classification: this._classifyBRIEF2(clampedT),
      };
    }

    // Composite indexes
    const bri = this._compositeT([scales.inhibit, scales.self_monitor]);
    const eri = this._compositeT([scales.shift, scales.emotional_control]);
    const cri = this._compositeT([
      scales.initiate,
      scales.working_memory,
      scales.plan_organize,
      scales.task_monitor,
      scales.organization_materials,
    ]);
    const allScales = Object.values(scales);
    const gec = this._compositeT(allScales);

    const composites = {
      behavioral_regulation_index: { ...bri, classification: this._classifyBRIEF2(bri.t_score) },
      emotion_regulation_index: { ...eri, classification: this._classifyBRIEF2(eri.t_score) },
      cognitive_regulation_index: { ...cri, classification: this._classifyBRIEF2(cri.t_score) },
      global_executive_composite: { ...gec, classification: this._classifyBRIEF2(gec.t_score) },
    };

    // Clinical interpretation
    const concerns = [];
    const strengths = [];
    for (const [name, data] of Object.entries(scales)) {
      const nameMap = {
        inhibit: 'التثبيط',
        self_monitor: 'المراقبة الذاتية',
        shift: 'المرونة',
        emotional_control: 'التحكم الانفعالي',
        initiate: 'المبادرة',
        working_memory: 'الذاكرة العاملة',
        plan_organize: 'التخطيط والتنظيم',
        task_monitor: 'مراقبة المهام',
        organization_materials: 'تنظيم المواد',
      };
      const arabicName = nameMap[name] || name;
      if (data.t_score >= 65) concerns.push(`${arabicName} (T=${data.t_score})`);
      else if (data.t_score <= 45) strengths.push(`${arabicName} (T=${data.t_score})`);
    }

    return {
      scale_scores: scales,
      composite_scores: composites,
      clinical_interpretation: {
        primary_concerns: concerns,
        strengths,
        intervention_recommendations: this._briefInterventions(scales),
      },
    };
  }

  static _compositeT(scaleArray) {
    const valid = scaleArray.filter(s => s && s.t_score != null);
    if (!valid.length) return { t_score: 50, percentile: 50 };
    const avg = valid.reduce((sum, s) => sum + s.t_score, 0) / valid.length;
    const t = Math.round(avg);
    return { t_score: t, percentile: this._tScoreToPercentile(t) };
  }

  static _tScoreToPercentile(t) {
    const z = (t - 50) / 10;
    let closest = Z_TO_PERCENTILE[0];
    for (const entry of Z_TO_PERCENTILE) {
      if (Math.abs(entry.z - z) < Math.abs(closest.z - z)) closest = entry;
    }
    return Math.round(closest.pct * 10) / 10;
  }

  static _classifyBRIEF2(tScore) {
    for (const [level, range] of Object.entries(BRIEF2_CLASSIFICATION)) {
      if (tScore >= range.min && tScore <= range.max) return level;
    }
    return 'normal';
  }

  static _briefInterventions(scales) {
    const interventions = [];
    if (scales.working_memory?.t_score >= 65) {
      interventions.push('تدريب الذاكرة العاملة باستخدام ألعاب الذاكرة والتكرار البصري');
      interventions.push('تقليل المدخلات اللفظية — تعليمات قصيرة ومرئية');
    }
    if (scales.inhibit?.t_score >= 65) {
      interventions.push('برنامج تدريب التحكم في الاندفاعية (Stop-Think-Act)');
      interventions.push('استخدام إشارات بصرية للتوقف قبل الاستجابة');
    }
    if (scales.shift?.t_score >= 65) {
      interventions.push('تحضير مسبق للانتقالات باستخدام جداول بصرية');
      interventions.push('تدريب المرونة المعرفية بأنشطة متدرجة');
    }
    if (scales.emotional_control?.t_score >= 65) {
      interventions.push('تدريب التنظيم الانفعالي (مناطق التنظيم Zones of Regulation)');
      interventions.push('استراتيجيات التهدئة الذاتية (تنفس عميق، عد تنازلي)');
    }
    if (scales.plan_organize?.t_score >= 65) {
      interventions.push('استخدام قوائم المهام والجداول البصرية');
      interventions.push('تقسيم المهام الكبيرة لخطوات صغيرة واضحة');
    }
    return interventions;
  }

  // ──────────────────────────────────────────────────────────────
  // SRS-2 Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreSRS2(items) {
    const subscales = {};

    for (const item of items) {
      const sub = item.subscale;
      if (!subscales[sub]) subscales[sub] = [];
      const score = item.is_reversed ? 5 - item.response : item.response;
      subscales[sub].push(score);
    }

    const subscaleScores = {};
    let totalRaw = 0;

    for (const [sub, scores] of Object.entries(subscales)) {
      const raw = scores.reduce((a, b) => a + b, 0);
      totalRaw += raw;
      // Approximate T-score
      const expectedMean = scores.length * 1.5;
      const sd = scores.length * 0.5;
      const z = (raw - expectedMean) / (sd || 1);
      const tScore = Math.round(50 + z * 10);
      subscaleScores[sub] = { raw, t_score: Math.max(30, Math.min(90, tScore)) };
    }

    const totalExpected = items.length * 1.5;
    const totalSD = items.length * 0.5;
    const totalZ = (totalRaw - totalExpected) / (totalSD || 1);
    const totalT = Math.round(50 + totalZ * 10);

    let severity, severity_ar;
    for (const [level, range] of Object.entries(SRS2_SEVERITY)) {
      if (totalT >= range.min && totalT <= range.max) {
        severity = level;
        severity_ar = range.label_ar;
        break;
      }
    }

    return {
      subscale_scores: subscaleScores,
      total_raw_score: totalRaw,
      total_t_score: totalT,
      severity_classification: severity || 'within_normal',
      severity_classification_ar: severity_ar || 'ضمن الحدود الطبيعية',
      dsm5_compatible: {
        social_communication_deficits:
          subscaleScores.social_awareness?.t_score >= 65 ||
          subscaleScores.social_cognition?.t_score >= 65 ||
          subscaleScores.social_communication?.t_score >= 65,
        restricted_repetitive_behaviors: subscaleScores.restricted_interests?.t_score >= 65,
      },
      auto_recommendations: this._srs2Recommendations(severity, subscaleScores),
    };
  }

  static _srs2Recommendations(severity, subscales) {
    const recs = {
      social_skills_training: severity !== 'within_normal',
      priority_areas: [],
      suggested_interventions: [],
    };
    if (subscales.social_awareness?.t_score >= 65)
      recs.priority_areas.push('الوعي الاجتماعي — فهم الإشارات الاجتماعية');
    if (subscales.social_cognition?.t_score >= 65)
      recs.priority_areas.push('الإدراك الاجتماعي — فهم وجهات النظر');
    if (subscales.social_communication?.t_score >= 65)
      recs.priority_areas.push('التواصل الاجتماعي — المحادثة التبادلية');
    if (subscales.social_motivation?.t_score >= 65)
      recs.priority_areas.push('الدافعية الاجتماعية — الرغبة في التفاعل');
    if (subscales.restricted_interests?.t_score >= 65)
      recs.priority_areas.push('السلوكيات النمطية — توسيع الاهتمامات');

    if (severity === 'severe' || severity === 'moderate') {
      recs.suggested_interventions.push('مجموعات المهارات الاجتماعية (Social Skills Groups)');
      recs.suggested_interventions.push('قصص اجتماعية (Social Stories) — Carol Gray');
      recs.suggested_interventions.push('تدريب استجابة محورية (PRT)');
      recs.suggested_interventions.push('نمذجة بالفيديو (Video Modeling)');
    }
    return recs;
  }

  // ──────────────────────────────────────────────────────────────
  // Sensory Profile 2 Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreSensoryProfile(items) {
    // Calculate section scores
    const sections = {};
    const quadrants = { seeking: 0, avoiding: 0, sensitivity: 0, registration: 0 };
    const quadrantCounts = { seeking: 0, avoiding: 0, sensitivity: 0, registration: 0 };

    for (const item of items) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item.frequency);
      if (item.quadrant && quadrants[item.quadrant] != null) {
        quadrants[item.quadrant] += item.frequency;
        quadrantCounts[item.quadrant]++;
      }
    }

    const sectionScores = {};
    for (const [section, scores] of Object.entries(sections)) {
      const raw = scores.reduce((a, b) => a + b, 0);
      sectionScores[section] = { raw, classification: '' };
    }

    // Quadrant classification
    const quadrantScores = {};
    for (const [quad, total] of Object.entries(quadrants)) {
      const norms = SENSORY_QUADRANT_NORMS[quad];
      let classification = 'just_like';
      let classification_ar = 'مثل معظم الأطفال';
      for (const [level, [min, max]] of Object.entries(norms)) {
        if (total >= min && total <= max) {
          classification = level;
          const arLabels = {
            much_less: 'أقل بكثير من معظم الأطفال',
            less: 'أقل من معظم الأطفال',
            just_like: 'مثل معظم الأطفال',
            more: 'أكثر من معظم الأطفال',
            much_more: 'أكثر بكثير من معظم الأطفال',
          };
          classification_ar = arLabels[level];
          break;
        }
      }
      quadrantScores[quad] = {
        raw_score: total,
        classification,
        classification_ar,
        percentile: Math.round((total / (quadrantCounts[quad] * 5 || 1)) * 100),
      };
    }

    // Determine dominant quadrant
    let dominant = 'just_like';
    let maxDeviation = 0;
    for (const [quad, data] of Object.entries(quadrantScores)) {
      const dev = Math.abs(data.percentile - 50);
      if (dev > maxDeviation) {
        maxDeviation = dev;
        dominant = quad;
      }
    }

    const quadrantNames = {
      seeking: 'البحث الحسي',
      avoiding: 'التجنب الحسي',
      sensitivity: 'الحساسية الحسية',
      registration: 'التسجيل المنخفض',
    };

    return {
      section_scores: sectionScores,
      quadrant_scores: quadrantScores,
      sensory_profile_summary: {
        dominant_quadrant: dominant,
        dominant_quadrant_ar: quadrantNames[dominant] || dominant,
        sensory_pattern_description_ar: this._describeSensoryPattern(quadrantScores),
        environmental_modifications: this._sensoryEnvironmentMods(quadrantScores),
        therapy_recommendations: this._sensoryTherapyRecs(quadrantScores),
        classroom_strategies: this._sensoryClassroomStrategies(dominant),
        home_strategies: this._sensoryHomeStrategies(dominant),
      },
    };
  }

  static _describeSensoryPattern(quadrants) {
    const parts = [];
    if (['more', 'much_more'].includes(quadrants.seeking?.classification))
      parts.push('يظهر سلوكيات بحث حسي مرتفعة (يحتاج لمدخلات حسية إضافية)');
    if (['more', 'much_more'].includes(quadrants.avoiding?.classification))
      parts.push('يتجنب المثيرات الحسية بشكل ملحوظ');
    if (['more', 'much_more'].includes(quadrants.sensitivity?.classification))
      parts.push('حساسية حسية مرتفعة تجاه المدخلات البيئية');
    if (['more', 'much_more'].includes(quadrants.registration?.classification))
      parts.push('تسجيل حسي منخفض — قد لا يلاحظ بعض المثيرات');
    return parts.length ? parts.join('. ') : 'الملف الحسي ضمن الحدود الطبيعية';
  }

  static _sensoryEnvironmentMods(quadrants) {
    const mods = [];
    if (['more', 'much_more'].includes(quadrants.avoiding?.classification)) {
      mods.push('تقليل الإضاءة الفلورية واستخدام إضاءة طبيعية');
      mods.push('توفير مكان هادئ للانسحاب عند الشعور بالإرهاق الحسي');
      mods.push('استخدام سماعات عزل الضوضاء عند الحاجة');
    }
    if (['more', 'much_more'].includes(quadrants.seeking?.classification)) {
      mods.push('توفير أدوات حسية (fidget tools, chewelry)');
      mods.push('السماح بالحركة خلال الأنشطة (كرسي متحرك، وسادة هوائية)');
      mods.push('جدول أنشطة حسية منتظم (Sensory Diet)');
    }
    return mods;
  }

  static _sensoryTherapyRecs(quadrants) {
    const recs = [];
    recs.push('برنامج حمية حسية (Sensory Diet) مخصص');
    const atypical = Object.values(quadrants).some(q =>
      ['more', 'much_more', 'much_less', 'less'].includes(q.classification)
    );
    if (atypical) {
      recs.push('جلسات علاج وظيفي مع تكامل حسي (Ayres Sensory Integration)');
      recs.push('برنامج Therapeutic Listening (إن كانت الحساسية السمعية مرتفعة)');
      recs.push('أنشطة الضغط العميق (Deep Pressure) لتنظيم الجهاز العصبي');
    }
    return recs;
  }

  static _sensoryClassroomStrategies(dominant) {
    const strategies = {
      seeking: [
        'السماح بالوقوف خلال العمل',
        'فترات حركة كل 15 دقيقة',
        'استخدام أقلام ثقيلة ولوحة مائلة',
      ],
      avoiding: [
        'مقعد بعيد عن الباب والنوافذ',
        'إشعار مسبق قبل التغييرات',
        'تقليل الزخرفة البصرية المشتتة',
      ],
      sensitivity: [
        'سماعات عزل الضوضاء',
        'تجنب اللمس غير المتوقع',
        'مكان محدد في الصف بعيداً عن مصادر الإزعاج',
      ],
      registration: [
        'منبهات بصرية أو لمسية لجذب الانتباه',
        'تنويع طريقة تقديم المعلومات',
        'فترات تنشيط حسي قبل المهام الأكاديمية',
      ],
    };
    return strategies[dominant] || strategies.seeking;
  }

  static _sensoryHomeStrategies(dominant) {
    const strategies = {
      seeking: [
        'توفير ترامبولين صغير',
        'لعب بالصلصال والرمل الحركي',
        'حمام بفقاعات مع ألعاب مائية',
      ],
      avoiding: [
        'تقليل الضوضاء المنزلية',
        'روتين يومي ثابت ومتوقع',
        'خيمة حسية هادئة في غرفة الطفل',
      ],
      sensitivity: [
        'ملابس من أقمشة ناعمة بدون بطاقات',
        'تحضير الطفل قبل الخروج من المنزل',
        'إضاءة خافتة وقت النوم',
      ],
      registration: [
        'تمارين قبل النوم (قفز، ضغط)',
        'ألعاب تتطلب حركة كبيرة',
        'استخدام بطانية ثقيلة (Weighted Blanket)',
      ],
    };
    return strategies[dominant] || strategies.seeking;
  }

  // ──────────────────────────────────────────────────────────────
  // Portage Guide Scoring
  // ──────────────────────────────────────────────────────────────
  static scorePortage(items, chronologicalAgeMonths) {
    const domains = {};

    for (const item of items) {
      if (!domains[item.domain]) {
        domains[item.domain] = { total: 0, achieved: 0, emerging: 0, items: [] };
      }
      domains[item.domain].total++;
      if (item.achieved) domains[item.domain].achieved++;
      else if (item.emerging) domains[item.domain].emerging++;
      domains[item.domain].items.push(item);
    }

    const summaries = {};
    let totalAchieved = 0;
    let totalItems = 0;
    let weakest = null,
      strongest = null;
    let weakestPct = 101,
      strongestPct = -1;

    for (const [domain, data] of Object.entries(domains)) {
      const percentage = data.total > 0 ? Math.round((data.achieved / data.total) * 100) : 0;
      const ageEq = this._estimatePortageAge(domain, data.achieved, chronologicalAgeMonths);
      const delay = chronologicalAgeMonths - ageEq;

      summaries[domain] = {
        total_items: data.total,
        achieved: data.achieved,
        emerging: data.emerging,
        percentage,
        age_equivalent_months: ageEq,
        delay_months: Math.max(0, delay),
      };

      totalAchieved += data.achieved;
      totalItems += data.total;

      if (percentage < weakestPct) {
        weakestPct = percentage;
        weakest = domain;
      }
      if (percentage > strongestPct) {
        strongestPct = percentage;
        strongest = domain;
      }
    }

    const overallPct = totalItems > 0 ? Math.round((totalAchieved / totalItems) * 100) : 0;
    const overallAgeEq = Math.round(chronologicalAgeMonths * (overallPct / 100));
    const overallDelay = chronologicalAgeMonths - overallAgeEq;
    const delayPct =
      chronologicalAgeMonths > 0 ? Math.round((overallDelay / chronologicalAgeMonths) * 100) : 0;

    let delaySeverity = 'no_delay';
    if (delayPct >= 50) delaySeverity = 'profound';
    else if (delayPct >= 33) delaySeverity = 'severe';
    else if (delayPct >= 25) delaySeverity = 'moderate';
    else if (delayPct >= 15) delaySeverity = 'mild';

    const domainNameMap = {
      infant_stimulation: 'تنبيه الرضيع',
      socialization: 'التنشئة الاجتماعية',
      language: 'اللغة',
      self_help: 'المساعدة الذاتية',
      cognitive: 'الإدراك',
      motor: 'الحركية',
    };

    return {
      domain_summaries: summaries,
      developmental_analysis: {
        overall_developmental_age_months: overallAgeEq,
        overall_delay_months: Math.max(0, overallDelay),
        delay_percentage: delayPct,
        delay_severity: delaySeverity,
        strongest_domain: domainNameMap[strongest] || strongest,
        weakest_domain: domainNameMap[weakest] || weakest,
        priority_goals: this._portageGoals(weakest, summaries[weakest]),
        recommended_programs: this._portagePrograms(summaries),
      },
    };
  }

  static _estimatePortageAge(domain, achievedCount, chronoAge) {
    // Rough estimation — real uses Portage norms
    const totalExpectedByAge = (chronoAge / 12) * 15; // ~15 items per year
    if (totalExpectedByAge <= 0) return 0;
    return Math.round(chronoAge * (achievedCount / totalExpectedByAge));
  }

  static _portageGoals(domain, summary) {
    if (!domain || !summary) return [];
    const goals = {
      language: ['زيادة المفردات التعبيرية', 'فهم التعليمات البسيطة', 'التقليد الصوتي/اللفظي'],
      motor: ['تحسين التوازن والتنسيق', 'تطوير المهارات الحركية الدقيقة', 'زيادة القوة العضلية'],
      cognitive: ['مطابقة الألوان والأشكال', 'فرز وتصنيف الأشياء', 'فهم مفهوم السبب والنتيجة'],
      self_help: ['الاستقلالية في الأكل', 'ارتداء/خلع الملابس', 'مهارات النظافة الشخصية'],
      socialization: [
        'التفاعل مع الأقران',
        'المشاركة في اللعب الرمزي',
        'الاستجابة للتعليمات الاجتماعية',
      ],
      infant_stimulation: ['تتبع بصري', 'الاستجابة للأصوات', 'التفاعل مع مقدم الرعاية'],
    };
    return goals[domain] || [];
  }

  static _portagePrograms(summaries) {
    const programs = [];
    for (const [domain, data] of Object.entries(summaries)) {
      if (data.delay_months >= 6) {
        const nameMap = {
          language: 'برنامج تدخل لغوي مبكر',
          motor: 'برنامج علاج طبيعي/وظيفي',
          cognitive: 'برنامج تنمية إدراكية',
          self_help: 'برنامج مهارات حياتية',
          socialization: 'برنامج مهارات اجتماعية',
        };
        if (nameMap[domain]) programs.push(nameMap[domain]);
      }
    }
    return programs;
  }

  // ──────────────────────────────────────────────────────────────
  // ABC Data Analysis — Functional Analysis
  // ──────────────────────────────────────────────────────────────
  static analyzeABCData(records) {
    if (!records || !records.length) return null;

    // Count antecedent categories
    const antecedentCounts = {};
    const consequenceCounts = {};
    const behaviorCounts = {};
    const hourCounts = {};
    const settingCounts = {};
    let totalDuration = 0;

    for (const rec of records) {
      const ant = rec.antecedent?.category;
      const con = rec.consequence?.category;
      const beh = rec.behavior?.category;
      const hour = new Date(rec.timestamp).getHours();
      const setting = rec.setting;

      if (ant) antecedentCounts[ant] = (antecedentCounts[ant] || 0) + 1;
      if (con) consequenceCounts[con] = (consequenceCounts[con] || 0) + 1;
      if (beh) behaviorCounts[beh] = (behaviorCounts[beh] || 0) + 1;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      if (setting) settingCounts[setting] = (settingCounts[setting] || 0) + 1;
      if (rec.behavior?.duration_seconds) totalDuration += rec.behavior.duration_seconds;
    }

    // Hypothesize function
    const functionScores = { attention: 0, escape: 0, tangible: 0, sensory: 0 };

    // Antecedent-based evidence
    if (antecedentCounts.attention_removed)
      functionScores.attention += antecedentCounts.attention_removed * 2;
    if (antecedentCounts.demand_placed) functionScores.escape += antecedentCounts.demand_placed * 2;
    if (antecedentCounts.task_difficulty)
      functionScores.escape += antecedentCounts.task_difficulty * 1.5;
    if (antecedentCounts.denied_access)
      functionScores.tangible += antecedentCounts.denied_access * 2;
    if (antecedentCounts.alone) functionScores.sensory += antecedentCounts.alone * 2;
    if (antecedentCounts.sensory_input)
      functionScores.sensory += antecedentCounts.sensory_input * 1.5;

    // Consequence-based evidence
    if (consequenceCounts.attention_given)
      functionScores.attention += consequenceCounts.attention_given * 2;
    if (consequenceCounts.demand_removed)
      functionScores.escape += consequenceCounts.demand_removed * 2;
    if (consequenceCounts.tangible_given)
      functionScores.tangible += consequenceCounts.tangible_given * 2;
    if (consequenceCounts.sensory_maintained)
      functionScores.sensory += consequenceCounts.sensory_maintained * 2;

    // Normalize to percentages
    const totalFnScore = Object.values(functionScores).reduce((a, b) => a + b, 0) || 1;
    const functions = Object.entries(functionScores)
      .map(([fn, score]) => ({
        function: fn,
        function_ar: { attention: 'انتباه', escape: 'هروب', tangible: 'ملموس', sensory: 'حسي' }[fn],
        confidence: Math.round((score / totalFnScore) * 100),
        evidence: `${Math.round((score / totalFnScore) * 100)}% من البيانات تدعم هذه الوظيفة`,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const primaryFn = functions[0]?.function;
    const isMultiple =
      functions.length >= 2 && Math.abs(functions[0].confidence - functions[1].confidence) < 15;

    // Peak times
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([h]) => `${h}:00`);

    const peakSettings = Object.entries(settingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([s]) => s);

    // Function-based interventions
    const interventions = this._functionBasedInterventions(isMultiple ? 'multiple' : primaryFn);

    return {
      hypothesized_functions: functions,
      primary_function: isMultiple ? 'multiple' : primaryFn,
      primary_function_ar: isMultiple ? 'متعددة' : functions[0]?.function_ar,
      patterns: {
        peak_times: peakHours,
        peak_settings: peakSettings,
        common_antecedents: Object.entries(antecedentCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([a]) => a),
        common_consequences: Object.entries(consequenceCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([c]) => c),
        average_frequency_per_hour:
          records.length > 0 ? Math.round((records.length / 8) * 10) / 10 : 0,
        average_duration_seconds:
          records.length > 0 ? Math.round(totalDuration / records.length) : 0,
        trend: 'stable', // Would need time-series analysis
      },
      function_based_interventions: interventions,
    };
  }

  static _functionBasedInterventions(primaryFunction) {
    const interventionBank = {
      attention: [
        {
          strategy_ar: 'تعزيز السلوكيات البديلة (طلب الانتباه بطريقة مناسبة)',
          category: 'teaching',
          priority: 'high',
        },
        {
          strategy_ar: 'التخطيط المسبق لأوقات انتباه فردي منتظمة',
          category: 'antecedent',
          priority: 'high',
        },
        {
          strategy_ar: 'الإطفاء المخطط — تجاهل السلوك المشكل مع الانتباه الفوري للسلوك البديل',
          category: 'consequence',
          priority: 'high',
        },
        { strategy_ar: 'تعليم مهارة "انتظر" بالتدريج', category: 'teaching', priority: 'medium' },
      ],
      escape: [
        {
          strategy_ar: 'تقديم خيارات وتقليل صعوبة المهام تدريجياً',
          category: 'antecedent',
          priority: 'high',
        },
        {
          strategy_ar: 'تعليم طلب الاستراحة بطريقة وظيفية (FCT)',
          category: 'teaching',
          priority: 'high',
        },
        {
          strategy_ar: 'عدم إزالة المطلب عند ظهور السلوك — إنهاء المهمة ثم الاستراحة',
          category: 'consequence',
          priority: 'high',
        },
        {
          strategy_ar: 'تعديل بيئي: تحسين جاذبية المهام واستخدام تعزيز أثناء المهمة',
          category: 'antecedent',
          priority: 'medium',
        },
      ],
      tangible: [
        {
          strategy_ar: 'جدول بصري للأنشطة والمواد المفضلة',
          category: 'antecedent',
          priority: 'high',
        },
        { strategy_ar: 'تعليم طلب الأشياء بطريقة مناسبة', category: 'teaching', priority: 'high' },
        {
          strategy_ar: 'عدم تقديم المعزز عند السلوك المشكل — تقديمه عند الطلب المناسب',
          category: 'consequence',
          priority: 'high',
        },
      ],
      sensory: [
        {
          strategy_ar: 'توفير بدائل حسية مناسبة (حمية حسية)',
          category: 'antecedent',
          priority: 'high',
        },
        {
          strategy_ar: 'تعليم طلب المدخل الحسي بطريقة مقبولة',
          category: 'teaching',
          priority: 'high',
        },
        {
          strategy_ar: 'إعادة توجيه لنشاط حسي آمن ومقبول',
          category: 'consequence',
          priority: 'medium',
        },
      ],
      multiple: [
        {
          strategy_ar: 'تطبيق استراتيجيات متعددة الوظائف شاملة',
          category: 'antecedent',
          priority: 'high',
        },
        {
          strategy_ar: 'تعليم التواصل الوظيفي (FCT) لجميع الوظائف المحددة',
          category: 'teaching',
          priority: 'high',
        },
        {
          strategy_ar: 'تعديل بيئي شامل مع جدول تعزيز مكثف',
          category: 'antecedent',
          priority: 'high',
        },
      ],
    };
    return interventionBank[primaryFunction] || interventionBank.multiple;
  }

  // ──────────────────────────────────────────────────────────────
  // Caregiver Burden (Zarit) Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreCaregiverBurden(items) {
    const dimensions = {};
    let totalScore = 0;

    for (const item of items) {
      totalScore += item.score;
      const dim = item.dimension;
      if (dim) {
        if (!dimensions[dim]) dimensions[dim] = { score: 0, count: 0 };
        dimensions[dim].score += item.score;
        dimensions[dim].count++;
      }
    }

    const dimensionScores = {};
    for (const [dim, data] of Object.entries(dimensions)) {
      dimensionScores[dim] = {
        score: data.score,
        max: data.count * 4,
        percentage: Math.round((data.score / (data.count * 4)) * 100),
      };
    }

    let burden_level, burden_level_ar;
    for (const [level, range] of Object.entries(ZARIT_LEVELS)) {
      if (totalScore >= range.min && totalScore <= range.max) {
        burden_level = level;
        burden_level_ar = range.label_ar;
        break;
      }
    }

    // Support recommendations
    const recs = {
      respite_care: {
        needed: totalScore >= 41,
        recommended_hours_weekly: totalScore >= 61 ? 20 : totalScore >= 41 ? 10 : 0,
      },
      counseling: {
        needed: totalScore >= 31,
        type: totalScore >= 61 ? 'فردي + عائلي' : 'إرشاد أسري',
      },
      support_group: { needed: totalScore >= 21 },
      training: {
        needed: true,
        topics: this._caregiverTrainingTopics(dimensionScores),
      },
      financial_assistance: { needed: dimensionScores.financial_impact?.percentage >= 60 },
      home_modification: { needed: false },
      medical_referral: {
        needed: dimensionScores.impact_on_health?.percentage >= 75,
        specialty: 'طب نفسي / طب عام',
      },
    };

    return {
      dimension_scores: dimensionScores,
      total_score: totalScore,
      burden_level,
      burden_level_ar,
      support_recommendations: recs,
    };
  }

  static _caregiverTrainingTopics(dimensions) {
    const topics = [];
    if (dimensions.personal_strain?.percentage >= 50)
      topics.push('إدارة الضغوط واستراتيجيات الرعاية الذاتية');
    if (dimensions.role_strain?.percentage >= 50)
      topics.push('تنظيم الوقت وتوزيع مسؤوليات الرعاية');
    if (dimensions.guilt?.percentage >= 50) topics.push('التعامل مع مشاعر الذنب والقبول');
    topics.push('مهارات التعامل مع سلوكيات الطفل');
    topics.push('التعرف على الحقوق والخدمات المتاحة لذوي الإعاقة');
    return topics;
  }

  // ──────────────────────────────────────────────────────────────
  // Quality of Life Scoring (WHOQOL-BREF adapted)
  // ──────────────────────────────────────────────────────────────
  static scoreQualityOfLife(domains) {
    const result = {};
    for (const [domain, data] of Object.entries(domains)) {
      if (!data.items || !data.items.length) continue;
      const rawSum = data.items.reduce((sum, item) => sum + (item.score || 0), 0);
      const rawMean = rawSum / data.items.length;
      // WHOQOL-BREF transformed score: (rawMean - 1) * (100/4)
      const transformed = Math.round((rawMean - 1) * 25);
      result[domain] = {
        raw_score: rawSum,
        transformed_score: Math.max(0, Math.min(100, transformed)),
      };
    }

    const allTransformed = Object.values(result).map(d => d.transformed_score);
    const totalMean = allTransformed.length
      ? Math.round(allTransformed.reduce((a, b) => a + b, 0) / allTransformed.length)
      : 0;

    let level, level_ar;
    if (totalMean >= 80) {
      level = 'very_good';
      level_ar = 'جودة حياة عالية جداً';
    } else if (totalMean >= 60) {
      level = 'good';
      level_ar = 'جودة حياة جيدة';
    } else if (totalMean >= 40) {
      level = 'moderate';
      level_ar = 'جودة حياة متوسطة';
    } else if (totalMean >= 20) {
      level = 'poor';
      level_ar = 'جودة حياة منخفضة';
    } else {
      level = 'very_poor';
      level_ar = 'جودة حياة منخفضة جداً';
    }

    const sortedDomains = Object.entries(result).sort(
      ([, a], [, b]) => b.transformed_score - a.transformed_score
    );
    const domainNames = {
      physical_health: 'الصحة الجسدية',
      psychological: 'الصحة النفسية',
      social_relationships: 'العلاقات الاجتماعية',
      environment: 'البيئة',
      disability_specific: 'مرتبط بالإعاقة',
    };

    return {
      domain_scores: result,
      total_transformed_score: totalMean,
      interpretation: {
        level,
        level_ar,
        strongest_domain: domainNames[sortedDomains[0]?.[0]] || '',
        weakest_domain: domainNames[sortedDomains[sortedDomains.length - 1]?.[0]] || '',
        improvement_areas: sortedDomains
          .filter(([, d]) => d.transformed_score < 50)
          .map(([name]) => domainNames[name] || name),
      },
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Transition Readiness Scoring
  // ──────────────────────────────────────────────────────────────
  static scoreTransitionReadiness(domains) {
    let totalScore = 0,
      maxScore = 0;
    const domainResults = {};

    for (const [domain, data] of Object.entries(domains)) {
      if (!data.skills || !data.skills.length) continue;
      const score = data.skills.reduce((sum, s) => sum + (s.level || 0), 0);
      const max = data.skills.length * 5;
      const pct = Math.round((score / max) * 100);

      let readiness;
      if (pct >= 90) readiness = 'exceeds';
      else if (pct >= 75) readiness = 'ready';
      else if (pct >= 50) readiness = 'approaching';
      else if (pct >= 25) readiness = 'developing';
      else readiness = 'not_ready';

      domainResults[domain] = { score, max_score: max, percentage: pct, readiness };
      totalScore += score;
      maxScore += max;
    }

    const overallPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    let overallLevel;
    if (overallPct >= 90) overallLevel = 'exceeds';
    else if (overallPct >= 75) overallLevel = 'ready';
    else if (overallPct >= 50) overallLevel = 'approaching';
    else if (overallPct >= 25) overallLevel = 'developing';
    else overallLevel = 'not_ready';

    const levelNames = {
      exceeds: 'يتجاوز المتطلبات',
      ready: 'جاهز',
      approaching: 'يقترب من الجاهزية',
      developing: 'في طور النمو',
      not_ready: 'غير جاهز بعد',
    };

    return {
      domains: domainResults,
      overall_readiness: {
        total_score: totalScore,
        max_score: maxScore,
        percentage: overallPct,
        level: overallLevel,
        level_ar: levelNames[overallLevel],
      },
    };
  }
}

module.exports = SmartAssessmentEngine;
