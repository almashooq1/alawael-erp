/**
 * Routes للتقارير والتحليلات
 * Reports and Analytics Routes
 */

const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/reports/dashboard
 * لوحة المعلومات الرئيسية
 * Dashboard Summary
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const result = await reportService.getDashboardSummary();
    res.json(result);
  } catch (error) {
    console.error('خطأ في الحصول على ملخص لوحة المعلومات:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في الحصول على ملخص لوحة المعلومات',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/fuel
 * تقرير استهلاك الوقود
 * Fuel Consumption Report
 */
router.get('/fuel', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      vehicleId: req.query.vehicleId,
      driverId: req.query.driverId,
    };

    const result = await reportService.getFuelConsumptionReport(filters);
    res.json(result);
  } catch (error) {
    console.error('خطأ في تقرير الوقود:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء تقرير الوقود',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/maintenance
 * تقرير الصيانة
 * Maintenance Report
 */
router.get('/maintenance', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      vehicleId: req.query.vehicleId,
      maintenanceType: req.query.maintenanceType,
    };

    const result = await reportService.getMaintenanceReport(filters);
    res.json(result);
  } catch (error) {
    console.error('خطأ في تقرير الصيانة:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء تقرير الصيانة',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/driver-performance
 * تقرير أداء السائقين
 * Driver Performance Report
 */
router.get('/driver-performance', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      driverId: req.query.driverId,
    };

    const result = await reportService.getDriverPerformanceReport(filters);
    res.json(result);
  } catch (error) {
    console.error('خطأ في تقرير أداء السائقين:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء تقرير أداء السائقين',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/vehicle-utilization
 * تقرير استخدام المركبات
 * Vehicle Utilization Report
 */
router.get('/vehicle-utilization', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      vehicleId: req.query.vehicleId,
    };

    const result = await reportService.getVehicleUtilizationReport(filters);
    res.json(result);
  } catch (error) {
    console.error('خطأ في تقرير استخدام المركبات:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء تقرير استخدام المركبات',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/costs
 * تقرير التكاليف الشامل
 * Comprehensive Cost Report
 */
router.get('/costs', authenticateToken, async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const result = await reportService.getComprehensiveCostReport(filters);
    res.json(result);
  } catch (error) {
    console.error('خطأ في تقرير التكاليف:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء تقرير التكاليف',
      error: error.message,
    });
  }
});

/**
 * GET /api/reports/export/:type
 * تصدير التقرير (PDF/Excel)
 * Export Report
 */
router.get('/export/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'json'; // json, csv, pdf

    let result;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      vehicleId: req.query.vehicleId,
      driverId: req.query.driverId,
    };

    switch (type) {
      case 'fuel':
        result = await reportService.getFuelConsumptionReport(filters);
        break;
      case 'maintenance':
        result = await reportService.getMaintenanceReport(filters);
        break;
      case 'driver-performance':
        result = await reportService.getDriverPerformanceReport(filters);
        break;
      case 'vehicle-utilization':
        result = await reportService.getVehicleUtilizationReport(filters);
        break;
      case 'costs':
        result = await reportService.getComprehensiveCostReport(filters);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'نوع التقرير غير صحيح',
        });
    }

    // إذا كان الطلب CSV
    if (format === 'csv') {
      // TODO: تحويل إلى CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      return res.json(result); // مؤقتاً حتى يتم تنفيذ CSV
    }

    // إذا كان الطلب PDF
    if (format === 'pdf') {
      // TODO: تحويل إلى PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
      return res.json(result); // مؤقتاً حتى يتم تنفيذ PDF
    }

    // JSON بشكل افتراضي
    res.json(result);
  } catch (error) {
    console.error('خطأ في تصدير التقرير:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تصدير التقرير',
      error: error.message,
    });
  }
});

module.exports = router;
