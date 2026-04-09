/**
 * ScoringEngine — محرك التصحيح والتفسير الآلي
 *
 * يحسب الدرجات الكلية، يفسّر النتائج، يقارن مع baseline/previous/target
 * ويحدد ما إذا كان التغيير ذا دلالة سريرية (MCID).
 *
 * @module domains/goals/services/ScoringEngine
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

class ScoringEngine {
  /**
   * تصحيح تطبيق مقياس كامل
   *
   * @param {Object} measure — مستند المقياس (Measure)
   * @param {Object[]} domainScores — الدرجات المدخلة لكل بُعد
   * @returns {Object} النتائج الكاملة مع التفسير
   */
  scoreApplication(measure, domainScores) {
    const scoredDomains = [];
    let totalRawScore = 0;
    let weightedSum = 0;
    let totalWeight = 0;

    for (const inputDomain of domainScores) {
      // Find the domain definition in the measure
      const domainDef = (measure.domains || []).find(d => d.key === inputDomain.domainKey);

      // Calculate raw score from items
      let rawScore = inputDomain.rawScore;
      if (inputDomain.itemScores && inputDomain.itemScores.length > 0) {
        rawScore = inputDomain.itemScores.reduce((sum, item) => sum + (item.rawScore || 0), 0);
      }

      // Domain weight
      const weight = domainDef?.weight || 1;
      weightedSum += rawScore * weight;
      totalWeight += weight;
      totalRawScore += rawScore;

      // Interpret domain score
      const interpretation = this._interpretDomainScore(measure, domainDef, rawScore);

      scoredDomains.push({
        domainKey: inputDomain.domainKey,
        domainName: domainDef?.name || inputDomain.domainKey,
        domainName_ar: domainDef?.name_ar,
        itemScores: inputDomain.itemScores || [],
        rawScore,
        standardScore: inputDomain.standardScore,
        percentile: inputDomain.percentile,
        ageEquivalent: inputDomain.ageEquivalent,
        scaledScore: inputDomain.scaledScore,
        ...interpretation,
      });
    }

    // Overall score
    const compositeScore =
      totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : totalRawScore;

    // Overall interpretation
    const overallInterpretation = this._interpretTotalScore(measure, totalRawScore);

    return {
      domainScores: scoredDomains,
      totalRawScore,
      compositeScore,
      ...overallInterpretation,
      isAutoScored: true,
    };
  }

  /**
   * مقارنة مع الـ baseline والتطبيق السابق والهدف
   *
   * @param {Object} currentApplication — التطبيق الحالي
   * @param {Object[]} history — سجل التطبيقات السابقة (مرتبة تصاعدياً بالتاريخ)
   * @param {Object} measure — المقياس
   * @param {number} [targetScore] — الدرجة المستهدفة (اختياري)
   * @returns {Object} بيانات المقارنة
   */
  computeComparison(currentApplication, history, measure, targetScore) {
    const comparison = {
      baselineScore: null,
      baselineDate: null,
      previousScore: null,
      previousDate: null,
      targetScore: targetScore || null,
      changeFromBaseline: null,
      changeFromBaselinePercent: null,
      changeFromPrevious: null,
      changeFromPreviousPercent: null,
      progressToTarget: null,
      trend: 'insufficient_data',
      isClinicallySignificant: false,
    };

    const currentScore = currentApplication.totalRawScore;

    // Baseline = first completed application
    const baseline =
      history.find(h => h.purpose === 'baseline' && h.status === 'completed') || history[0]; // fallback to first
    if (baseline) {
      comparison.baselineScore = baseline.totalRawScore;
      comparison.baselineDate = baseline.applicationDate;
      comparison.changeFromBaseline = currentScore - baseline.totalRawScore;
      if (baseline.totalRawScore !== 0) {
        comparison.changeFromBaselinePercent = Math.round(
          ((currentScore - baseline.totalRawScore) / Math.abs(baseline.totalRawScore)) * 100
        );
      }
    }

    // Previous = last completed before current
    const previousApps = history.filter(
      h =>
        h.status === 'completed' &&
        new Date(h.applicationDate) < new Date(currentApplication.applicationDate)
    );
    const previous = previousApps[previousApps.length - 1];
    if (previous) {
      comparison.previousScore = previous.totalRawScore;
      comparison.previousDate = previous.applicationDate;
      comparison.changeFromPrevious = currentScore - previous.totalRawScore;
      if (previous.totalRawScore !== 0) {
        comparison.changeFromPreviousPercent = Math.round(
          ((currentScore - previous.totalRawScore) / Math.abs(previous.totalRawScore)) * 100
        );
      }
    }

    // Target progress
    if (targetScore != null && comparison.baselineScore != null) {
      const totalRange = targetScore - comparison.baselineScore;
      if (totalRange !== 0) {
        comparison.progressToTarget = Math.round(
          ((currentScore - comparison.baselineScore) / totalRange) * 100
        );
      }
    }

    // Trend (using last 3+ data points)
    const completedHistory = history.filter(h => h.status === 'completed');
    comparison.trend = this._calculateTrend(completedHistory, measure);

    // Clinical significance (MCID)
    if (measure.psychometrics?.mcid && comparison.changeFromBaseline != null) {
      const direction = measure.scoringDirection === 'lower_better' ? -1 : 1;
      comparison.isClinicallySignificant =
        Math.abs(comparison.changeFromBaseline) >= measure.psychometrics.mcid &&
        comparison.changeFromBaseline * direction > 0;
    }

    return comparison;
  }

  /**
   * حساب تاريخ إعادة التطبيق القادم
   */
  calculateNextApplicationDate(measure, purpose, lastDate) {
    const intervalMap = {
      baseline: 90,
      progress: 90,
      screening: 180,
      periodic: 90,
      discharge: null,
      research: 30,
    };

    // Use administrationTime hints or default intervals
    const intervalDays = intervalMap[purpose] || 90;
    if (!intervalDays) return { nextDate: null, intervalDays: null };

    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    return { nextDate, intervalDays };
  }

  /**
   * توصية المقاييس المناسبة لمستفيد
   */
  async recommendMeasures(beneficiaryId) {
    try {
      const Beneficiary = mongoose.model('Beneficiary');
      const Measure = mongoose.model('Measure');
      const MeasureApplication = mongoose.model('MeasureApplication');

      const beneficiary = await Beneficiary.findById(beneficiaryId).lean({ virtuals: true });
      if (!beneficiary) return [];

      const ageInMonths =
        beneficiary.ageInMonths ||
        (beneficiary.personalInfo?.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(beneficiary.personalInfo.dateOfBirth)) /
                (1000 * 60 * 60 * 24 * 30.44)
            )
          : null);
      const disabilityType = beneficiary.disability?.type;

      // Get all applicable measures
      const applicable = await Measure.findApplicable(ageInMonths, disabilityType);

      // Get already applied measures
      const applied = await MeasureApplication.getLatestPerMeasure(beneficiaryId);
      const appliedMap = {};
      applied.forEach(a => {
        appliedMap[a.measureId.toString()] = a;
      });

      // Build recommendations
      const recommendations = applicable.map(m => {
        const lastApp = appliedMap[m._id.toString()];
        const isOverdue =
          lastApp?.nextApplicationDate && new Date() > new Date(lastApp.nextApplicationDate);

        return {
          measureId: m._id,
          code: m.code,
          name: m.name,
          name_ar: m.name_ar,
          category: m.category,
          priority: isOverdue ? 'high' : lastApp ? 'normal' : 'recommended',
          reason: isOverdue
            ? 'موعد إعادة التطبيق متأخر'
            : !lastApp
              ? 'لم يُطبَّق بعد — مناسب للمستفيد'
              : 'تطبيق دوري',
          lastApplication: lastApp
            ? {
                date: lastApp.lastDate,
                score: lastApp.lastScore,
                trend: lastApp.trend,
              }
            : null,
          isOverdue,
          neverApplied: !lastApp,
        };
      });

      // Sort: overdue first, then never-applied, then normal
      const priorityOrder = { high: 0, recommended: 1, normal: 2 };
      recommendations.sort(
        (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      );

      return recommendations;
    } catch (err) {
      logger.error(`[ScoringEngine] recommendMeasures failed: ${err.message}`);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Private helpers
  // ═══════════════════════════════════════════════════════════════════

  _interpretDomainScore(measure, domainDef, rawScore) {
    // Use scoring rules if available at domain level
    if (domainDef?.scoringRules) {
      const rule = domainDef.scoringRules.find(
        r => rawScore >= r.minScore && rawScore <= r.maxScore
      );
      if (rule) {
        return {
          interpretation: rule.interpretation,
          interpretation_ar: rule.interpretation_ar,
          severity: rule.severity,
        };
      }
    }
    // Fallback to measure-level scoring rules
    return this._interpretTotalScore(measure, rawScore);
  }

  _interpretTotalScore(measure, totalScore) {
    const result = {
      overallInterpretation: null,
      overallInterpretation_ar: null,
      overallSeverity: null,
      matchedRule: null,
    };

    if (!measure.scoringRules || measure.scoringRules.length === 0) return result;

    const rule = measure.scoringRules.find(
      r => totalScore >= r.minScore && totalScore <= r.maxScore
    );

    if (rule) {
      result.overallInterpretation = rule.interpretation;
      result.overallInterpretation_ar = rule.interpretation_ar;
      result.overallSeverity = rule.severity;
      result.matchedRule = {
        rangeLabel: rule.rangeLabel,
        rangeLabel_ar: rule.rangeLabel_ar,
        color: rule.color,
      };
    }

    return result;
  }

  _calculateTrend(history, measure) {
    if (history.length < 2) return 'insufficient_data';

    const scores = history.map(h => h.totalRawScore).filter(s => s != null);
    if (scores.length < 2) return 'insufficient_data';

    // Simple linear trend on last 5 points
    const recent = scores.slice(-5);
    const n = recent.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = recent.reduce((s, v) => s + v, 0);
    const sumXY = recent.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = recent.reduce((s, _, i) => s + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Invert for lower_better measures
    const direction = measure.scoringDirection === 'lower_better' ? -1 : 1;
    const normalizedSlope = slope * direction;

    // Use SEM or 5% threshold for significance
    const threshold = measure.psychometrics?.sem || (sumY / n) * 0.05;

    if (normalizedSlope > threshold) return 'improving';
    if (normalizedSlope < -threshold) return 'declining';
    return 'stable';
  }
}

// Singleton
const scoringEngine = new ScoringEngine();

module.exports = { ScoringEngine, scoringEngine };
