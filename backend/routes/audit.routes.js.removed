/**
 * API Routes للتدقيق (Audit Log Routes)
 * مسارات شاملة لإدارة واستعلام سجلات التدقيق
 */

const express = require('express');
const router = express.Router();
const AuditLogService = require('../services/auditLog.service');
const { AuditLog, AuditEventTypes, SeverityLevels } = require('../models/auditLog.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/audit/logs
 * @desc    الحصول على سجلات التدقيق مع فلاتر
 * @access  Private (Admin, Auditor)
 */
router.get('/logs', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const {
      eventType,
      eventCategory,
      severity,
      status,
      userId,
      startDate,
      endDate,
      ipAddress,
      searchText,
      tags,
      isAnomaly,
      requiresReview,
      page = 1,
      limit = 50,
      sort = '-timestamp',
    } = req.query;

    const filters = {
      eventType,
      eventCategory,
      severity,
      status,
      userId,
      startDate,
      endDate,
      ipAddress,
      searchText,
      tags: tags ? tags.split(',') : undefined,
      isAnomaly: isAnomaly === 'true',
      requiresReview: requiresReview === 'true',
    };

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort,
    };

    const result = await AuditLogService.search(filters, options);

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/logs/:id
 * @desc    الحصول على سجل تدقيق محدد
 * @access  Private (Admin, Auditor)
 */
router.get('/logs/:id', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'username email role')
      .populate('review.reviewedBy', 'username email')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/statistics
 * @desc    الحصول على إحصائيات التدقيق
 * @access  Private (Admin, Auditor)
 */
router.get('/statistics', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const statistics = await AuditLogService.getStatistics(start, end);

    res.json({
      success: true,
      data: statistics,
      period: { startDate: start, endDate: end },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/users/:userId
 * @desc    الحصول على سجلات تدقيق مستخدم محدد
 * @access  Private (Admin, Auditor, Self)
 */
router.get('/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, skip = 0, startDate, endDate } = req.query;

    // التحقق من الصلاحيات
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'auditor' &&
      req.user._id.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const logs = await AuditLog.getByUser(userId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user logs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/users/:userId/behavior
 * @desc    تحليل سلوك المستخدم
 * @access  Private (Admin, Auditor)
 */
router.get(
  '/users/:userId/behavior',
  authenticate,
  authorize(['admin', 'auditor']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      const analysis = await AuditLogService.analyzeUserBehavior(userId, parseInt(days));

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      res.status(500).json({
        success: false,
        message: 'Error analyzing user behavior',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/audit/critical
 * @desc    الحصول على الأحداث الحرجة
 * @access  Private (Admin, Auditor)
 */
router.get('/critical', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const criticalEvents = await AuditLog.getCriticalEvents(parseInt(hours));

    res.json({
      success: true,
      data: criticalEvents,
      count: criticalEvents.length,
    });
  } catch (error) {
    console.error('Error fetching critical events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching critical events',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/suspicious
 * @desc    الحصول على الأنشطة المشبوهة
 * @access  Private (Admin, Auditor)
 */
router.get('/suspicious', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const suspiciousActivities = await AuditLog.getSuspiciousActivities(parseInt(hours));

    res.json({
      success: true,
      data: suspiciousActivities,
      count: suspiciousActivities.length,
    });
  } catch (error) {
    console.error('Error fetching suspicious activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suspicious activities',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/anomalies/:userId
 * @desc    كشف الحالات الشاذة للمستخدم
 * @access  Private (Admin, Auditor)
 */
router.get(
  '/anomalies/:userId',
  authenticate,
  authorize(['admin', 'auditor']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { threshold = 3 } = req.query;

      const anomalies = await AuditLog.detectAnomalies(userId, parseInt(threshold));

      res.json({
        success: true,
        data: anomalies,
        count: anomalies.length,
      });
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      res.status(500).json({
        success: false,
        message: 'Error detecting anomalies',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/audit/logs/:id/review
 * @desc    مراجعة سجل تدقيق
 * @access  Private (Admin, Auditor)
 */
router.post('/logs/:id/review', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['reviewed', 'approved', 'flagged'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status',
      });
    }

    const log = await AuditLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    await log.addReview(req.user._id, status, notes);

    res.json({
      success: true,
      message: 'Review added successfully',
      data: log,
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/audit/logs/:id/flags
 * @desc    تحديث علامات سجل التدقيق
 * @access  Private (Admin, Auditor)
 */
router.patch('/logs/:id/flags', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { flags } = req.body;

    const log = await AuditLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    await log.setFlags(flags);

    res.json({
      success: true,
      message: 'Flags updated successfully',
      data: log,
    });
  } catch (error) {
    console.error('Error updating flags:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating flags',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/export
 * @desc    تصدير سجلات التدقيق
 * @access  Private (Admin, Auditor)
 */
router.get('/export', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;

    const logs = await AuditLogService.exportLogs(filters, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(logs);
    } else {
      res.json({
        success: true,
        data: logs,
      });
    }
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting logs',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/audit/archive
 * @desc    أرشفة السجلات القديمة
 * @access  Private (Admin)
 */
router.post('/archive', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { daysOld = 90 } = req.body;

    const result = await AuditLogService.archiveOldLogs(daysOld);

    res.json({
      success: true,
      message: 'Logs archived successfully',
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error archiving logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving logs',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/audit/clean
 * @desc    حذف السجلات المؤرشفة القديمة
 * @access  Private (Admin)
 */
router.delete('/clean', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { daysOld = 180 } = req.body;

    const result = await AuditLogService.deleteArchivedLogs(daysOld);

    res.json({
      success: true,
      message: 'Archived logs deleted successfully',
      count: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting logs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/event-types
 * @desc    الحصول على قائمة أنواع الأحداث
 * @access  Private (Admin, Auditor)
 */
router.get('/event-types', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    res.json({
      success: true,
      data: Object.values(AuditEventTypes),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event types',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/audit/dashboard
 * @desc    بيانات لوحة التحكم
 * @access  Private (Admin, Auditor)
 */
router.get('/dashboard', authenticate, authorize(['admin', 'auditor']), async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLogs24h,
      criticalEvents24h,
      failedEvents24h,
      suspiciousActivities24h,
      recentLogs,
      eventDistribution,
    ] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: last24h } }),
      AuditLog.countDocuments({
        severity: { $in: ['critical', 'high'] },
        timestamp: { $gte: last24h },
      }),
      AuditLog.countDocuments({
        status: 'failure',
        timestamp: { $gte: last24h },
      }),
      AuditLog.countDocuments({
        'flags.isAnomaly': true,
        timestamp: { $gte: last24h },
      }),
      AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: last7d } } },
        {
          $group: {
            _id: '$eventCategory',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalLogs24h,
          criticalEvents24h,
          failedEvents24h,
          suspiciousActivities24h,
          successRate:
            totalLogs24h > 0
              ? (((totalLogs24h - failedEvents24h) / totalLogs24h) * 100).toFixed(2)
              : 0,
        },
        recentLogs,
        eventDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
});

module.exports = router;
