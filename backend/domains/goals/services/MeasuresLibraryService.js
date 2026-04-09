/**
 * MeasuresLibraryService — خدمة مكتبة المقاييس الشاملة
 *
 * تتكامل مع ScoringEngine و MeasureApplication لتقديم:
 *  - تطبيق مقياس (مع تصحيح آلي)
 *  - تاريخ التطبيقات
 *  - مقارنة baseline/current/target
 *  - التوصيات
 *  - جداول إعادة التطبيق
 *  - لوحة تحكم المقاييس
 *
 * @module domains/goals/services/MeasuresLibraryService
 */

const mongoose = require('mongoose');
const { scoringEngine } = require('./ScoringEngine');
const logger = require('../../../utils/logger');

class MeasuresLibraryService {
  /**
   * تطبيق مقياس على مستفيد مع تصحيح آلي
   */
  async applyMeasure({
    beneficiaryId,
    episodeId,
    measureId,
    domainScores,
    purpose,
    assessorId,
    setting,
    notes,
    clinicalObservations,
    targetScore,
    branchId,
    organizationId,
  }) {
    const Measure = mongoose.model('Measure');
    const MeasureApplication = mongoose.model('MeasureApplication');

    // 1. Load measure
    const measure = await Measure.findById(measureId);
    if (!measure) {
      const err = new Error('المقياس غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // 2. Get history for comparison
    const history = await MeasureApplication.getMeasureHistory(beneficiaryId, measureId);

    // 3. Auto-score
    const scored = scoringEngine.scoreApplication(measure, domainScores);

    // 4. Calculate application number
    const applicationNumber = history.filter(h => h.status === 'completed').length + 1;

    // 5. Build application
    const applicationData = {
      beneficiaryId,
      episodeId,
      measureId,
      applicationDate: new Date(),
      applicationNumber,
      purpose: purpose || (applicationNumber === 1 ? 'baseline' : 'progress'),

      domainScores: scored.domainScores,
      totalRawScore: scored.totalRawScore,
      totalStandardScore: scored.totalStandardScore,
      compositeScore: scored.compositeScore,
      overallInterpretation: scored.overallInterpretation,
      overallInterpretation_ar: scored.overallInterpretation_ar,
      overallSeverity: scored.overallSeverity,
      matchedRule: scored.matchedRule,
      isAutoScored: scored.isAutoScored,

      assessorId,
      setting,
      notes,
      clinicalObservations,

      status: 'completed',
      branchId,
      organizationId,
      createdBy: assessorId,
    };

    // 6. Compute comparison with history
    applicationData.comparison = scoringEngine.computeComparison(
      applicationData,
      history,
      measure,
      targetScore
    );

    // 7. Calculate re-application schedule
    const schedule = scoringEngine.calculateNextApplicationDate(
      measure,
      applicationData.purpose,
      applicationData.applicationDate
    );
    if (schedule.nextDate) {
      applicationData.nextApplicationDate = schedule.nextDate;
      applicationData.reapplicationIntervalDays = schedule.intervalDays;
      applicationData.reapplicationStatus = 'scheduled';
    }

    // 8. Save
    const application = await MeasureApplication.create(applicationData);

    // 9. Record in timeline
    await this._recordTimeline({
      beneficiaryId,
      episodeId,
      eventType: 'assessment_completed',
      title: `تطبيق مقياس: ${measure.name_ar || measure.name}`,
      description: `النتيجة: ${scored.totalRawScore} — ${scored.overallInterpretation_ar || scored.overallInterpretation || ''}`,
      userId: assessorId,
      metadata: {
        measureId,
        measureCode: measure.code,
        applicationId: application._id,
        score: scored.totalRawScore,
        severity: scored.overallSeverity,
        applicationNumber,
      },
    });

    logger.info(
      `[MeasuresLibrary] Applied ${measure.code} to beneficiary ${beneficiaryId} — Score: ${scored.totalRawScore}`
    );

    return {
      application,
      scoring: scored,
      comparison: applicationData.comparison,
      nextApplicationDate: applicationData.nextApplicationDate,
    };
  }

  /**
   * الحصول على تاريخ تطبيقات مقياس معين لمستفيد
   */
  async getMeasureHistory(beneficiaryId, measureId) {
    const MeasureApplication = mongoose.model('MeasureApplication');
    const history = await MeasureApplication.getMeasureHistory(beneficiaryId, measureId);

    // Build chart data
    const chartData = history.map(h => ({
      date: h.applicationDate,
      score: h.totalRawScore,
      standardScore: h.totalStandardScore,
      severity: h.overallSeverity,
      purpose: h.purpose,
      applicationNumber: h.applicationNumber,
    }));

    return {
      applications: history,
      chartData,
      total: history.length,
      baseline: history.find(h => h.purpose === 'baseline') || history[0],
      latest: history[history.length - 1],
    };
  }

  /**
   * ملخص جميع المقاييس المطبقة على مستفيد
   */
  async getBeneficiaryMeasuresSummary(beneficiaryId) {
    const MeasureApplication = mongoose.model('MeasureApplication');
    return MeasureApplication.getLatestPerMeasure(beneficiaryId);
  }

  /**
   * توصيات المقاييس المناسبة لمستفيد
   */
  async getRecommendations(beneficiaryId) {
    return scoringEngine.recommendMeasures(beneficiaryId);
  }

  /**
   * التطبيقات المتأخرة (overdue re-applications)
   */
  async getOverdueReapplications(branchId) {
    const MeasureApplication = mongoose.model('MeasureApplication');
    return MeasureApplication.getOverdueReapplications(branchId);
  }

  /**
   * لوحة تحكم مقياس معين (إحصائيات عبر جميع المستفيدين)
   */
  async getMeasureDashboard(measureId, filters = {}) {
    const MeasureApplication = mongoose.model('MeasureApplication');
    const Measure = mongoose.model('Measure');

    const [measure, stats] = await Promise.all([
      Measure.findById(measureId).lean(),
      MeasureApplication.getMeasureDashboard(measureId, filters),
    ]);

    if (!measure) {
      const err = new Error('المقياس غير موجود');
      err.statusCode = 404;
      throw err;
    }

    const dashboardStats = stats[0] || {
      avgScore: 0,
      totalApplications: 0,
      uniqueBeneficiaries: 0,
    };

    // Count severity distribution
    const severityDist = {};
    if (dashboardStats.severityDistribution) {
      dashboardStats.severityDistribution.forEach(s => {
        severityDist[s || 'unknown'] = (severityDist[s || 'unknown'] || 0) + 1;
      });
    }

    return {
      measure: {
        id: measure._id,
        code: measure.code,
        name: measure.name,
        name_ar: measure.name_ar,
        category: measure.category,
        maxScore: measure.maxScore,
        scoringDirection: measure.scoringDirection,
      },
      statistics: {
        avgScore: dashboardStats.avgScore,
        avgStandardScore: dashboardStats.avgStandardScore,
        minScore: dashboardStats.minScore,
        maxScore: dashboardStats.maxScore,
        totalApplications: dashboardStats.totalApplications,
        uniqueBeneficiaries: dashboardStats.uniqueBeneficiaries,
        severityDistribution: severityDist,
      },
    };
  }

  /**
   * مقارنة درجات مستفيد عبر عدة مقاييس (cross-measure comparison)
   */
  async crossMeasureComparison(beneficiaryId) {
    const summary = await this.getBeneficiaryMeasuresSummary(beneficiaryId);

    // Group by category
    const byCategory = {};
    for (const entry of summary) {
      const cat = entry.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        measureName: entry.measureName_ar || entry.measureName,
        code: entry.measureCode,
        lastScore: entry.lastScore,
        lastStandardScore: entry.lastStandardScore,
        severity: entry.severity,
        lastDate: entry.lastDate,
        changeFromBaseline: entry.changeFromBaseline,
        trend: entry.trend,
      });
    }

    return {
      total: summary.length,
      byCategory,
      allMeasures: summary,
    };
  }

  // ── Private ──

  async _recordTimeline({
    beneficiaryId,
    episodeId,
    eventType,
    title,
    description,
    userId,
    metadata,
  }) {
    try {
      const CareTimeline = mongoose.model('CareTimeline');
      await CareTimeline.create({
        beneficiaryId,
        episodeId,
        eventType,
        title,
        description,
        performedBy: userId,
        metadata,
        category: 'clinical',
      });
    } catch (err) {
      logger.error(`[MeasuresLibrary] Timeline recording failed: ${err.message}`);
    }
  }
}

// Singleton
const measuresLibraryService = new MeasuresLibraryService();

module.exports = { MeasuresLibraryService, measuresLibraryService };
