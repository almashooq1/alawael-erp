/**
 * Business Intelligence Routes — مسارات ذكاء الأعمال
 *
 * Unified BI dashboard aggregating KPIs, analytics, trends,
 * and executive reports across all system modules.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { safeError } = require('../utils/safeError');

router.use(authenticate);

// Safe-load all models needed for aggregation
function safeModel(name) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD — لوحة تحكم تنفيذية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/executive', async (req, res) => {
  try {
    const data = {};

    // Beneficiary stats
    const Beneficiary = safeModel('Beneficiary');
    if (Beneficiary) {
      const [total, active] = await Promise.all([
        Beneficiary.countDocuments(),
        Beneficiary.countDocuments({ status: { $in: ['active', 'ACTIVE'] } }),
      ]);
      data.beneficiaries = {
        total,
        active,
        occupancy: total > 0 ? Math.round((active / total) * 100) : 0,
      };
    }

    // Staff stats
    const User = safeModel('User');
    if (User) {
      const [totalStaff, activeStaff] = await Promise.all([
        User.countDocuments({ role: { $ne: 'beneficiary' } }),
        User.countDocuments({ role: { $ne: 'beneficiary' }, isActive: true }),
      ]);
      data.staff = { total: totalStaff, active: activeStaff };
    }

    // Financial overview
    const Account = safeModel('Account');
    if (Account) {
      const balanceSummary = await Account.aggregate([
        { $group: { _id: '$accountType', totalBalance: { $sum: '$balance' }, count: { $sum: 1 } } },
        { $limit: 100 },
      ]);
      data.finance = { accounts: balanceSummary };
    }

    // Session stats (today)
    const TherapySession = safeModel('TherapySession');
    if (TherapySession) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todaySessions, completed, cancelled] = await Promise.all([
        TherapySession.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
        TherapySession.countDocuments({
          date: { $gte: today, $lt: tomorrow },
          status: 'completed',
        }),
        TherapySession.countDocuments({
          date: { $gte: today, $lt: tomorrow },
          status: 'cancelled',
        }),
      ]);
      data.sessions = { today: todaySessions, completed, cancelled };
    }

    res.json({ success: true, data });
  } catch (error) {
    safeError(res, error, '[BI] Executive dashboard error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// KPIs — مؤشرات الأداء الرئيسية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/kpis', async (req, res) => {
  try {
    const kpis = {};

    // Attendance rate
    const Attendance = safeModel('Attendance');
    if (Attendance) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [totalRecords, presentRecords] = await Promise.all([
        Attendance.countDocuments({ date: { $gte: thirtyDaysAgo } }),
        Attendance.countDocuments({
          date: { $gte: thirtyDaysAgo },
          status: { $in: ['present', 'PRESENT'] },
        }),
      ]);
      kpis.attendanceRate =
        totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
    }

    // Session utilization
    const TherapySession = safeModel('TherapySession');
    if (TherapySession) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [total, completed] = await Promise.all([
        TherapySession.countDocuments({ date: { $gte: thirtyDaysAgo } }),
        TherapySession.countDocuments({ date: { $gte: thirtyDaysAgo }, status: 'completed' }),
      ]);
      kpis.sessionUtilization = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    // Waitlist
    const Waitlist = safeModel('Waitlist');
    if (Waitlist) {
      kpis.waitlistCount = await Waitlist.countDocuments({ status: 'WAITING' });
    }

    // Open compliance issues
    const ComplianceLog = safeModel('ComplianceLog');
    if (ComplianceLog) {
      kpis.openComplianceIssues = await ComplianceLog.countDocuments({ status: 'OPEN' });
    }

    res.json({ success: true, data: kpis });
  } catch (error) {
    safeError(res, error, 'bi');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TRENDS — الاتجاهات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/trends', async (req, res) => {
  try {
    const { period = '30', metric = 'sessions' } = req.query;
    const days = parseInt(period, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let trendData = [];

    if (metric === 'sessions') {
      const TherapySession = safeModel('TherapySession');
      if (TherapySession) {
        trendData = await TherapySession.aggregate([
          { $match: { date: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              total: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      }
    } else if (metric === 'attendance') {
      const Attendance = safeModel('Attendance');
      if (Attendance) {
        trendData = await Attendance.aggregate([
          { $match: { date: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              total: { $sum: 1 },
              present: { $sum: { $cond: [{ $in: ['$status', ['present', 'PRESENT']] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      }
    } else if (metric === 'finance') {
      const JournalEntry = safeModel('JournalEntry');
      if (JournalEntry) {
        trendData = await JournalEntry.aggregate([
          { $match: { date: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              totalDebit: { $sum: '$totalDebit' },
              totalCredit: { $sum: '$totalCredit' },
              entries: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
      }
    }

    res.json({ success: true, data: { metric, period: days, trends: trendData } });
  } catch (error) {
    safeError(res, error, 'bi');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MODULE HEALTH — صحة الأنظمة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/modules', async (req, res) => {
  try {
    const modules = [
      'Beneficiary',
      'User',
      'TherapySession',
      'Attendance',
      'Account',
      'JournalEntry',
      'Donation',
      'Waitlist',
      'ComplianceLog',
      'Lead',
      'Asset',
      'Vehicle',
      'MaintenanceRequest',
      'Inventory',
    ];

    const results = await Promise.all(
      modules.map(async name => {
        const Model = safeModel(name);
        if (!Model) return { module: name, status: 'not-loaded', count: 0 };
        try {
          const count = await Model.estimatedDocumentCount();
          return { module: name, status: 'active', count };
        } catch (_err) {
          return { module: name, status: 'error', count: 0 };
        }
      })
    );

    res.json({ success: true, data: results });
  } catch (error) {
    safeError(res, error, 'bi');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS — التقارير
// ═══════════════════════════════════════════════════════════════════════════

router.get('/reports/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const summary = {};

    // Sessions summary
    const TherapySession = safeModel('TherapySession');
    if (TherapySession) {
      const sessionFilter = Object.keys(dateFilter).length ? { date: dateFilter } : {};
      const sessionStats = await TherapySession.aggregate([
        { $match: sessionFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);
      summary.sessions = Object.fromEntries(sessionStats.map(s => [s._id || 'unknown', s.count]));
    }

    // Financial summary
    const JournalEntry = safeModel('JournalEntry');
    if (JournalEntry) {
      const finFilter = Object.keys(dateFilter).length ? { date: dateFilter } : {};
      const finStats = await JournalEntry.aggregate([
        { $match: finFilter },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$totalDebit' },
            totalCredit: { $sum: '$totalCredit' },
            entries: { $sum: 1 },
          },
        },
      ]);
      summary.finance = finStats[0] || { totalDebit: 0, totalCredit: 0, entries: 0 };
    }

    // Donations summary
    const Donation = safeModel('Donation');
    if (Donation) {
      const donFilter = Object.keys(dateFilter).length ? { donationDate: dateFilter } : {};
      const donStats = await Donation.aggregate([
        { $match: donFilter },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);
      summary.donations = donStats;
    }

    res.json({ success: true, data: summary });
  } catch (error) {
    safeError(res, error, 'bi');
  }
});

module.exports = router;
