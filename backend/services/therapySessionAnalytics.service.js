/**
 * خدمة تحليلات الجلسات العلاجية المتقدمة
 * Therapy Session Analytics Service
 *
 * Provides comprehensive analytics for the therapy sessions dashboard:
 * ─── نظرة عامة شاملة (KPIs)
 * ─── اتجاهات الجلسات (يومي/أسبوعي/شهري)
 * ─── مقارنة أداء المعالجين
 * ─── استخدام الغرف
 * ─── تقارير الحضور والغياب
 * ─── ملخص الفوترة والإيرادات
 * ─── تقدم الأهداف العلاجية
 * ─── تحليل الإلغاءات
 * ─── عرض التقويم
 * ─── تصدير التقارير
 * ─── قائمة الانتظار
 *
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ─── Lazy model loaders (test-safe) ─────────────────────────────────────
let _TherapySession, _TherapistAvailability, _TherapyRoom, _TherapeuticPlan;
let _Beneficiary, _Employee, _SessionDocumentation;

const getSession = () => {
  if (!_TherapySession) _TherapySession = require('../models/TherapySession');
  return _TherapySession;
};
const getAvailability = () => {
  if (!_TherapistAvailability) _TherapistAvailability = require('../models/TherapistAvailability');
  return _TherapistAvailability;
};
const getRoom = () => {
  if (!_TherapyRoom) _TherapyRoom = require('../models/TherapyRoom');
  return _TherapyRoom;
};
const getPlan = () => {
  if (!_TherapeuticPlan) _TherapeuticPlan = require('../models/TherapeuticPlan');
  return _TherapeuticPlan;
};
const getBeneficiary = () => {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
};
const getEmployee = () => {
  if (!_Employee) _Employee = require('../models/Employee');
  return _Employee;
};
const getDocumentation = () => {
  if (!_SessionDocumentation) _SessionDocumentation = require('../models/SessionDocumentation');
  return _SessionDocumentation;
};

// ─── Date Helpers ────────────────────────────────────────────────────────
const startOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const startOfWeek = (d = new Date()) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfWeek = (d = new Date()) => {
  const dt = startOfWeek(d);
  dt.setDate(dt.getDate() + 6);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => {
  const dt = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const subtractDays = (d, days) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - days);
  return dt;
};

class TherapySessionAnalyticsService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  نظرة عامة شاملة — Dashboard Overview KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive dashboard overview with all KPIs
   */
  async getDashboardOverview(query = {}) {
    const Session = getSession();
    const today = startOfDay();
    const todayEnd = endOfDay();
    const weekStart = startOfWeek();
    const weekEnd = endOfWeek();
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();
    const lastMonthStart = startOfMonth(subtractDays(today, 30));
    const lastMonthEnd = endOfMonth(subtractDays(today, 30));

    const [
      todaySessions,
      weekSessions,
      monthSessions,
      lastMonthSessions,
      statusDistribution,
      typeDistribution,
      avgRating,
      totalBeneficiaries,
      billedSessions,
      unbilledCompleted,
      avgDuration,
      topTherapists,
    ] = await Promise.all([
      // جلسات اليوم
      Session.aggregate([
        { $match: { date: { $gte: today, $lte: todayEnd } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      // جلسات الأسبوع
      Session.countDocuments({ date: { $gte: weekStart, $lte: weekEnd } }),
      // جلسات الشهر
      Session.aggregate([
        { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalDuration: { $sum: { $ifNull: ['$duration', 45] } },
          },
        },
      ]),
      // جلسات الشهر الماضي (للمقارنة)
      Session.countDocuments({ date: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
      // توزيع الحالات
      Session.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // توزيع الأنواع
      Session.aggregate([
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // متوسط التقييم
      Session.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
          },
        },
      ]),
      // عدد المستفيدين الفريدين
      Session.distinct('beneficiary', {
        beneficiary: { $exists: true, $ne: null },
        date: { $gte: monthStart },
      }),
      // جلسات مفوترة
      Session.countDocuments({ isBilled: true, status: 'COMPLETED' }),
      // جلسات مكتملة غير مفوترة
      Session.countDocuments({ isBilled: { $ne: true }, status: 'COMPLETED' }),
      // متوسط المدة
      Session.aggregate([
        { $match: { duration: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } },
      ]),
      // أفضل المعالجين (هذا الشهر)
      Session.aggregate([
        {
          $match: {
            therapist: { $exists: true, $ne: null },
            date: { $gte: monthStart, $lte: monthEnd },
          },
        },
        {
          $group: {
            _id: '$therapist',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            cancelled: {
              $sum: {
                $cond: [
                  {
                    $in: ['$status', ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER']],
                  },
                  1,
                  0,
                ],
              },
            },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { completed: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Process today's stats
    const todayMap = {};
    todaySessions.forEach(s => (todayMap[s._id] = s.count));
    const totalToday = Object.values(todayMap).reduce((a, b) => a + b, 0);

    // Process month stats
    const monthMap = {};
    let monthTotalDuration = 0;
    monthSessions.forEach(s => {
      monthMap[s._id] = s.count;
      monthTotalDuration += s.totalDuration || 0;
    });
    const totalMonth = Object.values(monthMap).reduce((a, b) => a + b, 0);

    // Status distribution map
    const statusMap = {};
    statusDistribution.forEach(s => (statusMap[s._id] = s.count));
    const totalAll = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Month-over-month growth
    const monthGrowth =
      lastMonthSessions > 0
        ? Math.round(((totalMonth - lastMonthSessions) / lastMonthSessions) * 100)
        : 0;

    // Populate therapist names
    let therapistDetails = [];
    try {
      const Employee = getEmployee();
      therapistDetails = await Promise.all(
        topTherapists.map(async t => {
          let name = 'غير محدد';
          try {
            const emp = await Employee.findById(t._id).select('firstName lastName fullName').lean();
            name = emp?.fullName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || name;
          } catch {
            /* ignore */
          }
          return {
            therapistId: t._id,
            name,
            total: t.total,
            completed: t.completed,
            cancelled: t.cancelled,
            noShow: t.noShow,
            completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
            avgRating: t.avgRating ? Math.round(t.avgRating * 10) / 10 : null,
          };
        })
      );
    } catch {
      therapistDetails = topTherapists.map(t => ({
        therapistId: t._id,
        name: 'غير محدد',
        total: t.total,
        completed: t.completed,
        completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      }));
    }

    return {
      today: {
        total: totalToday,
        completed: todayMap.COMPLETED || 0,
        scheduled: (todayMap.SCHEDULED || 0) + (todayMap.CONFIRMED || 0),
        inProgress: todayMap.IN_PROGRESS || 0,
        cancelled: (todayMap.CANCELLED_BY_PATIENT || 0) + (todayMap.CANCELLED_BY_CENTER || 0),
        noShow: todayMap.NO_SHOW || 0,
      },
      week: {
        total: weekSessions,
      },
      month: {
        total: totalMonth,
        completed: monthMap.COMPLETED || 0,
        cancelled: (monthMap.CANCELLED_BY_PATIENT || 0) + (monthMap.CANCELLED_BY_CENTER || 0),
        noShow: monthMap.NO_SHOW || 0,
        completionRate:
          totalMonth > 0 ? Math.round(((monthMap.COMPLETED || 0) / totalMonth) * 100) : 0,
        totalDurationHours: Math.round(monthTotalDuration / 60),
        growthRate: monthGrowth,
      },
      overall: {
        total: totalAll,
        statusDistribution: statusMap,
        typeDistribution: typeDistribution.map(t => ({
          name: t._id || 'غير محدد',
          count: t.count,
          percentage: totalAll > 0 ? Math.round((t.count / totalAll) * 100) : 0,
        })),
        avgRating: avgRating[0]?.avgRating ? Math.round(avgRating[0].avgRating * 10) / 10 : 0,
        totalRatings: avgRating[0]?.totalRatings || 0,
        avgDurationMinutes: Math.round(avgDuration[0]?.avg || 45),
        uniqueBeneficiaries: totalBeneficiaries.length,
      },
      billing: {
        billed: billedSessions,
        unbilled: unbilledCompleted,
        billingRate:
          billedSessions + unbilledCompleted > 0
            ? Math.round((billedSessions / (billedSessions + unbilledCompleted)) * 100)
            : 0,
      },
      topTherapists: therapistDetails,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  اتجاهات الجلسات — Session Trends
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get session trends over time (daily/weekly/monthly)
   */
  async getSessionTrends(query = {}) {
    const Session = getSession();
    const { period = 'daily', days = 30, startDate, endDate } = query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : subtractDays(end, Number(days));

    let dateFormat;
    let groupId;

    switch (period) {
      case 'weekly':
        dateFormat = '%Y-W%V';
        groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      case 'daily':
      default:
        dateFormat = '%Y-%m-%d';
        groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    const pipeline = [
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: groupId,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelled: {
            $sum: {
              $cond: [{ $in: ['$status', ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER']] }, 1, 0],
            },
          },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
          avgRating: { $avg: '$rating' },
          totalDuration: { $sum: { $ifNull: ['$duration', 45] } },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const trends = await Session.aggregate(pipeline);

    // Calculate running averages
    let runningTotal = 0;
    const enriched = trends.map((t, i) => {
      runningTotal += t.total;
      return {
        date: t._id,
        total: t.total,
        completed: t.completed,
        cancelled: t.cancelled,
        noShow: t.noShow,
        completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
        avgRating: t.avgRating ? Math.round(t.avgRating * 10) / 10 : null,
        totalDurationHours: Math.round(t.totalDuration / 60),
        runningAvg: Math.round(runningTotal / (i + 1)),
      };
    });

    return {
      period,
      dateRange: { start, end },
      data: enriched,
      summary: {
        totalSessions: enriched.reduce((a, b) => a + b.total, 0),
        totalCompleted: enriched.reduce((a, b) => a + b.completed, 0),
        totalCancelled: enriched.reduce((a, b) => a + b.cancelled, 0),
        avgPerDay:
          enriched.length > 0
            ? Math.round(enriched.reduce((a, b) => a + b.total, 0) / enriched.length)
            : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  مقارنة أداء المعالجين — Therapist Performance Comparison
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Compare therapist performance metrics
   */
  async getTherapistPerformance(query = {}) {
    const Session = getSession();
    const { startDate, endDate, therapistIds } = query;

    const match = {};
    match.therapist = { $exists: true, $ne: null };

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    } else {
      match.date = { $gte: subtractDays(new Date(), 30) };
    }

    if (therapistIds && Array.isArray(therapistIds) && therapistIds.length) {
      match.therapist = {
        $in: therapistIds.map(id => new mongoose.Types.ObjectId(id)),
      };
    }

    const therapistStats = await Session.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$therapist',
          totalSessions: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          cancelled: {
            $sum: {
              $cond: [{ $in: ['$status', ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER']] }, 1, 0],
            },
          },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
          avgRating: { $avg: '$rating' },
          totalDuration: { $sum: { $ifNull: ['$duration', 45] } },
          uniquePatients: { $addToSet: '$beneficiary' },
          sessionTypes: { $addToSet: '$sessionType' },
          billed: { $sum: { $cond: [{ $eq: ['$isBilled', true] }, 1, 0] } },
        },
      },
      { $sort: { completed: -1 } },
    ]);

    // Enrich with therapist names
    let enriched = [];
    try {
      const Employee = getEmployee();
      enriched = await Promise.all(
        therapistStats.map(async t => {
          let name = 'غير محدد';
          let specialization = '';
          try {
            const emp = await Employee.findById(t._id)
              .select('firstName lastName fullName specialization')
              .lean();
            name = emp?.fullName || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || name;
            specialization = emp?.specialization || '';
          } catch {
            /* ignore */
          }
          return {
            therapistId: t._id,
            name,
            specialization,
            totalSessions: t.totalSessions,
            completed: t.completed,
            cancelled: t.cancelled,
            noShow: t.noShow,
            completionRate:
              t.totalSessions > 0 ? Math.round((t.completed / t.totalSessions) * 100) : 0,
            cancellationRate:
              t.totalSessions > 0 ? Math.round((t.cancelled / t.totalSessions) * 100) : 0,
            noShowRate: t.totalSessions > 0 ? Math.round((t.noShow / t.totalSessions) * 100) : 0,
            avgRating: t.avgRating ? Math.round(t.avgRating * 10) / 10 : null,
            totalHours: Math.round(t.totalDuration / 60),
            uniquePatients: t.uniquePatients?.length || 0,
            sessionTypes: t.sessionTypes || [],
            billedSessions: t.billed,
          };
        })
      );
    } catch {
      enriched = therapistStats.map(t => ({
        therapistId: t._id,
        name: 'غير محدد',
        totalSessions: t.totalSessions,
        completed: t.completed,
        completionRate: t.totalSessions > 0 ? Math.round((t.completed / t.totalSessions) * 100) : 0,
      }));
    }

    return {
      therapists: enriched,
      summary: {
        totalTherapists: enriched.length,
        avgCompletionRate:
          enriched.length > 0
            ? Math.round(enriched.reduce((a, b) => a + b.completionRate, 0) / enriched.length)
            : 0,
        avgRating:
          enriched.filter(t => t.avgRating).length > 0
            ? Math.round(
                (enriched.filter(t => t.avgRating).reduce((a, b) => a + b.avgRating, 0) /
                  enriched.filter(t => t.avgRating).length) *
                  10
              ) / 10
            : 0,
        topPerformer: enriched[0] || null,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  استخدام الغرف — Room Utilization
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze room utilization rates
   */
  async getRoomUtilization(query = {}) {
    const Session = getSession();
    const Room = getRoom();
    const { startDate, endDate } = query;

    const match = { room: { $exists: true, $ne: null } };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    } else {
      match.date = { $gte: subtractDays(new Date(), 30) };
    }

    const [roomUsage, allRooms] = await Promise.all([
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$room',
            totalSessions: { $sum: 1 },
            totalDuration: { $sum: { $ifNull: ['$duration', 45] } },
            uniqueTherapists: { $addToSet: '$therapist' },
            sessionTypes: { $addToSet: '$sessionType' },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
        { $sort: { totalSessions: -1 } },
      ]),
      Room.find()
        .lean()
        .catch(() => []),
    ]);

    // Build room map
    const roomMap = {};
    allRooms.forEach(r => {
      roomMap[r._id.toString()] = r;
    });

    const enriched = roomUsage.map(r => {
      const room = roomMap[r._id?.toString()] || {};
      return {
        roomId: r._id,
        name: room.name || 'غير محدد',
        type: room.type || 'غير محدد',
        capacity: room.capacity || 0,
        totalSessions: r.totalSessions,
        totalHours: Math.round(r.totalDuration / 60),
        completedSessions: r.completed,
        uniqueTherapists: r.uniqueTherapists?.length || 0,
        sessionTypes: r.sessionTypes || [],
        utilizationScore: r.totalSessions, // higher = more used
      };
    });

    // Rooms with no sessions
    const usedRoomIds = new Set(roomUsage.map(r => r._id?.toString()));
    const unusedRooms = allRooms
      .filter(r => !usedRoomIds.has(r._id.toString()))
      .map(r => ({
        roomId: r._id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        totalSessions: 0,
        totalHours: 0,
        status: 'غير مستخدمة',
      }));

    return {
      usedRooms: enriched,
      unusedRooms,
      summary: {
        totalRooms: allRooms.length,
        activeRooms: enriched.length,
        unusedRooms: unusedRooms.length,
        totalSessionsInRooms: enriched.reduce((a, b) => a + b.totalSessions, 0),
        mostUsedRoom: enriched[0] || null,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تقارير الحضور — Attendance Reports
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate attendance analytics
   */
  async getAttendanceReport(query = {}) {
    const Session = getSession();
    const { startDate, endDate, therapistId, beneficiaryId } = query;

    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    } else {
      match.date = { $gte: subtractDays(new Date(), 30) };
    }
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);
    if (beneficiaryId) match.beneficiary = new mongoose.Types.ObjectId(beneficiaryId);

    const [overall, byDay, byHour, lateArrivals] = await Promise.all([
      // الإجمالي
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
            cancelled: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER']] },
                  1,
                  0,
                ],
              },
            },
            cancelledByPatient: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED_BY_PATIENT'] }, 1, 0] },
            },
            cancelledByCenter: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED_BY_CENTER'] }, 1, 0] },
            },
            avgLateMinutes: { $avg: '$attendance.lateMinutes' },
          },
        },
      ]),
      // حسب اليوم
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dayOfWeek: '$date' },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            noShow: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // حسب الساعة
      Session.aggregate([
        { $match: { ...match, startTime: { $exists: true, $ne: null } } },
        {
          $addFields: {
            hour: {
              $toInt: { $arrayElemAt: [{ $split: ['$startTime', ':'] }, 0] },
            },
          },
        },
        {
          $group: {
            _id: '$hour',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // التأخيرات
      Session.aggregate([
        {
          $match: {
            ...match,
            'attendance.lateMinutes': { $exists: true, $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            avgLate: { $avg: '$attendance.lateMinutes' },
            maxLate: { $max: '$attendance.lateMinutes' },
            totalLate: { $sum: 1 },
          },
        },
      ]),
    ]);

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const stats = overall[0] || { total: 0, completed: 0, noShow: 0, cancelled: 0 };

    return {
      overall: {
        total: stats.total,
        attended: stats.completed,
        noShow: stats.noShow,
        cancelledByPatient: stats.cancelledByPatient || 0,
        cancelledByCenter: stats.cancelledByCenter || 0,
        attendanceRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        noShowRate: stats.total > 0 ? Math.round((stats.noShow / stats.total) * 100) : 0,
        cancellationRate: stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0,
      },
      byDayOfWeek: byDay.map(d => ({
        day: dayNames[d._id - 1] || `يوم ${d._id}`,
        dayNumber: d._id,
        total: d.total,
        completed: d.completed,
        noShow: d.noShow,
        attendanceRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      })),
      byHourOfDay: byHour.map(h => ({
        hour: `${String(h._id).padStart(2, '0')}:00`,
        total: h.total,
        completed: h.completed,
        completionRate: h.total > 0 ? Math.round((h.completed / h.total) * 100) : 0,
      })),
      lateArrivals: {
        totalLate: lateArrivals[0]?.totalLate || 0,
        avgLateMinutes: Math.round(lateArrivals[0]?.avgLate || 0),
        maxLateMinutes: lateArrivals[0]?.maxLate || 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ملخص الفوترة — Billing Summary
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get billing summary and revenue analytics
   */
  async getBillingSummary(query = {}) {
    const Session = getSession();
    const { startDate, endDate } = query;

    const match = { status: 'COMPLETED' };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const [billingStats, monthlyBilling, byType] = await Promise.all([
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            billed: { $sum: { $cond: [{ $eq: ['$isBilled', true] }, 1, 0] } },
            unbilled: { $sum: { $cond: [{ $ne: ['$isBilled', true] }, 1, 0] } },
          },
        },
      ]),
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            total: { $sum: 1 },
            billed: { $sum: { $cond: [{ $eq: ['$isBilled', true] }, 1, 0] } },
            unbilled: { $sum: { $cond: [{ $ne: ['$isBilled', true] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$sessionType',
            total: { $sum: 1 },
            billed: { $sum: { $cond: [{ $eq: ['$isBilled', true] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const stats = billingStats[0] || { total: 0, billed: 0, unbilled: 0 };

    return {
      summary: {
        totalCompleted: stats.total,
        billed: stats.billed,
        unbilled: stats.unbilled,
        billingRate: stats.total > 0 ? Math.round((stats.billed / stats.total) * 100) : 0,
      },
      monthly: monthlyBilling.map(m => ({
        month: m._id,
        total: m.total,
        billed: m.billed,
        unbilled: m.unbilled,
        billingRate: m.total > 0 ? Math.round((m.billed / m.total) * 100) : 0,
      })),
      byType: byType.map(t => ({
        type: t._id || 'غير محدد',
        total: t.total,
        billed: t.billed,
        billingRate: t.total > 0 ? Math.round((t.billed / t.total) * 100) : 0,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تقدم الأهداف — Goal Progress Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze therapy goal progress across sessions
   */
  async getGoalProgressAnalytics(query = {}) {
    const Session = getSession();
    const { beneficiaryId, therapistId, startDate, endDate } = query;

    const match = {
      'goalsProgress.0': { $exists: true },
    };
    if (beneficiaryId) match.beneficiary = new mongoose.Types.ObjectId(beneficiaryId);
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const sessions = await Session.find(match)
      .select('date beneficiary therapist goalsProgress sessionType')
      .populate('beneficiary', 'firstName lastName fullName')
      .sort({ date: 1 })
      .lean();

    // Aggregate goal progress
    const goalMap = {};
    sessions.forEach(s => {
      s.goalsProgress.forEach(g => {
        const key = g.goalId?.toString() || g.description || 'unknown';
        if (!goalMap[key]) {
          goalMap[key] = {
            goalId: g.goalId,
            description: g.description || '',
            baseline: g.baseline || 0,
            target: g.target || 100,
            measurements: [],
          };
        }
        goalMap[key].measurements.push({
          date: s.date,
          achieved: g.achieved || 0,
          sessionId: s._id,
          beneficiary: s.beneficiary,
        });
      });
    });

    // Calculate progress for each goal
    const goals = Object.values(goalMap).map(g => {
      const latest = g.measurements[g.measurements.length - 1];
      const earliest = g.measurements[0];
      const progressPercent =
        g.target > 0 ? Math.round(((latest?.achieved || 0) / g.target) * 100) : 0;
      const improvement = (latest?.achieved || 0) - (earliest?.achieved || 0);

      return {
        goalId: g.goalId,
        description: g.description,
        baseline: g.baseline,
        target: g.target,
        currentValue: latest?.achieved || 0,
        progressPercent: Math.min(100, progressPercent),
        improvement,
        measurementCount: g.measurements.length,
        firstMeasurement: earliest?.date,
        lastMeasurement: latest?.date,
        trend:
          g.measurements.length >= 2
            ? improvement > 0
              ? 'تحسن'
              : improvement < 0
                ? 'تراجع'
                : 'ثابت'
            : 'غير كافي',
      };
    });

    return {
      totalGoals: goals.length,
      goals,
      summary: {
        goalsOnTrack: goals.filter(g => g.progressPercent >= 70).length,
        goalsAtRisk: goals.filter(g => g.progressPercent >= 30 && g.progressPercent < 70).length,
        goalsBehind: goals.filter(g => g.progressPercent < 30).length,
        avgProgress:
          goals.length > 0
            ? Math.round(goals.reduce((a, b) => a + b.progressPercent, 0) / goals.length)
            : 0,
        improving: goals.filter(g => g.trend === 'تحسن').length,
        declining: goals.filter(g => g.trend === 'تراجع').length,
        stable: goals.filter(g => g.trend === 'ثابت').length,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تحليل الإلغاءات — Cancellation Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detailed cancellation analysis
   */
  async getCancellationAnalysis(query = {}) {
    const Session = getSession();
    const { startDate, endDate } = query;

    const match = {
      status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW'] },
    };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    } else {
      match.date = { $gte: subtractDays(new Date(), 90) };
    }

    const [byReason, byType, byTherapist, byBeneficiary, trend] = await Promise.all([
      // حسب السبب
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      // حسب نوع الجلسة
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$sessionType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      // حسب المعالج
      Session.aggregate([
        { $match: { ...match, therapist: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$therapist',
            cancellations: { $sum: 1 },
          },
        },
        { $sort: { cancellations: -1 } },
        { $limit: 10 },
      ]),
      // حسب المستفيد
      Session.aggregate([
        { $match: { ...match, beneficiary: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$beneficiary',
            cancellations: { $sum: 1 },
          },
        },
        { $sort: { cancellations: -1 } },
        { $limit: 10 },
      ]),
      // الاتجاه الشهري
      Session.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            count: { $sum: 1 },
            byPatient: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED_BY_PATIENT'] }, 1, 0] },
            },
            byCenter: {
              $sum: { $cond: [{ $eq: ['$status', 'CANCELLED_BY_CENTER'] }, 1, 0] },
            },
            noShow: {
              $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const reasonMap = {};
    byReason.forEach(r => (reasonMap[r._id] = r.count));
    const totalCancellations = Object.values(reasonMap).reduce((a, b) => a + b, 0);

    return {
      total: totalCancellations,
      byReason: {
        cancelledByPatient: reasonMap.CANCELLED_BY_PATIENT || 0,
        cancelledByCenter: reasonMap.CANCELLED_BY_CENTER || 0,
        noShow: reasonMap.NO_SHOW || 0,
      },
      bySessionType: byType.map(t => ({
        type: t._id || 'غير محدد',
        count: t.count,
        percentage: totalCancellations > 0 ? Math.round((t.count / totalCancellations) * 100) : 0,
      })),
      topCancellingTherapists: byTherapist.map(t => ({
        therapistId: t._id,
        cancellations: t.cancellations,
      })),
      topCancellingBeneficiaries: byBeneficiary.map(b => ({
        beneficiaryId: b._id,
        cancellations: b.cancellations,
      })),
      monthlyTrend: trend.map(t => ({
        month: t._id,
        total: t.count,
        byPatient: t.byPatient,
        byCenter: t.byCenter,
        noShow: t.noShow,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  عرض التقويم — Calendar View
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get sessions formatted for calendar display
   */
  async getCalendarSessions(query = {}) {
    const Session = getSession();
    const { startDate, endDate, therapistId, roomId, status, sessionType } = query;

    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    } else {
      // Default: current month
      match.date = { $gte: startOfMonth(), $lte: endOfMonth() };
    }
    if (therapistId) match.therapist = new mongoose.Types.ObjectId(therapistId);
    if (roomId) match.room = new mongoose.Types.ObjectId(roomId);
    if (status) match.status = status;
    if (sessionType) match.sessionType = sessionType;

    const sessions = await Session.find(match)
      .populate('beneficiary', 'firstName lastName fullName name')
      .populate('therapist', 'firstName lastName fullName specialization')
      .populate('room', 'name type')
      .sort({ date: 1, startTime: 1 })
      .lean();

    // Map status to colors
    const statusColors = {
      SCHEDULED: '#2196F3',
      CONFIRMED: '#4CAF50',
      IN_PROGRESS: '#FF9800',
      COMPLETED: '#8BC34A',
      CANCELLED_BY_PATIENT: '#f44336',
      CANCELLED_BY_CENTER: '#E91E63',
      NO_SHOW: '#9E9E9E',
      RESCHEDULED: '#9C27B0',
    };

    const statusLabels = {
      SCHEDULED: 'مجدولة',
      CONFIRMED: 'مؤكدة',
      IN_PROGRESS: 'جارية',
      COMPLETED: 'مكتملة',
      CANCELLED_BY_PATIENT: 'ملغاة (مستفيد)',
      CANCELLED_BY_CENTER: 'ملغاة (مركز)',
      NO_SHOW: 'غياب',
      RESCHEDULED: 'معاد جدولتها',
    };

    const calendarEvents = sessions.map(s => ({
      id: s._id,
      title:
        s.title ||
        `${s.sessionType} - ${s.beneficiary?.fullName || s.beneficiary?.name || 'غير محدد'}`,
      start: s.startTime
        ? new Date(`${new Date(s.date).toISOString().split('T')[0]}T${s.startTime}:00`)
        : s.date,
      end: s.endTime
        ? new Date(`${new Date(s.date).toISOString().split('T')[0]}T${s.endTime}:00`)
        : new Date(new Date(s.date).getTime() + (s.duration || 45) * 60000),
      color: statusColors[s.status] || '#2196F3',
      status: s.status,
      statusLabel: statusLabels[s.status] || s.status,
      sessionType: s.sessionType,
      therapist: s.therapist
        ? {
            id: s.therapist._id,
            name:
              s.therapist.fullName ||
              `${s.therapist.firstName || ''} ${s.therapist.lastName || ''}`.trim(),
          }
        : null,
      beneficiary: s.beneficiary
        ? {
            id: s.beneficiary._id,
            name: s.beneficiary.fullName || s.beneficiary.name || 'غير محدد',
          }
        : null,
      room: s.room ? { id: s.room._id, name: s.room.name } : null,
      priority: s.priority,
      duration: s.duration || s.computedDuration || 45,
    }));

    return {
      events: calendarEvents,
      total: calendarEvents.length,
      dateRange: {
        start: startDate || startOfMonth(),
        end: endDate || endOfMonth(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تصدير التقارير — Export Report
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate exportable report data (JSON/CSV-ready)
   */
  async generateExportReport(query = {}) {
    const Session = getSession();
    const { startDate, endDate, format = 'json', reportType = 'sessions' } = query;

    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const sessions = await Session.find(match)
      .populate('beneficiary', 'firstName lastName fullName name')
      .populate('therapist', 'firstName lastName fullName')
      .populate('room', 'name type')
      .sort({ date: -1 })
      .lean();

    if (format === 'csv') {
      // CSV format
      const headers = [
        'التاريخ',
        'الوقت',
        'النوع',
        'الحالة',
        'المعالج',
        'المستفيد',
        'الغرفة',
        'المدة (دقيقة)',
        'التقييم',
        'مفوتر',
      ];

      const rows = sessions.map(s => [
        new Date(s.date).toISOString().split('T')[0],
        s.startTime || '',
        s.sessionType || '',
        s.status,
        s.therapist?.fullName ||
          `${s.therapist?.firstName || ''} ${s.therapist?.lastName || ''}`.trim() ||
          '',
        s.beneficiary?.fullName || s.beneficiary?.name || '',
        s.room?.name || '',
        s.duration || '',
        s.rating || '',
        s.isBilled ? 'نعم' : 'لا',
      ]);

      return {
        format: 'csv',
        headers,
        rows,
        totalRows: rows.length,
        generatedAt: new Date(),
      };
    }

    // JSON format with summary
    return {
      format: 'json',
      reportType,
      generatedAt: new Date(),
      totalSessions: sessions.length,
      sessions: sessions.map(s => ({
        id: s._id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        sessionType: s.sessionType,
        status: s.status,
        therapist: s.therapist?.fullName || '',
        beneficiary: s.beneficiary?.fullName || s.beneficiary?.name || '',
        room: s.room?.name || '',
        duration: s.duration,
        rating: s.rating,
        isBilled: s.isBilled,
        notes: s.notes,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  قائمة الانتظار — Waitlist Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get waitlist (check for overbookings and pending slots)
   */
  async getWaitlist(query = {}) {
    const Session = getSession();
    const { therapistId, sessionType, date } = query;

    // Find sessions that are rescheduled or have cancellation slots
    const recentCancellations = await Session.find({
      status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      date: { $gte: new Date() },
      ...(therapistId ? { therapist: therapistId } : {}),
      ...(sessionType ? { sessionType } : {}),
    })
      .populate('therapist', 'firstName lastName fullName')
      .populate('room', 'name')
      .sort({ date: 1 })
      .limit(20)
      .lean();

    // Available slots = cancelled sessions that can be filled
    const availableSlots = recentCancellations.map(s => ({
      originalSessionId: s._id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      sessionType: s.sessionType,
      therapist: s.therapist
        ? {
            id: s.therapist._id,
            name: s.therapist.fullName || `${s.therapist.firstName} ${s.therapist.lastName}`,
          }
        : null,
      room: s.room ? { id: s.room._id, name: s.room.name } : null,
      status: 'متاح',
    }));

    return {
      availableSlots,
      totalAvailable: availableSlots.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تحديث حالة الفوترة — Billing Status Update
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update billing status for a session
   */
  async updateBillingStatus(sessionId, billingData) {
    const Session = getSession();
    const session = await Session.findById(sessionId);
    if (!session) {
      const { AppError } = require('../middleware/errorHandler.enhanced');
      throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');
    }

    session.isBilled = billingData.isBilled !== undefined ? billingData.isBilled : true;
    if (billingData.invoiceId) session.invoiceId = billingData.invoiceId;

    await session.save();
    return session;
  }

  /**
   * Bulk update billing status
   */
  async bulkUpdateBilling(sessionIds, isBilled, invoiceId) {
    const Session = getSession();
    const update = { isBilled };
    if (invoiceId) update.invoiceId = invoiceId;

    const result = await Session.updateMany({ _id: { $in: sessionIds } }, { $set: update });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }
}

module.exports = new TherapySessionAnalyticsService();
