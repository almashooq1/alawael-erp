/**
 * progress-analytics.js
 * ═══════════════════════════════════════════════════════════════
 * خدمة تحليل التقدم الإحصائي — Progress Analytics Service
 *
 * تحليلات احترافية لقياس فعالية التأهيل:
 *   1. حجم الأثر (Cohen's d) — هل التغيير مهم عملياً؟
 *   2. مؤشر التغيير الموثوق (RCI) — هل التغيير حقيقي أم عشوائي؟
 *   3. الدلالة السريرية — هل انتقل المستفيد لنطاق طبيعي؟
 *   4. تحليل الاتجاه (Trend Analysis) — ما اتجاه التقدم؟
 *   5. التنبؤ بالنتائج — متى يصل للهدف المتوقع؟
 *   6. المقارنة المعيارية — كيف يقارن بأقرانه؟
 *   7. ROI العلاجي — عائد الاستثمار في التأهيل
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

class ProgressAnalytics {
  // ══════════════════════════════════════════════════════════════
  // 1. EFFECT SIZE — حجم الأثر (Cohen's d)
  // ══════════════════════════════════════════════════════════════

  /**
   * حساب حجم الأثر باستخدام Cohen's d
   * يقيس مقدار التغيير بوحدات الانحراف المعياري
   *
   * @param {number} preScore - الدرجة القبلية
   * @param {number} postScore - الدرجة البعدية
   * @param {number} sd - الانحراف المعياري (للمعايير: 15 للدرجات المعيارية، 10 لـ T-scores)
   * @returns {object} حجم الأثر مع التفسير
   */
  static cohenD(preScore, postScore, sd = 15) {
    if (sd === 0) return { d: 0, interpretation: 'no_effect', interpretation_ar: 'لا يوجد أثر' };

    const d = (postScore - preScore) / sd;
    const absD = Math.abs(d);
    const rounded = Math.round(d * 100) / 100;

    let interpretation, interpretation_ar, color;
    if (absD < 0.2) {
      interpretation = 'negligible';
      interpretation_ar = 'أثر مهمل';
      color = '#9E9E9E';
    } else if (absD < 0.5) {
      interpretation = 'small';
      interpretation_ar = 'أثر صغير';
      color = '#FF9800';
    } else if (absD < 0.8) {
      interpretation = 'medium';
      interpretation_ar = 'أثر متوسط';
      color = '#2196F3';
    } else if (absD < 1.2) {
      interpretation = 'large';
      interpretation_ar = 'أثر كبير';
      color = '#4CAF50';
    } else {
      interpretation = 'very_large';
      interpretation_ar = 'أثر كبير جداً';
      color = '#00C853';
    }

    // Confidence interval for d (approximate)
    const seDun = Math.sqrt(2 / 30 + (d * d) / (2 * 30)); // approximate for n=30
    const ci95Lower = Math.round((d - 1.96 * seDun) * 100) / 100;
    const ci95Upper = Math.round((d + 1.96 * seDun) * 100) / 100;

    return {
      d: rounded,
      direction: d > 0 ? 'improvement' : d < 0 ? 'decline' : 'no_change',
      direction_ar: d > 0 ? 'تحسن' : d < 0 ? 'تراجع' : 'بدون تغيير',
      interpretation,
      interpretation_ar,
      color,
      confidence_interval_95: { lower: ci95Lower, upper: ci95Upper },
      clinical_summary_ar: this._effectSizeSummary(rounded, interpretation_ar),
    };
  }

  static _effectSizeSummary(d, levelAr) {
    if (d > 0) return `تحسن بمقدار ${Math.abs(d)} انحراف معياري (${levelAr}) — التدخل فعال`;
    if (d < 0) return `تراجع بمقدار ${Math.abs(d)} انحراف معياري (${levelAr}) — يتطلب مراجعة`;
    return 'لم يُلاحظ تغيير';
  }

  // ══════════════════════════════════════════════════════════════
  // 2. RELIABLE CHANGE INDEX (RCI)
  //    مؤشر التغيير الموثوق — هل التغيير حقيقي أم مصادفة؟
  // ══════════════════════════════════════════════════════════════

  /**
   * حساب مؤشر التغيير الموثوق (Jacobson & Truax, 1991)
   *
   * @param {number} preScore - القبلية
   * @param {number} postScore - البعدية
   * @param {number} sd - الانحراف المعياري المعياري
   * @param {number} reliability - معامل الثبات (مثلاً Alpha = 0.90)
   * @returns {object} RCI مع التفسير
   */
  static reliableChangeIndex(preScore, postScore, sd = 15, reliability = 0.9) {
    // Standard Error of Measurement
    const sem = sd * Math.sqrt(1 - reliability);
    // Standard Error of Difference (Sdiff)
    const sdiff = Math.sqrt(2 * sem * sem);

    if (sdiff === 0) return { rci: 0, reliable: false, interpretation_ar: 'لا يمكن الحساب' };

    const rci = (postScore - preScore) / sdiff;
    const roundedRCI = Math.round(rci * 100) / 100;
    const isReliable = Math.abs(rci) >= 1.96; // p < .05

    let interpretation, interpretation_ar, color;
    if (rci >= 1.96) {
      interpretation = 'reliable_improvement';
      interpretation_ar = 'تحسن موثوق إحصائياً (p < .05)';
      color = '#4CAF50';
    } else if (rci <= -1.96) {
      interpretation = 'reliable_deterioration';
      interpretation_ar = 'تراجع موثوق إحصائياً (p < .05)';
      color = '#F44336';
    } else {
      interpretation = 'no_reliable_change';
      interpretation_ar = 'التغيير ضمن هامش الخطأ القياسي — غير دال إحصائياً';
      color = '#9E9E9E';
    }

    return {
      rci: roundedRCI,
      sem: Math.round(sem * 100) / 100,
      sdiff: Math.round(sdiff * 100) / 100,
      reliable: isReliable,
      direction: rci > 0 ? 'improvement' : rci < 0 ? 'decline' : 'stable',
      interpretation,
      interpretation_ar,
      color,
      minimum_detectable_change: Math.round(sdiff * 1.96 * 100) / 100,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 3. CLINICAL SIGNIFICANCE
  //    الدلالة السريرية — هل عاد المستفيد للنطاق الطبيعي؟
  // ══════════════════════════════════════════════════════════════

  /**
   * تحليل الدلالة السريرية (Jacobson-Truax Method)
   *
   * @param {number} preScore - القبلية
   * @param {number} postScore - البعدية
   * @param {number} clinicalMean - متوسط المجموعة السريرية
   * @param {number} clinicalSD - انحراف المجموعة السريرية
   * @param {number} normativeMean - متوسط المجموعة المعيارية (عادة 100)
   * @param {number} normativeSD - انحراف المجموعة المعيارية (عادة 15)
   * @param {number} reliability - معامل الثبات
   */
  static clinicalSignificance(
    preScore,
    postScore,
    {
      clinicalMean = 65,
      clinicalSD = 12,
      normativeMean = 100,
      normativeSD = 15,
      reliability = 0.9,
    } = {}
  ) {
    // Cutoff C: weighted midpoint between clinical and normative means
    const cutoffC =
      (clinicalSD * normativeMean + normativeSD * clinicalMean) / (clinicalSD + normativeSD);

    // RCI
    const rciResult = this.reliableChangeIndex(preScore, postScore, normativeSD, reliability);

    // Classification (Jacobson-Truax categories)
    let category, category_ar, color;
    const crossedCutoff = preScore < cutoffC && postScore >= cutoffC;
    const reliableImprove = rciResult.rci >= 1.96;
    const reliableDecline = rciResult.rci <= -1.96;

    if (crossedCutoff && reliableImprove) {
      category = 'recovered';
      category_ar = 'تعافي — تحسن موثوق وانتقل للنطاق الطبيعي';
      color = '#00C853';
    } else if (reliableImprove && !crossedCutoff) {
      category = 'improved';
      category_ar = 'تحسن — تغيير موثوق لكن لم يصل للنطاق الطبيعي بعد';
      color = '#4CAF50';
    } else if (!reliableImprove && !reliableDecline) {
      category = 'unchanged';
      category_ar = 'بدون تغيير ملحوظ — التغيير ضمن هامش الخطأ';
      color = '#FF9800';
    } else if (reliableDecline) {
      category = 'deteriorated';
      category_ar = 'تراجع — تغيير سلبي موثوق إحصائياً';
      color = '#F44336';
    } else {
      category = 'unchanged';
      category_ar = 'بدون تغيير ملحوظ';
      color = '#FF9800';
    }

    return {
      cutoff_c: Math.round(cutoffC * 10) / 10,
      pre_zone: preScore >= cutoffC ? 'normative' : 'clinical',
      post_zone: postScore >= cutoffC ? 'normative' : 'clinical',
      crossed_cutoff: crossedCutoff,
      rci: rciResult,
      category,
      category_ar,
      color,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 4. TREND ANALYSIS — تحليل الاتجاه
  // ══════════════════════════════════════════════════════════════

  /**
   * تحليل اتجاه سلسلة من التقييمات
   * Uses simple linear regression + moving average
   *
   * @param {Array<{date: Date|string, score: number}>} dataPoints - نقاط البيانات
   * @returns {object} تحليل الاتجاه
   */
  static trendAnalysis(dataPoints) {
    if (!dataPoints || dataPoints.length < 2) {
      return { trend: 'insufficient_data', trend_ar: 'بيانات غير كافية للتحليل' };
    }

    // Convert dates to numerical x-axis (days from first)
    const sorted = [...dataPoints].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstDate = new Date(sorted[0].date).getTime();
    const points = sorted.map(p => ({
      x: (new Date(p.date).getTime() - firstDate) / (1000 * 60 * 60 * 24), // days
      y: p.score,
    }));

    // Linear Regression (least squares)
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const meanY = sumY / n;
    const ssTotal = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
    const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Rate of change per month
    const ratePerMonth = slope * 30;

    // Trend classification
    let trend, trend_ar, color;
    const slopeThreshold = 0.1; // minimum meaningful change per day
    if (slope > slopeThreshold) {
      if (rSquared > 0.7) {
        trend = 'strong_improvement';
        trend_ar = 'تحسن ثابت وقوي';
        color = '#00C853';
      } else {
        trend = 'moderate_improvement';
        trend_ar = 'تحسن تدريجي';
        color = '#4CAF50';
      }
    } else if (slope < -slopeThreshold) {
      if (rSquared > 0.7) {
        trend = 'strong_decline';
        trend_ar = 'تراجع ملحوظ';
        color = '#F44336';
      } else {
        trend = 'moderate_decline';
        trend_ar = 'تراجع تدريجي';
        color = '#FF5722';
      }
    } else {
      trend = 'stable';
      trend_ar = 'مستقر';
      color = '#FF9800';
    }

    // Variability
    const scores = points.map(p => p.y);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;
    const stdDev = Math.sqrt(scores.reduce((s, y) => s + (y - meanY) ** 2, 0) / n);
    const cv = meanY > 0 ? (stdDev / meanY) * 100 : 0; // coefficient of variation

    let variability, variability_ar;
    if (cv < 5) {
      variability = 'very_stable';
      variability_ar = 'مستقر جداً';
    } else if (cv < 15) {
      variability = 'stable';
      variability_ar = 'مستقر';
    } else if (cv < 30) {
      variability = 'moderate';
      variability_ar = 'متذبذب بشكل معتدل';
    } else {
      variability = 'high';
      variability_ar = 'متذبذب بشكل كبير';
    }

    // Moving average (window = 3)
    const movingAvg = [];
    const window = Math.min(3, Math.floor(n / 2) || 1);
    for (let i = 0; i <= n - window; i++) {
      const windowPoints = points.slice(i, i + window);
      const avg = windowPoints.reduce((s, p) => s + p.y, 0) / window;
      movingAvg.push({
        date: sorted[i + Math.floor(window / 2)]?.date,
        score: Math.round(avg * 10) / 10,
      });
    }

    return {
      trend,
      trend_ar,
      color,
      regression: {
        slope: Math.round(slope * 1000) / 1000,
        intercept: Math.round(intercept * 10) / 10,
        r_squared: Math.round(rSquared * 1000) / 1000,
        rate_per_month: Math.round(ratePerMonth * 10) / 10,
      },
      statistics: {
        n,
        mean: Math.round(meanY * 10) / 10,
        min: minScore,
        max: maxScore,
        range,
        std_dev: Math.round(stdDev * 10) / 10,
        coefficient_of_variation: Math.round(cv * 10) / 10,
      },
      variability,
      variability_ar,
      moving_average: movingAvg,
      first_score: sorted[0].score,
      last_score: sorted[n - 1].score,
      total_change: Math.round((sorted[n - 1].score - sorted[0].score) * 10) / 10,
      days_span: Math.round(points[n - 1].x),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 5. GOAL ATTAINMENT PREDICTION — التنبؤ بوصول الهدف
  // ══════════════════════════════════════════════════════════════

  /**
   * توقع متى سيصل المستفيد لدرجة الهدف
   *
   * @param {Array<{date: Date|string, score: number}>} dataPoints
   * @param {number} targetScore - الدرجة المستهدفة
   * @returns {object} التنبؤ
   */
  static predictGoalAttainment(dataPoints, targetScore) {
    const trendResult = this.trendAnalysis(dataPoints);
    if (trendResult.trend === 'insufficient_data') {
      return { prediction: 'insufficient_data', prediction_ar: 'بيانات غير كافية للتنبؤ' };
    }

    const { slope, intercept } = trendResult.regression;
    const lastPoint = dataPoints[dataPoints.length - 1];
    const lastScore = lastPoint.score;
    const lastDate = new Date(lastPoint.date);

    if (lastScore >= targetScore) {
      return {
        prediction: 'already_achieved',
        prediction_ar: 'الهدف محقق بالفعل',
        current_score: lastScore,
        target_score: targetScore,
      };
    }

    if (slope <= 0) {
      return {
        prediction: 'not_achievable_current_rate',
        prediction_ar: 'لا يمكن الوصول للهدف بالمعدل الحالي — يتطلب تعديل الخطة',
        current_score: lastScore,
        target_score: targetScore,
        gap: targetScore - lastScore,
        current_rate_per_month: trendResult.regression.rate_per_month,
      };
    }

    // Days to target
    const daysToTarget = (targetScore - lastScore) / slope;
    const predictedDate = new Date(lastDate);
    predictedDate.setDate(predictedDate.getDate() + Math.round(daysToTarget));

    // Confidence based on R²
    const confidence = Math.round(trendResult.regression.r_squared * 100);

    let prediction_ar;
    if (daysToTarget <= 90) {
      prediction_ar = `متوقع الوصول خلال ${Math.round(daysToTarget)} يوم (بثقة ${confidence}%)`;
    } else if (daysToTarget <= 365) {
      prediction_ar = `متوقع الوصول خلال ${Math.round(daysToTarget / 30)} شهر (بثقة ${confidence}%)`;
    } else {
      prediction_ar = `متوقع الوصول خلال ${(daysToTarget / 365).toFixed(1)} سنة — قد يحتاج لتكثيف التدخل`;
    }

    return {
      prediction: 'achievable',
      prediction_ar,
      current_score: lastScore,
      target_score: targetScore,
      gap: Math.round((targetScore - lastScore) * 10) / 10,
      days_to_target: Math.round(daysToTarget),
      predicted_date: predictedDate.toISOString().split('T')[0],
      confidence_percentage: confidence,
      current_rate_per_month: trendResult.regression.rate_per_month,
      required_rate_per_month_for_6_months: Math.round(((targetScore - lastScore) / 6) * 10) / 10,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 6. BENCHMARKING — المقارنة المعيارية
  // ══════════════════════════════════════════════════════════════

  /**
   * مقارنة تقدم المستفيد بالمعايير الإقليمية
   */
  static benchmark(
    currentScore,
    {
      normMean = 100,
      normSD = 15,
      clinicalGroupMean = 68,
      clinicalGroupSD = 12,
      ageGroupMean = null,
      diagnosisGroupMean = null,
    } = {}
  ) {
    const zNorm = (currentScore - normMean) / normSD;
    const zClinical = (currentScore - clinicalGroupMean) / clinicalGroupSD;
    const percentileNorm = this._zToPercentile(zNorm);
    const percentileClinical = this._zToPercentile(zClinical);

    const result = {
      current_score: currentScore,
      vs_normative: {
        z_score: Math.round(zNorm * 100) / 100,
        percentile: percentileNorm,
        description_ar: `في الرتبة المئينية ${percentileNorm} مقارنة بالأطفال الطبيعيين`,
      },
      vs_clinical_group: {
        z_score: Math.round(zClinical * 100) / 100,
        percentile: percentileClinical,
        description_ar: `في الرتبة المئينية ${percentileClinical} مقارنة بأقرانه من ذوي الإعاقة`,
      },
    };

    if (ageGroupMean != null) {
      const zAge = (currentScore - ageGroupMean) / normSD;
      result.vs_age_group = {
        z_score: Math.round(zAge * 100) / 100,
        percentile: this._zToPercentile(zAge),
        description_ar: `مقارنة بأقرانه في نفس العمر: الرتبة المئينية ${this._zToPercentile(zAge)}`,
      };
    }

    if (diagnosisGroupMean != null) {
      const zDiag = (currentScore - diagnosisGroupMean) / clinicalGroupSD;
      result.vs_diagnosis_group = {
        z_score: Math.round(zDiag * 100) / 100,
        percentile: this._zToPercentile(zDiag),
        description_ar: `مقارنة بأقرانه بنفس التشخيص: الرتبة المئينية ${this._zToPercentile(zDiag)}`,
      };
    }

    return result;
  }

  static _zToPercentile(z) {
    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327;
    const p =
      d *
      Math.exp((-z * z) / 2) *
      (0.3193815 * t -
        0.3565638 * t * t +
        1.781478 * t * t * t -
        1.821256 * t * t * t * t +
        1.3302744 * t * t * t * t * t);
    const percentile = z > 0 ? (1 - p) * 100 : p * 100;
    return Math.round(percentile * 10) / 10;
  }

  // ══════════════════════════════════════════════════════════════
  // 7. COMPREHENSIVE PROGRESS REPORT
  //    تقرير تقدم شامل
  // ══════════════════════════════════════════════════════════════

  /**
   * توليد تقرير تقدم شامل
   */
  static generateProgressReport({
    beneficiaryName,
    diagnosis,
    enrollmentDate,
    assessments, // [{date, scores: {domain: score}}]
    goals, // [{name, baseline, target, current}]
    attendance, // {attended, total}
    behaviorData, // [{date, frequency}]
  }) {
    const report = {
      generated_at: new Date().toISOString(),
      beneficiary_name: beneficiaryName,
      diagnosis,
      enrollment_date: enrollmentDate,
      duration_months: this._monthsBetween(new Date(enrollmentDate), new Date()),
    };

    // Assessment progress per domain
    if (assessments && assessments.length >= 2) {
      const first = assessments[0];
      const last = assessments[assessments.length - 1];
      report.domain_progress = {};

      const allDomains = new Set();
      assessments.forEach(a => Object.keys(a.scores || {}).forEach(d => allDomains.add(d)));

      for (const domain of allDomains) {
        const domainPoints = assessments
          .filter(a => a.scores?.[domain] != null)
          .map(a => ({ date: a.date, score: a.scores[domain] }));

        if (domainPoints.length < 2) continue;

        const pre = domainPoints[0].score;
        const post = domainPoints[domainPoints.length - 1].score;

        report.domain_progress[domain] = {
          pre_score: pre,
          post_score: post,
          change: Math.round((post - pre) * 10) / 10,
          effect_size: this.cohenD(pre, post),
          rci: this.reliableChangeIndex(pre, post),
          clinical_significance: this.clinicalSignificance(pre, post),
          trend: this.trendAnalysis(domainPoints),
        };
      }
    }

    // Goal attainment
    if (goals) {
      report.goal_attainment = {
        total_goals: goals.length,
        achieved: goals.filter(g => g.current >= g.target).length,
        in_progress: goals.filter(g => g.current > g.baseline && g.current < g.target).length,
        not_started: goals.filter(g => g.current <= g.baseline).length,
        percentage:
          goals.length > 0
            ? Math.round((goals.filter(g => g.current >= g.target).length / goals.length) * 100)
            : 0,
        details: goals.map(g => ({
          name: g.name,
          baseline: g.baseline,
          target: g.target,
          current: g.current,
          progress_percentage:
            g.target > g.baseline
              ? Math.round(((g.current - g.baseline) / (g.target - g.baseline)) * 100)
              : 100,
          status:
            g.current >= g.target
              ? 'achieved'
              : g.current > g.baseline
                ? 'progressing'
                : 'not_started',
        })),
      };
    }

    // Attendance
    if (attendance) {
      const rate =
        attendance.total > 0 ? Math.round((attendance.attended / attendance.total) * 100) : 0;
      report.attendance = {
        attended: attendance.attended,
        total: attendance.total,
        rate,
        rating: rate >= 90 ? 'excellent' : rate >= 75 ? 'good' : rate >= 60 ? 'fair' : 'poor',
        rating_ar: rate >= 90 ? 'ممتاز' : rate >= 75 ? 'جيد' : rate >= 60 ? 'مقبول' : 'ضعيف',
      };
    }

    // Behavior trends
    if (behaviorData && behaviorData.length >= 2) {
      report.behavior_trend = this.trendAnalysis(
        behaviorData.map(b => ({ date: b.date, score: b.frequency }))
      );
      // For behavior, decreasing is improvement
      if (report.behavior_trend.regression.slope < 0) {
        report.behavior_trend.behavior_interpretation_ar =
          'السلوكيات المشكلة في تناقص — اتجاه إيجابي';
      } else if (report.behavior_trend.regression.slope > 0) {
        report.behavior_trend.behavior_interpretation_ar =
          'السلوكيات المشكلة في تزايد — يتطلب مراجعة';
      } else {
        report.behavior_trend.behavior_interpretation_ar = 'السلوكيات المشكلة مستقرة';
      }
    }

    // Overall summary
    report.overall_summary = this._generateSummary(report);

    return report;
  }

  static _monthsBetween(d1, d2) {
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30));
  }

  static _generateSummary(report) {
    const parts = [];
    const duration = report.duration_months;

    parts.push(`مدة الالتحاق: ${duration} شهر.`);

    // Domain progress summary
    if (report.domain_progress) {
      const improvedDomains = Object.entries(report.domain_progress)
        .filter(([, d]) => d.effect_size?.d > 0.2)
        .map(([name]) => name);
      const declinedDomains = Object.entries(report.domain_progress)
        .filter(([, d]) => d.effect_size?.d < -0.2)
        .map(([name]) => name);

      if (improvedDomains.length) {
        parts.push(`تحسن ملحوظ في: ${improvedDomains.join('، ')}.`);
      }
      if (declinedDomains.length) {
        parts.push(`تراجع في: ${declinedDomains.join('، ')} — يتطلب مراجعة.`);
      }
    }

    // Goals
    if (report.goal_attainment) {
      parts.push(
        `الأهداف: تحقق ${report.goal_attainment.percentage}% (${report.goal_attainment.achieved} من ${report.goal_attainment.total_goals}).`
      );
    }

    // Attendance
    if (report.attendance) {
      parts.push(`الحضور: ${report.attendance.rate}% (${report.attendance.rating_ar}).`);
    }

    return parts.join(' ');
  }

  // ══════════════════════════════════════════════════════════════
  // 8. THERAPEUTIC ROI — عائد الاستثمار العلاجي
  // ══════════════════════════════════════════════════════════════

  /**
   * حساب عائد الاستثمار العلاجي
   * يقارن التكلفة بمقدار التقدم المحقق
   */
  static therapeuticROI({
    totalCost, // التكلفة الإجمالية
    totalSessions, // عدد الجلسات
    preScore, // الدرجة القبلية
    postScore, // الدرجة البعدية
    normativeSD = 15,
  }) {
    const improvement = postScore - preScore;
    const costPerSession = totalSessions > 0 ? Math.round(totalCost / totalSessions) : 0;
    const costPerPoint = improvement > 0 ? Math.round(totalCost / improvement) : null;
    const effectSize = this.cohenD(preScore, postScore, normativeSD);

    // Cost-effectiveness: cost per 0.1 SD improvement
    const costPerSmallEffect =
      effectSize.d > 0 ? Math.round(totalCost / (effectSize.d * 10)) : null;

    return {
      total_cost: totalCost,
      total_sessions: totalSessions,
      cost_per_session: costPerSession,
      improvement_points: improvement,
      cost_per_point: costPerPoint,
      effect_size: effectSize,
      cost_effectiveness: {
        cost_per_sd_improvement: costPerSmallEffect,
        rating:
          effectSize.d >= 0.8
            ? 'excellent'
            : effectSize.d >= 0.5
              ? 'good'
              : effectSize.d >= 0.2
                ? 'moderate'
                : 'needs_review',
        rating_ar:
          effectSize.d >= 0.8
            ? 'فعالية عالية'
            : effectSize.d >= 0.5
              ? 'فعالية جيدة'
              : effectSize.d >= 0.2
                ? 'فعالية متوسطة'
                : 'يتطلب مراجعة',
      },
    };
  }
}

module.exports = ProgressAnalytics;
