/**
 * bi-analytics.routes.js — cross-module executive BI dashboard.
 *
 * Mount at /api/admin/bi. Aggregates KPIs from the modules shipped today:
 * Beneficiaries · TherapySessions · Assessments · CarePlans.
 *
 * Endpoints:
 *   GET /overview      — top-line KPIs
 *   GET /sessions      — sessions trend + by type + by status
 *   GET /beneficiaries — demographics + disability distribution
 *   GET /goals         — goal progress across active plans
 *   GET /branches      — per-branch activity comparison
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const Beneficiary = require('../models/Beneficiary');
const TherapySession = require('../models/TherapySession');
const ClinicalAssessment = require('../models/ClinicalAssessment');
const CarePlan = require('../models/CarePlan');

router.use(authenticateToken);

const READ_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'clinical_supervisor'];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── GET /overview ────────────────────────────────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const m30 = daysAgo(30);
    const m7 = daysAgo(7);

    const [
      totalBeneficiaries,
      activeBeneficiaries,
      newBeneficiaries30d,
      totalSessions,
      sessionsThisWeek,
      sessionsToday,
      completedThisMonth,
      totalAssessments,
      activeCarePlans,
    ] = await Promise.all([
      Beneficiary.countDocuments({}),
      Beneficiary.countDocuments({ status: { $in: ['active', 'enrolled'] } }),
      Beneficiary.countDocuments({ createdAt: { $gte: m30 } }),
      TherapySession.countDocuments({}),
      TherapySession.countDocuments({ date: { $gte: m7 } }),
      TherapySession.countDocuments({
        date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
      TherapySession.countDocuments({ date: { $gte: m30 }, status: 'COMPLETED' }),
      ClinicalAssessment.countDocuments({}),
      CarePlan.countDocuments({ status: 'ACTIVE' }),
    ]);

    // completion rate over last 30d
    const [comp30, noShow30, cancel30] = await Promise.all([
      TherapySession.countDocuments({ date: { $gte: m30 }, status: 'COMPLETED' }),
      TherapySession.countDocuments({ date: { $gte: m30 }, status: 'NO_SHOW' }),
      TherapySession.countDocuments({
        date: { $gte: m30 },
        status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      }),
    ]);
    const denom = comp30 + noShow30 + cancel30;
    const completionRate30d = denom > 0 ? Math.round((comp30 / denom) * 100) : null;

    res.json({
      success: true,
      kpis: {
        totalBeneficiaries,
        activeBeneficiaries,
        newBeneficiaries30d,
        totalSessions,
        sessionsThisWeek,
        sessionsToday,
        completedThisMonth,
        totalAssessments,
        activeCarePlans,
        completionRate30d,
        noShowRate30d: denom > 0 ? Math.round((noShow30 / denom) * 100) : null,
      },
    });
  } catch (err) {
    return safeError(res, err, 'bi.overview');
  }
});

// ── GET /sessions — trend + by type + by status ──────────────────────────
router.get('/sessions', requireRole(READ_ROLES), async (req, res) => {
  try {
    const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30));
    const since = daysAgo(days);

    const [daily, byType, byStatus, peakHours] = await Promise.all([
      TherapySession.aggregate([
        { $match: { date: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TherapySession.aggregate([
        { $match: { date: { $gte: since } } },
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      TherapySession.aggregate([
        { $match: { date: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TherapySession.aggregate([
        { $match: { date: { $gte: since }, startTime: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: { $substr: ['$startTime', 0, 2] },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      windowDays: days,
      daily: daily.map(d => ({
        date: d._id,
        total: d.total,
        completed: d.completed,
        noShow: d.noShow,
      })),
      byType: byType.map(d => ({ type: d._id, count: d.count })),
      byStatus: byStatus.map(d => ({ status: d._id, count: d.count })),
      peakHours: peakHours.map(d => ({ hour: d._id, count: d.count })),
    });
  } catch (err) {
    return safeError(res, err, 'bi.sessions');
  }
});

// ── GET /beneficiaries — demographics ────────────────────────────────────
router.get('/beneficiaries', requireRole(READ_ROLES), async (req, res) => {
  try {
    const [byGender, byDisability, byStatus, byAgeGroup, enrollment90d] = await Promise.all([
      Beneficiary.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Beneficiary.aggregate([
        { $group: { _id: '$disability.primaryType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Beneficiary.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Beneficiary.aggregate([
        { $match: { dateOfBirth: { $exists: true, $ne: null } } },
        {
          $project: {
            ageYears: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), '$dateOfBirth'] },
                  1000 * 60 * 60 * 24 * 365.25,
                ],
              },
            },
          },
        },
        {
          $bucket: {
            groupBy: '$ageYears',
            boundaries: [0, 3, 6, 9, 12, 15, 18, 25, 40, 100],
            default: 'Unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Beneficiary.aggregate([
        { $match: { createdAt: { $gte: daysAgo(90) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const ageLabels = ['0–3', '3–6', '6–9', '9–12', '12–15', '15–18', '18–25', '25–40', '40+'];

    res.json({
      success: true,
      byGender: byGender.map(d => ({ gender: d._id || 'غير محدد', count: d.count })),
      byDisability: byDisability.map(d => ({ type: d._id || 'غير محدد', count: d.count })),
      byStatus: byStatus.map(d => ({ status: d._id || 'غير محدد', count: d.count })),
      byAgeGroup: byAgeGroup
        .filter(d => d._id !== 'Unknown')
        .map((d, i) => ({ group: ageLabels[i] || String(d._id), count: d.count })),
      enrollment90d: enrollment90d.map(d => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    return safeError(res, err, 'bi.beneficiaries');
  }
});

// ── GET /goals — goal progress aggregated ────────────────────────────────
router.get('/goals', requireRole(READ_ROLES), async (req, res) => {
  try {
    const result = await CarePlan.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $project: {
          allGoals: {
            $concatArrays: [
              { $ifNull: ['$educational.domains.academic.goals', []] },
              { $ifNull: ['$educational.domains.classroom.goals', []] },
              { $ifNull: ['$educational.domains.communication.goals', []] },
              { $ifNull: ['$therapeutic.domains.speech.goals', []] },
              { $ifNull: ['$therapeutic.domains.occupational.goals', []] },
              { $ifNull: ['$therapeutic.domains.physical.goals', []] },
              { $ifNull: ['$therapeutic.domains.behavioral.goals', []] },
              { $ifNull: ['$therapeutic.domains.psychological.goals', []] },
              { $ifNull: ['$lifeSkills.domains.selfCare.goals', []] },
              { $ifNull: ['$lifeSkills.domains.homeSkills.goals', []] },
              { $ifNull: ['$lifeSkills.domains.social.goals', []] },
              { $ifNull: ['$lifeSkills.domains.transport.goals', []] },
              { $ifNull: ['$lifeSkills.domains.financial.goals', []] },
            ],
          },
        },
      },
      { $unwind: '$allGoals' },
      {
        $facet: {
          byStatus: [{ $group: { _id: '$allGoals.status', count: { $sum: 1 } } }],
          byType: [
            {
              $group: {
                _id: '$allGoals.type',
                count: { $sum: 1 },
                avgProgress: { $avg: '$allGoals.progress' },
              },
            },
            { $sort: { count: -1 } },
          ],
          progressDist: [
            {
              $bucket: {
                groupBy: '$allGoals.progress',
                boundaries: [0, 25, 50, 75, 100, 101],
                default: 'n/a',
                output: { count: { $sum: 1 } },
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                achieved: {
                  $sum: { $cond: [{ $eq: ['$allGoals.status', 'ACHIEVED'] }, 1, 0] },
                },
                avgProgress: { $avg: '$allGoals.progress' },
              },
            },
          ],
        },
      },
    ]);

    const data = result[0] || {};
    const totals = data.totals?.[0] || {};
    res.json({
      success: true,
      total: totals.total || 0,
      achieved: totals.achieved || 0,
      avgProgress: totals.avgProgress ? Math.round(totals.avgProgress) : 0,
      achievementRate: totals.total ? Math.round((totals.achieved / totals.total) * 100) : null,
      byStatus: (data.byStatus || []).map(d => ({ status: d._id, count: d.count })),
      byType: (data.byType || []).map(d => ({
        type: d._id,
        count: d.count,
        avgProgress: d.avgProgress ? Math.round(d.avgProgress) : 0,
      })),
      progressDist: (data.progressDist || []).map((d, i) => ({
        bucket: ['0-25%', '25-50%', '50-75%', '75-100%', '100%'][i] || String(d._id),
        count: d.count,
      })),
    });
  } catch (err) {
    return safeError(res, err, 'bi.goals');
  }
});

// ── GET /branches — per-branch comparison ────────────────────────────────
router.get('/branches', requireRole(READ_ROLES), async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const branches = await Branch.find({}).select('name nameEn code').lean();
    const branchIds = branches.map(b => b._id);

    const [benCounts, assessCounts] = await Promise.all([
      Beneficiary.aggregate([
        { $match: { branchId: { $in: branchIds } } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } },
      ]),
      ClinicalAssessment.aggregate([
        { $match: { branchId: { $in: branchIds } } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } },
      ]),
    ]);
    const benMap = Object.fromEntries(benCounts.map(b => [String(b._id), b.count]));
    const assessMap = Object.fromEntries(assessCounts.map(a => [String(a._id), a.count]));

    const rows = branches.map(b => ({
      id: b._id,
      name: b.name || b.nameEn,
      code: b.code,
      beneficiaries: benMap[String(b._id)] || 0,
      assessments: assessMap[String(b._id)] || 0,
    }));
    rows.sort((a, b) => b.beneficiaries - a.beneficiaries);
    res.json({ success: true, items: rows });
  } catch (err) {
    return safeError(res, err, 'bi.branches');
  }
});

module.exports = router;
