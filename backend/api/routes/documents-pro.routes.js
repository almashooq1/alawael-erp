'use strict';

/**
 * Document Pro Routes — مسارات إدارة المستندات الاحترافية
 * ═══════════════════════════════════════════════════════════
 * API شامل يجمع: الذكاء الاصطناعي، سير العمل، البحث المتقدم،
 * الإشعارات، التحليلات الذكية
 *
 * Base URL: /api/documents-pro
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// الخدمات
const intelligenceService = require('../../services/documents/documentIntelligence.service');
const workflowEngine = require('../../services/documents/documentWorkflow.engine');
const searchEngine = require('../../services/documents/documentSearch.engine');
const notificationService = require('../../services/documents/documentNotification.service');

// Authentication middleware
let authenticateToken;
try {
  authenticateToken = require('../../middleware/auth');
  if (typeof authenticateToken !== 'function') {
    authenticateToken =
      authenticateToken.authenticateToken || authenticateToken.default || authenticateToken.auth;
  }
} catch {
  authenticateToken = (req, res, next) => next();
}

// تطبيق التوثيق على جميع المسارات
router.use(authenticateToken);

// ═══════════════════════════════════════════════════════════
//  📊 لوحة المعلومات الذكية
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/documents-pro/dashboard
 * لوحة معلومات شاملة مع تحليلات ذكية
 */
