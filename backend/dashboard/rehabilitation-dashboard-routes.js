/* eslint-disable no-unused-vars */
/**
 * Rehabilitation Dashboard Routes
 * مسارات لوحة تحكم مراكز التأهيل
 */

const express = require('express');
const router = express.Router();
const {
  rehabilitationDashboardService,
  dashboardConfig,
} = require('./rehabilitation-dashboard-service');

// ============ Configuration ============

router.get('/config', (req, res) => {
  res.json({ success: true, data: dashboardConfig });
});

router.get('/config/card-types', (req, res) => {
  res.json({ success: true, data: dashboardConfig.cardTypes });
});

router.get('/config/time-ranges', (req, res) => {
  res.json({ success: true, data: dashboardConfig.timeRanges });
});

router.get('/config/kpis', (req, res) => {
  res.json({ success: true, data: dashboardConfig.kpis });
});

// ============ Main Dashboard ============

router.get('/center/:centerId', async (req, res) => {
  try {
    const options = {
      timeRange: req.query.timeRange || 'today',
    };
    const data = await rehabilitationDashboardService.getDashboardData(
      req.params.centerId,
      req.user?.id,
      options
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/center/:centerId/overview', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getOverviewStats(
      req.params.centerId,
      req.query.timeRange || 'today'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/center/:centerId/beneficiaries', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getBeneficiariesStats(
      req.params.centerId,
      req.query.timeRange || 'month'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/center/:centerId/staff', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getStaffStats(
      req.params.centerId,
      req.query.timeRange || 'month'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.get('/center/:centerId/transport', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getTransportStats(
      req.params.centerId,
      req.query.timeRange || 'today'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Charts ============

router.get('/center/:centerId/charts/attendance', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getAttendanceChartData(
      req.params.centerId,
      req.query.timeRange || 'week'
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ KPIs ============

router.get('/center/:centerId/kpis', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getKPIs(req.params.centerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Real-time ============

router.get('/center/:centerId/realtime', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getRealTimeMetrics(req.params.centerId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Alerts ============

router.get('/center/:centerId/alerts', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getActiveAlerts(req.params.centerId);
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/center/:centerId/alerts', async (req, res) => {
  try {
    const alert = await rehabilitationDashboardService.createAlert({
      ...req.body,
      centerId: req.params.centerId,
    });
    res.status(201).json({ success: true, data: alert, message: 'تم إنشاء التنبيه' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.put('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const alert = await rehabilitationDashboardService.acknowledgeAlert(req.params.alertId);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert, message: 'تم تأكيد التنبيه' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

// ============ Widgets ============

router.get('/center/:centerId/widgets', async (req, res) => {
  try {
    const data = await rehabilitationDashboardService.getWidgets(req.params.centerId);
    res.json({ success: true, data, count: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

router.post('/center/:centerId/widgets', async (req, res) => {
  try {
    const widget = await rehabilitationDashboardService.createWidget({
      ...req.body,
      centerId: req.params.centerId,
    });
    res.status(201).json({ success: true, data: widget, message: 'تم إنشاء البطاقة' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
