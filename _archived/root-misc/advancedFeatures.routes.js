/**
 * 🚀 مسارات API للميزات الجديدة - نظام الفوترة الذكية
 * Advanced Features Routes
 * مسارات API للتحليليات والإشعارات المتقدمة
 */

const express = require('express');
const router = express.Router();
const { AdvancedAnalyticsService, Analytics } = require('../AdvancedAnalytics');
const { AdvancedSMSService } = require('../AdvancedSMSNotifications');
const SmartInvoice = require('../SmartInvoice');

// Middleware للمصادقة والترخيص
const verifyToken = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// ============================================
// مسارات التحليليات المتقدمة
// ============================================

/**
 * GET /api/advanced-analytics/metrics
 * الحصول على المقاييس الأساسية لفترة محددة
 */
router.get('/analytics/metrics', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'يرجى تحديد startDate و endDate'
      });
    }

    const metrics = await AdvancedAnalyticsService.calculateMetrics(
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: metrics,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/advanced-analytics/customers
 * تحليل بيانات العملاء
 */
router.get('/analytics/customers', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const customerAnalytics = await AdvancedAnalyticsService.analyzeCustomers(
      new Date(startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
      new Date(endDate || Date.now())
    );

    res.status(200).json({
      success: true,
      data: customerAnalytics
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/advanced-analytics/forecasts
 * الحصول على التنبؤات المستقبلية
 */
router.get('/analytics/forecasts', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    // جمع بيانات تاريخية
    const historicalInvoices = await SmartInvoice.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' }
          },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const historicalData = historicalInvoices.map(inv => inv.totalAmount).reverse();

    const forecasts = await AdvancedAnalyticsService.generateForecasts(historicalData);

    res.status(200).json({
      success: true,
      data: forecasts,
      basedOnMonths: historicalData.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/advanced-analytics/historical
 * الحصول على البيانات التحليلية التاريخية
 */
router.get('/analytics/historical', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { period = 'monthly', limit = 12 } = req.query;

    const historical = await AdvancedAnalyticsService.getHistoricalAnalytics(period, parseInt(limit));

    res.status(200).json({
      success: true,
      data: historical,
      count: historical.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/advanced-analytics/generate
 * توليد تقرير تحليلي شامل
 */
router.post('/analytics/generate', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, period = 'monthly' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'يرجى تحديد تاريخ البداية والنهاية'
      });
    }

    // حساب جميع المقاييس
    const metrics = await AdvancedAnalyticsService.calculateMetrics(
      new Date(startDate),
      new Date(endDate)
    );

    const customerAnalytics = await AdvancedAnalyticsService.analyzeCustomers(
      new Date(startDate),
      new Date(endDate)
    );

    // حفظ التقرير
    const analyticsReport = await AdvancedAnalyticsService.saveAnalytics({
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      metrics,
      customerAnalytics,
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'تم توليد التقرير بنجاح',
      data: analyticsReport
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================
// مسارات إشعارات SMS المتقدمة
// ============================================

/**
 * POST /api/sms/send-new-invoice
 * إرسال إشعار فاتورة جديدة
 */
router.post('/sms/send-new-invoice', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'معرف الفاتورة مطلوب'
      });
    }

    const notification = await AdvancedSMSService.sendNewInvoiceNotification(invoiceId);

    res.status(200).json({
      success: true,
      message: 'تم إرسال الإشعار بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/send-payment-reminder
 * إرسال تذكير الدفع
 */
router.post('/sms/send-payment-reminder', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'معرف الفاتورة مطلوب'
      });
    }

    const notification = await AdvancedSMSService.sendPaymentReminder(invoiceId);

    res.status(200).json({
      success: true,
      message: 'تم إرسال تذكير الدفع بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/send-overdue-alert
 * إرسال تنبيه متأخر
 */
router.post('/sms/send-overdue-alert', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        error: 'معرف الفاتورة مطلوب'
      });
    }

    const notification = await AdvancedSMSService.sendOverdueAlert(invoiceId);

    res.status(200).json({
      success: true,
      message: 'تم إرسال التنبيه بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/send-payment-confirmation
 * إرسال تأكيد الدفع
 */
router.post('/sms/send-payment-confirmation', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId, paymentAmount } = req.body;

    if (!invoiceId || !paymentAmount) {
      return res.status(400).json({
        error: 'معرف الفاتورة والمبلغ مطلوبان'
      });
    }

    const notification = await AdvancedSMSService.sendPaymentConfirmation(invoiceId, paymentAmount);

    res.status(200).json({
      success: true,
      message: 'تم إرسال التأكيد بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/send-custom
 * إرسال رسالة مخصصة
 */
router.post('/sms/send-custom', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const { phoneNumber, message, invoiceId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'الرقم الهاتفي والرسالة مطلوبان'
      });
    }

    const notification = await AdvancedSMSService.sendCustomMessage(
      phoneNumber,
      message,
      invoiceId
    );

    res.status(200).json({
      success: true,
      message: 'تم الإرسال بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/schedule
 * جدولة إشعار
 */
router.post('/sms/schedule', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId, notificationType, scheduledTime, recurring } = req.body;

    if (!invoiceId || !notificationType || !scheduledTime) {
      return res.status(400).json({
        error: 'معرف الفاتورة ونوع الإشعار والوقت مطلوبان'
      });
    }

    const notification = await AdvancedSMSService.scheduleNotification(
      invoiceId,
      notificationType,
      new Date(scheduledTime),
      recurring
    );

    res.status(200).json({
      success: true,
      message: 'تم جدولة الإشعار بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/sms/history/:invoiceId
 * الحصول على سجل الإشعارات
 */
router.get('/sms/history/:invoiceId', verifyToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { limit = 50 } = req.query;

    const history = await AdvancedSMSService.getNotificationHistory(invoiceId, parseInt(limit));

    res.status(200).json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/sms/stats
 * إحصائيات الإشعارات
 */
router.get('/sms/stats', verifyToken, authorize(['admin', 'finance']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await AdvancedSMSService.getNotificationStats(
      new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      new Date(endDate || Date.now())
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/sms/process-scheduled
 * معالجة الإشعارات المجدولة (يتم تشغيله عبر Cron Job)
 */
router.post('/sms/process-scheduled', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const count = await AdvancedSMSService.processScheduledNotifications();

    res.status(200).json({
      success: true,
      message: `تمت معالجة ${count} إشعار مجدول`,
      processedCount: count
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// ============================================
// تصدير
// ============================================
module.exports = router;