router.get('/dashboard', async (req, res) => {
  try {
    const Document = mongoose.model('Document');
    const userId = req.user?.id || req.user?._id;

    // جلب جميع المستندات
    const allDocuments = await Document.find({ status: { $ne: 'محذوف' } }).lean();

    // تحليلات ذكية
    const analytics = intelligenceService.analyzeDocumentCollection(allDocuments);

    // إحصائيات سير العمل
    let workflowStats = { overview: { totalActive: 0, totalCompleted: 0, totalOverdue: 0 } };
    try {
      workflowStats = await workflowEngine.getWorkflowStats();
    } catch (e) {
      logger.warn(`[Dashboard] فشل جلب إحصائيات سير العمل: ${e.message}`);
    }

    // المهام المعلقة للمستخدم
    let pendingTasks = [];
    if (userId) {
      try {
        pendingTasks = await workflowEngine.getPendingTasks(userId, { limit: 10 });
      } catch (e) {
        logger.warn(`[Dashboard] فشل جلب المهام المعلقة: ${e.message}`);
      }
    }

    // إشعارات غير مقروءة
    let unreadNotifications = 0;
    if (userId) {
      try {
        unreadNotifications = await notificationService.getUnreadCount(userId);
      } catch (e) {
        logger.warn(`[Dashboard] فشل جلب الإشعارات: ${e.message}`);
      }
    }

    // المستندات الأخيرة
    const recentDocuments = await Document.find({ status: { $ne: 'محذوف' } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title category fileType fileSize createdAt uploadedByName status workflowStatus')
      .lean();

    // المستندات المنتهية قريباً
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = await Document.find({
      expiryDate: { $gte: now, $lte: thirtyDaysLater },
      status: { $ne: 'محذوف' },
    })
      .sort({ expiryDate: 1 })
      .limit(10)
      .select('title category expiryDate')
      .lean();

    res.json({
      success: true,
      data: {
        analytics,
        workflow: {
          stats: workflowStats,
          pendingTasks: pendingTasks.slice(0, 5),
        },
        unreadNotifications,
        recentDocuments,
        expiringSoon,
      },
    });
  } catch (err) {
    logger.error(`[DocumentPro] خطأ في لوحة المعلومات: ${err.message}`);
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحميل لوحة المعلومات', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  🧠 الذكاء الاصطناعي — التصنيف والتحليل
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/documents-pro/intelligence/classify
 * تصنيف مستند تلقائياً
 */
router.post('/intelligence/classify', async (req, res) => {
  try {
    const { title, description, content, fileName, documentId } = req.body;

    const result = intelligenceService.classifyDocument(title, description, content, fileName);

    // حفظ التصنيف في المستند إذا تم تمرير documentId
    if (documentId) {
      try {
        const Document = mongoose.model('Document');
        await Document.findByIdAndUpdate(documentId, {
          smartClassification: {
            category: result.primary.category,
            confidence: result.primary.confidence,
            securityLevel: result.securityLevel,
            priority: result.priority,
            suggestedTags: result.suggestedTags,
            language: result.language,
            entities: result.entities,
            classifiedAt: new Date(),
            classifiedBy: 'auto',
          },
          category: result.primary.category,
        });
      } catch (e) {
        logger.warn(`[Intelligence] فشل حفظ التصنيف: ${e.message}`);
      }
    }

    res.json({ success: true, classification: result });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في التصنيف: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في التصنيف', error: err.message });
  }
});

/**
 * POST /api/documents-pro/intelligence/classify-bulk
 * تصنيف مجموعة مستندات
 */
router.post('/intelligence/classify-bulk', async (req, res) => {
  try {
    const { documentIds } = req.body;
    if (!documentIds?.length) {
      return res.status(400).json({ success: false, message: 'يجب تحديد مستندات' });
    }

    const Document = mongoose.model('Document');
    const documents = await Document.find({ _id: { $in: documentIds } }).lean();

    const results = [];
    for (const doc of documents) {
      const classification = intelligenceService.classifyDocument(
        doc.title,
        doc.description,
        doc.extractedText,
        doc.originalFileName
      );

      await Document.findByIdAndUpdate(doc._id, {
        smartClassification: {
          category: classification.primary.category,
          confidence: classification.primary.confidence,
          securityLevel: classification.securityLevel,
          priority: classification.priority,
          suggestedTags: classification.suggestedTags,
          language: classification.language,
          entities: classification.entities,
          classifiedAt: new Date(),
          classifiedBy: 'auto',
        },
      });

      results.push({ documentId: doc._id, title: doc.title, classification });
    }

    res.json({ success: true, classified: results.length, results });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في التصنيف الجماعي: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في التصنيف الجماعي', error: err.message });
  }
});

/**
 * POST /api/documents-pro/intelligence/duplicates
 * فحص التكرار
 */
router.post('/intelligence/duplicates', async (req, res) => {
  try {
    const { documentId, threshold } = req.body;

    const Document = mongoose.model('Document');
    const targetDoc = await Document.findById(documentId).lean();
    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'المستند غير موجود' });
    }

    const existingDocs = await Document.find({
      _id: { $ne: documentId },
      status: { $ne: 'محذوف' },
    })
      .select('title description extractedText fileSize originalFileName fileName')
      .limit(200)
      .lean();

    const duplicates = intelligenceService.findDuplicates(
      targetDoc,
      existingDocs,
      threshold || 0.7
    );

    res.json({ success: true, documentId, duplicatesCount: duplicates.length, duplicates });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في فحص التكرار: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في فحص التكرار', error: err.message });
  }
});

/**
 * POST /api/documents-pro/intelligence/summarize
 * تلخيص مستند
 */
router.post('/intelligence/summarize', async (req, res) => {
  try {
    const { documentId, text, maxSentences } = req.body;
    let contentText = text;

    if (documentId && !contentText) {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).lean();
      if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });
      contentText = doc.extractedText || doc.description || doc.title;
    }

    const summary = intelligenceService.summarizeDocument(contentText, maxSentences || 3);

    // حفظ التلخيص
    if (documentId) {
      try {
        const Document = mongoose.model('Document');
        await Document.findByIdAndUpdate(documentId, {
          summary: { ...summary, generatedAt: new Date() },
        });
      } catch (e) {
        logger.warn(`[Intelligence] فشل حفظ التلخيص: ${e.message}`);
      }
    }

    res.json({ success: true, summary });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في التلخيص: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في التلخيص', error: err.message });
  }
});

/**
 * GET /api/documents-pro/intelligence/recommendations/:documentId
 * جلب التوصيات الذكية
 */
router.get('/intelligence/recommendations/:documentId', async (req, res) => {
  try {
    const Document = mongoose.model('Document');
    const doc = await Document.findById(req.params.documentId).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

    const recommendations = intelligenceService.generateRecommendations(doc);

    res.json({ success: true, documentId: doc._id, recommendations });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في التوصيات: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ', error: err.message });
  }
});

/**
 * GET /api/documents-pro/intelligence/analytics
 * تحليلات ذكية شاملة
 */
