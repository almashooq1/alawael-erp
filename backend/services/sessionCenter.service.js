'use strict';

/**
 * Session Center Service — مركز الجلسات العلاجية الموحد
 * ══════════════════════════════════════════════════════════════════════════════
 * Facade تحليلي فوق TherapySession — لا يكرر CRUD الموجود في therapy-sessions.
 * يوفر:
 *   • getDashboard()           — KPIs وتوزيعات الحالة والنوع والمعالج
 *   • getEpisodeSessions()     — كل جلسات حلقة علاجية مع مؤشرات التقدم
 *   • getBeneficiarySessions() — تاريخ جلسات مستفيد كامل (مع SOAP خطوط زمنية)
 *   • getTherapistLoad()       — حمل المعالجين اليومي/الأسبوعي
 *   • getCalendarSlots()       — بيانات تقويم الجلسات لعرض FullCalendar/Recharts
 *   • getSOAPSummary()         — ملخص SOAP لجلسة واحدة
 *   • getAttendanceReport()    — تقرير الحضور والغياب بالفترة
 *   • getGoalsProgress()       — تقدم الأهداف المرتبطة بالجلسات
 * ══════════════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');

// ─── Lazy model loaders ───────────────────────────────────────────────────────
const M = {
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
};

/** Safely execute a DB query, return fallback on any error */
async function safeQuery(modelFn, queryFn, fallback) {
  try {
    const model = modelFn();
    if (!model) return fallback;
    return await queryFn(model);
  } catch {
    return fallback;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const _COMPLETION_STATUSES = new Set(['COMPLETED']);
const CANCELLED_STATUSES = new Set(['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW']);
const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED']);

// ─── Helper ───────────────────────────────────────────────────────────────────
function _dateRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
  const end = to ? new Date(to) : new Date();
  if (isNaN(start.getTime())) start.setTime(Date.now() - 30 * 86400000);
  if (isNaN(end.getTime())) end.setTime(Date.now());
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════════════════════
class SessionCenterSvc {
  // ──────────────────────────────────────────────────────────────────────────
  /** Dashboard — KPIs + distributions + trends (last 30 days default) */
  async getDashboard({ from, to } = {}) {
    const { start, end } = _dateRange(from, to);

    const [
      totalInRange,
      completedInRange,
      cancelledInRange,
      noShowInRange,
      activeNow,
      byType,
      byStatus,
      byTherapist,
      trendsRaw,
      teleCount,
    ] = await Promise.all([
      // totals in range
      safeQuery(M.TherapySession, S => S.countDocuments({ date: { $gte: start, $lte: end } }), 0),
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, status: 'COMPLETED' }),
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
        S => S.countDocuments({ date: { $gte: start, $lte: end }, status: 'NO_SHOW' }),
        0
      ),

      // active today
      safeQuery(
        M.TherapySession,
        S => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tmrw = new Date(today);
          tmrw.setDate(tmrw.getDate() + 1);
          return S.countDocuments({
            date: { $gte: today, $lt: tmrw },
            status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          });
        },
        0
      ),

      // by type
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: '$sessionType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // by status
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
        []
      ),

      // by therapist (top 10)
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            { $match: { date: { $gte: start, $lte: end }, status: 'COMPLETED' } },
            {
              $group: { _id: '$therapist', count: { $sum: 1 }, avgDuration: { $avg: '$duration' } },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            {
              $addFields: { name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'غير محدد'] } },
            },
            { $project: { _id: 1, name: 1, count: 1, avgDuration: 1 } },
          ]),
        []
      ),

      // daily trend (grouped by date)
      safeQuery(
        M.TherapySession,
        S =>
          S.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                total: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        []
      ),

      // telehealth count
      safeQuery(
        M.TherapySession,
        S => S.countDocuments({ date: { $gte: start, $lte: end }, 'telehealth.enabled': true }),
        0
      ),
    ]);

    const completionRate = totalInRange ? Math.round((completedInRange / totalInRange) * 100) : 0;
    const cancelRate = totalInRange ? Math.round((cancelledInRange / totalInRange) * 100) : 0;
    const noShowRate = totalInRange ? Math.round((noShowInRange / totalInRange) * 100) : 0;

    return {
      period: { from: start, to: end },
      kpis: {
        totalInRange,
        completedInRange,
        cancelledInRange,
        noShowInRange,
        activeNow,
        teleCount,
        completionRate,
        cancelRate,
        noShowRate,
      },
      byType: byType.map(x => ({ name: x._id || 'أخرى', value: x.count })),
      byStatus: byStatus.map(x => ({ name: x._id, value: x.count })),
      byTherapist,
      trends: trendsRaw.map(x => ({ date: x._id, total: x.total, completed: x.completed })),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** All sessions for an Episode of Care with progress metrics */
  async getEpisodeSessions(episodeId) {
    if (!episodeId) return { sessions: [], meta: {} };

    const sessions = await safeQuery(
      M.TherapySession,
      S =>
        S.find({ episodeOfCare: episodeId })
          .sort({ date: 1 })
          .populate('therapist', 'name specialty')
          .populate('beneficiary', 'name arabicName')
          .lean(),
      []
    );

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const cancelled = sessions.filter(s => CANCELLED_STATUSES.has(s.status)).length;
    const noShows = sessions.filter(s => s.status === 'NO_SHOW').length;
    const upcoming = sessions.filter(
      s => ACTIVE_STATUSES.has(s.status) && new Date(s.date) > new Date()
    ).length;

    const totalDuration = sessions
      .filter(s => s.status === 'COMPLETED')
      .reduce((acc, s) => acc + (s.duration || 0), 0);

    const avgDuration = completed ? Math.round(totalDuration / completed) : 0;

    return {
      sessions,
      meta: {
        total,
        completed,
        cancelled,
        noShows,
        upcoming,
        totalDurationMinutes: totalDuration,
        avgDuration,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Full session history for a beneficiary (timeline with SOAP) */
  async getBeneficiarySessions(beneficiaryId, { from, to, limit = 50 } = {}) {
    if (!beneficiaryId) return { sessions: [], meta: {} };

    const query = { beneficiary: beneficiaryId };
    if (from || to) {
      const { start, end } = _dateRange(from, to);
      query.date = { $gte: start, $lte: end };
    }

    const sessions = await safeQuery(
      M.TherapySession,
      S =>
        S.find(query)
          .sort({ date: -1 })
          .limit(limit)
          .populate('therapist', 'name specialty')
          .populate('episodeOfCare', 'status currentPhase')
          .lean(),
      []
    );

    // Timeline entries with SOAP summary
    const timeline = sessions.map(s => ({
      _id: s._id,
      date: s.date,
      sessionType: s.sessionType,
      status: s.status,
      duration: s.duration,
      therapist: s.therapist,
      episodeOfCare: s.episodeOfCare,
      attendance: s.attendance,
      soap: {
        subjective: (s.notes && s.notes.subjective) || '',
        objective: (s.notes && s.notes.objective) || '',
        assessment: (s.notes && s.notes.assessment) || '',
        plan: (s.notes && s.notes.plan) || '',
      },
      goalsProgress: s.goalsProgress || [],
      telehealth:
        s.telehealth && s.telehealth.enabled
          ? { enabled: true, provider: s.telehealth.provider }
          : { enabled: false },
    }));

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;

    return { sessions: timeline, meta: { total, completed } };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Therapist workload — daily session counts (default this week) */
  async getTherapistLoad({ from, to, therapistId } = {}) {
    const { start, end } = _dateRange(
      from || new Date(Date.now() - 7 * 86400000).toISOString(),
      to || new Date().toISOString()
    );

    const match = { date: { $gte: start, $lte: end } };
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);

    const rows = await safeQuery(
      M.TherapySession,
      S =>
        S.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                therapist: '$therapist',
                day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
              totalMin: { $sum: { $ifNull: ['$duration', 0] } },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id.therapist',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $addFields: {
              therapistName: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'غير محدد'] },
            },
          },
          {
            $project: {
              _id: 0,
              therapist: '$_id.therapist',
              therapistName: 1,
              day: '$_id.day',
              total: 1,
              completed: 1,
              totalMin: 1,
            },
          },
          { $sort: { day: 1, total: -1 } },
        ]),
      []
    );

    return rows;
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Calendar slots for a given month — lightweight (id, date, type, status) */
  async getCalendarSlots({ year, month, therapistId, beneficiaryId } = {}) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = (parseInt(month, 10) || new Date().getMonth() + 1) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59);

    const match = { date: { $gte: start, $lte: end } };
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);
    if (beneficiaryId) match.beneficiary = new mongoose.Types.ObjectId(beneficiaryId);

    const sessions = await safeQuery(
      M.TherapySession,
      S =>
        S.find(match)
          .select('date startTime endTime sessionType status beneficiary therapist title duration')
          .populate('beneficiary', 'name arabicName')
          .populate('therapist', 'name')
          .lean(),
      []
    );

    return sessions.map(s => ({
      id: s._id,
      title: s.title || s.sessionType || 'جلسة',
      date: s.date,
      start: s.startTime,
      end: s.endTime,
      status: s.status,
      sessionType: s.sessionType,
      beneficiary: s.beneficiary,
      therapist: s.therapist,
      duration: s.duration,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Full SOAP summary for a single session */
  async getSOAPSummary(sessionId) {
    return safeQuery(
      M.TherapySession,
      S =>
        S.findById(sessionId)
          .populate('therapist', 'name specialty')
          .populate('beneficiary', 'name arabicName dateOfBirth disabilityType')
          .populate('episodeOfCare', 'status currentPhase')
          .populate('carePlan', 'title goals')
          .lean(),
      null
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Attendance report — presence/absence/noshow breakdown by period */
  async getAttendanceReport({ from, to, beneficiaryId, therapistId } = {}) {
    const { start, end } = _dateRange(from, to);

    const match = { date: { $gte: start, $lte: end } };
    if (beneficiaryId) match.beneficiary = new mongoose.Types.ObjectId(beneficiaryId);
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);

    const rows = await safeQuery(
      M.TherapySession,
      S =>
        S.aggregate([
          { $match: match },
          {
            $group: {
              _id: {
                beneficiary: '$beneficiary',
                day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              },
              sessions: { $sum: 1 },
              attended: { $sum: { $cond: [{ $eq: ['$attendance.isPresent', true] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
              cancelled: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER']] },
                    1,
                    0,
                  ],
                },
              },
              lateMin: { $sum: { $ifNull: ['$attendance.lateMinutes', 0] } },
            },
          },
          {
            $lookup: {
              from: 'beneficiaries',
              localField: '_id.beneficiary',
              foreignField: '_id',
              as: 'ben',
            },
          },
          {
            $addFields: {
              beneficiaryName: {
                $ifNull: [
                  { $arrayElemAt: ['$ben.arabicName', 0] },
                  { $arrayElemAt: ['$ben.name', 0] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              beneficiary: '$_id.beneficiary',
              beneficiaryName: 1,
              day: '$_id.day',
              sessions: 1,
              attended: 1,
              absent: 1,
              cancelled: 1,
              lateMin: 1,
            },
          },
          { $sort: { day: -1 } },
        ]),
      []
    );

    const summary = rows.reduce(
      (acc, r) => {
        acc.total += r.sessions;
        acc.attended += r.attended;
        acc.absent += r.absent;
        acc.cancelled += r.cancelled;
        return acc;
      },
      { total: 0, attended: 0, absent: 0, cancelled: 0 }
    );

    const attendanceRate = summary.total ? Math.round((summary.attended / summary.total) * 100) : 0;

    return { summary: { ...summary, attendanceRate }, detail: rows };
  }

  // ──────────────────────────────────────────────────────────────────────────
  /** Goals progress extracted from session.goalsProgress[] */
  async getGoalsProgress(episodeId) {
    if (!episodeId) return [];

    const sessions = await safeQuery(
      M.TherapySession,
      S =>
        S.find({
          episodeOfCare: episodeId,
          status: 'COMPLETED',
          'goalsProgress.0': { $exists: true },
        })
          .sort({ date: 1 })
          .select('date goalsProgress')
          .lean(),
      []
    );

    // Flatten to goal-level time series
    const goalMap = {};
    for (const s of sessions) {
      for (const g of s.goalsProgress || []) {
        const key = String(g.goalId || g._id || 'unknown');
        if (!goalMap[key]) goalMap[key] = { goalId: key, title: g.title || '', history: [] };
        goalMap[key].history.push({ date: s.date, value: g.value, note: g.note || '' });
      }
    }

    return Object.values(goalMap);
  }
}

// ─── Export singleton ─────────────────────────────────────────────────────────
module.exports = new SessionCenterSvc();
