/**
 * Smart Assessment & Scoring Engine — محرك التقييم والتسجيل الذكي
 *
 * يقوم بـ:
 *  1. حساب الدرجات الخام والمعيارية لأي مقياس
 *  2. تفسير النتائج سريرياً حسب نطاقات الدرجات
 *  3. المقارنة مع البيانات المعيارية (percentile / z-score)
 *  4. توليد توصيات ذكية قابلة للتنفيذ
 *  5. تتبع التقدم عبر الزمن ورصد الاتجاهات
 *  6. اقتراح الأهداف التأهيلية القابلة للقياس (SMART Goals)
 *  7. ربط نتائج المقاييس بخطط الرعاية
 */

'use strict';

const {
  getMeasure,
  getSmartRecommendations,
  MEASURES_CATALOG,
} = require('./rehab-measures-library');

// ─────────────────────────────────────────────────────────────────────────────
// SCORING ALGORITHMS — خوارزميات الحساب
// ─────────────────────────────────────────────────────────────────────────────

const ScoringAlgorithms = {
  /**
   * Sum all item scores in a flat array.
   * @param {Object} responses  { itemId: score }
   * @param {Array}  items      [{ id, maxScore }]
   */
  sumRatings(responses, items) {
    let total = 0;
    let possible = 0;
    const itemScores = {};

    for (const item of items) {
      const raw = responses[item.id];
      const score = raw !== undefined ? Number(raw) : null;
      itemScores[item.id] = score;
      if (score !== null) {
        total += score;
        possible += item.maxScore;
      }
    }
    return {
      total,
      possible,
      percent: possible > 0 ? Math.round((total / possible) * 100) : 0,
      itemScores,
    };
  },

  /**
   * Compute domain sub-scores then total.
   * @param {Object} responses { itemId: score }
   * @param {Object} domains   { domainKey: { items: [...], maxScore } }
   */
  sumByDomain(responses, domains) {
    const domainScores = {};
    let grandTotal = 0;
    let grandPossible = 0;

    for (const [key, domain] of Object.entries(domains)) {
      const items = domain.items || [];
      const { total, possible, percent, itemScores } = ScoringAlgorithms.sumRatings(
        responses,
        items
      );
      domainScores[key] = {
        name_ar: domain.name_ar,
        score: total,
        maxScore: possible || domain.maxScore || possible,
        percent,
        itemScores,
      };
      grandTotal += total;
      grandPossible += possible || domain.maxScore || 0;
    }

    return {
      domainScores,
      total: grandTotal,
      possible: grandPossible,
      percent: grandPossible > 0 ? Math.round((grandTotal / grandPossible) * 100) : 0,
    };
  },

  /**
   * Ordinal classification — the response IS the level (GMFCS, MACS, CFCS).
   * @param {number} level
   * @param {Array}  levels
   */
  ordinalClassification(level, levels) {
    const found = levels.find(l => l.level === level);
    return {
      level,
      classification: found || null,
      isValid: !!found,
    };
  },

  sumCARS2Ratings(responses, items) {
    if (responses.total !== undefined && responses.total !== null) {
      return { total: Number(responses.total), itemScores: {} };
    }
    return ScoringAlgorithms.sumRatings(responses, items);
  },

  /**
   * Binary sum (SCQ, CSI) — count of "yes" responses.
   * @param {Object} responses  { itemId: 0|1 }
   * @param {Array}  items      [{ id }]
   */
  binarySum(responses, items) {
    let total = 0;
    const itemScores = {};
    for (const item of items) {
      const val = responses[item.id] ? 1 : 0;
      itemScores[item.id] = val;
      total += val;
    }
    return { total, possible: items.length, itemScores };
  },

  /**
   * PedsQL reverse linear transform.
   * Raw: 0 (never problem) → 4 (always problem)
   * Converted: ((4 - raw) / 4) × 100
   * @param {Object} responses { itemId: 0..4 }
   * @param {Object} domains   { domainKey: { items: [{id}], weight } }
   */
  pedsQLTransform(responses, domains) {
    const domainScores = {};
    let weightedTotal = 0;
    let totalWeight = 0;

    for (const [key, domain] of Object.entries(domains)) {
      const items = domain.items_arr || [];
      let domSum = 0;
      let count = 0;
      for (const itemId of items) {
        const raw = responses[itemId];
        if (raw !== undefined && raw !== null) {
          domSum += ((4 - Number(raw)) / 4) * 100;
          count++;
        }
      }
      const avg = count > 0 ? Math.round(domSum / count) : null;
      domainScores[key] = { name_ar: domain.name_ar, score: avg };
      if (avg !== null) {
        weightedTotal += avg * (domain.weight || 1);
        totalWeight += domain.weight || 1;
      }
    }

    const totalScore = totalWeight > 0 ? Math.round(weightedTotal / totalWeight) : null;
    return { domainScores, totalScore };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERPRETATION ENGINE — محرك التفسير
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find interpretation tier for a numeric score against an interpretation array.
 * Each entry has { range: [min, max], label_ar, color, tier }.
 * @param {number} score
 * @param {Array}  interpretationArray
 * @returns {Object|null}
 */
function interpretScore(score, interpretationArray) {
  if (!interpretationArray || score === null || score === undefined) return null;
  return (
    interpretationArray.find(entry => score >= entry.range[0] && score <= entry.range[1]) || null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Z-SCORE / PERCENTILE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate z-score: (observed - mean) / SD
 */
function calcZScore(observed, mean, sd) {
  if (!sd) return null;
  return Math.round(((observed - mean) / sd) * 100) / 100;
}

/**
 * Approximate percentile from z-score (standard normal CDF approximation).
 * @param {number} z
 */
function zToPercentile(z) {
  if (z === null) return null;
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return Math.round((z >= 0 ? cdf : 1 - cdf) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART GOAL GENERATOR — مولّد الأهداف الذكية
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_TEMPLATES = {
  GMFCS: {
    1: ['الانخراط في نشاط رياضي منظم مرة في الأسبوع خلال 3 أشهر'],
    2: [
      'المشي مسافة 500 متر خارج المنزل باستقلالية خلال 3 أشهر',
      'صعود 10 درجات دون مساعدة خلال شهرين',
    ],
    3: [
      'استخدام المشاية باستقلالية داخل المنزل خلال شهرين',
      'الانتقال من الجلوس إلى الوقوف باستقلالية خلال شهر',
    ],
    4: [
      'قيادة الكرسي المتحرك الكهربائي 30 متراً باستقلالية خلال شهرين',
      'تحسين التحكم بالجذع أثناء الجلوس إلى 80% من الوقت',
    ],
    5: [
      'الوضعية الآمنة في الكرسي لمدة ساعتين متواصلتين دون ألم',
      'التواصل بنعم/لا بوسيلة تبادلية موثوقة خلال شهر',
    ],
  },
  FIM: {
    severe: [
      'تناول الطعام باستقلالية (درجة 4) خلال 4 أسابيع',
      'الانتقال من السرير للكرسي بمساعدة واحدة (درجة 3) خلال شهر',
    ],
    moderate: [
      'ارتداء ملابس الجزء العلوي باستقلالية (درجة 6) خلال 6 أسابيع',
      'التحكم في المثانة بمساعدة محدودة (درجة 4) خلال شهرين',
    ],
    mild: ['الاستحمام باستقلالية معدّلة (درجة 6) خلال 3 أسابيع'],
    modified: ['الانتقال للمرحاض باستقلالية تامة (درجة 7) خلال أسبوعين'],
    independent: ['الحفاظ على الأداء الحالي والانخراط في برنامج رياضي'],
  },
  BergBalance: {
    high_fall_risk: [
      'الوقوف بمساعدة ≥30 ثانية (درجة 3) خلال 3 أسابيع',
      'الانتقال من الجلوس إلى الوقوف بمساعدة بسيطة خلال أسبوعين',
    ],
    medium_fall_risk: [
      'المشي 10 متر باستخدام المشاية دون سقوط خلال 3 أسابيع',
      'الوقوف بأعين مغلقة ≥10 ثوانٍ (درجة 3) خلال شهر',
    ],
    low_fall_risk: ['الوقوف على قدم واحدة ≥10 ثوانٍ (درجة 4) خلال 3 أسابيع'],
  },
  CARS2: {
    mild_moderate: [
      'تحسين درجة التفاعل الاجتماعي بمقدار 0.5 نقطة خلال 3 أشهر',
      'تقليل سلوكيات التكرار الحركي إلى مرة يومياً خلال شهرين',
    ],
    severe: [
      'التواصل البصري التلقائي ≥3 ثوانٍ في 70% من المحاولات خلال شهر',
      'تقليد 3 إيماءات بشكل متسق خلال 6 أسابيع',
    ],
  },
  Vineland3: {
    very_low: [
      'استخدام الملعقة للأكل باستقلالية خلال 3 أسابيع',
      'التواصل بـ 5 كلمات وظيفية خلال 6 أسابيع',
    ],
    low: [
      'ارتداء الملابس باستقلالية مع إرشادات بسيطة خلال شهرين',
      'التفاعل الاجتماعي التبادلي مع طفل آخر ≥5 دقائق/يوم',
    ],
    below_average: ['أداء مهمة منزلية واحدة باستقلالية خلال شهر'],
  },
};

/**
 * Generate SMART goals for a beneficiary based on measure results.
 * @param {string} measureKey
 * @param {string} tier
 * @param {Object} [context]  { age, beneficiaryId, episode }
 * @returns {Array<string>}
 */
function generateSMARTGoals(measureKey, tier, context = {}) {
  const templates = GOAL_TEMPLATES[measureKey];
  if (!templates) return [];
  const goals = templates[tier] || [];

  // Personalize if age context available
  if (context.age && context.age < 5) {
    return goals.map(g =>
      g.replace('خلال 3 أشهر', 'خلال شهرين').replace('خلال شهرين', 'خلال 6 أسابيع')
    );
  }
  return goals;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS ANALYSIS — تحليل التقدم الزمني
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyse a series of assessment results over time to compute trend.
 * @param {Array<{ date: string, score: number }>} history  chronological array
 * @param {number} maxScore
 * @returns {{ trend: 'improving'|'stable'|'declining', changePercent, summary_ar }}
 */
function analyzeProgressTrend(history, maxScore) {
  if (!history || history.length < 2) {
    return { trend: 'insufficient_data', changePercent: 0, summary_ar: 'بيانات غير كافية للتحليل' };
  }

  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0].score;
  const last = sorted[sorted.length - 1].score;
  const changePercent = maxScore > 0 ? Math.round(((last - first) / maxScore) * 100) : 0;

  // Linear regression slope
  const n = sorted.length;
  const xMean = (n - 1) / 2;
  const yMean = sorted.reduce((s, p) => s + p.score, 0) / n;
  let sxy = 0;
  let sxx = 0;
  sorted.forEach((p, i) => {
    sxy += (i - xMean) * (p.score - yMean);
    sxx += (i - xMean) ** 2;
  });
  const slope = sxx !== 0 ? sxy / sxx : 0;

  let trend;
  let summary_ar;
  if (slope > 0.5) {
    trend = 'improving';
    summary_ar = `تحسّن ملحوظ بنسبة ${Math.abs(changePercent)}% منذ بداية التدخل`;
  } else if (slope < -0.5) {
    trend = 'declining';
    summary_ar = `تراجع بنسبة ${Math.abs(changePercent)}% — يستدعي مراجعة البرنامج`;
  } else {
    trend = 'stable';
    summary_ar = 'الأداء مستقر — يمكن مراجعة الأهداف للتحدي';
  }

  return {
    trend,
    slope: Math.round(slope * 100) / 100,
    changePercent,
    firstScore: first,
    lastScore: last,
    assessmentCount: n,
    summary_ar,
    dataPoints: sorted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE CLASS — الفئة الرئيسية للمحرك
// ─────────────────────────────────────────────────────────────────────────────

class SmartAssessmentEngine {
  /**
   * Score a completed assessment.
   * @param {string} measureKey   e.g. 'GMFCS', 'FIM', 'CARS2'
   * @param {Object} responses    { itemId: value }  OR  { level: N } for classification
   * @param {Object} [meta]       { age, ageMonths, form, reportType }
   * @returns {Object} scoringResult
   */
  score(measureKey, responses, meta = {}) {
    const measure = getMeasure(measureKey);
    if (!measure) {
      return { error: `المقياس '${measureKey}' غير موجود في المكتبة` };
    }

    let raw = null;
    let domainScores = null;
    let classification = null;
    let isValid = null;

    switch (measure.scoringType) {
      case 'ordinal_classification': {
        const level = responses.level ?? responses.LEVEL ?? null;
        const result = ScoringAlgorithms.ordinalClassification(level, measure.levels || []);
        classification = result.classification;
        isValid = result.isValid;
        raw = level;
        break;
      }

      case 'rating_scale': {
        if (measure.domains) {
          // Flatten domain items
          const _allItems = Object.values(measure.domains).flatMap(d => d.items || []);
          const result = ScoringAlgorithms.sumByDomain(responses, measure.domains);
          domainScores = result.domainScores;
          raw = result.total;
        } else if (measure.items) {
          const result = ScoringAlgorithms.sumRatings(responses, measure.items);
          raw = result.total;
        }
        break;
      }

      case 'binary': {
        const itemsList =
          measure.items ||
          Object.values(measure.sections || {})
            .flatMap(s => s.items_arr || [])
            .filter(Boolean);
        const result = ScoringAlgorithms.binarySum(responses, itemsList.length ? itemsList : []);
        raw = result.total;
        break;
      }

      default:
        raw = responses.total ?? null;
    }

    // Special handling: PedsQL
    if (measureKey === 'PedsQL') {
      const pedsResult = ScoringAlgorithms.pedsQLTransform(responses, measure.domains || {});
      raw = pedsResult.totalScore;
      domainScores = pedsResult.domainScores;
    }

    // Special handling: CARS2
    if (measureKey === 'CARS2') {
      const form = meta.form || 'ST';
      const items = measure[`items_${form}`] || measure.items_ST || [];
      raw = ScoringAlgorithms.sumCARS2Ratings(responses, items).total;
    }

    // Interpretation
    let interpretationArray = null;
    if (measure.scoringType !== 'ordinal_classification') {
      if (measureKey === 'CARS2' && measure.interpretation) {
        const form = meta.form || 'ST';
        interpretationArray = measure.interpretation[form] || measure.interpretation.ST || null;
      } else if (measure.interpretation instanceof Array) {
        interpretationArray = measure.interpretation;
      }
    }

    const interpretation = interpretationArray ? interpretScore(raw, interpretationArray) : null;
    const tier = interpretation?.tier || classification?.level || null;

    // Z-score for standardized tests (Vineland-3 etc.)
    let zScore = null;
    let percentile = null;
    if (measure.scores?.type === 'standard_scores' && raw !== null) {
      zScore = calcZScore(raw, measure.scores.mean || 100, measure.scores.sd || 15);
      percentile = zToPercentile(zScore);
    }

    // Smart recommendations
    const recommendations = getSmartRecommendations(measureKey, String(tier));

    // SMART goals
    const smartGoals = generateSMARTGoals(measureKey, String(tier), meta);

    // Clinical flags
    const flags = this._computeFlags(measureKey, raw, tier, domainScores);

    return {
      measureKey,
      measureName: measure.name_ar,
      scoringType: measure.scoringType,
      rawScore: raw,
      maxScore: measure.maxTotalScore || measure.maxScore || null,
      percentScore: measure.maxTotalScore ? Math.round((raw / measure.maxTotalScore) * 100) : null,
      domainScores,
      classification,
      interpretation,
      tier,
      zScore,
      percentile,
      recommendations,
      smartGoals,
      flags,
      isValid,
      scoredAt: new Date().toISOString(),
    };
  }

  /**
   * Score multiple measures at once (battery assessment).
   * @param {Array<{ measureKey, responses, meta }>} assessments
   */
  scoreBattery(assessments) {
    const results = assessments.map(({ measureKey, responses, meta }) =>
      this.score(measureKey, responses, meta)
    );

    // Cross-measure analysis
    const crossAnalysis = this._crossMeasureAnalysis(results);

    return {
      batteryResults: results,
      crossAnalysis,
      overallRecommendations: this._mergeRecommendations(results),
      priorityGoals: this._prioritizeGoals(results),
      scoredAt: new Date().toISOString(),
    };
  }

  /**
   * Analyse progress over multiple assessment sessions.
   * @param {string} measureKey
   * @param {Array<{ date, responses, meta }>} sessions  chronological
   */
  analyzeProgress(measureKey, sessions) {
    const measure = getMeasure(measureKey);
    if (!measure) return { error: `المقياس '${measureKey}' غير موجود` };

    const scoredSessions = sessions.map(s => ({
      date: s.date,
      ...this.score(measureKey, s.responses, s.meta || {}),
    }));

    const history = scoredSessions
      .filter(s => s.rawScore !== null)
      .map(s => ({ date: s.date, score: s.rawScore }));

    const trend = analyzeProgressTrend(history, measure.maxTotalScore || 100);

    return {
      measureKey,
      measureName: measure.name_ar,
      sessions: scoredSessions,
      trend,
      latestResult: scoredSessions[scoredSessions.length - 1] || null,
    };
  }

  /**
   * Suggest which measures to apply for a given diagnosis/population.
   * @param {string} diagnosis  e.g. 'شلل دماغي', 'اضطراب طيف التوحد'
   * @param {number} age        in years
   */
  suggestMeasures(diagnosis, age) {
    const suggestions = [];

    for (const [key, measure] of Object.entries(MEASURES_CATALOG)) {
      if (!measure.targetPopulation) continue;

      const diagnosisMatch = measure.targetPopulation.some(
        p => p.includes(diagnosis) || diagnosis.includes(p)
      );
      if (!diagnosisMatch) continue;

      const ageMatch =
        !measure.ageRanges || measure.ageRanges.some(r => age >= r.min && age <= (r.max || 200));

      if (ageMatch) {
        suggestions.push({
          key,
          name_ar: measure.name_ar,
          abbreviation: measure.abbreviation,
          category: measure.category,
          adminTime: measure.adminTime,
          adminMode: measure.adminMode,
          priority: this._measurePriority(measure, diagnosis),
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  // ──────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────

  _computeFlags(measureKey, score, tier, domainScores) {
    const flags = [];

    // FIM-specific: flag if motor or cognitive subscores diverge significantly
    if (measureKey === 'FIM' && domainScores) {
      const motorDomains = ['selfCare', 'sphincterControl', 'transfers', 'locomotion'];
      const cogDomains = ['communication', 'socialCognition'];
      const motorTotal = motorDomains.reduce((sum, d) => sum + (domainScores[d]?.score || 0), 0);
      const cogTotal = cogDomains.reduce((sum, d) => sum + (domainScores[d]?.score || 0), 0);
      const motorPct = Math.round((motorTotal / 91) * 100);
      const cogPct = Math.round((cogTotal / 35) * 100);
      if (Math.abs(motorPct - cogPct) > 25) {
        flags.push({
          type: 'discrepancy',
          message_ar: `تباين ملحوظ بين الأداء الحركي (${motorPct}%) والأداء المعرفي (${cogPct}%) — يستدعي تقييماً تخصصياً`,
        });
      }
    }

    // CARS2-specific: flag if score near cutoff boundary
    if (measureKey === 'CARS2' && score !== null) {
      if (score >= 27 && score <= 32) {
        flags.push({
          type: 'borderline',
          message_ar: 'الدرجة في المنطقة الحدودية — ينصح بتقييم تكميلي (ADOS-2 / ADI-R)',
        });
      }
    }

    // Berg Balance: flag if below 45 (fall risk cutoff)
    if (measureKey === 'BergBalance' && score !== null && score < 45) {
      flags.push({
        type: 'safety',
        message_ar: 'خطر سقوط مرتفع — يجب إخطار الفريق الطبي واتخاذ احتياطات السلامة الفورية',
      });
    }

    // CSI: flag high caregiver strain
    if (measureKey === 'CSI' && score !== null && score >= 7) {
      flags.push({
        type: 'caregiver_alert',
        message_ar: 'إجهاد مقدم الرعاية مرتفع — يستدعي تدخلاً فورياً لدعم الأسرة',
      });
    }

    return flags;
  }

  _crossMeasureAnalysis(results) {
    const insights = [];
    const errorResults = results.filter(r => r.error);
    const validResults = results.filter(r => !r.error);

    if (errorResults.length) {
      insights.push({ type: 'error', message_ar: `تعذّر تسجيل ${errorResults.length} مقاييس` });
    }

    // Check for alignment between functional and behavioral measures
    const fimResult = validResults.find(r => r.measureKey === 'FIM');
    const carsResult = validResults.find(r => r.measureKey === 'CARS2');
    const csiResult = validResults.find(r => r.measureKey === 'CSI');

    if (fimResult && carsResult) {
      if (
        fimResult.tier === 'severe' &&
        (carsResult.tier === 'severe' || carsResult.tier === 'mild_moderate')
      ) {
        insights.push({
          type: 'high_complexity',
          message_ar:
            'إعاقة مركّبة مع ضعف وظيفي واضطراب طيف التوحد — يتطلب تدخلاً مكثفاً متعدد التخصصات',
        });
      }
    }

    if (csiResult?.tier === 'high') {
      insights.push({
        type: 'family_support_urgent',
        message_ar:
          'إجهاد مقدم الرعاية مرتفع مع احتياجات مرتفعة للمستفيد — أولوية قصوى لخدمات دعم الأسرة',
      });
    }

    return { insights, validCount: validResults.length, errorCount: errorResults.length };
  }

  _mergeRecommendations(results) {
    const allRecs = results
      .filter(r => !r.error && r.recommendations)
      .flatMap(r => r.recommendations);
    // Deduplicate while preserving order
    return [...new Set(allRecs)];
  }

  _prioritizeGoals(results) {
    const allGoals = results.filter(r => !r.error && r.smartGoals).flatMap(r => r.smartGoals);
    // Return top 5 unique goals
    return [...new Set(allGoals)].slice(0, 5);
  }

  _measurePriority(measure, diagnosis) {
    // Higher priority to well-validated, shorter measures
    let score = 0;
    if (measure.reliability?.ICC > 0.9 || measure.reliability?.alpha > 0.9) score += 3;
    if (measure.adminTime <= 15) score += 2;
    if (measure.adminTime <= 30) score += 1;
    // Boost measures specifically designed for the diagnosis
    if (measure.targetPopulation?.some(p => p === diagnosis)) score += 5;
    return score;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT SESSION BUILDER — بناء جلسة تقييم كاملة
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a complete assessment session plan for a beneficiary.
 * @param {Object} beneficiary  { diagnosis, age, gmfcsLevel }
 * @returns {Object} assessmentPlan
 */
function buildAssessmentPlan(beneficiary) {
  const engine = new SmartAssessmentEngine();
  const { diagnosis, age } = beneficiary;

  const suggestedMeasures = engine.suggestMeasures(diagnosis, age);
  const totalTime = suggestedMeasures.reduce((s, m) => s + (m.adminTime || 0), 0);

  // Group by session (max 90 min per session)
  const sessions = [];
  let currentSession = [];
  let sessionTime = 0;

  for (const measure of suggestedMeasures) {
    if (sessionTime + (measure.adminTime || 0) > 90 && currentSession.length > 0) {
      sessions.push({ measures: currentSession, estimatedTime: sessionTime });
      currentSession = [];
      sessionTime = 0;
    }
    currentSession.push(measure);
    sessionTime += measure.adminTime || 0;
  }
  if (currentSession.length) {
    sessions.push({ measures: currentSession, estimatedTime: sessionTime });
  }

  return {
    beneficiary,
    suggestedMeasures,
    sessions,
    totalMeasures: suggestedMeasures.length,
    totalEstimatedMinutes: totalTime,
    plan_ar: `خطة تقييم شاملة لـ ${diagnosis}، العمر ${age} سنة — ${suggestedMeasures.length} مقياس في ${sessions.length} جلسة`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME SUMMARY GENERATOR — مولّد ملخص النتائج السريرية
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a narrative clinical summary from battery results.
 * @param {Object} batteryResult  returned by engine.scoreBattery()
 * @param {Object} beneficiary    { name_ar, age, diagnosis }
 */
function generateClinicalSummary(batteryResult, beneficiary) {
  const { batteryResults, crossAnalysis, priorityGoals } = batteryResult;
  const lines = [];

  lines.push(
    `**ملخص تقييم: ${beneficiary.name_ar || 'المستفيد'} — ${beneficiary.diagnosis || ''} — العمر: ${beneficiary.age || ''} سنة**`
  );
  lines.push('');
  lines.push('**نتائج المقاييس:**');

  for (const result of batteryResults) {
    if (result.error) continue;
    const scoreText = result.classification
      ? `المستوى ${result.classification.level}: ${result.classification.label_ar}`
      : result.rawScore !== null
        ? `الدرجة: ${result.rawScore}${result.maxScore ? ` / ${result.maxScore}` : ''}`
        : 'غير متاح';
    const interp = result.interpretation?.label_ar || '';
    lines.push(
      `- **${result.measureName}** (${result.measureKey}): ${scoreText}${interp ? ` — ${interp}` : ''}`
    );
  }

  lines.push('');
  if (crossAnalysis?.insights?.length) {
    lines.push('**ملاحظات سريرية:**');
    for (const insight of crossAnalysis.insights) {
      lines.push(`- ${insight.message_ar}`);
    }
    lines.push('');
  }

  if (priorityGoals?.length) {
    lines.push('**الأهداف ذات الأولوية:**');
    priorityGoals.forEach((g, i) => lines.push(`${i + 1}. ${g}`));
    lines.push('');
  }

  lines.push('**التوصيات الإجمالية:**');
  for (const rec of (batteryResult.overallRecommendations || []).slice(0, 8)) {
    lines.push(`- ${rec}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  SmartAssessmentEngine,
  ScoringAlgorithms,
  analyzeProgressTrend,
  generateSMARTGoals,
  buildAssessmentPlan,
  generateClinicalSummary,
  interpretScore,
  calcZScore,
  zToPercentile,
};
