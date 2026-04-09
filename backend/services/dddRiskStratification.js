'use strict';

/**
 * DDD Risk Stratification Service
 * ═══════════════════════════════════════════════════════════════════════
 * Population-level risk analysis and caseload prioritization engine.
 *
 * Features:
 *  - Multi-factor risk model (clinical, operational, social, safety)
 *  - Population segmentation into risk clusters
 *  - Risk trajectory prediction & early warning
 *  - Caseload prioritization for therapists
 *  - Resource allocation recommendations
 *  - Branch/organization benchmarking
 *  - Watchlist management for high-risk cases
 *
 * Builds on existing:
 *  - ClinicalRiskScore (individual risk scores)
 *  - DDDClinicalInsight (clinical engine evaluations)
 *  - DecisionAlert (dashboard decision alerts)
 *
 * @module dddRiskStratification
 */

const mongoose = require('mongoose');
const { Router } = require('express');

const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Watchlist Model — persistent high-risk tracking
   ═══════════════════════════════════════════════════════════════════════ */
const watchlistSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Risk classification */
    riskTier: {
      type: String,
      enum: ['tier_1_critical', 'tier_2_high', 'tier_3_elevated', 'tier_4_moderate'],
      required: true,
      index: true,
    },
    compositeRiskScore: { type: Number, min: 0, max: 100, required: true },

    /* Risk factor breakdown */
    factorScores: {
      clinical: { type: Number, min: 0, max: 100, default: 0 },
      operational: { type: Number, min: 0, max: 100, default: 0 },
      social: { type: Number, min: 0, max: 100, default: 0 },
      safety: { type: Number, min: 0, max: 100, default: 0 },
      trajectory: { type: Number, min: 0, max: 100, default: 0 },
    },

    /* Trajectory */
    trajectory: {
      type: String,
      enum: ['rapidly_worsening', 'worsening', 'stable', 'improving', 'rapidly_improving'],
      default: 'stable',
    },
    previousScores: [
      {
        score: Number,
        date: Date,
        tier: String,
      },
    ],

    /* Alerts */
    activeAlerts: [
      {
        alertType: String,
        severity: { type: String, enum: ['info', 'warning', 'critical'] },
        message: String,
        triggeredAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
      },
    ],

    /* Assignment */
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedRole: String,
    reviewFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },
    nextReviewDate: Date,
    lastReviewedAt: Date,
    lastReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: String,

    /* Status */
    status: {
      type: String,
      enum: ['active', 'under_review', 'improving', 'resolved', 'escalated'],
      default: 'active',
      index: true,
    },
    addedReason: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: String,

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

watchlistSchema.index({ riskTier: 1, branchId: 1, status: 1 });
watchlistSchema.index({ compositeRiskScore: -1 });

