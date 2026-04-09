'use strict';

/**
 * DDD Smart Scheduler
 * ═══════════════════════════════════════════════════════════════════════
 * Intelligence-driven session scheduling and workload optimization.
 *
 * Features:
 *  - Workload balancing across therapists
 *  - Priority-based scheduling recommendations
 *  - Conflict detection & resolution
 *  - Optimal session frequency recommendations based on progress
 *  - No-show prediction & mitigation strategies
 *  - Caseload capacity analysis
 *  - Availability & utilization analytics
 *
 * Relies on:
 *  - ClinicalSession (scheduling data)
 *  - EpisodeOfCare (care team assignments)
 *  - TherapeuticGoal (progress data for frequency tuning)
 *  - DDDWatchlist (risk prioritization)
 *  - ClinicalRiskScore (risk-weighted scheduling)
 *
 * @module dddSmartScheduler
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
   1. Scheduling Recommendation Model
   ═══════════════════════════════════════════════════════════════════════ */
const schedRecommendationSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Recommendation type */
    recommendationType: {
      type: String,
      enum: [
        'increase_frequency',
        'decrease_frequency',
        'maintain_frequency',
        'reschedule',
        'add_modality',
        'switch_therapist',
        'add_group_session',
        'schedule_assessment',
        'schedule_family_meeting',
        'no_show_mitigation',
        'workload_rebalance',
      ],
      required: true,
    },

    /* Details */
    currentFrequency: { type: Number }, // sessions per week
    recommendedFrequency: { type: Number },
    rationale: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    confidence: { type: Number, min: 0, max: 1 },

    /* No-show prediction */
    noShowProbability: { type: Number, min: 0, max: 1 },
    noShowFactors: [String],
    mitigationStrategy: String,

    /* Scheduling suggestions */
    suggestedSlots: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday
        timeSlot: String, // "09:00-10:00"
        therapistId: { type: mongoose.Schema.Types.ObjectId },
        modality: String,
        score: Number, // fit score 0-100
      },
    ],

    /* Status */
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    respondedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId },

    evaluatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schedRecommendationSchema.index({ beneficiaryId: 1, status: 1, evaluatedAt: -1 });