router.get('/intelligence/analytics', async (req, res) => {
  try {
    const Document = mongoose.model('Document');
    const documents = await Document.find({ status: { $ne: 'محذوف' } }).lean();
    const analytics = intelligenceService.analyzeDocumentCollection(documents);
    res.json({ success: true, analytics });
  } catch (err) {
    logger.error(`[Intelligence] خطأ في التحليلات: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في التحليلات', error: err.message });
  }
});

/**
 * GET /api/documents-pro/intelligence/config
 * جلب تكوين خدمة الذكاء
 */
router.get('/intelligence/config', async (req, res) => {
  res.json({
    success: true,
    config: {
      categories: intelligenceService.getClassificationRules(),
      securityLevels: intelligenceService.getSecurityLevels(),
      priorityLevels: intelligenceService.getPriorityLevels(),
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  ⚙️ سير العمل
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/documents-pro/workflow/create
 * إنشاء سير عمل جديد
 */
router.post('/workflow/create', async (req, res) => {
  try {
    const { documentId, templateId, assignTo, priority, category } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!documentId || !templateId) {
      return res.status(400).json({ success: false, message: 'documentId و templateId مطلوبان' });
    }

    const result = await workflowEngine.createWorkflow(documentId, templateId, userId, {
      assignTo,
      priority,
      category,
    });

    // تحديث المستند
    try {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(documentId, {
        workflowStatus: 'draft',
        activeWorkflowId: result.workflow.id,
      });
    } catch (e) {
      logger.warn(`[Workflow] فشل تحديث المستند: ${e.message}`);
    }

    // إشعار المسؤول المعين
    if (assignTo) {
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).select('title').lean();
      await notificationService.notify(assignTo, 'workflow_assigned', {
        title: doc?.title || '',
        documentId,
        workflowId: result.workflow.id,
        triggeredBy: userId,
        priority: 'high',
      });
    }

    res.json(result);
  } catch (err) {
    logger.error(`[Workflow] خطأ: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/documents-pro/workflow/:workflowId/transition
 * تنفيذ انتقال
 */
router.post('/workflow/:workflowId/transition', async (req, res) => {
  try {
    const { newStatus, comments, assignTo, assignRole } = req.body;
    const userId = req.user?.id || req.user?._id;
    const userName = req.user?.name || '';

    const result = await workflowEngine.executeTransition(
      req.params.workflowId,
      newStatus,
      userId,
      { comments, assignTo, assignRole, performedByName: userName }
    );

    // تحديث حالة المستند
    try {
      const Document = mongoose.model('Document');
      await Document.findByIdAndUpdate(result.workflow.documentId, {
        workflowStatus: newStatus,
      });
    } catch (e) {
      logger.warn(`[Workflow] فشل تحديث المستند: ${e.message}`);
    }

    // إرسال إشعارات
    const doc = await mongoose
      .model('Document')
      .findById(result.workflow.documentId)
      .select('title uploadedBy')
      .lean();
    const notificationMap = {
      approved: 'workflow_approved',
      rejected: 'workflow_rejected',
      revision_required: 'workflow_revision',
    };

    if (notificationMap[newStatus] && doc?.uploadedBy) {
      await notificationService.notify(doc.uploadedBy, notificationMap[newStatus], {
        title: doc.title || '',
        documentId: result.workflow.documentId,
        reason: comments || '',
        triggeredBy: userId,
        triggeredByName: userName,
      });
    }

    res.json(result);
  } catch (err) {
    logger.error(`[Workflow] خطأ في الانتقال: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/workflow/document/:documentId
 * جلب سير عمل المستند
 */
router.get('/workflow/document/:documentId', async (req, res) => {
  try {
    const workflow = await workflowEngine.getWorkflow(req.params.documentId);
    res.json({ success: true, workflow });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/workflow/pending
 * جلب المهام المعلقة
 */
router.get('/workflow/pending', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const tasks = await workflowEngine.getPendingTasks(userId, {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/documents-pro/workflow/:workflowId/delegate
 * تفويض المهمة
 */
router.post('/workflow/:workflowId/delegate', async (req, res) => {
  try {
    const { toUserId, comments } = req.body;
    const userId = req.user?.id || req.user?._id;

    const result = await workflowEngine.delegateTask(
      req.params.workflowId,
      userId,
      toUserId,
      comments
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/documents-pro/workflow/:workflowId/escalate
 * تصعيد سير العمل
 */
router.post('/workflow/:workflowId/escalate', async (req, res) => {
  try {
    const { escalateTo } = req.body;
    const userId = req.user?.id || req.user?._id;

    const result = await workflowEngine.escalateOverdue(req.params.workflowId, escalateTo, userId);

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/workflow/stats
 * إحصائيات سير العمل
 */
router.get('/workflow/stats', async (req, res) => {
  try {
    const stats = await workflowEngine.getWorkflowStats({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/workflow/templates
 * جلب قوالب سير العمل
 */
router.get('/workflow/templates', async (req, res) => {
  const templates = workflowEngine.getTemplates();
  const statuses = workflowEngine.getStatuses();
  res.json({ success: true, templates, statuses });
});

// ═══════════════════════════════════════════════════════════
//  🔍 البحث المتقدم
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/documents-pro/search
 * بحث متقدم
 */
router.get('/search', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const result = await searchEngine.search(
      req.query.q || '',
      {
        category: req.query.category,
        categories: req.query.categories?.split(','),
        fileType: req.query.fileType,
        fileTypes: req.query.fileTypes?.split(','),
        status: req.query.status,
        tags: req.query.tags?.split(','),
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        uploadedBy: req.query.uploadedBy,
        isShared:
          req.query.isShared === 'true' ? true : req.query.isShared === 'false' ? false : undefined,
        isEncrypted: req.query.isEncrypted === 'true' ? true : undefined,
        folder: req.query.folder,
      },
      {
        page: req.query.page,
        limit: req.query.limit,
        sortBy: req.query.sortBy || 'relevance',
        userId,
        isAdmin: req.user?.role === 'admin',
      }
    );

    res.json(result);
  } catch (err) {
    logger.error(`[Search] خطأ: ${err.message}`);
    res.status(500).json({ success: false, message: 'خطأ في البحث', error: err.message });
  }
});

/**
 * GET /api/documents-pro/search/quick
 * بحث فوري (autocomplete)
 */
router.get('/search/quick', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await searchEngine.quickSearch(
      req.query.q || '',
      userId,
      parseInt(req.query.limit) || 8
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/search/content
 * بحث في المحتوى المستخرج
 */
router.get('/search/content', async (req, res) => {
  try {
    const result = await searchEngine.searchContent(
      req.query.q || '',
      { category: req.query.category, fileType: req.query.fileType },
      { page: req.query.page, limit: req.query.limit }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/documents-pro/search/save
 * حفظ فلتر بحث
 */
router.post('/search/save', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await searchEngine.saveSearch(userId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/search/saved
 * جلب البحوث المحفوظة
 */
router.get('/search/saved', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const searches = await searchEngine.getSavedSearches(userId);
    res.json({ success: true, searches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/documents-pro/search/saved/:searchId/execute
 * تنفيذ بحث محفوظ
 */
router.post('/search/saved/:searchId/execute', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await searchEngine.executeSavedSearch(userId, req.params.searchId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/documents-pro/search/saved/:searchId
 * حذف بحث محفوظ
 */
router.delete('/search/saved/:searchId', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await searchEngine.deleteSavedSearch(userId, req.params.searchId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  🔔 الإشعارات
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/documents-pro/notifications
 * جلب إشعارات المستخدم
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await notificationService.getNotifications(userId, {
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
      type: req.query.type,
      priority: req.query.priority,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/notifications/summary
 * ملخص الإشعارات
 */
router.get('/notifications/summary', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const summary = await notificationService.getNotificationSummary(userId);
    res.json({ success: true, ...summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/documents-pro/notifications/:notificationId/read
 * تحديد كمقروء
 */
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const notification = await notificationService.markAsRead(req.params.notificationId, userId);
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/documents-pro/notifications/read-all
 * تحديد الكل كمقروء
 */
router.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await notificationService.markAllAsRead(userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/documents-pro/notifications/:notificationId
 * حذف إشعار
 */
router.delete('/notifications/:notificationId', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const result = await notificationService.deleteNotification(req.params.notificationId, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/documents-pro/notifications/preferences
 * جلب تفضيلات الإشعارات
 */
router.get('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const prefs = await notificationService.getPreferences(userId);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/documents-pro/notifications/preferences
 * تحديث تفضيلات الإشعارات
 */
router.put('/notifications/preferences', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const prefs = await notificationService.updatePreferences(userId, req.body);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  📋 الثوابت والتكوين
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/documents-pro/config
 * جلب جميع الثوابت المتاحة
 */
router.get('/config', async (req, res) => {
  res.json({
    success: true,
    config: {
      categories: intelligenceService.getClassificationRules(),
      securityLevels: intelligenceService.getSecurityLevels(),
      priorityLevels: intelligenceService.getPriorityLevels(),
      workflowStatuses: workflowEngine.getStatuses(),
      workflowTemplates: workflowEngine.getTemplates(),
      notificationTypes: notificationService.getNotificationTypes(),
    },
  });
});

module.exports = router;
