/**
 * DDD Analytics Aggregation Pipelines — تحليلات تجميعية للدومينات العلاجية
 *
 * Pre-built MongoDB aggregation pipelines for clinical analytics,
 * operational KPIs, and decision support data.
 *
 * Features:
 *  - 15+ pre-built analytics queries
 *  - Beneficiary outcomes over time
 *  - Therapist productivity
 *  - Episode flow analysis
 *  - Quality compliance rates
 *  - Session utilization patterns
 *
 * @module domains/_base/ddd-analytics
 */

'use strict';

const mongoose = require('mongoose');
const safeError = require('../../utils/safeError');

// ═══════════════════════════════════════════════════════════════════════════════
//  Helper: Safe model accessor
// ═══════════════════════════════════════════════════════════════════════════════

function getModel(name) {
  return mongoose.models[name];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. Beneficiary Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Beneficiary distribution by disability type and level
 */
async function beneficiaryDistribution() {
  const Model = getModel('Beneficiary');
  if (!Model) return [];

  const [byType, byLevel, byStatus] = await Promise.all([
    Model.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Model.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$disabilityLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Model.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return { byType, byLevel, byStatus };
}

/**
 * New beneficiaries per month (last 12 months)
 */
async function beneficiaryTrend(months = 12) {
  const Model = getModel('Beneficiary');
  if (!Model) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return Model.aggregate([
    { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        count: 1,
      },
    },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. Episode Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Episode phase distribution (current snapshot)
 */
async function episodePhaseDistribution() {
  const Model = getModel('EpisodeOfCare');
  if (!Model) return [];

  return Model.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$phase', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
}

/**
 * Average episode duration by phase (days)
 */
async function episodeAverageDuration() {
  const Model = getModel('EpisodeOfCare');
  if (!Model) return [];

  return Model.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },
        startDate: { $exists: true },
        endDate: { $exists: true },
      },
    },
    {
      $project: {
        phase: 1,
        durationDays: {
          $divide: [{ $subtract: ['$endDate', '$startDate'] }, 1000 * 60 * 60 * 24],
        },
      },
    },
    {
      $group: {
        _id: '$phase',
        avgDays: { $avg: '$durationDays' },
        minDays: { $min: '$durationDays' },
        maxDays: { $max: '$durationDays' },
        count: { $sum: 1 },
      },
    },
    { $sort: { avgDays: -1 } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. Session Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Session utilization: completed vs scheduled vs cancelled by month
 */
async function sessionUtilization(months = 6) {
  const Model = getModel('ClinicalSession');
  if (!Model) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return Model.aggregate([
    { $match: { scheduledDate: { $gte: since }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          year: { $year: '$scheduledDate' },
          month: { $month: '$scheduledDate' },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        statuses: { $push: { status: '$_id.status', count: '$count' } },
        total: { $sum: '$count' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
}

/**
 * Sessions by type distribution
 */
async function sessionTypeDistribution() {
  const Model = getModel('ClinicalSession');
  if (!Model) return [];

  return Model.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$sessionType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
}

/**
 * Therapist productivity: sessions per therapist (last N days)
 */
async function therapistProductivity(days = 30) {
  const Model = getModel('ClinicalSession');
  if (!Model) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  return Model.aggregate([
    {
      $match: {
        scheduledDate: { $gte: since },
        status: 'completed',
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$therapist',
        completedSessions: { $sum: 1 },
        totalMinutes: { $sum: { $ifNull: ['$actualDuration', '$duration'] } },
        uniqueBeneficiaries: { $addToSet: '$beneficiary' },
      },
    },
    {
      $project: {
        _id: 0,
        therapist: '$_id',
        completedSessions: 1,
        totalMinutes: 1,
        uniqueBeneficiaries: { $size: '$uniqueBeneficiaries' },
      },
    },
    { $sort: { completedSessions: -1 } },
    { $limit: 50 },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. Goals Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Goal achievement rate by priority
 */
async function goalAchievementRate() {
  const Model = getModel('TherapeuticGoal');
  if (!Model) return [];

  return Model.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$priority',
        total: { $sum: 1 },
        achieved: { $sum: { $cond: [{ $eq: ['$status', 'achieved'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        priority: '$_id',
        total: 1,
        achieved: 1,
        inProgress: 1,
        achievementRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$achieved', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. Quality Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quality compliance rate over time
 */
async function qualityComplianceRate(months = 6) {
  const Model = getModel('QualityAudit');
  if (!Model) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return Model.aggregate([
    { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: 1 },
        compliant: { $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        total: 1,
        compliant: 1,
        complianceRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$compliant', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { year: 1, month: 1 } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. Risk & Recommendations Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk score distribution across beneficiaries
 */
async function riskScoreDistribution() {
  const Model = getModel('ClinicalRiskScore');
  if (!Model) return [];

  return Model.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$riskLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  7. Behavior Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Behavior incidents trend by severity
 */
async function behaviorTrend(months = 6) {
  const Model = getModel('BehaviorRecord');
  if (!Model) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return Model.aggregate([
    { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          severity: '$severity',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        severities: { $push: { severity: '$_id.severity', count: '$count' } },
        total: { $sum: '$count' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  8. Tele-Rehab & AR/VR Analytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tele-rehab session volume and completion rate
 */
async function teleRehabStats(months = 6) {
  const Model = getModel('TeleSession');
  if (!Model) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return Model.aggregate([
    { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        total: 1,
        completed: 1,
        completionRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { year: 1, month: 1 } },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  9. Platform-wide summary
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a comprehensive analytics summary for the executive dashboard.
 */
async function executiveSummary() {
  const [beneficiaryDist, episodePhases, sessionTypes, goalRates, riskDist] = await Promise.all([
    beneficiaryDistribution().catch(() => ({})),
    episodePhaseDistribution().catch(() => []),
    sessionTypeDistribution().catch(() => []),
    goalAchievementRate().catch(() => []),
    riskScoreDistribution().catch(() => []),
  ]);

  // Quick counts
  const counts = {};
  const modelsToCount = [
    'Beneficiary',
    'EpisodeOfCare',
    'ClinicalSession',
    'ClinicalAssessment',
    'TherapeuticGoal',
    'UnifiedCarePlan',
    'WorkflowTask',
    'QualityAudit',
    'FamilyMember',
    'BehaviorRecord',
    'TeleSession',
    'ARVRSession',
  ];

  await Promise.all(
    modelsToCount.map(async name => {
      const M = getModel(name);
      if (M) {
        const filter = M.schema.paths.isDeleted ? { isDeleted: { $ne: true } } : {};
        counts[name] = await M.countDocuments(filter).catch(() => 0);
      }
    })
  );

  return {
    timestamp: new Date().toISOString(),
    counts,
    beneficiaryDistribution: beneficiaryDist,
    episodePhases,
    sessionTypes,
    goalAchievementRates: goalRates,
    riskDistribution: riskDist,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Express Router
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');

function createAnalyticsRouter() {
  const router = express.Router();

  router.get('/analytics/summary', async (_req, res) => {
    try {
      const data = await executiveSummary();
      res.json({ success: true, ...data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/beneficiaries', async (_req, res) => {
    try {
      const months = parseInt(_req.query.months, 10) || 12;
      const [distribution, trend] = await Promise.all([
        beneficiaryDistribution(),
        beneficiaryTrend(months),
      ]);
      res.json({ success: true, distribution, trend });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/episodes', async (_req, res) => {
    try {
      const [phases, duration] = await Promise.all([
        episodePhaseDistribution(),
        episodeAverageDuration(),
      ]);
      res.json({ success: true, phases, duration });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/sessions', async (_req, res) => {
    try {
      const months = parseInt(_req.query.months, 10) || 6;
      const days = parseInt(_req.query.days, 10) || 30;
      const [utilization, types, productivity] = await Promise.all([
        sessionUtilization(months),
        sessionTypeDistribution(),
        therapistProductivity(days),
      ]);
      res.json({ success: true, utilization, types, productivity });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/goals', async (_req, res) => {
    try {
      const data = await goalAchievementRate();
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/quality', async (_req, res) => {
    try {
      const months = parseInt(_req.query.months, 10) || 6;
      const data = await qualityComplianceRate(months);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/risk', async (_req, res) => {
    try {
      const data = await riskScoreDistribution();
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/behavior', async (_req, res) => {
    try {
      const months = parseInt(_req.query.months, 10) || 6;
      const data = await behaviorTrend(months);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  router.get('/analytics/tele-rehab', async (_req, res) => {
    try {
      const months = parseInt(_req.query.months, 10) || 6;
      const data = await teleRehabStats(months);
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'ddd-analytics');
    }
  });

  return router;
}

module.exports = {
  // Pipeline functions
  beneficiaryDistribution,
  beneficiaryTrend,
  episodePhaseDistribution,
  episodeAverageDuration,
  sessionUtilization,
  sessionTypeDistribution,
  therapistProductivity,
  goalAchievementRate,
  qualityComplianceRate,
  riskScoreDistribution,
  behaviorTrend,
  teleRehabStats,
  executiveSummary,
  // Router
  createAnalyticsRouter,
};
