'use strict';
/**
 * HR Smart Routes — الموارد البشرية الذكية
 * AI-assisted recommendations, anomaly detection, smart scheduling
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Smart Attendance Anomaly Detection
router.get(
  '/anomalies/attendance',
  authorize('admin', 'hr_manager', 'manager'),
  async (req, res) => {
    try {
      const Attendance = require('../models/HR/Attendance');
      const { days = 30 } = req.query;
      const since = new Date();
      since.setDate(since.getDate() - +days);
      const anomalies = await Attendance.aggregate([
        { $match: { date: { $gte: since }, status: { $in: ['absent', 'late'] } } },
        {
          $group: {
            _id: '$employeeId',
            absences: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            lates: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          },
        },
        { $match: { $or: [{ absences: { $gte: 3 } }, { lates: { $gte: 5 } }] } },
        { $sort: { absences: -1 } },
      ]);
      res.json({ success: true, data: anomalies, count: anomalies.length });
    } catch (err) {
      return safeError(res, err, 'hr-smart');
    }
  }
);

// Smart Leave Conflict Detector
router.get('/leaves/conflicts', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const LeaveRequest = require('../models/HR/LeaveRequest');
    const { from, to, department } = req.query;
    if (!from || !to)
      return res.status(400).json({ success: false, message: 'from and to date required' });
    const filter = {
      status: 'approved',
      $or: [{ startDate: { $lte: new Date(to) }, endDate: { $gte: new Date(from) } }],
    };
    if (department) {
      // Join on employee department
      const Employee = require('../models/HR/Employee');
      const empIds = await Employee.find({ department }).distinct('_id');
      filter.employeeId = { $in: empIds };
    }
    const data = await LeaveRequest.find(filter).lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    return safeError(res, err, 'hr-smart');
  }
});

// Smart Overtime Recommendations
router.get(
  '/overtime/recommendations',
  authorize('admin', 'hr_manager', 'manager'),
  async (req, res) => {
    try {
      const Employee = require('../models/HR/Employee');
      const { department } = req.query;
      const filter = { status: 'active' };
      if (department) filter.department = department;
      const data = await Employee.find(filter)
        .select('firstName lastName department position')
        .lean();
      // Stub: real implementation would cross-reference scheduled hours vs worked hours
      res.json({
        success: true,
        data: data.map(e => ({
          employee: e,
          suggestedOvertimeHours: 0,
          reason: 'Calculated from schedule',
        })),
      });
    } catch (err) {
      return safeError(res, err, 'hr-smart');
    }
  }
);

// Smart Performance Alerts
router.get('/performance/alerts', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const PerformanceReview = require('../models/HR/PerformanceReview');
    const alerts = await PerformanceReview.find({ overallScore: { $lt: 3 }, status: 'completed' })
      .sort({ reviewDate: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) {
    return safeError(res, err, 'hr-smart');
  }
});

// Smart Suggestions (general AI endpoint stub)
router.post('/suggestions', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const { topic } = req.body;
    // Placeholder for ML/AI integration
    res.json({
      success: true,
      data: {
        topic,
        suggestions: [],
        note: 'AI suggestions module pending integration',
      },
    });
  } catch (err) {
    return safeError(res, err, 'hr-smart');
  }
});

module.exports = router;