const DDDWatchlist =
  mongoose.models.DDDWatchlist || mongoose.model('DDDWatchlist', watchlistSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Risk Factor Weights & Thresholds
   ═══════════════════════════════════════════════════════════════════════ */
const RISK_WEIGHTS = {
  clinical: 0.35,
  operational: 0.2,
  social: 0.15,
  safety: 0.2,
  trajectory: 0.1,
};

const TIER_THRESHOLDS = {
  tier_1_critical: 75,
  tier_2_high: 55,
  tier_3_elevated: 35,
  tier_4_moderate: 15,
};

function determineTier(score) {
  if (score >= TIER_THRESHOLDS.tier_1_critical) return 'tier_1_critical';
  if (score >= TIER_THRESHOLDS.tier_2_high) return 'tier_2_high';
  if (score >= TIER_THRESHOLDS.tier_3_elevated) return 'tier_3_elevated';
  if (score >= TIER_THRESHOLDS.tier_4_moderate) return 'tier_4_moderate';
  return 'tier_4_moderate';
}

function determineTrajectory(previousScores) {
  if (!previousScores || previousScores.length < 2) return 'stable';
  const recent = previousScores.slice(0, 3);
  const diffs = [];
  for (let i = 0; i < recent.length - 1; i++) {
    diffs.push(recent[i].score - recent[i + 1].score);
  }
  const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  if (avgDiff > 15) return 'rapidly_worsening';
  if (avgDiff > 5) return 'worsening';
  if (avgDiff < -15) return 'rapidly_improving';
  if (avgDiff < -5) return 'improving';
  return 'stable';
}

/* ═══════════════════════════════════════════════════════════════════════
   3. Risk Factor Computation
   ═══════════════════════════════════════════════════════════════════════ */
async function computeRiskFactors(beneficiaryId) {
  const [
    episode,
    sessions,
    goals,
    lastAssessment,
    behaviorRecords,
    familyEvents,
    latestRiskScore,
    latestInsight,
  ] = await Promise.all([
    model('EpisodeOfCare')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    model('ClinicalSession')
      ?.find({ beneficiaryId })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean() || [],
    model('TherapeuticGoal')
      ?.find({ beneficiaryId, status: 'active', isDeleted: { $ne: true } })
      .lean() || [],
    model('ClinicalAssessment')?.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean(),
    model('BehaviorRecord')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(20).lean() || [],
    model('FamilyCommunication')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(5).lean() ||
      [],
    model('ClinicalRiskScore')?.findOne({ beneficiaryId }).sort({ calculatedAt: -1 }).lean(),
    model('DDDClinicalInsight')?.findOne({ beneficiaryId }).sort({ evaluatedAt: -1 }).lean(),
  ]);

  const factors = { clinical: 0, operational: 0, social: 0, safety: 0, trajectory: 0 };
  const alerts = [];

  /* ── Clinical Factor ────────────────────────────────────── */
  let clinicalScore = 0;

  // Assessment staleness
  if (!lastAssessment) {
    clinicalScore += 30;
  } else {
    const daysSince = (Date.now() - new Date(lastAssessment.assessmentDate).getTime()) / 86400000;
    if (daysSince > 90) clinicalScore += 25;
    else if (daysSince > 60) clinicalScore += 15;
    // Declining trends
    if (lastAssessment.trend?.direction === 'declining') {
      clinicalScore += 20;
      alerts.push({
        alertType: 'assessment_declining',
        severity: 'critical',
        message: 'Assessment scores declining',
      });
    }
  }

  // Goal stagnation
  const stalledGoals = goals.filter(g => {
    const hist = g.progressHistory || [];
    if (hist.length === 0) return true;
    const lastEntry = new Date(hist[hist.length - 1].date);
    return Date.now() - lastEntry.getTime() > 21 * 86400000;
  });
  clinicalScore += Math.min(30, stalledGoals.length * 10);
  if (stalledGoals.length >= 3) {
    alerts.push({
      alertType: 'goals_stalled',
      severity: 'warning',
      message: `${stalledGoals.length} goals stalled`,
    });
  }

  // Declining goals
  const declining = goals.filter(g => g.trend?.direction === 'declining');
  clinicalScore += Math.min(20, declining.length * 10);

  factors.clinical = Math.min(100, clinicalScore);

  /* ── Operational Factor ──────────────────────────────────── */
  let opScore = 0;

  // Attendance
  const completed = sessions.filter(s => s.status === 'completed').length;
  const noShows = sessions.filter(s =>
    ['no_show', 'cancelled', 'late_cancel'].includes(s.status)
  ).length;
  if (sessions.length > 0) {
    const missRate = noShows / sessions.length;
    opScore += Math.min(40, Math.round(missRate * 100));
    if (missRate > 0.3) {
      alerts.push({
        alertType: 'high_absence',
        severity: 'warning',
        message: `Absence rate: ${(missRate * 100).toFixed(0)}%`,
      });
    }
  }

  // Session gap
  if (sessions.length > 0) {
    const lastSession = new Date(sessions[0].scheduledDate);
    const daysSince = (Date.now() - lastSession.getTime()) / 86400000;
    if (daysSince > 14) opScore += 25;
    else if (daysSince > 7) opScore += 10;
  } else if (episode) {
    opScore += 30;
  }

  // Episode overdue
  if (episode?.expectedEndDate) {
    const overdueDays = (Date.now() - new Date(episode.expectedEndDate).getTime()) / 86400000;
    if (overdueDays > 30) opScore += 20;
    else if (overdueDays > 14) opScore += 10;
  }

  factors.operational = Math.min(100, opScore);

  /* ── Social Factor ───────────────────────────────────────── */
  let socialScore = 0;

  // Family engagement
  if (familyEvents.length === 0) {
    socialScore += 40;
    alerts.push({
      alertType: 'no_family_contact',
      severity: 'warning',
      message: 'No family engagement recorded',
    });
  } else {
    const lastContact = new Date(familyEvents[0].communicationDate || familyEvents[0].createdAt);
    const daysSince = (Date.now() - lastContact.getTime()) / 86400000;
    if (daysSince > 30) socialScore += 25;
    else if (daysSince > 14) socialScore += 10;
  }

  // No care plan
  const carePlan = await model('UnifiedCarePlan')
    ?.findOne({ beneficiaryId, status: 'active' })
    .lean();
  if (!carePlan && episode?.status === 'active') socialScore += 30;

  // Guardian engagement (check if guardian consent exists)
  const beneficiary = await model('Beneficiary')
    ?.findById(beneficiaryId)
    .select('guardians')
    .lean();
  const hasActiveGuardian = (beneficiary?.guardians || []).some(
    g => g.hasLegalGuardianship && g.consent
  );
  if (!hasActiveGuardian) socialScore += 20;

  factors.social = Math.min(100, socialScore);

  /* ── Safety Factor ───────────────────────────────────────── */
  let safetyScore = 0;

  const recentBehavior = behaviorRecords.filter(
    b => new Date(b.incidentDate || b.createdAt) > new Date(Date.now() - 14 * 86400000)
  );
  const severeBehavior = recentBehavior.filter(b => ['severe', 'crisis'].includes(b.severity));
  safetyScore += Math.min(40, recentBehavior.length * 8);
  safetyScore += Math.min(40, severeBehavior.length * 20);

  if (severeBehavior.length >= 2) {
    alerts.push({
      alertType: 'safety_concern',
      severity: 'critical',
      message: `${severeBehavior.length} severe behavior incidents in 14 days`,
    });
  }

  // Risk flags from beneficiary
  const riskFlags = (beneficiary?.riskFlags || []).filter(f => f.status === 'active');
  safetyScore += Math.min(20, riskFlags.length * 10);

  factors.safety = Math.min(100, safetyScore);

  /* ── Trajectory Factor ──────────────────────────────────── */
  if (latestInsight) {
    // Use clinical engine insight to inform trajectory risk
    const insightScore = latestInsight.clinicalScore || 50;
    factors.trajectory = Math.max(0, 100 - insightScore);
  } else if (latestRiskScore) {
    factors.trajectory = latestRiskScore.totalScore || 0;
  }

  return { factors, alerts };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Stratification Functions
   ═══════════════════════════════════════════════════════════════════════ */
async function stratifyBeneficiary(beneficiaryId) {
  const { factors, alerts } = await computeRiskFactors(beneficiaryId);

  /* Weighted composite */
  const compositeRiskScore = Math.round(
    factors.clinical * RISK_WEIGHTS.clinical +
      factors.operational * RISK_WEIGHTS.operational +
      factors.social * RISK_WEIGHTS.social +
      factors.safety * RISK_WEIGHTS.safety +
      factors.trajectory * RISK_WEIGHTS.trajectory
  );

  const riskTier = determineTier(compositeRiskScore);

  /* Find/update watchlist entry */
  let watchEntry = await DDDWatchlist.findOne({
    beneficiaryId,
    status: { $in: ['active', 'under_review'] },
  });

  const previousScores = watchEntry
    ? [
        {
          score: watchEntry.compositeRiskScore,
          date: watchEntry.updatedAt,
          tier: watchEntry.riskTier,
        },
        ...(watchEntry.previousScores || []).slice(0, 9),
      ]
    : [];

  const trajectory = determineTrajectory(previousScores);

  /* Get episode + branch */
  const episode = await model('EpisodeOfCare')
    ?.findOne({ beneficiaryId, status: 'active' })
    .select('_id branchId')
    .lean();

  if (watchEntry) {
    watchEntry.compositeRiskScore = compositeRiskScore;
    watchEntry.riskTier = riskTier;
    watchEntry.factorScores = factors;
    watchEntry.trajectory = trajectory;
    watchEntry.previousScores = previousScores;
    watchEntry.activeAlerts = alerts;
    watchEntry.episodeId = episode?._id;
    await watchEntry.save();
  } else if (compositeRiskScore >= TIER_THRESHOLDS.tier_4_moderate) {
    watchEntry = await DDDWatchlist.create({
      beneficiaryId,
      episodeId: episode?._id,
      branchId: episode?.branchId,
      riskTier,
      compositeRiskScore,
      factorScores: factors,
      trajectory,
      previousScores,
      activeAlerts: alerts,
      status: 'active',
      addedReason: `Auto-stratified: composite score ${compositeRiskScore}`,
      nextReviewDate: new Date(
        Date.now() +
          (riskTier === 'tier_1_critical' ? 1 : riskTier === 'tier_2_high' ? 3 : 7) * 86400000
      ),
      reviewFrequency:
        riskTier === 'tier_1_critical'
          ? 'daily'
          : riskTier === 'tier_2_high'
            ? 'weekly'
            : 'biweekly',
    });
  }

  return {
    beneficiaryId,
    compositeRiskScore,
    riskTier,
    factorScores: factors,
    trajectory,
    alerts,
    watchlistId: watchEntry?._id,
  };
}

async function stratifyPopulation(filter = {}) {
  const Episode = model('EpisodeOfCare');
  if (!Episode) return { stratified: 0, errors: 0, distribution: {} };

  const query = { status: 'active', ...filter };
  const episodes = await Episode.find(query).select('beneficiaryId').lean();
  const uniqueIds = [...new Set(episodes.map(e => e.beneficiaryId?.toString()).filter(Boolean))];

  let stratified = 0;
  let errors = 0;
  const distribution = {
    tier_1_critical: 0,
    tier_2_high: 0,
    tier_3_elevated: 0,
    tier_4_moderate: 0,
    low_risk: 0,
  };

  for (const bid of uniqueIds) {
    try {
      const result = await stratifyBeneficiary(bid);
      distribution[result.riskTier] = (distribution[result.riskTier] || 0) + 1;
      stratified++;
    } catch {
      errors++;
    }
  }

  // Count low risk (those not on watchlist)
  distribution.low_risk = uniqueIds.length - stratified + errors;

  return { stratified, errors, total: uniqueIds.length, distribution };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Caseload Prioritization
   ═══════════════════════════════════════════════════════════════════════ */
async function getCaseloadPriorities(therapistId, branchId) {
  /* Find all beneficiaries assigned to this therapist */
  const Episode = model('EpisodeOfCare');
  if (!Episode) return [];

  const episodeFilter = { status: 'active' };
  if (therapistId) episodeFilter['careTeam.userId'] = new mongoose.Types.ObjectId(therapistId);
  if (branchId) episodeFilter.branchId = new mongoose.Types.ObjectId(branchId);

  const episodes = await Episode.find(episodeFilter).select('beneficiaryId').lean();
  const beneficiaryIds = [...new Set(episodes.map(e => e.beneficiaryId))];

  if (beneficiaryIds.length === 0) return [];

  /* Get watchlist entries sorted by risk */
  const entries = await DDDWatchlist.find({
    beneficiaryId: { $in: beneficiaryIds },
    status: { $in: ['active', 'under_review'] },
    isDeleted: { $ne: true },
  })
    .sort({ compositeRiskScore: -1 })
    .populate('beneficiaryId', 'firstName lastName mrn disability.type')
    .lean();

  return entries.map(e => ({
    beneficiaryId: e.beneficiaryId?._id || e.beneficiaryId,
    beneficiaryName: e.beneficiaryId?.firstName
      ? `${e.beneficiaryId.firstName} ${e.beneficiaryId.lastName}`
      : 'Unknown',
    mrn: e.beneficiaryId?.mrn,
    disabilityType: e.beneficiaryId?.disability?.type,
    riskTier: e.riskTier,
    compositeScore: e.compositeRiskScore,
    trajectory: e.trajectory,
    factorScores: e.factorScores,
    alerts: e.activeAlerts,
    nextReview: e.nextReviewDate,
    reviewFrequency: e.reviewFrequency,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Watchlist Management
   ═══════════════════════════════════════════════════════════════════════ */
async function getWatchlist(filter = {}) {
  const query = { isDeleted: { $ne: true }, status: { $in: ['active', 'under_review'] } };
  if (filter.branchId) query.branchId = new mongoose.Types.ObjectId(filter.branchId);
  if (filter.riskTier) query.riskTier = filter.riskTier;

  return DDDWatchlist.find(query)
    .sort({ compositeRiskScore: -1 })
    .populate('beneficiaryId', 'firstName lastName mrn disability.type')
    .limit(filter.limit || 50)
    .lean();
}

async function reviewWatchlistEntry(watchlistId, userId, { notes, status }) {
  const entry = await DDDWatchlist.findById(watchlistId);
  if (!entry) throw new Error('Watchlist entry not found');

  entry.lastReviewedAt = new Date();
  entry.lastReviewedBy = userId;
  entry.reviewNotes = notes || entry.reviewNotes;
  if (status) entry.status = status;
  if (status === 'resolved') {
    entry.resolvedAt = new Date();
    entry.resolvedBy = userId;
    entry.resolutionNote = notes;
  }

  /* Set next review date */
  const reviewDays = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
  entry.nextReviewDate = new Date(Date.now() + (reviewDays[entry.reviewFrequency] || 7) * 86400000);

  await entry.save();
  return entry.toObject();
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Population Risk Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getRiskDashboard(branchId) {
  const match = { isDeleted: { $ne: true }, status: { $in: ['active', 'under_review'] } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const [distribution, trajectories, overdueReviews, alerts] = await Promise.all([
    DDDWatchlist.aggregate([
      { $match: match },
      {
        $group: { _id: '$riskTier', count: { $sum: 1 }, avgScore: { $avg: '$compositeRiskScore' } },
      },
      { $sort: { avgScore: -1 } },
    ]),
    DDDWatchlist.aggregate([
      { $match: match },
      { $group: { _id: '$trajectory', count: { $sum: 1 } } },
    ]),
    DDDWatchlist.countDocuments({ ...match, nextReviewDate: { $lt: new Date() } }),
    DDDWatchlist.aggregate([
      { $match: match },
      { $unwind: '$activeAlerts' },
      { $match: { 'activeAlerts.acknowledged': false } },
      { $group: { _id: '$activeAlerts.severity', count: { $sum: 1 } } },
    ]),
  ]);

  /* Factor averages across population */
  const factorAverages = await DDDWatchlist.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgClinical: { $avg: '$factorScores.clinical' },
        avgOperational: { $avg: '$factorScores.operational' },
        avgSocial: { $avg: '$factorScores.social' },
        avgSafety: { $avg: '$factorScores.safety' },
        avgTrajectory: { $avg: '$factorScores.trajectory' },
        avgComposite: { $avg: '$compositeRiskScore' },
      },
    },
  ]);

  return {
    distribution: distribution.reduce((o, d) => {
      o[d._id] = { count: d.count, avgScore: +d.avgScore.toFixed(1) };
      return o;
    }, {}),
    trajectories: trajectories.reduce((o, t) => {
      o[t._id] = t.count;
      return o;
    }, {}),
    overdueReviews,
    unacknowledgedAlerts: alerts.reduce((o, a) => {
      o[a._id] = a.count;
      return o;
    }, {}),
    factorAverages: factorAverages[0] || {},
    totalOnWatchlist: factorAverages[0]?.total || 0,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Early Warning Detection
   ═══════════════════════════════════════════════════════════════════════ */
async function detectEarlyWarnings(branchId) {
  const match = {
    isDeleted: { $ne: true },
    status: { $in: ['active', 'under_review'] },
    trajectory: { $in: ['rapidly_worsening', 'worsening'] },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return DDDWatchlist.find(match)
    .sort({ compositeRiskScore: -1 })
    .populate('beneficiaryId', 'firstName lastName mrn')
    .limit(20)
    .lean();
}

/* ═══════════════════════════════════════════════════════════════════════
   9. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createRiskStratificationRouter() {
  const router = Router();

  /* Stratify single beneficiary */
  router.post('/risk-stratification/stratify/:beneficiaryId', async (req, res) => {
    try {
      const result = await stratifyBeneficiary(req.params.beneficiaryId);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Stratify population */
  router.post('/risk-stratification/stratify-population', async (req, res) => {
    try {
      const result = await stratifyPopulation(req.body.filter || {});
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Caseload priorities */
  router.get('/risk-stratification/caseload/:therapistId', async (req, res) => {
    try {
      const priorities = await getCaseloadPriorities(req.params.therapistId, req.query.branchId);
      res.json({ success: true, priorities });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Watchlist */
  router.get('/risk-stratification/watchlist', async (req, res) => {
    try {
      const entries = await getWatchlist({
        branchId: req.query.branchId,
        riskTier: req.query.riskTier,
        limit: parseInt(req.query.limit, 10) || 50,
      });
      res.json({ success: true, entries });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Review watchlist entry */
  router.post('/risk-stratification/watchlist/:id/review', async (req, res) => {
    try {
      const entry = await reviewWatchlistEntry(req.params.id, req.body.userId, {
        notes: req.body.notes,
        status: req.body.status,
      });
      res.json({ success: true, entry });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Risk dashboard */
  router.get('/risk-stratification/dashboard', async (req, res) => {
    try {
      const dashboard = await getRiskDashboard(req.query.branchId);
      res.json({ success: true, dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Early warnings */
  router.get('/risk-stratification/early-warnings', async (req, res) => {
    try {
      const warnings = await detectEarlyWarnings(req.query.branchId);
      res.json({ success: true, warnings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDWatchlist,
  RISK_WEIGHTS,
  TIER_THRESHOLDS,
  determineTier,
  determineTrajectory,
  computeRiskFactors,
  stratifyBeneficiary,
  stratifyPopulation,
  getCaseloadPriorities,
  getWatchlist,
  reviewWatchlistEntry,
  getRiskDashboard,
  detectEarlyWarnings,
  createRiskStratificationRouter,
};
