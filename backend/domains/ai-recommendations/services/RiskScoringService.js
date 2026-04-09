/**
 * RiskScoringService — خدمة تسجيل المخاطر والتوصيات
 *
 * تنسّق بين RecommendationEngine والنماذج لإنتاج وحفظ
 * Risk Scores + Recommendations + Dashboard data
 *
 * @module domains/ai-recommendations/services/RiskScoringService
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');
const { recommendationEngine } = require('./RecommendationEngine');

// ── Risk Level Thresholds ───────────────────────────────────────────────────
const RISK_THRESHOLDS = {
  critical: 75,
  high: 50,
  moderate: 25,
  low: 0,
};

function riskLevelFromScore(score) {
  if (score >= RISK_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_THRESHOLDS.high) return 'high';
  if (score >= RISK_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

class RiskScoringService {
  // ═══════════════════════════════════════════════════════════════════════════
  // Core: Calculate risk + generate recommendations for ONE beneficiary
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * حساب المخاطر وتوليد التوصيات لمستفيد واحد
   */
  async calculateRisk(beneficiaryId, { episodeId, triggerEvent, calculatedBy } = {}) {
    const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');
    const Recommendation = mongoose.model('Recommendation');

    // 1. Run rule engine
    const ruleResults = await recommendationEngine.evaluate(beneficiaryId, episodeId);

    // 2. Collect risk factors
    const riskFactors = ruleResults
      .filter(r => r.riskFactor)
      .map(r => ({
        ...r.riskFactor,
        evidence: {
          description: r.title,
          measuredAt: new Date(),
        },
        isActive: true,
      }));

    // 3. Calculate total score (weighted average scaled to 100)
    let totalScore = 0;
    if (riskFactors.length > 0) {
      const totalWeighted = riskFactors.reduce((s, f) => s + (f.weight || 1) * (f.score || 0), 0);
      const maxPossible = riskFactors.reduce((s, f) => s + (f.weight || 1) * 10, 0);
      totalScore = maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;
    }

    // 4. Get previous score for trend
    const previous = await ClinicalRiskScore.findOne({ beneficiaryId, isDeleted: false })
      .sort({ calculatedAt: -1 })
      .lean();

    let trend = 'new';
    if (previous) {
      const diff = totalScore - previous.totalScore;
      if (diff > 5) trend = 'worsening';
      else if (diff < -5) trend = 'improving';
      else trend = 'stable';
    }

    // 5. Save risk score
    const riskScore = await ClinicalRiskScore.create({
      beneficiaryId,
      episodeId,
      totalScore,
      riskLevel: riskLevelFromScore(totalScore),
      previousScore: previous?.totalScore,
      trend,
      factors: riskFactors,
      calculatedAt: new Date(),
      calculatedBy: calculatedBy || 'system_event',
      triggerEvent,
    });

    // 6. Save recommendations
    const savedRecos = [];
    for (const result of ruleResults) {
      const reco = await Recommendation.create({
        beneficiaryId,
        episodeId,
        type: result.type,
        category: result.category,
        priority: result.priority,
        title: result.title,
        explanation: result.explanation,
        suggestedActions: result.suggestedActions || [],
        riskScoreId: riskScore._id,
        generatedBy: 'rule_engine',
        ruleCodes: [result.ruleCode],
        status: 'pending',
        expiresAt: new Date(Date.now() + 14 * 86400000), // 14 days
      });
      savedRecos.push(reco);
    }

    // 7. Link recommendations to risk score
    riskScore.recommendationIds = savedRecos.map(r => r._id);
    await riskScore.save();

    logger.info(
      `[RiskScoring] Beneficiary ${beneficiaryId}: score=${totalScore} (${riskScore.riskLevel}), ${savedRecos.length} recommendations`
    );

    return { riskScore, recommendations: savedRecos };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch: Calculate for all active beneficiaries
  // ═══════════════════════════════════════════════════════════════════════════

  async calculateBatch(branchId) {
    const EpisodeOfCare = mongoose.model('EpisodeOfCare');
    const episodes = await EpisodeOfCare.find({
      status: { $in: ['active', 'in_progress'] },
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
    })
      .select('beneficiaryId _id')
      .lean();

    const results = { processed: 0, errors: 0, highRisk: 0, critical: 0 };

    for (const ep of episodes) {
      try {
        const { riskScore } = await this.calculateRisk(ep.beneficiaryId, {
          episodeId: ep._id,
          calculatedBy: 'system_scheduled',
        });
        results.processed++;
        if (riskScore.riskLevel === 'high') results.highRisk++;
        if (riskScore.riskLevel === 'critical') results.critical++;
      } catch (err) {
        results.errors++;
        logger.warn(`[RiskScoring] Batch error for ${ep.beneficiaryId}: ${err.message}`);
      }
    }

    logger.info(
      `[RiskScoring] Batch complete: ${results.processed} processed, ${results.highRisk} high, ${results.critical} critical, ${results.errors} errors`
    );
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Queries: Risk Scores
  // ═══════════════════════════════════════════════════════════════════════════

  async getLatestRiskScore(beneficiaryId) {
    const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');
    return ClinicalRiskScore.findOne({ beneficiaryId, isDeleted: false })
      .sort({ calculatedAt: -1 })
      .lean();
  }

  async getRiskHistory(beneficiaryId, limit = 20) {
    const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');
    return ClinicalRiskScore.find({ beneficiaryId, isDeleted: false })
      .sort({ calculatedAt: -1 })
      .limit(limit)
      .lean();
  }

  async getHighRiskBeneficiaries(branchId, limit = 50) {
    const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');

    // Get latest score per beneficiary using aggregation
    const pipeline = [
      {
        $match: {
          isDeleted: false,
          riskLevel: { $in: ['high', 'critical'] },
          ...(branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {}),
        },
      },
      { $sort: { calculatedAt: -1 } },
      {
        $group: {
          _id: '$beneficiaryId',
          latestScore: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latestScore' } },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'beneficiaries',
          localField: 'beneficiaryId',
          foreignField: '_id',
          as: 'beneficiary',
        },
      },
      { $unwind: { path: '$beneficiary', preserveNullAndEmptyArrays: true } },
    ];

    return ClinicalRiskScore.aggregate(pipeline);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Queries: Recommendations
  // ═══════════════════════════════════════════════════════════════════════════

  async getPendingRecommendations(beneficiaryId) {
    const Recommendation = mongoose.model('Recommendation');
    return Recommendation.find({
      beneficiaryId,
      status: { $in: ['pending', 'viewed'] },
      isDeleted: false,
    })
      .sort({ priority: 1, createdAt: -1 })
      .lean();
  }

  async getAllRecommendations(beneficiaryId, { status, type, limit = 30 } = {}) {
    const Recommendation = mongoose.model('Recommendation');
    const filter = { beneficiaryId, isDeleted: false };
    if (status) filter.status = status;
    if (type) filter.type = type;
    return Recommendation.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async respondToRecommendation(recoId, userId, { action, note }) {
    const Recommendation = mongoose.model('Recommendation');
    const validActions = ['accepted', 'rejected', 'in_progress', 'completed'];
    if (!validActions.includes(action)) {
      throw new Error(`الإجراء غير صالح: ${action}`);
    }

    const update = {
      status: action,
      respondedAt: new Date(),
      respondedBy: userId,
    };
    if (note) update.responseNote = note;
    if (action === 'completed') update.completedAt = new Date();

    return Recommendation.findByIdAndUpdate(recoId, update, { new: true }).lean();
  }

  async markViewed(recoId, userId) {
    const Recommendation = mongoose.model('Recommendation');
    return Recommendation.findOneAndUpdate(
      { _id: recoId, status: 'pending' },
      { status: 'viewed', viewedAt: new Date(), viewedBy: userId },
      { new: true }
    ).lean();
  }

  async rateRecommendation(recoId, userId, { wasHelpful, impactNote }) {
    const Recommendation = mongoose.model('Recommendation');
    return Recommendation.findByIdAndUpdate(
      recoId,
      {
        outcome: { wasHelpful, impactNote, ratedAt: new Date(), ratedBy: userId },
      },
      { new: true }
    ).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard / Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(branchId) {
    const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');
    const Recommendation = mongoose.model('Recommendation');

    const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [riskDistribution, recoStats, topRisk, recentRecos] = await Promise.all([
      // Risk level distribution
      ClinicalRiskScore.aggregate([
        { $match: { isDeleted: false, ...branchFilter } },
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: '$beneficiaryId', latest: { $first: '$$ROOT' } } },
        { $group: { _id: '$latest.riskLevel', count: { $sum: 1 } } },
      ]),

      // Recommendation status distribution
      Recommendation.aggregate([
        { $match: { isDeleted: false, ...branchFilter } },
        {
          $group: {
            _id: { status: '$status', priority: '$priority' },
            count: { $sum: 1 },
          },
        },
      ]),

      // Top 10 highest risk
      this.getHighRiskBeneficiaries(branchId, 10),

      // Recent pending recos
      Recommendation.find({ status: 'pending', isDeleted: false, ...branchFilter })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
        .lean(),
    ]);

    // Format risk distribution
    const riskLevels = { low: 0, moderate: 0, high: 0, critical: 0 };
    riskDistribution.forEach(r => {
      if (r._id in riskLevels) riskLevels[r._id] = r.count;
    });

    // Format reco stats
    const recoSummary = { total: 0, pending: 0, accepted: 0, rejected: 0, completed: 0 };
    recoStats.forEach(r => {
      recoSummary.total += r.count;
      if (r._id.status in recoSummary) recoSummary[r._id.status] += r.count;
    });

    return {
      riskDistribution: riskLevels,
      totalBeneficiaries: Object.values(riskLevels).reduce((a, b) => a + b, 0),
      recommendations: recoSummary,
      topRiskCases: topRisk,
      recentPendingRecommendations: recentRecos,
    };
  }

  /**
   * لوحة الأولويات اليومية للأخصائي
   */
  async getTherapistPriorities(therapistId) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const Recommendation = mongoose.model('Recommendation');

    // Get beneficiaries assigned to this therapist (from recent sessions)
    const sessions = await ClinicalSession.find({
      therapistId,
      isDeleted: false,
    })
      .sort({ sessionDate: -1 })
      .limit(100)
      .select('beneficiaryId')
      .lean();

    const beneficiaryIds = [...new Set(sessions.map(s => s.beneficiaryId?.toString()))].filter(
      Boolean
    );

    // Get pending recommendations for those beneficiaries
    const recos = await Recommendation.find({
      beneficiaryId: { $in: beneficiaryIds },
      status: { $in: ['pending', 'viewed'] },
      isDeleted: false,
    })
      .sort({ priority: 1, createdAt: -1 })
      .limit(30)
      .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
      .lean();

    // Group by priority
    const grouped = { urgent: [], high: [], medium: [], low: [] };
    recos.forEach(r => {
      if (grouped[r.priority]) grouped[r.priority].push(r);
    });

    return {
      therapistId,
      totalRecommendations: recos.length,
      byPriority: grouped,
    };
  }

  /**
   * قائمة القواعد المتاحة
   */
  listRules() {
    return recommendationEngine.listRules();
  }
}

const riskScoringService = new RiskScoringService();

module.exports = { riskScoringService, RiskScoringService };
