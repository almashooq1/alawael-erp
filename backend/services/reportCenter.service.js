'use strict';

/**
 * Report Center Service — مركز التقارير والتحليلات السريرية الموحد
 * ══════════════════════════════════════════════════════════════════════════════
 * Facade تحليلي شامل يجمع بيانات من جميع نماذج المنصة ويولّد:
 *   • getExecutiveSummary()        — ملخص تنفيذي شامل للمنصة
 *   • getClinicalKPIs()            — مؤشرات الأداء السريري الرئيسية
 *   • getBeneficiaryReport()       — تقرير تفصيلي للمستفيدين
 *   • getSessionsReport()          — تقرير الجلسات العلاجية
 *   • getOutcomesReport()          — تقرير نتائج التأهيل والمقاييس
 *   • getAttendanceReport()        — تقرير الحضور والانتظام
 *   • getQualityIndicators()       — مؤشرات الجودة والامتثال
 *   • getDischargeReport()         — تقرير التخريج والنتائج النهائية
 * ══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ─── Lazy model loaders ───────────────────────────────────────────────────────
const M = {
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      try {
        return require('../models/Beneficiary');
      } catch {
        return null;
      }
    }
  },
  TherapySession: () => {
    try {
      return mongoose.model('TherapySession');
    } catch {
      try {
        return require('../models/TherapySession');
      } catch {
        return null;
      }
    }
  },
  EpisodeOfCare: () => {
    try {
      return mongoose.model('EpisodeOfCare');
    } catch {
      try {
        return require('../models/EpisodeOfCare');
      } catch {
        return null;
      }
    }
  },
  CarePlan: () => {
    try {
      return mongoose.model('CarePlan');
    } catch {
      try {
        return require('../models/CarePlan');
      } catch {
        return null;
      }
    }
  },
  ClinicalAssessment: () => {
    try {
      return mongoose.model('ClinicalAssessment');
    } catch {
      try {
        return require('../models/ClinicalAssessment');
      } catch {
        return null;
      }
    }
  },
};

async function safeQuery(modelFn, queryFn, fallback) {
  try {
    const model = modelFn();
    if (!model) return fallback;
    return await queryFn(model);
  } catch {
    return fallback;
  }
}

function _dateRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
  const end = to ? new Date(to) : new Date();
  if (isNaN(start.getTime())) start.setTime(Date.now() - 30 * 86400000);
  if (isNaN(end.getTime())) end.setTime(Date.now());
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════════════════════
class ReportCenterSvc {
  // ──────────────────────────────────────────────────────────────────────────
  /** Executive Summary — ملخص تنفيذي شامل للمنصة */
  async getExecutiveSummary({ from, to } = {}) {
    const { start, end } = _dateRange(from, to);

    const [
      totalBeneficiaries,
      activeBeneficiaries,
      newBeneficiaries,
      totalEpisodes,
      activeEpisodes,
      completedEpisodes,
      totalSessions,
      completedSessions,
      totalAssessments,
      totalCarePlans,
      activeCarePlans,
    ] = await Promise.all([
      safeQuery(M.Beneficiary, B => B.countDocuments({}), 0),
      safeQuery(M.Beneficiary, B => B.countDocuments({ status: { $in: ['active', 'نشط'] } }), 0),
      safeQuery(M.Beneficiary, B => B.countDocuments({ createdAt: { $gte: start, $lte: end } }), 0),
      safeQuery(M.EpisodeOfCare, E => E.countDocuments({}), 0),
      safeQuery(
        M.EpisodeOfCare,
        E => E.countDocuments({ status: { $in: ['active', 'active_treatment'] } }),
        0
      ),
      safeQuery(
        M.EpisodeOfCare,
        E => E.countDocuments({ status: { $in: ['discharged', 'discharge', 'completed'] } }),
        0
      ),
      safeQuery(M.TherapySession, S => S.countDocuments({ date: { $gte: start, $lte: end } }), 0),
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, status: 'COMPLETED' }),
        0
      ),
      safeQuery(
        M.ClinicalAssessment,
        A => A.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        0
      ),
      safeQuery(M.CarePlan, P => P.countDocuments({}), 0),
      safeQuery(M.CarePlan, P => P.countDocuments({ status: { $in: ['active', 'approved'] } }), 0),
    ]);

    const sessionCompletionRate = totalSessions
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;
    const episodeCompletionRate = totalEpisodes
      ? Math.round((completedEpisodes / totalEpisodes) * 100)
      : 0;

    return {
      period: { from: start, to: end },
      beneficiaries: {
        total: totalBeneficiaries,
        active: activeBeneficiaries,
        newInPeriod: newBeneficiaries,
      },
      episodes: {
        total: totalEpisodes,
        active: activeEpisodes,
        completed: completedEpisodes,
        completionRate: episodeCompletionRate,
      },
      sessions: {
        totalInPeriod: totalSessions,
        completed: completedSessions,
        completionRate: sessionCompletionRate,
      },
      assessments: { totalInPeriod: totalAssessments },
      carePlans: { total: totalCarePlans, active: activeCarePlans },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Clinical KPIs — مؤشرات الأداء السريري */
  async getClinicalKPIs({ from, to } = {}) {
    const { start, end } = _dateRange(from, to);

    const [byDisability, bySessionType, byEpisodePhase, assessmentsByCategory] = await Promise.all([
      // Beneficiaries by disability type
      safeQuery(
        M.Beneficiary,
        B =>
          B.aggregate([
            { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // Sessions by type in period
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
              $group: {
                _id: '$sessionType',
                count: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
              },
            },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // Episodes by phase
      safeQuery(
        M.EpisodeOfCare,
        E =>
          E.aggregate([
            { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // Assessments by category
      safeQuery(
        M.ClinicalAssessment,
        A =>
          A.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        []
      ),
    ]);

    return {
      period: { from: start, to: end },
      byDisability: byDisability.map(x => ({ name: x._id || 'غير محدد', value: x.count })),
      bySessionType: bySessionType.map(x => ({
        name: x._id || 'أخرى',
        total: x.count,
        completed: x.completed,
      })),
      byEpisodePhase: byEpisodePhase.map(x => ({ name: x._id || 'غير محدد', value: x.count })),
      assessmentsByCategory: assessmentsByCategory.map(x => ({
        name: x._id || 'غير محدد',
        value: x.count,
      })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Beneficiary Report — قائمة المستفيدين مع الإحصائيات */
  async getBeneficiaryReport({ from, to, status, disabilityType, page = 1, limit = 50 } = {}) {
    const filter = {};
    if (from || to) {
      const { start, end } = _dateRange(from, to);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (status) filter.status = status;
    if (disabilityType) filter.disabilityType = disabilityType;

    const [beneficiaries, total] = await Promise.all([
      safeQuery(
        M.Beneficiary,
        B =>
          B.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('name arabicName fileNumber disabilityType status dateOfBirth gender createdAt')
            .lean(),
        []
      ),
      safeQuery(M.Beneficiary, B => B.countDocuments(filter), 0),
    ]);

    return { beneficiaries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Sessions Report — تقرير الجلسات العلاجية التفصيلي */
  async getSessionsReport({
    from,
    to,
    therapistId,
    sessionType,
    status,
    page = 1,
    limit = 50,
  } = {}) {
    const { start, end } = _dateRange(from, to);
    const filter = { date: { $gte: start, $lte: end } };
    if (therapistId) filter.therapist = new mongoose.Types.ObjectId(therapistId);
    if (sessionType) filter.sessionType = sessionType;
    if (status) filter.status = status;

    const [sessions, total] = await Promise.all([
      safeQuery(
        M.TherapySession,
        S =>
          S.find(filter)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('beneficiary', 'name arabicName fileNumber')
            .populate('therapist', 'name specialty')
            .select(
              'date sessionType status duration attendance.isPresent attendance.lateMinutes notes.assessment isBilled telehealth.enabled'
            )
            .lean(),
        []
      ),
      safeQuery(M.TherapySession, S => S.countDocuments(filter), 0),
    ]);

    return { sessions, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Outcomes Report — تقرير نتائج التأهيل */
  async getOutcomesReport({ from, to } = {}) {
    const { start, end } = _dateRange(from, to);

    const [episodeOutcomes, assessmentTrends] = await Promise.all([
      // Discharged episodes with outcome
      safeQuery(
        M.EpisodeOfCare,
        E =>
          E.aggregate([
            {
              $match: {
                status: { $in: ['discharged', 'discharge', 'completed'] },
                updatedAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: '$dischargeOutcome',
                count: { $sum: 1 },
                avgPhasesCompleted: { $avg: { $size: { $ifNull: ['$phases', []] } } },
              },
            },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // Assessment scores over time (weekly avg)
      safeQuery(
        M.ClinicalAssessment,
        A =>
          A.aggregate([
            {
              $match: {
                createdAt: { $gte: start, $lte: end },
                'result.totalScore': { $exists: true },
              },
            },
            {
              $group: {
                _id: { week: { $isoWeek: '$createdAt' }, year: { $year: '$createdAt' } },
                avgScore: { $avg: '$result.totalScore' },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
            {
              $project: {
                _id: 0,
                week: '$_id.week',
                year: '$_id.year',
                avgScore: { $round: ['$avgScore', 1] },
                count: 1,
              },
            },
          ]),
        []
      ),
    ]);

    return {
      period: { from: start, to: end },
      episodeOutcomes: episodeOutcomes.map(x => ({
        outcome: x._id || 'غير محدد',
        count: x.count,
        avgPhasesCompleted: Math.round(x.avgPhasesCompleted || 0),
      })),
      assessmentTrends,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Quality Indicators — مؤشرات الجودة والامتثال */
  async getQualityIndicators({ from, to } = {}) {
    const { start, end } = _dateRange(from, to);

    const [
      totalSessions,
      completedSessions,
      noShowSessions,
      cancelledSessions,
      telehealthSessions,
      avgDurationArr,
      carePlansWithGoals,
      totalCarePlans,
    ] = await Promise.all([
      safeQuery(M.TherapySession, S => S.countDocuments({ date: { $gte: start, $lte: end } }), 0),
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, status: 'COMPLETED' }),
        0
      ),
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, status: 'NO_SHOW' }),
        0
      ),
      safeQuery(
        M.TherapySession,
        S =>
          S.countDocuments({
            date: { $gte: start, $lte: end },
            status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
          }),
        0
      ),
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, 'telehealth.enabled': true }),
        0
      ),
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            {
              $match: {
                date: { $gte: start, $lte: end },
                status: 'COMPLETED',
                duration: { $gt: 0 },
              },
            },
            { $group: { _id: null, avg: { $avg: '$duration' } } },
          ]),
        []
      ),
      safeQuery(M.CarePlan, P => P.countDocuments({ 'goals.0': { $exists: true } }), 0),
      safeQuery(M.CarePlan, P => P.countDocuments({}), 0),
    ]);

    const completionRate = totalSessions
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;
    const noShowRate = totalSessions ? Math.round((noShowSessions / totalSessions) * 100) : 0;
    const cancellationRate = totalSessions
      ? Math.round((cancelledSessions / totalSessions) * 100)
      : 0;
    const telehealthRate = totalSessions
      ? Math.round((telehealthSessions / totalSessions) * 100)
      : 0;
    const carePlanGoalRate = totalCarePlans
      ? Math.round((carePlansWithGoals / totalCarePlans) * 100)
      : 0;
    const avgDuration = avgDurationArr[0] ? Math.round(avgDurationArr[0].avg) : 0;

    return {
      period: { from: start, to: end },
      indicators: [
        {
          id: 'session_completion',
          label: 'معدل إكمال الجلسات',
          value: completionRate,
          unit: '%',
          benchmark: 85,
          status: completionRate >= 85 ? 'good' : completionRate >= 70 ? 'warning' : 'alert',
        },
        {
          id: 'no_show_rate',
          label: 'معدل الغياب',
          value: noShowRate,
          unit: '%',
          benchmark: 10,
          status: noShowRate <= 10 ? 'good' : noShowRate <= 20 ? 'warning' : 'alert',
          inverted: true,
        },
        {
          id: 'cancellation_rate',
          label: 'معدل الإلغاء',
          value: cancellationRate,
          unit: '%',
          benchmark: 15,
          status: cancellationRate <= 15 ? 'good' : cancellationRate <= 25 ? 'warning' : 'alert',
          inverted: true,
        },
        {
          id: 'telehealth_rate',
          label: 'نسبة جلسات التأهيل عن بُعد',
          value: telehealthRate,
          unit: '%',
          benchmark: 20,
          status: 'info',
        },
        {
          id: 'avg_session_duration',
          label: 'متوسط مدة الجلسة (د)',
          value: avgDuration,
          unit: 'دقيقة',
          benchmark: 45,
          status: avgDuration >= 30 ? 'good' : 'warning',
        },
        {
          id: 'care_plan_goal_rate',
          label: 'خطط الرعاية مع أهداف',
          value: carePlanGoalRate,
          unit: '%',
          benchmark: 90,
          status: carePlanGoalRate >= 90 ? 'good' : carePlanGoalRate >= 70 ? 'warning' : 'alert',
        },
      ],
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Discharge Report — تقرير التخريج */
  async getDischargeReport({ from, to, page = 1, limit = 50 } = {}) {
    const { start, end } = _dateRange(from, to);

    const [episodes, total] = await Promise.all([
      safeQuery(
        M.EpisodeOfCare,
        E =>
          E.find({
            status: { $in: ['discharged', 'discharge', 'completed'] },
            updatedAt: { $gte: start, $lte: end },
          })
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('beneficiary', 'name arabicName fileNumber disabilityType dateOfBirth')
            .populate('assignedTherapist', 'name specialty')
            .select('episodeType status currentPhase dischargeOutcome startDate endDate phases')
            .lean(),
        []
      ),
      safeQuery(
        M.EpisodeOfCare,
        E =>
          E.countDocuments({
            status: { $in: ['discharged', 'discharge', 'completed'] },
            updatedAt: { $gte: start, $lte: end },
          }),
        0
      ),
    ]);

    const enriched = episodes.map(e => ({
      ...e,
      durationDays:
        e.startDate && e.endDate
          ? Math.round((new Date(e.endDate) - new Date(e.startDate)) / 86400000)
          : null,
      phasesCompleted: (e.phases || []).filter(p => p.exitedAt).length,
    }));

    return { episodes: enriched, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────
module.exports = new ReportCenterSvc();
