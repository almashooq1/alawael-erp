/**
 * 🔔 مسارات الإنذارات والتنبيهات
 */

const express = require('express');
const router = express.Router();
const alertService = require('../services/alertNotificationService');
const { authenticateToken } = require('../middleware/auth');

// إنشاء إنذار
router.post('/', authenticateToken, (req, res) => {
  try {
    const alert = alertService.createAlert(req.body);
    res.json({
      success: true,
      message: 'تم إنشاء الإنذار',
      alert,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الإنذارات النشطة
router.get('/active', (req, res) => {
  try {
    const result = alertService.getActiveAlerts(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تاريخ الإنذارات
router.get('/history', (req, res) => {
  try {
    const result = alertService.getAlertHistory(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تأكيد الإنذار
router.put('/:id/acknowledge', authenticateToken, (req, res) => {
  try {
    const alert = alertService.acknowledgeAlert(parseInt(req.params.id), req.user.id || 'admin');
    if (!alert) {
      return res.status(404).json({ success: false, message: 'الإنذار غير موجود' });
    }
    res.json({
      success: true,
      message: 'تم تأكيد الإنذار',
      alert,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إغلاق الإنذار
router.put('/:id/close', authenticateToken, (req, res) => {
  try {
    const alert = alertService.closeAlert(parseInt(req.params.id), req.body.resolution);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'الإنذار غير موجود' });
    }
    res.json({
      success: true,
      message: 'تم إغلاق الإنذار',
      alert,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إحصائيات الإنذارات
router.get('/statistics', (req, res) => {
  try {
    const stats = alertService.getAlertStatistics(req.query.period || 'monthly');
    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// الإشعارات المعلقة
router.get('/notifications/pending', authenticateToken, (req, res) => {
  try {
    const notifications = alertService.getPendingNotifications(req.user.id || 'admin');
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديد الإشعار كمقروء
router.put('/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const notification = alertService.markNotificationAsRead(
      parseInt(req.params.id),
      req.user.id || 'admin'
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'الإشعار غير موجود' });
    }
    res.json({
      success: true,
      message: 'تم تحديث الإشعار',
      notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// قواعس التنبيهات
router.get('/rules', (req, res) => {
  try {
    const rules = alertService.getAlertRules();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// إنشاء قاعدة مخصصة
router.post('/rules', authenticateToken, (req, res) => {
  try {
    const rule = alertService.createCustomAlertRule(req.body);
    res.json({
      success: true,
      message: 'تم إنشاء القاعدة',
      rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحديث قاعدة
router.put('/rules/:id', authenticateToken, (req, res) => {
  try {
    const rule = alertService.updateAlertRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    }
    res.json({
      success: true,
      message: 'تم تحديث القاعدة',
      rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تقرير الإنذارات
router.get('/report/:vehicleId', (req, res) => {
  try {
    const report = alertService.getAlertReport(
      req.params.vehicleId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تحليل الأنماط
router.get('/analytics/patterns', (req, res) => {
  try {
    const patterns = alertService.analyzeAlertPatterns();
    res.json(patterns);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
