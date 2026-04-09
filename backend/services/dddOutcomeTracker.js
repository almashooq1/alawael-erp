'use strict';

/**
 * DDD Outcome Tracker
 * ═══════════════════════════════════════════════════════════════════════
 * Treatment outcome measurement & effectiveness analysis engine.
 *
 * Features:
 *  - Pre/post treatment comparison (baseline → current → discharge)
 *  - Effect size calculations (Cohen's d, Glass's Δ)
 *  - Goal Attainment Scaling (GAS)
 *  - Intervention comparison across beneficiaries
 *  - Outcome prediction from historical patterns
 *  - Discharge readiness scoring
 *  - Population-level outcome dashboards
 *
 * Relies on:
 *  - MeasureApplication (pre/post scores)
 *  - TherapeuticGoal (progress tracking)
 *  - ClinicalAssessment (domain scores)
 *  - EpisodeOfCare (episode outcomes)
 *  - ClinicalSession (session-level progress)
 *
 * @module dddOutcomeTracker
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
   1. Outcome Summary Model
   ═══════════════════════════════════════════════════════════════════════ */
const outcomeSnapshotSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EpisodeOfCare',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Snapshot type */
    snapshotType: {
      type: String,
      enum: ['baseline', 'progress', 'discharge', 'follow_up', 'periodic'],
      required: true,
      index: true,
    },

    /* Overall outcome metrics */
    overallOutcomeScore: { type: Number, min: 0, max: 100 },
    overallStatus: {
      type: String,
      enum: [
        'significantly_improved',
        'improved',
        'maintained',
        'minimal_change',
        'declined',
        'significantly_declined',
      ],
    },

    /* Goal Attainment Scaling */
    gasScore: {
      totalGAS: Number,
      tScore: Number, // T-score (mean 50, SD 10)
      goalsEvaluated: Number,
      goalDetails: [
        {
          goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
          title: String,
          weight: { type: Number, default: 1 },
          expectedLevel: { type: Number, default: 0 }, // -2 to +2 scale
          achievedLevel: Number,
          baselineProgress: Number,
          currentProgress: Number,
          targetProgress: Number,
        },
      ],
    },

    /* Effect sizes — per measure */
    effectSizes: [
      {
        measureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Measure' },
        measureName: String,
        baselineScore: Number,
        currentScore: Number,
        baselineSD: Number,
        pooledSD: Number,
        cohensD: Number, // Cohen's d
        glassDelta: Number, // Glass's Δ
        percentChange: Number,
        interpretation: {
          type: String,
          enum: [
            'large_positive',
            'medium_positive',
            'small_positive',
            'negligible',
            'small_negative',
            'medium_negative',
            'large_negative',
          ],
        },
        isClinicallySignificant: Boolean,
        mcid: Number, // Minimal Clinically Important Difference
      },
    ],

    /* Domain-level outcomes */
    domainOutcomes: [
      {
        domain: String,
        baselineScore: Number,
        currentScore: Number,
        percentChange: Number,
        trend: { type: String, enum: ['improving', 'stable', 'declining'] },
      },
    ],

    /* Treatment metrics */
    treatmentMetrics: {
      totalSessions: Number,
      completedSessions: Number,
      attendanceRate: Number,
      averageGoalProgress: Number,
      goalsAchieved: Number,
      goalsTotal: Number,
      episodeDurationDays: Number,
      sessionsPerWeek: Number,
    },

    /* Discharge readiness */
    dischargeReadiness: {
      score: { type: Number, min: 0, max: 100 },
      isReady: Boolean,
      criteria: [
        {
          criterion: String,
          met: Boolean,
          weight: { type: Number, default: 1 },
          evidence: String,
        },
      ],
      recommendation: {
        type: String,
        enum: ['discharge', 'continue', 'step_down', 'step_up', 'refer'],
      },
      estimatedSessionsRemaining: Number,
    },

    /* Prediction */
    prediction: {
      expectedOutcomeScore: Number,
      expectedDischargeDate: Date,
      confidence: { type: Number, min: 0, max: 1 },
      predictedGoalAchievement: Number, // percentage
      basedOnSampleSize: Number,
    },

    /* Metadata */
    evaluatedAt: { type: Date, default: Date.now },
    evaluatedBy: { type: String, default: 'system' },
    processingTimeMs: Number,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

