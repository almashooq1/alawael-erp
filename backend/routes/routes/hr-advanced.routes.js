/**
 * HR Advanced Routes - المسارات المتقدمة للموارد البشرية
 * API Endpoints شاملة مع التقارير والتحليلات والعمليات
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

// استيراد الخدمات
const HRService = require('../services/hr-advanced.service');
const HRAuditService = require('../services/hr/auditService');
const HRReportService = require('../services/hr/reportService');
const HRNotificationService = require('../services/hr/notificationService');
const HRExportService = require('../services/hr/exportService');
const HRBatchService = require('../services/hr/batchService');
const HRAnalyticsAIService = require('../services/hr/analyticsAIService');

// ============= إدارة الموظفين =============

/**
 * إنشاء موظف جديد
 * POST /api/hr/employees
 */
router.post('/employees', authenticateToken, authorizeRole(['HR', 'Admin']), async (req, res) => {
  try {
    const employee = await HRService.createEmployee(req.body);

    // تسجيل العملية
    await HRAuditService.logOperation({
      userId: req.user.id,
      action: 'CREATE_EMPLOYEE',
      entityType: 'Employee',
      entityId: employee._id,
      status: 'success',
    });

    res.json({
      success: true,
      message: 'تم إنشاء الموظف بنجاح',
      data: employee,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * تحديث بيانات الموظف
 * PUT /api/hr/employees/:id
 */
router.put(
  '/employees/:id',
  authenticateToken,
  authorizeRole(['HR', 'Admin']),
  async (req, res) => {
    try {
      const oldEmployee = await HRService.getEmployee(req.params.id);
      const employee = await HRService.updateEmployee(req.params.id, req.body);

      // تسجيل التغييرات
      await HRAuditService.logEmployeeChange(
        req.params.id,
        req.user.id,
        oldEmployee,
        employee,
        req.body.reason || 'تحديث بيانات'
      );

      res.json({
        success: true,
        message: 'تم تحديث الموظف بنجاح',
        data: employee,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * الحصول على بيانات الموظف الكاملة
 * GET /api/hr/employees/:id/profile
 */
router.get('/employees/:id/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await HRService.getEmployeeProfile(req.params.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

/**
 * البحث عن الموظفين
 * POST /api/hr/employees/search
 */
router.post('/employees/search', authenticateToken, async (req, res) => {
  try {
    const { searchTerm, filters } = req.body;
    const results = await HRService.searchEmployees(searchTerm, filters);
    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= نظام الرواتب =============

/**
 * إنشاء كشف رواتب شهري
 * POST /api/hr/payroll/generate
 */
router.post(
  '/payroll/generate',
  authenticateToken,
  authorizeRole(['HR', 'Finance']),
  async (req, res) => {
    try {
      const payrolls = await HRService.generatePayroll(req.body.month, req.body.employeeData);

      await HRAuditService.logOperation({
        userId: req.user.id,
        action: 'GENERATE_PAYROLL',
        entityType: 'Payroll',
        details: { month: req.body.month },
        affectedRecords: payrolls.length,
      });

      res.json({
        success: true,
        message: `تم إنشاء ${payrolls.length} كشف رواتب`,
        count: payrolls.length,
        data: payrolls,
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * معالجة الرواتب (دعم)
 * POST /api/hr/payroll/:month/process
 */
router.post(
  '/payroll/:month/process',
  authenticateToken,
  authorizeRole(['Finance', 'Admin']),
  async (req, res) => {
    try {
      const result = await HRService.processPayroll(req.params.month);

      await HRAuditService.logOperation({
        userId: req.user.id,
        action: 'PROCESS_PAYROLL',
        details: { month: req.params.month },
      });

      res.json({ success: true, message: 'تم معالجة الرواتب', data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تحويل الرواتب
 * POST /api/hr/payroll/:month/transfer
 */
router.post(
  '/payroll/:month/transfer',
  authenticateToken,
  authorizeRole(['Finance', 'Admin']),
  async (req, res) => {
    try {
      const result = await HRService.transferPayroll(req.params.month);
      res.json({ success: true, message: 'تم تحويل الرواتب', data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * الحصول على ملخص الرواتب الشهري
 * GET /api/hr/payroll/:month/summary
 */
router.get('/payroll/:month/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await HRService.getMonthlyPayrollSummary(req.params.month);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= التقييمات والأداء =============

/**
 * إنشاء تقييم أداء
 * POST /api/hr/performance
 */
router.post(
  '/performance',
  authenticateToken,
  authorizeRole(['HR', 'Manager']),
  async (req, res) => {
    try {
      const review = await HRService.createPerformanceReview(req.body.employeeId, req.body);

      await HRNotificationService.notifyPerformanceReview(
        { _id: req.body.employeeId },
        { reviewerName: req.user.name }
      );

      res.json({ success: true, message: 'تم إنشاء التقييم', data: review });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * الحصول على تقييمات الموظف
 * GET /api/hr/performance/:employeeId
 */
router.get('/performance/:employeeId', authenticateToken, async (req, res) => {
  try {
    const reviews = await HRService.getPerformanceReviews(req.params.employeeId);
    res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= التقارير =============

/**
 * تقرير نظرة عامة على الموارد البشرية
 * GET /api/hr/reports/overview
 */
router.get(
  '/reports/overview',
  authenticateToken,
  authorizeRole(['HR', 'Manager', 'Admin']),
  async (req, res) => {
    try {
      const report = await HRReportService.generateHROverviewReport(
        new Date(req.query.startDate),
        new Date(req.query.endDate)
      );
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تقرير الرواتب الشهري
 * GET /api/hr/reports/payroll?month=2&year=2026
 */
router.get(
  '/reports/payroll',
  authenticateToken,
  authorizeRole(['Finance', 'HR', 'Admin']),
  async (req, res) => {
    try {
      const report = await HRReportService.generateMonthlyPayrollReport(
        parseInt(req.query.month),
        parseInt(req.query.year)
      );
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تقرير الأداء
 * GET /api/hr/reports/performance
 */
router.get(
  '/reports/performance',
  authenticateToken,
  authorizeRole(['HR', 'Manager']),
  async (req, res) => {
    try {
      const report = await HRReportService.generatePerformanceReport(
        new Date(req.query.startDate),
        new Date(req.query.endDate)
      );
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تقرير العقود المنتهية
 * GET /api/hr/reports/expiring-contracts?days=30
 */
router.get(
  '/reports/expiring-contracts',
  authenticateToken,
  authorizeRole(['HR', 'Admin']),
  async (req, res) => {
    try {
      const report = await HRReportService.generateExpiringContractsReport(
        parseInt(req.query.days) || 30
      );
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============= التدقيق والسجلات =============

/**
 * جلب سجل التدقيق لموظف
 * GET /api/hr/audit/trail/:employeeId
 */
router.get(
  '/audit/trail/:employeeId',
  authenticateToken,
  authorizeRole(['HR', 'Admin']),
  async (req, res) => {
    try {
      const trail = await HRAuditService.getEmployeeAuditTrail(req.params.employeeId, {
        limit: req.query.limit || 50,
        page: req.query.page || 1,
      });
      res.json({ success: true, data: trail });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تقرير التدقيق الشامل
 * GET /api/hr/audit/report
 */
router.get('/audit/report', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    const report = await HRAuditService.getAuditReport({
      startDate: new Date(req.query.startDate),
      endDate: new Date(req.query.endDate),
    });
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= الإشعارات =============

/**
 * جلب إشعارات الموظف
 * GET /api/hr/notifications
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await HRNotificationService.getEmployeeNotifications(req.user.id, {
      limit: req.query.limit || 20,
      unreadOnly: req.query.unreadOnly === 'true',
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * تعليم إشعار كمقروء
 * PATCH /api/hr/notifications/:id/read
 */
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const result = await HRNotificationService.markAsRead(req.params.id);
    res.json({ success: true, message: 'تم تعليم الإشعار كمقروء' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= التصدير =============

/**
 * تصدير الموظفين إلى Excel
 * POST /api/hr/export/employees
 */
router.post(
  '/export/employees',
  authenticateToken,
  authorizeRole(['HR', 'Admin']),
  async (req, res) => {
    try {
      const result = await HRExportService.exportEmployeesToExcel(req.body.filters);
      res.json({ success: true, message: result.message, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تصدير الرواتب إلى Excel
 * POST /api/hr/export/payroll
 */
router.post(
  '/export/payroll',
  authenticateToken,
  authorizeRole(['Finance', 'HR']),
  async (req, res) => {
    try {
      const result = await HRExportService.exportPayrollToExcel(req.body.month, req.body.year);
      res.json({ success: true, message: result.message, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

// ============= العمليات الدفعية =============

/**
 * استيراد الموظفين
 * POST /api/hr/batch/import
 */
router.post(
  '/batch/import',
  authenticateToken,
  authorizeRole(['HR', 'Admin']),
  async (req, res) => {
    try {
      const result = await HRBatchService.importEmployees(req.body.data, req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * معالجة الرواتب الشهرية
 * POST /api/hr/batch/payroll
 */
router.post(
  '/batch/payroll',
  authenticateToken,
  authorizeRole(['Finance', 'Admin']),
  async (req, res) => {
    try {
      const result = await HRBatchService.processMonthlyPayroll(
        req.body.month,
        req.body.year,
        req.user.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * جلب حالة المهمة الدفعية
 * GET /api/hr/batch/status/:jobId
 */
router.get('/batch/status/:jobId', authenticateToken, async (req, res) => {
  try {
    const status = await HRBatchService.getJobStatus(req.params.jobId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============= التحليلات الذكية =============

/**
 * حساب مخاطر دوران الموظفين
 * GET /api/hr/analytics/retention-risk/:employeeId
 */
router.get(
  '/analytics/retention-risk/:employeeId',
  authenticateToken,
  authorizeRole(['HR', 'Manager']),
  async (req, res) => {
    try {
      const risk = await HRAnalyticsAIService.calculateRetentionRisk(req.params.employeeId);
      res.json({ success: true, data: risk });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * التنبؤ بالأداء المستقبلي
 * GET /api/hr/analytics/predict-performance/:employeeId
 */
router.get('/analytics/predict-performance/:employeeId', authenticateToken, async (req, res) => {
  try {
    const prediction = await HRAnalyticsAIService.predictFuturePerformance(req.params.employeeId);
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * التوصيات التدريبية
 * GET /api/hr/analytics/training-recommendations/:employeeId
 */
router.get(
  '/analytics/training-recommendations/:employeeId',
  authenticateToken,
  async (req, res) => {
    try {
      const recommendations = await HRAnalyticsAIService.recommendTrainings(req.params.employeeId);
      res.json({ success: true, data: recommendations });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
);

/**
 * تحليل التطوير الوظيفي
 * GET /api/hr/analytics/career-development/:employeeId
 */
router.get('/analytics/career-development/:employeeId', authenticateToken, async (req, res) => {
  try {
    const analysis = await HRAnalyticsAIService.analyzeCareerDevelopment(req.params.employeeId);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * تحليل الرضا الوظيفي
 * GET /api/hr/analytics/job-satisfaction/:employeeId
 */
router.get('/analytics/job-satisfaction/:employeeId', authenticateToken, async (req, res) => {
  try {
    const satisfaction = await HRAnalyticsAIService.analyzeJobSatisfaction(req.params.employeeId);
    res.json({ success: true, data: satisfaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * مقارنة الأداء
 * GET /api/hr/analytics/benchmarking/:employeeId
 */
router.get('/analytics/benchmarking/:employeeId', authenticateToken, async (req, res) => {
  try {
    const benchmark = await HRAnalyticsAIService.performanceBenchmarking(req.params.employeeId);
    res.json({ success: true, data: benchmark });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
