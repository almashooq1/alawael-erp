/**
 * ═══════════════════════════════════════════════════════════════
 * 🔄 Notification Routes & API Endpoints
 * طرق التطبيق وواجهات برمجية الإشعارات
 * ═══════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// استيراد الخدمات
const { notificationManager } = require('../services/unifiedNotificationManager');
const { templateSystem } = require('../services/smartTemplateSystem');
const { preferencesManager } = require('../services/userPreferencesManager');
const { rulesEngine } = require('../services/advancedAlertRulesEngine');
const { analyticsSystem } = require('../services/notificationAnalyticsSystem');
const whatsappService = require('../services/whatsappNotificationService');

// ═══════════════════════════════════════════════════════════════
// 📨 إرسال الإشعارات
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/send
 * إرسال إشعار موحد
 */
router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, channels, category, priority, metadata } = req.body;

    // التحقق من البيانات
    if (!userId || !title || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: userId, title, body',
      });
    }

    // إرسال الإشعار
    const notification = await notificationManager.sendNotification(userId, {
      title,
      body,
      channels: channels || { email: true, inApp: true },
      category: category || 'notification',
      priority: priority || 'medium',
      metadata,
    });

    res.status(201).json({
      status: 'success',
      message: 'Notification queued for delivery',
      notification,
    });
  } catch (error) {
    logger.error(`❌ Error in /send: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-immediate
 * إرسال إشعار فوري
 */
router.post('/send-immediate', async (req, res) => {
  try {
    const { userId, title, body, metadata } = req.body;

    const notification = await notificationManager.sendImmediateNotification(userId, {
      title,
      body,
      metadata,
    });

    res.status(200).json({
      status: 'success',
      notification,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-bulk
 * إرسال إشعارات جماعية
 */
router.post('/send-bulk', async (req, res) => {
  try {
    const { userIds, notificationTemplate } = req.body;

    if (!userIds || !Array.isArray(userIds) || !notificationTemplate) {
      return res.status(400).json({
        status: 'error',
        message: 'userIds and notificationTemplate are required',
      });
    }

    const results = await notificationManager.sendBulkNotifications(
      userIds,
      notificationTemplate
    );

    res.status(201).json({
      status: 'success',
      results,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/whatsapp/send
 * إرسال رسالة واتس آب
 */
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { phoneNumber, message, type = 'text', mediaUrl } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'phoneNumber and message are required',
      });
    }

    let result;

    switch (type) {
      case 'image':
        result = await whatsappService.sendImageMessage(phoneNumber, mediaUrl, message);
        break;
      case 'document':
        result = await whatsappService.sendDocumentMessage(phoneNumber, mediaUrl, message);
        break;
      default:
        result = await whatsappService.sendMessage(phoneNumber, message);
    }

    res.status(200).json({
      status: 'success',
      message: 'WhatsApp message queued',
      result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📋 إدارة القوالب
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/templates
 * الحصول على جميع القوالب
 */
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await templateSystem.getAllTemplates(
      category ? { category } : {}
    );

    res.status(200).json({
      status: 'success',
      templates,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/templates/:templateId
 * الحصول على قالب معين
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await templateSystem.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }

    res.status(200).json({
      status: 'success',
      template,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/templates
 * إنشاء قالب جديد
 */
router.post('/templates', async (req, res) => {
  try {
    const templateData = req.body;
    const template = await templateSystem.createTemplate(templateData);

    res.status(201).json({
      status: 'success',
      message: 'Template created successfully',
      template,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/templates/:templateId
 * تحديث قالب
 */
router.put('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const result = await templateSystem.updateTemplate(templateId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Template updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/templates/:templateId
 * حذف قالب
 */
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    await templateSystem.deleteTemplate(templateId);

    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/templates/:templateId/use
 * استخدام قالب لإنشاء إشعار
 */
router.post('/templates/:templateId/use', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { userId, variables, language } = req.body;

    const notificationData = await templateSystem.createNotificationFromTemplate(
      templateId,
      variables,
      language
    );

    const notification = await notificationManager.sendNotification(
      userId,
      notificationData
    );

    res.status(201).json({
      status: 'success',
      notification,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// ⚙️ تفضيلات المستخدمين
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/preferences/:userId
 * الحصول على تفضيلات المستخدم
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await preferencesManager.getPreferences(userId);

    res.status(200).json({
      status: 'success',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/preferences/:userId
 * تحديث تفضيلات المستخدم
 */
router.put('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await preferencesManager.updatePreferences(userId, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Preferences updated',
      preferences,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/preferences/:userId/suspend
 * تعليق الإشعارات
 */
router.post('/preferences/:userId/suspend', async (req, res) => {
  try {
    const { userId } = req.params;
    const { hours = 1 } = req.body;

    await preferencesManager.suspendNotifications(userId, hours);

    res.status(200).json({
      status: 'success',
      message: `Notifications suspended for ${hours} hour(s)`,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/preferences/:userId/resume
 * استئناف الإشعارات
 */
router.post('/preferences/:userId/resume', async (req, res) => {
  try {
    const { userId } = req.params;
    await preferencesManager.resumeNotifications(userId);

    res.status(200).json({
      status: 'success',
      message: 'Notifications resumed',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📊 الإحصائيات والتقارير
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/metrics/current
 * الإحصائيات الحالية
 */
router.get('/metrics/current', async (req, res) => {
  try {
    const metrics = await analyticsSystem.getCurrentMetrics();

    res.status(200).json({
      status: 'success',
      metrics,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/metrics/kpis
 * مؤشرات الأداء الرئيسية
 */
router.get('/metrics/kpis', async (req, res) => {
  try {
    const kpis = await analyticsSystem.getKPIs();

    res.status(200).json({
      status: 'success',
      kpis,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/metrics/range
 * الإحصائيات لنطاق زمني
 */
router.get('/metrics/range', async (req, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required',
      });
    }

    const metrics = await analyticsSystem.getMetricsRange(
      new Date(startDate),
      new Date(endDate),
      period
    );

    res.status(200).json({
      status: 'success',
      metrics,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/reports/comprehensive
 * إنشاء تقرير شامل
 */
router.post('/reports/comprehensive', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required',
      });
    }

    const report = await analyticsSystem.generateComprehensiveReport(
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/reports/channel/:channel
 * تقرير القناة
 */
router.get('/reports/channel/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required',
      });
    }

    const report = await analyticsSystem.getChannelReport(
      channel,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/reports/engagement
 * تقرير المشاركة
 */
router.get('/reports/engagement', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await analyticsSystem.getUserEngagementReport(
      new Date(startDate || new Date(Date.now() - 86400000)),
      new Date(endDate || new Date())
    );

    res.status(200).json({
      status: 'success',
      report,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 👤 إدارة الإشعارات للمستخدم
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/user/:userId
 * الحصول على إشعارات المستخدم
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, status } = req.query;

    const notifications = await notificationManager.getUserNotifications(userId, {
      limit: parseInt(limit),
      status,
    });

    res.status(200).json({
      status: 'success',
      notifications,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * وضع علامة على الإشعار كمقروء
 */
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    await notificationManager.markAsRead(notificationId);

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * حذف الإشعار
 */
router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    await notificationManager.deleteNotification(notificationId);

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * POST /api/notifications/:notificationId/rate
 * تقييم الإشعار
 */
router.post('/:notificationId/rate', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { rating, feedback } = req.body;

    await notificationManager.rateNotification(notificationId, rating, feedback);

    res.status(200).json({
      status: 'success',
      message: 'Notification rated',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🎯 قواعس التنبيهات
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/rules
 * إنشاء قاعدة تنبيه
 */
router.post('/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const rule = await rulesEngine.createRule(ruleData);

    res.status(201).json({
      status: 'success',
      rule,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/notifications/rules
 * الحصول على جميع القواعس
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await rulesEngine.searchRules();

    res.status(200).json({
      status: 'success',
      rules,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/rules/:ruleId
 * تحديث قاعدة
 */
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = await rulesEngine.updateRule(ruleId, req.body);

    res.status(200).json({
      status: 'success',
      rule,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/rules/:ruleId
 * حذف قاعدة
 */
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    await rulesEngine.deleteRule(ruleId);

    res.status(200).json({
      status: 'success',
      message: 'Rule deleted',
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = router;