outcomeSnapshotSchema.index({ beneficiaryId: 1, episodeId: 1, snapshotType: 1, evaluatedAt: -1 });
outcomeSnapshotSchema.index({ branchId: 1, snapshotType: 1, evaluatedAt: -1 });

const DDDOutcomeSnapshot =
  mongoose.models.DDDOutcomeSnapshot || mongoose.model('DDDOutcomeSnapshot', outcomeSnapshotSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Effect Size Calculations
   ═══════════════════════════════════════════════════════════════════════ */
function cohensD(mean1, mean2, sd1, sd2) {
  const pooledSD = Math.sqrt((sd1 * sd1 + sd2 * sd2) / 2);
  if (pooledSD === 0) return 0;
  return (mean2 - mean1) / pooledSD;
}

function glassDelta(mean1, mean2, sdBaseline) {
  if (sdBaseline === 0) return 0;
  return (mean2 - mean1) / sdBaseline;
}

function interpretEffectSize(d) {
  const abs = Math.abs(d);
  const direction = d >= 0 ? 'positive' : 'negative';
  if (abs >= 0.8) return `large_${direction}`;
  if (abs >= 0.5) return `medium_${direction}`;
  if (abs >= 0.2) return `small_${direction}`;
  return 'negligible';
}

/* ═══════════════════════════════════════════════════════════════════════
   3. Goal Attainment Scaling (GAS)
   ═══════════════════════════════════════════════════════════════════════ */
function calculateGAS(goals) {
  if (!goals || goals.length === 0)
    return { totalGAS: 0, tScore: 50, goalsEvaluated: 0, goalDetails: [] };

  const goalDetails = goals.map(g => {
    const baseline = g.baseline?.value || 0;
    const current = g.currentProgress || 0;
    const target = g.target?.value || 100;

    // GAS level: -2 (much less), -1 (less), 0 (expected), +1 (more), +2 (much more)
    let achievedLevel;
    const ratio = target > baseline ? (current - baseline) / (target - baseline) : 0;
    if (ratio >= 1.25) achievedLevel = 2;
    else if (ratio >= 1.0) achievedLevel = 1;
    else if (ratio >= 0.75) achievedLevel = 0;
    else if (ratio >= 0.5) achievedLevel = -1;
    else achievedLevel = -2;

    return {
      goalId: g._id,
      title: g.title,
      weight: 1,
      expectedLevel: 0,
      achievedLevel,
      baselineProgress: baseline,
      currentProgress: current,
      targetProgress: target,
    };
  });

  const n = goalDetails.length;
  const sumLevels = goalDetails.reduce((s, g) => s + g.achievedLevel, 0);
  const sumSquares = goalDetails.reduce((s, g) => s + g.achievedLevel * g.achievedLevel, 0);

  // GAS T-Score formula: T = 50 + (10 * Σ(xi*wi)) / √(0.7 * Σ(wi²) + 0.3 * (Σwi)²)
  const sumWeights = n;
  const sumWeightsSq = n;
  const denominator = Math.sqrt(0.7 * sumSquares + 0.3 * sumWeights * sumWeights);
  const tScore = denominator > 0 ? 50 + (10 * sumLevels) / Math.sqrt(0.7 * n + 0.3 * n * n) : 50;

  return {
    totalGAS: sumLevels,
    tScore: +tScore.toFixed(2),
    goalsEvaluated: n,
    goalDetails,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Discharge Readiness Scoring
   ═══════════════════════════════════════════════════════════════════════ */
function evaluateDischargeReadiness(ctx) {
  const criteria = [];

  /* Goal achievement ≥80% */
  const activeGoals = (ctx.goals || []).filter(g => ['active', 'achieved'].includes(g.status));
  const achieved = activeGoals.filter(g => g.status === 'achieved' || g.currentProgress >= 90);
  const goalRate = activeGoals.length > 0 ? achieved.length / activeGoals.length : 0;
  criteria.push({
    criterion: 'Goal achievement ≥80%',
    met: goalRate >= 0.8,
    weight: 3,
    evidence: `${achieved.length}/${activeGoals.length} goals achieved (${(goalRate * 100).toFixed(0)}%)`,
  });

  /* Assessment improvement */
  const assessments = ctx.assessments || [];
  if (assessments.length >= 2) {
    const first = assessments[assessments.length - 1];
    const last = assessments[0];
    const improved = (last.percentageScore || 0) > (first.percentageScore || 0);
    criteria.push({
      criterion: 'Assessment scores improved',
      met: improved,
      weight: 2,
      evidence: `${first.percentageScore || 0}% → ${last.percentageScore || 0}%`,
    });
  } else {
    criteria.push({
      criterion: 'Assessment scores improved',
      met: false,
      weight: 2,
      evidence: 'Insufficient assessments',
    });
  }

  /* Stable attendance (≥80%) */
  const sessions = ctx.recentSessions || [];
  const completed = sessions.filter(s => s.status === 'completed').length;
  const attendanceRate = sessions.length > 0 ? completed / sessions.length : 0;
  criteria.push({
    criterion: 'Attendance rate ≥80%',
    met: attendanceRate >= 0.8,
    weight: 1,
    evidence: `${completed}/${sessions.length} sessions attended (${(attendanceRate * 100).toFixed(0)}%)`,
  });

  /* No declining goals */
  const declining = (ctx.goals || []).filter(
    g => g.status === 'active' && g.trend?.direction === 'declining'
  );
  criteria.push({
    criterion: 'No declining goals',
    met: declining.length === 0,
    weight: 2,
    evidence: declining.length > 0 ? `${declining.length} goals declining` : 'No declining goals',
  });

  /* Family engagement documented */
  const familyEvents = ctx.familyEvents || [];
  const recentFamily = familyEvents.filter(
    f => new Date(f.communicationDate || f.createdAt) > new Date(Date.now() - 30 * 86400000)
  );
  criteria.push({
    criterion: 'Recent family engagement',
    met: recentFamily.length > 0,
    weight: 1,
    evidence: `${recentFamily.length} family contact(s) in last 30 days`,
  });

  /* No active behavior concerns */
  const behaviorRecords = ctx.behaviorRecords || [];
  const recentSevere = behaviorRecords.filter(
    b =>
      ['severe', 'crisis'].includes(b.severity) &&
      new Date(b.incidentDate || b.createdAt) > new Date(Date.now() - 14 * 86400000)
  );
  criteria.push({
    criterion: 'No severe behavior incidents (14 days)',
    met: recentSevere.length === 0,
    weight: 2,
    evidence:
      recentSevere.length > 0 ? `${recentSevere.length} severe incidents` : 'No severe incidents',
  });

  /* Calculate weighted score */
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = criteria.reduce((s, c) => s + (c.met ? c.weight : 0), 0);
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  let recommendation;
  if (score >= 85) recommendation = 'discharge';
  else if (score >= 70) recommendation = 'step_down';
  else if (score >= 50) recommendation = 'continue';
  else if (score >= 30) recommendation = 'step_up';
  else recommendation = 'refer';

  /* Estimate remaining sessions */
  const avgProgressPerSession =
    activeGoals.length > 0
      ? activeGoals.reduce((s, g) => {
          const hist = g.progressHistory || [];
          return s + (hist.length > 0 ? g.currentProgress / hist.length : 0);
        }, 0) / activeGoals.length
      : 5;
  const avgRemainingProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((s, g) => s + Math.max(0, 90 - (g.currentProgress || 0)), 0) /
        activeGoals.length
      : 50;
  const estimatedSessions =
    avgProgressPerSession > 0 ? Math.ceil(avgRemainingProgress / avgProgressPerSession) : 20;

  return {
    score,
    isReady: score >= 80,
    criteria,
    recommendation,
    estimatedSessionsRemaining: estimatedSessions,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Context Gathering
   ═══════════════════════════════════════════════════════════════════════ */
async function gatherOutcomeContext(beneficiaryId, episodeId) {
  const eFilter = episodeId ? { _id: episodeId } : { beneficiaryId, status: 'active' };

  const [episode, recentSessions, goals, assessments, measureApps, familyEvents, behaviorRecords] =
    await Promise.all([
      model('EpisodeOfCare')?.findOne(eFilter).sort({ startDate: -1 }).lean(),
      model('ClinicalSession')
        ?.find({ beneficiaryId })
        .sort({ scheduledDate: -1 })
        .limit(30)
        .lean() || [],
      model('TherapeuticGoal')
        ?.find({ beneficiaryId, isDeleted: { $ne: true } })
        .lean() || [],
      model('ClinicalAssessment')
        ?.find({ beneficiaryId })
        .sort({ assessmentDate: -1 })
        .limit(10)
        .lean() || [],
      model('MeasureApplication')
        ?.find({ beneficiaryId, status: 'completed' })
        .sort({ applicationDate: -1 })
        .lean() || [],
      model('FamilyCommunication')
        ?.find({ beneficiaryId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean() || [],
      model('BehaviorRecord')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(20).lean() ||
        [],
    ]);

  return {
    episode,
    recentSessions,
    goals,
    assessments,
    measureApps,
    familyEvents,
    behaviorRecords,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Effect Size per Measure
   ═══════════════════════════════════════════════════════════════════════ */
function computeEffectSizes(measureApps) {
  /* Group by measure */
  const byMeasure = {};
  for (const app of measureApps) {
    const key = app.measureId?.toString() || app.measureName || 'unknown';
    if (!byMeasure[key]) byMeasure[key] = [];
    byMeasure[key].push(app);
  }

  const effectSizes = [];

  for (const [, apps] of Object.entries(byMeasure)) {
    if (apps.length < 2) continue;

    /* Sort oldest → newest */
    apps.sort((a, b) => new Date(a.applicationDate) - new Date(b.applicationDate));
    const baseline = apps[0];
    const latest = apps[apps.length - 1];

    const bScore =
      baseline.totalRawScore || baseline.compositeScore || baseline.percentageScore || 0;
    const cScore = latest.totalRawScore || latest.compositeScore || latest.percentageScore || 0;

    /* Compute SD from all scores in this measure */
    const scores = apps.map(a => a.totalRawScore || a.compositeScore || a.percentageScore || 0);
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance =
      scores.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(scores.length - 1, 1);
    const sd = Math.sqrt(variance);

    const bSD = sd || 1;
    const d = cohensD(bScore, cScore, bSD, bSD);
    const g = glassDelta(bScore, cScore, bSD);
    const pctChange = bScore !== 0 ? ((cScore - bScore) / bScore) * 100 : 0;

    /* Determine clinical significance (using MCID from measure if available) */
    const mcid = baseline.comparison?.targetScore
      ? Math.abs(baseline.comparison.targetScore - bScore) * 0.1
      : sd * 0.5;
    const isClinicallySignificant = Math.abs(cScore - bScore) >= mcid;

    effectSizes.push({
      measureId: baseline.measureId,
      measureName: baseline.measureName || `Measure-${baseline.measureId}`,
      baselineScore: bScore,
      currentScore: cScore,
      baselineSD: +bSD.toFixed(2),
      pooledSD: +bSD.toFixed(2),
      cohensD: +d.toFixed(3),
      glassDelta: +g.toFixed(3),
      percentChange: +pctChange.toFixed(1),
      interpretation: interpretEffectSize(d),
      isClinicallySignificant,
      mcid: +mcid.toFixed(2),
    });
  }

  return effectSizes;
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Domain Outcomes from Assessments
   ═══════════════════════════════════════════════════════════════════════ */
function computeDomainOutcomes(assessments) {
  if (assessments.length < 2) return [];

  const first = assessments[assessments.length - 1];
  const latest = assessments[0];

  const firstDomains = {};
  for (const d of first.domainScores || []) {
    firstDomains[d.domain] = d;
  }

  return (latest.domainScores || []).map(d => {
    const baseline = firstDomains[d.domain];
    const bScore = baseline?.score || baseline?.percentile || 0;
    const cScore = d.score || d.percentile || 0;
    const pctChange = bScore !== 0 ? ((cScore - bScore) / bScore) * 100 : 0;
    let trend = 'stable';
    if (pctChange > 5) trend = 'improving';
    else if (pctChange < -5) trend = 'declining';

    return {
      domain: d.domain,
      baselineScore: bScore,
      currentScore: cScore,
      percentChange: +pctChange.toFixed(1),
      trend,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Outcome Prediction (simple regression from historical data)
   ═══════════════════════════════════════════════════════════════════════ */
async function predictOutcome(beneficiaryId, ctx) {
  const goals = ctx.goals || [];
  const activeGoals = goals.filter(g => g.status === 'active');

  if (activeGoals.length === 0) {
    return { expectedOutcomeScore: null, confidence: 0, basedOnSampleSize: 0 };
  }

  /* Simple linear projection from goal progress history */
  let totalProjected = 0;
  let count = 0;

  for (const goal of activeGoals) {
    const hist = goal.progressHistory || [];
    if (hist.length < 2) continue;

    /* Linear regression on progress over time */
    const points = hist.map(h => ({
      x: (new Date(h.date).getTime() - new Date(hist[0].date).getTime()) / 86400000,
      y: h.value || goal.currentProgress || 0,
    }));

    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    /* Project 30 days forward */
    const lastDay = points[points.length - 1].x;
    const projected = Math.min(100, Math.max(0, intercept + slope * (lastDay + 30)));
    totalProjected += projected;
    count++;
  }

  const expectedScore = count > 0 ? Math.round(totalProjected / count) : null;

  /* Prediction confidence based on data quality */
  const dataPoints = activeGoals.reduce((s, g) => s + (g.progressHistory || []).length, 0);
  const confidence = Math.min(0.95, dataPoints * 0.05);

  /* Estimated discharge date */
  const avgProgress =
    activeGoals.reduce((s, g) => s + (g.currentProgress || 0), 0) / activeGoals.length;
  const avgWeeklyGain =
    ctx.recentSessions?.length > 0 ? avgProgress / (ctx.recentSessions.length / 2) : 2;
  const remainingProgress = 90 - avgProgress;
  const weeksToDischarge = avgWeeklyGain > 0 ? Math.ceil(remainingProgress / avgWeeklyGain) : 20;
  const expectedDischargeDate = new Date(Date.now() + weeksToDischarge * 7 * 86400000);

  return {
    expectedOutcomeScore: expectedScore,
    expectedDischargeDate,
    confidence: +confidence.toFixed(2),
    predictedGoalAchievement: expectedScore,
    basedOnSampleSize: dataPoints,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   9. Main Tracking Function
   ═══════════════════════════════════════════════════════════════════════ */
async function trackOutcome(beneficiaryId, options = {}) {
  const start = Date.now();
  const ctx = await gatherOutcomeContext(beneficiaryId, options.episodeId);

  if (!ctx.episode) throw new Error('No episode found for beneficiary');

  /* GAS */
  const gasScore = calculateGAS(ctx.goals);

  /* Effect sizes */
  const effectSizes = computeEffectSizes(ctx.measureApps);

  /* Domain outcomes */
  const domainOutcomes = computeDomainOutcomes(ctx.assessments);

  /* Treatment metrics */
  const sessions = ctx.recentSessions || [];
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const activeGoals = (ctx.goals || []).filter(g => ['active', 'achieved'].includes(g.status));
  const achievedGoals = activeGoals.filter(g => g.status === 'achieved' || g.currentProgress >= 90);
  const episodeStart = ctx.episode.startDate
    ? new Date(ctx.episode.startDate)
    : new Date(ctx.episode.createdAt);
  const durationDays = Math.round((Date.now() - episodeStart.getTime()) / 86400000);

  const treatmentMetrics = {
    totalSessions: sessions.length,
    completedSessions,
    attendanceRate:
      sessions.length > 0 ? +((completedSessions / sessions.length) * 100).toFixed(1) : 0,
    averageGoalProgress:
      activeGoals.length > 0
        ? +(
            activeGoals.reduce((s, g) => s + (g.currentProgress || 0), 0) / activeGoals.length
          ).toFixed(1)
        : 0,
    goalsAchieved: achievedGoals.length,
    goalsTotal: activeGoals.length,
    episodeDurationDays: durationDays,
    sessionsPerWeek: durationDays > 0 ? +((completedSessions / durationDays) * 7).toFixed(1) : 0,
  };

  /* Discharge readiness */
  const dischargeReadiness = evaluateDischargeReadiness(ctx);

  /* Prediction */
  const prediction = await predictOutcome(beneficiaryId, ctx);

  /* Overall outcome status */
  const avgEffectSize =
    effectSizes.length > 0
      ? effectSizes.reduce((s, e) => s + e.cohensD, 0) / effectSizes.length
      : 0;
  const avgGoalProgress = treatmentMetrics.averageGoalProgress;
  const overallScore = Math.round(
    avgGoalProgress * 0.5 +
      dischargeReadiness.score * 0.3 +
      Math.min(100, (avgEffectSize + 1) * 50) * 0.2
  );

  let overallStatus;
  if (avgEffectSize >= 0.8 && avgGoalProgress >= 80) overallStatus = 'significantly_improved';
  else if (avgEffectSize >= 0.5 || avgGoalProgress >= 70) overallStatus = 'improved';
  else if (avgEffectSize >= 0.2 || avgGoalProgress >= 50) overallStatus = 'maintained';
  else if (avgEffectSize >= -0.2) overallStatus = 'minimal_change';
  else if (avgEffectSize >= -0.5) overallStatus = 'declined';
  else overallStatus = 'significantly_declined';

  /* Persist */
  const snapshot = await DDDOutcomeSnapshot.create({
    beneficiaryId,
    episodeId: ctx.episode._id,
    branchId: ctx.episode.branchId,
    snapshotType: options.snapshotType || 'progress',
    overallOutcomeScore: overallScore,
    overallStatus,
    gasScore,
    effectSizes,
    domainOutcomes,
    treatmentMetrics,
    dischargeReadiness,
    prediction,
    evaluatedAt: new Date(),
    evaluatedBy: options.evaluatedBy || 'system',
    processingTimeMs: Date.now() - start,
  });

  return snapshot.toObject();
}

/* ═══════════════════════════════════════════════════════════════════════
   10. Query Functions
   ═══════════════════════════════════════════════════════════════════════ */
async function getLatestOutcome(beneficiaryId, episodeId) {
  const filter = { beneficiaryId, isDeleted: { $ne: true } };
  if (episodeId) filter.episodeId = episodeId;
  return DDDOutcomeSnapshot.findOne(filter).sort({ evaluatedAt: -1 }).lean();
}

async function getOutcomeHistory(beneficiaryId, episodeId, limit = 20) {
  const filter = { beneficiaryId, isDeleted: { $ne: true } };
  if (episodeId) filter.episodeId = episodeId;
  return DDDOutcomeSnapshot.find(filter).sort({ evaluatedAt: -1 }).limit(limit).lean();
}

async function getOutcomeDashboard(branchId) {
  const match = { isDeleted: { $ne: true } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const pipeline = [
    { $match: match },
    { $sort: { beneficiaryId: 1, episodeId: 1, evaluatedAt: -1 } },
    { $group: { _id: { b: '$beneficiaryId', e: '$episodeId' }, latest: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latest' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgScore: { $avg: '$overallOutcomeScore' },
        avgGAS: { $avg: '$gasScore.tScore' },
        avgDischargeReadiness: { $avg: '$dischargeReadiness.score' },
        significantlyImproved: {
          $sum: { $cond: [{ $eq: ['$overallStatus', 'significantly_improved'] }, 1, 0] },
        },
        improved: { $sum: { $cond: [{ $eq: ['$overallStatus', 'improved'] }, 1, 0] } },
        maintained: { $sum: { $cond: [{ $eq: ['$overallStatus', 'maintained'] }, 1, 0] } },
        declined: {
          $sum: {
            $cond: [{ $in: ['$overallStatus', ['declined', 'significantly_declined']] }, 1, 0],
          },
        },
        dischargeReady: { $sum: { $cond: ['$dischargeReadiness.isReady', 1, 0] } },
        avgAttendance: { $avg: '$treatmentMetrics.attendanceRate' },
        avgGoalProgress: { $avg: '$treatmentMetrics.averageGoalProgress' },
      },
    },
  ];

  const [result] = await DDDOutcomeSnapshot.aggregate(pipeline);
  return (
    result || {
      total: 0,
      avgScore: 0,
      avgGAS: 50,
      avgDischargeReadiness: 0,
      significantlyImproved: 0,
      improved: 0,
      maintained: 0,
      declined: 0,
      dischargeReady: 0,
      avgAttendance: 0,
      avgGoalProgress: 0,
    }
  );
}

async function getInterventionComparison(branchId) {
  const match = { isDeleted: { $ne: true } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  /* Compare outcomes by episode type */
  return DDDOutcomeSnapshot.aggregate([
    { $match: match },
    { $sort: { beneficiaryId: 1, episodeId: 1, evaluatedAt: -1 } },
    { $group: { _id: { b: '$beneficiaryId', e: '$episodeId' }, latest: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latest' } },
    {
      $lookup: {
        from: 'episodeofcares',
        localField: 'episodeId',
        foreignField: '_id',
        as: 'episode',
        pipeline: [{ $project: { type: 1, 'serviceConfig.serviceType': 1 } }],
      },
    },
    { $unwind: { path: '$episode', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { type: '$episode.type' },
        count: { $sum: 1 },
        avgOutcomeScore: { $avg: '$overallOutcomeScore' },
        avgGAS: { $avg: '$gasScore.tScore' },
        avgAttendance: { $avg: '$treatmentMetrics.attendanceRate' },
        avgGoalProgress: { $avg: '$treatmentMetrics.averageGoalProgress' },
        avgDuration: { $avg: '$treatmentMetrics.episodeDurationDays' },
      },
    },
    { $sort: { avgOutcomeScore: -1 } },
  ]);
}

/* ═══════════════════════════════════════════════════════════════════════
   11. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createOutcomeRouter() {
  const router = Router();

  /* Track outcome */
  router.post('/outcome-tracker/track/:beneficiaryId', async (req, res) => {
    try {
      const snapshot = await trackOutcome(req.params.beneficiaryId, {
        episodeId: req.body.episodeId,
        snapshotType: req.body.snapshotType || 'progress',
        evaluatedBy: 'user_request',
      });
      res.json({ success: true, snapshot });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Latest outcome */
  router.get('/outcome-tracker/latest/:beneficiaryId', async (req, res) => {
    try {
      const snapshot = await getLatestOutcome(req.params.beneficiaryId, req.query.episodeId);
      res.json({ success: true, snapshot });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* History */
  router.get('/outcome-tracker/history/:beneficiaryId', async (req, res) => {
    try {
      const snapshots = await getOutcomeHistory(
        req.params.beneficiaryId,
        req.query.episodeId,
        parseInt(req.query.limit, 10) || 20
      );
      res.json({ success: true, snapshots });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Discharge readiness */
  router.get('/outcome-tracker/discharge-readiness/:beneficiaryId', async (req, res) => {
    try {
      const ctx = await gatherOutcomeContext(req.params.beneficiaryId, req.query.episodeId);
      const readiness = evaluateDischargeReadiness(ctx);
      res.json({ success: true, readiness });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Dashboard */
  router.get('/outcome-tracker/dashboard', async (req, res) => {
    try {
      const dashboard = await getOutcomeDashboard(req.query.branchId);
      res.json({ success: true, dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Intervention comparison */
  router.get('/outcome-tracker/intervention-comparison', async (req, res) => {
    try {
      const comparison = await getInterventionComparison(req.query.branchId);
      res.json({ success: true, comparison });
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
  DDDOutcomeSnapshot,
  cohensD,
  glassDelta,
  interpretEffectSize,
  calculateGAS,
  evaluateDischargeReadiness,
  trackOutcome,
  getLatestOutcome,
  getOutcomeHistory,
  getOutcomeDashboard,
  getInterventionComparison,
  computeEffectSizes,
  computeDomainOutcomes,
  predictOutcome,
  createOutcomeRouter,
};
