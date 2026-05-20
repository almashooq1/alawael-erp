'use strict';

/**
 * ministry-report.routes.js — Wave 187.
 *
 * Monthly aggregation for the وزارة الموارد البشرية والتنمية الاجتماعية
 * (MOHRSD) report. Composes data from W174-W179 modules into the shape
 * required by the ministry's standard monthly form.
 *
 * Endpoint:
 *   GET /monthly?year=2026&month=5&branchId=<id>
 *
 * Computes:
 *   • Enrollment headcount per program (from BeneficiarySection)
 *   • Attendance %: present/total-expected per (working) day, monthly avg
 *   • Days breakdown: working days, attendance counts, send-home count
 *   • Communication compliance: logs written / expected (per kid per day)
 *   • Allergy incidents from meal log
 *   • Health flags: fever days, send-home decisions
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const BeneficiarySection = require('../models/BeneficiarySection');
const BeneficiaryDayAttendance = require('../models/BeneficiaryDayAttendance');
const DailyCommunicationLog = require('../models/DailyCommunicationLog');
const MorningHealthCheck = require('../models/MorningHealthCheck');
const BeneficiaryMealEvent = require('../models/BeneficiaryMealEvent');
const safeError = require('../utils/safeError');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'quality',
  'ceo',
  'hr',
];

function startOfMonth(y, m) {
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}
function endOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}

router.get('/monthly', requireRole(READ_ROLES), async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || now.getUTCMonth() + 1;
    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'الشهر يجب أن يكون بين 1 و 12' });
    }
    const start = startOfMonth(year, month);
    const end = endOfMonth(year, month);

    const branchFilter = {};
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      branchFilter.branchId = new mongoose.Types.ObjectId(req.query.branchId);
    }

    // ── Active sections snapshot ─────────────────────────────────
    const sections = await BeneficiarySection.find({
      ...branchFilter,
      status: { $in: ['active', 'paused'] },
    })
      .select('name code program beneficiaryIds capacity primaryTherapistId assistantIds status')
      .lean();

    const totalEnrolled = sections.reduce((acc, s) => acc + (s.beneficiaryIds?.length || 0), 0);
    const totalCapacity = sections.reduce((acc, s) => acc + (s.capacity || 0), 0);
    const totalStaff = sections.reduce(
      (acc, s) => acc + (s.primaryTherapistId ? 1 : 0) + (s.assistantIds?.length || 0),
      0
    );

    const enrollmentByProgram = {};
    for (const s of sections) {
      const p = s.program || 'unknown';
      enrollmentByProgram[p] = (enrollmentByProgram[p] || 0) + (s.beneficiaryIds?.length || 0);
    }

    // ── Attendance breakdown (parallel aggregations) ─────────────
    const dateFilter = { date: { $gte: start, $lte: end } };
    const [attendanceByStatus, dailyAttendance] = await Promise.all([
      BeneficiaryDayAttendance.aggregate([
        { $match: { ...dateFilter, ...branchFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      BeneficiaryDayAttendance.aggregate([
        { $match: { ...dateFilter, ...branchFilter } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    const attendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, sent_home: 0 };
    for (const r of attendanceByStatus) {
      if (r._id in attendanceSummary) attendanceSummary[r._id] = r.count;
    }
    const totalAttendanceRecords = Object.values(attendanceSummary).reduce((a, b) => a + b, 0);
    const attendanceRate =
      totalAttendanceRecords > 0
        ? Math.round(
            ((attendanceSummary.present + attendanceSummary.late) / totalAttendanceRecords) * 100
          )
        : 0;

    // Distinct working days = days with any attendance record
    const workingDaysSet = new Set(dailyAttendance.map(r => r._id.date));
    const workingDays = workingDaysSet.size;

    // ── Communication compliance ─────────────────────────────────
    const [commTotal, commParentSeen] = await Promise.all([
      DailyCommunicationLog.countDocuments({ ...dateFilter, ...branchFilter }),
      DailyCommunicationLog.countDocuments({
        ...dateFilter,
        ...branchFilter,
        parentSeen: true,
      }),
    ]);

    // ── Health flags ─────────────────────────────────────────────
    const [healthByDecision, feverDaysAgg] = await Promise.all([
      MorningHealthCheck.aggregate([
        { $match: { ...dateFilter, ...branchFilter } },
        { $group: { _id: '$decision', count: { $sum: 1 } } },
      ]),
      MorningHealthCheck.aggregate([
        { $match: { ...dateFilter, ...branchFilter, temperatureC: { $gte: 38 } } },
        { $count: 'count' },
      ]),
    ]);
    const healthSummary = { allow: 0, observe: 0, send_home: 0 };
    for (const r of healthByDecision) {
      if (r._id in healthSummary) healthSummary[r._id] = r.count;
    }
    const feverCases = feverDaysAgg[0]?.count || 0;

    // ── Meal incidents ───────────────────────────────────────────
    const allergyIncidents = await BeneficiaryMealEvent.countDocuments({
      ...dateFilter,
      ...branchFilter,
      allergyIncident: true,
    });

    // ── Daily attendance grid for line/bar chart ────────────────
    const dailyGrid = {};
    for (const r of dailyAttendance) {
      const d = r._id.date;
      if (!dailyGrid[d])
        dailyGrid[d] = { present: 0, absent: 0, late: 0, excused: 0, sent_home: 0 };
      dailyGrid[d][r._id.status] = r.count;
    }
    const dailySeries = Object.entries(dailyGrid)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      period: {
        year,
        month,
        start: start.toISOString(),
        end: end.toISOString(),
        workingDays,
      },
      enrollment: {
        totalEnrolled,
        totalCapacity,
        capacityUtilization:
          totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0,
        sectionsCount: sections.length,
        byProgram: enrollmentByProgram,
      },
      staffing: {
        totalStaff,
        beneficiaryToStaffRatio:
          totalStaff > 0 ? Number((totalEnrolled / totalStaff).toFixed(1)) : null,
      },
      attendance: {
        ...attendanceSummary,
        totalRecords: totalAttendanceRecords,
        rate: attendanceRate,
      },
      communication: {
        logsWritten: commTotal,
        parentSeen: commParentSeen,
        seenRate: commTotal > 0 ? Math.round((commParentSeen / commTotal) * 100) : 0,
      },
      health: {
        ...healthSummary,
        feverCases,
        totalChecks: Object.values(healthSummary).reduce((a, b) => a + b, 0),
      },
      meals: {
        allergyIncidents,
      },
      dailySeries,
    });
  } catch (err) {
    return safeError(res, err, 'ministryReport.monthly');
  }
});

module.exports = router;