const DDDSchedulingRecommendation =
  mongoose.models.DDDSchedulingRecommendation ||
  mongoose.model('DDDSchedulingRecommendation', schedRecommendationSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. No-Show Prediction
   ═══════════════════════════════════════════════════════════════════════ */
function predictNoShow(sessions) {
  if (!sessions || sessions.length < 5) return { probability: 0.1, factors: ['insufficient_data'] };

  const factors = [];
  let score = 0;

  /* Historical no-show rate */
  const total = sessions.length;
  const noShows = sessions.filter(s => s.status === 'no_show').length;
  const cancelled = sessions.filter(s => ['cancelled', 'late_cancel'].includes(s.status)).length;
  const missRate = (noShows + cancelled) / total;

  if (missRate > 0.3) {
    score += 30;
    factors.push('high_historical_miss_rate');
  } else if (missRate > 0.15) {
    score += 15;
    factors.push('moderate_miss_rate');
  }

  /* Consecutive no-shows */
  let consecutive = 0;
  for (const s of sessions) {
    if (['no_show', 'cancelled'].includes(s.status)) consecutive++;
    else break;
  }
  if (consecutive >= 2) {
    score += 25;
    factors.push('consecutive_misses');
  }

  /* Day of week pattern */
  const dayMisses = {};
  for (const s of sessions) {
    if (['no_show', 'cancelled', 'late_cancel'].includes(s.status)) {
      const day = new Date(s.scheduledDate).getDay();
      dayMisses[day] = (dayMisses[day] || 0) + 1;
    }
  }
  const worstDay = Object.entries(dayMisses).sort(([, a], [, b]) => b - a)[0];
  if (worstDay && worstDay[1] >= 3) {
    score += 10;
    factors.push(`worst_day_${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][worstDay[0]]}`);
  }

  /* Time of day pattern */
  const morningMisses = sessions.filter(s => {
    if (!['no_show', 'cancelled'].includes(s.status)) return false;
    const hour = new Date(s.scheduledStartTime || s.scheduledDate).getHours();
    return hour < 10;
  }).length;
  if (morningMisses > 2) {
    score += 10;
    factors.push('early_morning_miss_pattern');
  }

  /* Long gap since last completed session */
  const lastCompleted = sessions.find(s => s.status === 'completed');
  if (lastCompleted) {
    const daysSince = (Date.now() - new Date(lastCompleted.scheduledDate).getTime()) / 86400000;
    if (daysSince > 14) {
      score += 15;
      factors.push('long_gap_since_completion');
    }
  }

  const probability = Math.min(0.95, score / 100);
  return { probability: +probability.toFixed(2), factors };
}

function suggestMitigationStrategy(probability, factors) {
  if (probability >= 0.6) {
    return 'High risk: Send reminder 24h + 2h before, offer tele-rehab alternative, consider rescheduling to preferred time';
  }
  if (probability >= 0.3) {
    return 'Moderate risk: Send SMS/push reminder 24h before, confirm attendance day before';
  }
  if (factors.includes('early_morning_miss_pattern')) {
    return 'Suggest afternoon time slots to improve attendance';
  }
  return 'Standard: Automated reminder 24h before session';
}

/* ═══════════════════════════════════════════════════════════════════════
   3. Frequency Optimization
   ═══════════════════════════════════════════════════════════════════════ */
function recommendFrequency(ctx) {
  const goals = (ctx.goals || []).filter(g => g.status === 'active');
  if (goals.length === 0)
    return { recommended: 2, rationale: 'Default frequency — no active goals', confidence: 0.3 };

  const currentFreq =
    ctx.episode?.serviceConfig?.sessionsPerWeek || ctx.episode?.sessionsPerWeek || 2;

  /* Calculate progress rate */
  let totalProgressPerSession = 0;
  let goalCount = 0;

  for (const goal of goals) {
    const hist = goal.progressHistory || [];
    if (hist.length >= 2) {
      const first = hist[0];
      const last = hist[hist.length - 1];
      const progressGain = (last.value || goal.currentProgress || 0) - (first.value || 0);
      const sessionsInPeriod = hist.length;
      if (sessionsInPeriod > 0) {
        totalProgressPerSession += progressGain / sessionsInPeriod;
        goalCount++;
      }
    }
  }

  const avgProgressPerSession = goalCount > 0 ? totalProgressPerSession / goalCount : 3;

  /* Decision logic */
  let recommended = currentFreq;
  let rationale = '';
  let confidence = 0.5;

  const decliningGoals = goals.filter(g => g.trend?.direction === 'declining');
  const nearTargetGoals = goals.filter(g => g.currentProgress >= 85);

  if (decliningGoals.length >= 2) {
    recommended = Math.min(5, currentFreq + 1);
    rationale = `${decliningGoals.length} declining goals — increase frequency to intensify intervention`;
    confidence = 0.8;
  } else if (avgProgressPerSession < 1 && goalCount > 0) {
    recommended = Math.min(5, currentFreq + 1);
    rationale = `Low progress rate (${avgProgressPerSession.toFixed(1)}% per session) — consider increased frequency`;
    confidence = 0.6;
  } else if (nearTargetGoals.length >= Math.ceil(goals.length * 0.7) && goals.length > 0) {
    recommended = Math.max(1, currentFreq - 1);
    rationale = `${nearTargetGoals.length}/${goals.length} goals near target — consider step-down frequency`;
    confidence = 0.7;
  } else if (avgProgressPerSession >= 5) {
    recommended = currentFreq;
    rationale = `Good progress rate (${avgProgressPerSession.toFixed(1)}% per session) — maintain current frequency`;
    confidence = 0.7;
  } else {
    recommended = currentFreq;
    rationale = 'Progress within normal range — maintain frequency';
    confidence = 0.5;
  }

  const type =
    recommended > currentFreq
      ? 'increase_frequency'
      : recommended < currentFreq
        ? 'decrease_frequency'
        : 'maintain_frequency';

  return { recommended, current: currentFreq, type, rationale, confidence };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Workload Analysis
   ═══════════════════════════════════════════════════════════════════════ */
async function analyzeWorkload(branchId, weekOffset = 0) {
  const Session = model('ClinicalSession');
  if (!Session) return [];

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const match = { scheduledDate: { $gte: weekStart, $lt: weekEnd } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const results = await Session.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$therapistId',
        totalScheduled: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: {
          $sum: { $cond: [{ $in: ['$status', ['cancelled', 'no_show', 'late_cancel']] }, 1, 0] },
        },
        totalMinutes: { $sum: { $ifNull: ['$scheduledDuration', 45] } },
        uniqueBeneficiaries: { $addToSet: '$beneficiaryId' },
        modalities: { $addToSet: '$modality' },
        types: { $addToSet: '$type' },
      },
    },
    {
      $project: {
        therapistId: '$_id',
        totalScheduled: 1,
        completed: 1,
        cancelled: 1,
        totalMinutes: 1,
        totalHours: { $round: [{ $divide: ['$totalMinutes', 60] }, 1] },
        uniqueBeneficiaries: { $size: '$uniqueBeneficiaries' },
        modalities: 1,
        types: 1,
        utilizationRate: {
          $cond: [
            { $gt: ['$totalScheduled', 0] },
            { $round: [{ $multiply: [{ $divide: ['$completed', '$totalScheduled'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort: { totalScheduled: -1 } },
  ]);

  /* Capacity indicators */
  const MAX_WEEKLY_HOURS = 35;
  return results.map(r => ({
    ...r,
    capacityUsed: +((r.totalHours / MAX_WEEKLY_HOURS) * 100).toFixed(1),
    isOverloaded: r.totalHours > MAX_WEEKLY_HOURS,
    isUnderutilized: r.totalHours < MAX_WEEKLY_HOURS * 0.5,
    availableSlots: Math.max(0, Math.floor((MAX_WEEKLY_HOURS - r.totalHours) / 0.75)), // 45min sessions
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Conflict Detection
   ═══════════════════════════════════════════════════════════════════════ */
async function detectConflicts(therapistId, date, startTime, endTime) {
  const Session = model('ClinicalSession');
  if (!Session) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sessions = await Session.find({
    therapistId,
    scheduledDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['cancelled', 'late_cancel'] },
  }).lean();

  const conflicts = [];
  for (const s of sessions) {
    const sStart = s.scheduledStartTime || s.scheduledDate;
    const sDuration = s.scheduledDuration || 45;
    const sEnd = new Date(new Date(sStart).getTime() + sDuration * 60000);

    const reqStart = new Date(`${date}T${startTime}`);
    const reqEnd = endTime
      ? new Date(`${date}T${endTime}`)
      : new Date(reqStart.getTime() + 45 * 60000);

    if (reqStart < sEnd && reqEnd > new Date(sStart)) {
      conflicts.push({
        sessionId: s._id,
        beneficiaryId: s.beneficiaryId,
        scheduledDate: s.scheduledDate,
        startTime: sStart,
        duration: sDuration,
        status: s.status,
      });
    }
  }

  return conflicts;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Generate Scheduling Recommendations
   ═══════════════════════════════════════════════════════════════════════ */
async function generateRecommendations(beneficiaryId) {
  const [episode, sessions, goals] = await Promise.all([
    model('EpisodeOfCare')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    model('ClinicalSession')
      ?.find({ beneficiaryId })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean() || [],
    model('TherapeuticGoal')
      ?.find({ beneficiaryId, status: 'active', isDeleted: { $ne: true } })
      .lean() || [],
  ]);

  if (!episode) return [];

  const recommendations = [];

  /* 1. Frequency recommendation */
  const freqResult = recommendFrequency({ episode, goals, sessions });
  if (freqResult.type !== 'maintain_frequency') {
    recommendations.push({
      beneficiaryId,
      episodeId: episode._id,
      branchId: episode.branchId,
      recommendationType: freqResult.type,
      currentFrequency: freqResult.current,
      recommendedFrequency: freqResult.recommended,
      rationale: freqResult.rationale,
      priority: freqResult.type === 'increase_frequency' ? 'high' : 'medium',
      confidence: freqResult.confidence,
    });
  }

  /* 2. No-show prediction */
  const noShowResult = predictNoShow(sessions);
  if (noShowResult.probability >= 0.3) {
    recommendations.push({
      beneficiaryId,
      episodeId: episode._id,
      branchId: episode.branchId,
      recommendationType: 'no_show_mitigation',
      noShowProbability: noShowResult.probability,
      noShowFactors: noShowResult.factors,
      mitigationStrategy: suggestMitigationStrategy(noShowResult.probability, noShowResult.factors),
      rationale: `No-show probability: ${(noShowResult.probability * 100).toFixed(0)}%`,
      priority: noShowResult.probability >= 0.6 ? 'high' : 'medium',
      confidence: 0.6,
    });
  }

  /* 3. Assessment scheduling */
  const lastAssessment = await model('ClinicalAssessment')
    ?.findOne({ beneficiaryId })
    .sort({ assessmentDate: -1 })
    .lean();
  if (lastAssessment) {
    const daysSince = (Date.now() - new Date(lastAssessment.assessmentDate).getTime()) / 86400000;
    if (daysSince > 75) {
      recommendations.push({
        beneficiaryId,
        episodeId: episode._id,
        branchId: episode.branchId,
        recommendationType: 'schedule_assessment',
        rationale: `Last assessment ${Math.round(daysSince)} days ago — due for reassessment`,
        priority: daysSince > 90 ? 'high' : 'medium',
        confidence: 0.9,
      });
    }
  }

  /* 4. Family meeting */
  const familyEvents =
    (await model('FamilyCommunication')
      ?.find({ beneficiaryId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()) || [];
  if (
    familyEvents.length === 0 ||
    Date.now() - new Date(familyEvents[0]?.createdAt).getTime() > 30 * 86400000
  ) {
    recommendations.push({
      beneficiaryId,
      episodeId: episode._id,
      branchId: episode.branchId,
      recommendationType: 'schedule_family_meeting',
      rationale:
        familyEvents.length === 0
          ? 'No family engagement recorded'
          : `Last family contact ${Math.round((Date.now() - new Date(familyEvents[0].createdAt).getTime()) / 86400000)} days ago`,
      priority: 'medium',
      confidence: 0.7,
    });
  }

  /* 5. Group therapy opportunity */
  const isIndividualOnly = sessions.every(s => s.type === 'individual' || !s.type);
  if (isIndividualOnly && sessions.length >= 8) {
    recommendations.push({
      beneficiaryId,
      episodeId: episode._id,
      branchId: episode.branchId,
      recommendationType: 'add_group_session',
      rationale:
        'Only individual sessions recorded — consider adding group therapy for social skill development',
      priority: 'low',
      confidence: 0.5,
    });
  }

  /* Persist */
  const saved = [];
  for (const rec of recommendations) {
    try {
      const doc = await DDDSchedulingRecommendation.create(rec);
      saved.push(doc.toObject());
    } catch {
      /* ignore */
    }
  }

  return saved;
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Utilization Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getUtilizationDashboard(branchId) {
  const Session = model('ClinicalSession');
  if (!Session) return {};

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const match = { scheduledDate: { $gte: thirtyDaysAgo } };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  const [overall, byDay, byModality] = await Promise.all([
    Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          totalMinutes: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$actualDuration', 45] }, 0],
            },
          },
          uniqueTherapists: { $addToSet: '$therapistId' },
          uniqueBeneficiaries: { $addToSet: '$beneficiaryId' },
        },
      },
      {
        $project: {
          total: 1,
          completed: 1,
          noShow: 1,
          cancelled: 1,
          completionRate: {
            $round: [{ $multiply: [{ $divide: ['$completed', { $max: ['$total', 1] }] }, 100] }, 1],
          },
          noShowRate: {
            $round: [{ $multiply: [{ $divide: ['$noShow', { $max: ['$total', 1] }] }, 100] }, 1],
          },
          totalHours: { $round: [{ $divide: ['$totalMinutes', 60] }, 1] },
          therapistCount: { $size: '$uniqueTherapists' },
          beneficiaryCount: { $size: '$uniqueBeneficiaries' },
        },
      },
    ]),
    Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dayOfWeek: '$scheduledDate' },
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$modality',
          count: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    overall: overall[0] || {},
    byDayOfWeek: byDay,
    byModality,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createSmartSchedulerRouter() {
  const router = Router();

  /* Generate recommendations */
  router.post('/smart-scheduler/recommend/:beneficiaryId', async (req, res) => {
    try {
      const recommendations = await generateRecommendations(req.params.beneficiaryId);
      res.json({ success: true, recommendations });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Workload analysis */
  router.get('/smart-scheduler/workload', async (req, res) => {
    try {
      const workload = await analyzeWorkload(
        req.query.branchId,
        parseInt(req.query.weekOffset, 10) || 0
      );
      res.json({ success: true, workload });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Conflict detection */
  router.get('/smart-scheduler/conflicts', async (req, res) => {
    try {
      const { therapistId, date, startTime, endTime } = req.query;
      if (!therapistId || !date || !startTime) {
        return res
          .status(400)
          .json({ success: false, error: 'therapistId, date, startTime required' });
      }
      const conflicts = await detectConflicts(therapistId, date, startTime, endTime);
      res.json({ success: true, conflicts, hasConflict: conflicts.length > 0 });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* No-show prediction */
  router.get('/smart-scheduler/no-show-prediction/:beneficiaryId', async (req, res) => {
    try {
      const sessions =
        (await model('ClinicalSession')
          ?.find({ beneficiaryId: req.params.beneficiaryId })
          .sort({ scheduledDate: -1 })
          .limit(20)
          .lean()) || [];
      const prediction = predictNoShow(sessions);
      prediction.mitigationStrategy = suggestMitigationStrategy(
        prediction.probability,
        prediction.factors
      );
      res.json({ success: true, ...prediction });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Utilization dashboard */
  router.get('/smart-scheduler/utilization', async (req, res) => {
    try {
      const dashboard = await getUtilizationDashboard(req.query.branchId);
      res.json({ success: true, dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Pending recommendations */
  router.get('/smart-scheduler/recommendations/:beneficiaryId', async (req, res) => {
    try {
      const recs = await DDDSchedulingRecommendation.find({
        beneficiaryId: req.params.beneficiaryId,
        status: 'pending',
        isDeleted: { $ne: true },
      })
        .sort({ evaluatedAt: -1 })
        .lean();
      res.json({ success: true, recommendations: recs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Respond to recommendation */
  router.post('/smart-scheduler/recommendations/:id/respond', async (req, res) => {
    try {
      const rec = await DDDSchedulingRecommendation.findById(req.params.id);
      if (!rec) return res.status(404).json({ success: false, error: 'Not found' });
      rec.status = req.body.accept ? 'accepted' : 'rejected';
      rec.respondedAt = new Date();
      rec.respondedBy = req.body.userId;
      await rec.save();
      res.json({ success: true, recommendation: rec.toObject() });
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
  DDDSchedulingRecommendation,
  predictNoShow,
  suggestMitigationStrategy,
  recommendFrequency,
  analyzeWorkload,
  detectConflicts,
  generateRecommendations,
  getUtilizationDashboard,
  createSmartSchedulerRouter,
};
