/**
 * طرق العمليات الجماعية والتحليلات
 * Batch Operations and Analytics Routes
 */

const router = require('express').Router();
const axios = require('axios');
const Payroll = require('../models/payroll.model');
const BatchOperationsService = require('../services/batchOperationsService');
const DataExportService = require('../services/dataExportService');
const { authMiddleware, rbacMiddleware } = require('../middleware/auth');

/**
 * ========================
 * العمليات الجماعية
 * Batch Operations Routes
 * ========================
 */

/**
 * معالجة الرواتب لعدة موظفين
 * POST /api/payroll/batch/process-multiple
 */
router.post(
  '/batch/process-multiple',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'hr']),
  async (req, res) => {
    try {
      const { filters = {}, limit = 500 } = req.body;

      const results = await BatchOperationsService.processMultiplePayrolls(
        filters,
        {
          limit,
          userId: req.user.id
        }
      );

      res.status(200).json({
        success: true,
        message: 'تمت معالجة الرواتب بنجاح',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * الموافقة الجماعية على الرواتب
 * POST /api/payroll/batch/approve-all
 */
router.post(
  '/batch/approve-all',
  authMiddleware,
  rbacMiddleware(['admin', 'hr', 'manager', 'director']),
  async (req, res) => {
    try {
      const { payrollIds, comments } = req.body;

      if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد معرفات الرواتب'
        });
      }

      const results = await BatchOperationsService.approveMultiplePayrolls(
        payrollIds,
        {
          name: req.user.name,
          userId: req.user.id,
          level: req.user.role,
          comments
        }
      );

      res.status(200).json({
        success: true,
        message: 'تمت الموافقة على الرواتب بنجاح',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * تحويل الدفع الجماعي
 * POST /api/payroll/batch/transfer-payments
 */
router.post(
  '/batch/transfer-payments',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'finance']),
  async (req, res) => {
    try {
      const { payrollIds, bankCode, accountNumber } = req.body;

      if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد معرفات الرواتب'
        });
      }

      const results = await BatchOperationsService.transferMultiplePayments(
        payrollIds,
        {
          userId: req.user.id,
          bankCode,
          accountNumber
        }
      );

      res.status(200).json({
        success: true,
        message: 'تم تحويل الدفع بنجاح',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * تحديث حالة جماعي
 * PUT /api/payroll/batch/update-status
 */
router.put(
  '/batch/update-status',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'hr']),
  async (req, res) => {
    try {
      const { payrollIds, status } = req.body;

      if (!payrollIds || !Array.isArray(payrollIds)) {
        return res.status(400).json({
          success: false,
          message: 'يجب توفير قائمة معرفات صحيحة'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد الحالة الجديدة'
        });
      }

      const results = await BatchOperationsService.updateBulkStatus(
        payrollIds,
        status,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'تم تحديث الحالات بنجاح',
        data: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * جدولة عملية متكررة
 * POST /api/payroll/batch/schedule
 */
router.post(
  '/batch/schedule',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll']),
  async (req, res) => {
    try {
      const { operationType, frequency, filters, nextRunDate } = req.body;

      const schedule = await BatchOperationsService.scheduleRecurringOperation({
        operationType,
        frequency,
        filters,
        nextRunDate: nextRunDate ? new Date(nextRunDate) : null,
        userId: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'تمت جدولة العملية بنجاح',
        data: schedule
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * الحصول على حالة العملية الجماعية
 * GET /api/payroll/batch/status/:batchId
 */
router.get(
  '/batch/status/:batchId',
  authMiddleware,
  async (req, res) => {
    try {
      const { batchId } = req.params;

      const status = await BatchOperationsService.getBatchStatus(batchId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * إلغاء عملية جماعية
 * POST /api/payroll/batch/cancel/:batchId
 */
router.post(
  '/batch/cancel/:batchId',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll']),
  async (req, res) => {
    try {
      const { batchId } = req.params;
      const { reason } = req.body;

      const result = await BatchOperationsService.cancelBatchOperation(batchId, reason);

      res.status(200).json({
        success: true,
        message: 'تم إلغاء العملية بنجاح',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * ========================
 * التحليلات
 * Analytics Routes
 * ========================
 */

/**
 * الحصول على تحليلات الرواتب
 * GET /api/payroll/analytics
 */
router.get(
  '/analytics',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'hr', 'manager', 'director']),
  async (req, res) => {
    try {
      const { startDate, endDate, department, status } = req.query;

      // بناء الاستعلام
      let query = {};

      if (startDate || endDate) {
        query.payPeriod = {};
        if (startDate) query.payPeriod.$gte = new Date(startDate);
        if (endDate) query.payPeriod.$lte = new Date(endDate);
      }

      if (department && department !== 'all') {
        query.department = department;
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      const payrolls = await Payroll.find(query).lean();

      // حساب الإحصائيات
      const analytics = {
        summary: {
          totalEmployees: new Set(payrolls.map(p => p.employeeId)).size,
          totalPayroll: payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0),
          averageSalary: 0,
          maxSalary: Math.max(...payrolls.map(p => p.basicSalary || 0)),
          minSalary: Math.min(...payrolls.map(p => p.basicSalary || 0))
        },
        payrollStats: {
          processed: payrolls.filter(p => p.status === 'processed').length,
          pending: payrolls.filter(p => p.status === 'pending').length,
          approved: payrolls.filter(p => p.status === 'approved').length,
          paid: payrolls.filter(p => p.status === 'paid').length,
          approvalRate: payrolls.length > 0 
            ? Math.round((payrolls.filter(p => p.status === 'approved').length / payrolls.length) * 100)
            : 0
        },
        departmentStats: [],
        incentiveStats: {
          total: payrolls.reduce((sum, p) => sum + (p.totalIncentives || 0), 0),
          count: payrolls.filter(p => p.totalIncentives > 0).length,
          average: 0
        },
        deductionStats: {
          total: payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
          types: [],
          average: 0
        },
        trends: [],
        topPerformers: [],
        salaryDistribution: generateSalaryDistribution(payrolls)
      };

      // متوسط الراتب
      analytics.summary.averageSalary = analytics.summary.totalPayroll / 
        (analytics.summary.totalEmployees || 1);

      // متوسط الحافز
      analytics.incentiveStats.average = analytics.incentiveStats.count > 0
        ? analytics.incentiveStats.total / analytics.incentiveStats.count
        : 0;

      // متوسط الخصم
      analytics.deductionStats.average = payrolls.length > 0
        ? analytics.deductionStats.total / payrolls.length
        : 0;

      // حسب الأقسام
      const deptMap = {};
      payrolls.forEach(p => {
        if (!deptMap[p.department]) {
          deptMap[p.department] = 0;
        }
        deptMap[p.department] += p.netSalary || 0;
      });

      analytics.departmentStats = Object.entries(deptMap).map(([name, total]) => ({
        name,
        total,
        count: payrolls.filter(p => p.department === name).length
      }));

      // أفضل الموظفين
      analytics.topPerformers = payrolls
        .filter(p => p.totalIncentives > 0)
        .sort((a, b) => (b.totalIncentives || 0) - (a.totalIncentives || 0))
        .slice(0, 10)
        .map(p => ({
          employeeName: p.employeeName || 'غير معروف',
          department: p.department,
          totalIncentives: p.totalIncentives || 0
        }));

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * تصدير التحليلات إلى PDF
 * GET /api/payroll/analytics/export/pdf
 */
router.get(
  '/analytics/export/pdf',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'hr', 'manager', 'director']),
  async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;

      // الحصول على البيانات
      let query = {};
      if (startDate) query.payPeriod = { $gte: new Date(startDate) };
      if (endDate) {
        query.payPeriod = query.payPeriod || {};
        query.payPeriod.$lte = new Date(endDate);
      }
      if (department && department !== 'all') query.department = department;

      const payrolls = await Payroll.find(query);

      // تصدير إلى PDF
      const pdfBuffer = await DataExportService.exportAnalyticsToPDF(payrolls);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * تصدير التحليلات إلى Excel
 * GET /api/payroll/analytics/export/excel
 */
router.get(
  '/analytics/export/excel',
  authMiddleware,
  rbacMiddleware(['admin', 'payroll', 'hr', 'manager', 'director']),
  async (req, res) => {
    try {
      const { startDate, endDate, department } = req.query;

      // الحصول على البيانات
      let query = {};
      if (startDate) query.payPeriod = { $gte: new Date(startDate) };
      if (endDate) {
        query.payPeriod = query.payPeriod || {};
        query.payPeriod.$lte = new Date(endDate);
      }
      if (department && department !== 'all') query.department = department;

      const payrolls = await Payroll.find(query);

      // تصدير إلى Excel
      const buffer = await DataExportService.exportToExcel(payrolls);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.xlsx"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * دوال مساعدة
 */

function generateSalaryDistribution(payrolls) {
  const ranges = [
    { range: 'أقل من 3000', min: 0, max: 3000 },
    { range: '3000 - 5000', min: 3000, max: 5000 },
    { range: '5000 - 8000', min: 5000, max: 8000 },
    { range: '8000 - 12000', min: 8000, max: 12000 },
    { range: 'أكثر من 12000', min: 12000, max: Infinity }
  ];

  return ranges.map(range => {
    const count = payrolls.filter(
      p => p.basicSalary >= range.min && p.basicSalary < range.max
    ).length;
    return {
      range: range.range,
      count,
      percentage: payrolls.length > 0 ? Math.round((count / payrolls.length) * 100) : 0
    };
  });
}

module.exports = router;
