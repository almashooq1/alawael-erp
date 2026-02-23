/**
 * 🗂️ Advanced Archiving Routes
 * مسارات نظام الأرشفة الإلكترونية الذكي المتقدم
 */

const express = require('express');
const router = express.Router();
const AdvancedArchivingSystem = require('../services/advancedArchivingSystem');

// تهيئة نظام الأرشفة
const archivingSystem = new AdvancedArchivingSystem();

/**
 * POST /api/archive/save
 * أرشفة مستند جديد مع ضغط ذكي
 */
router.post('/save', async (req, res) => {
  try {
    const { document } = req.body;

    if (!document) {
      return res.status(400).json({
        success: false,
        message: 'المستند مطلوب',
      });
    }

    const result = await archivingSystem.archiveDocument(document);

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/archive/classify
 * تصنيف ذكي للمستند
 */
router.post('/classify', async (req, res) => {
  try {
    const { document } = req.body;

    if (!document) {
      return res.status(400).json({
        success: false,
        message: 'المستند مطلوب',
      });
    }

    const classification = await archivingSystem.classifyDocument(document);

    res.json({
      success: true,
      classification,
      message: `تم تصنيف المستند في فئة ${classification.category}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/search
 * بحث ذكي متقدم
 */
router.get('/search', (req, res) => {
  try {
    const { q, category, startDate, endDate, minSize, maxSize } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'استعلام البحث مطلوب',
      });
    }

    const filters = {
      category,
      startDate,
      endDate,
      minSize: minSize ? parseInt(minSize) : null,
      maxSize: maxSize ? parseInt(maxSize) : null,
    };

    const results = archivingSystem.smartSearch(q, filters);

    // تحويل النتائج إلى صيغة بسيطة
    const formatted = results.map(r => ({
      id: r.archive.id,
      name: r.archive.name,
      category: r.archive.classification.category,
      icon: r.archive.classification.icon,
      size: r.archive.originalSize,
      relevance: Math.round(r.relevance),
      createdAt: r.archive.metadata.createdAt,
      tags: r.archive.metadata.tags,
    }));

    res.json({
      success: true,
      query: q,
      resultsCount: formatted.length,
      results: formatted,
      message: `تم العثور على ${formatted.length} نتيجة`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/:id
 * استرجاع مستند من الأرشيف
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { skipVerification } = req.query;

    const result = await archivingSystem.retrieveArchive(id, {
      userId: req.user?.id || 'system',
      skipVerification: skipVerification === 'true',
    });

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/:id/info
 * الحصول على معلومات الأرشيف
 */
router.get('/:id/info', (req, res) => {
  try {
    const { id } = req.params;
    const info = archivingSystem.getArchiveInfo(id);

    if (!info) {
      return res.status(404).json({
        success: false,
        message: 'الأرشيف غير موجود',
      });
    }

    res.json({
      success: true,
      archive: info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/archive/:id
 * حذف أرشيف
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const archive = archivingSystem.archives.get(id);
    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'الأرشيف غير موجود',
      });
    }

    archivingSystem.archives.delete(id);
    archivingSystem.removeFromIndex(id);

    archivingSystem.logActivity({
      type: 'ARCHIVE_DELETED',
      archiveId: id,
      documentName: archive.name,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'تم حذف الأرشيف بنجاح',
      deletedArchive: {
        id,
        name: archive.name,
        size: archive.originalSize,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/archive/backup
 * إنشاء نسخة احتياطية ذكية
 */
router.post('/backup', (req, res) => {
  try {
    const { includeMetadata = true, includeAccessLog = false, compression = 'high' } = req.body;

    const result = archivingSystem.createSmartBackup({
      includeMetadata,
      includeAccessLog,
      compression,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/archive/cleanup
 * تنظيف الأرشيفات المنتهية
 */
router.post('/cleanup', (req, res) => {
  try {
    const result = archivingSystem.cleanupExpiredArchives();

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/stats/overview
 * الحصول على الإحصائيات المتقدمة
 */
router.get('/stats/overview', (req, res) => {
  try {
    const stats = archivingSystem.getAdvancedStatistics();

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/categories
 * الحصول على فئات التصنيف المتاحة
 */
router.get('/categories', (req, res) => {
  try {
    const categories = Object.entries(archivingSystem.categories).map(([key, value]) => ({
      id: key,
      name: key,
      icon: value.icon,
      priority: value.priority,
      retentionDays: value.retention,
      keywords: value.keywords.slice(0, 5), // أول 5 كلمات رئيسية
    }));

    res.json({
      success: true,
      categories,
      totalCategories: categories.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/activity-log
 * سجل النشاطات
 */
router.get('/activity-log', (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    let log = archivingSystem.activityLog;

    if (type) {
      log = log.filter(entry => entry.type === type);
    }

    const paginated = log.slice(-offset - limit, -offset || undefined).reverse();

    res.json({
      success: true,
      total: log.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      activities: paginated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/archive/templates
 * قوالب الأرشفة المتاحة
 */
router.get('/templates', (req, res) => {
  try {
    const templates = Object.entries(archivingSystem.templates).map(([key, value]) => ({
      id: key,
      name: key,
      pattern: value.pattern,
      frequency: value.frequency,
      compression: value.compression,
      retentionDays: value.retention,
    }));

    res.json({
      success: true,
      templates,
      totalTemplates: templates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/archive/verify/:id
 * التحقق من سلامة الأرشيف
 */
router.post('/verify/:id', (req, res) => {
  try {
    const { id } = req.params;
    const archive = archivingSystem.archives.get(id);

    if (!archive) {
      return res.status(404).json({
        success: false,
        message: 'الأرشيف غير موجود',
      });
    }

    const currentHash = archivingSystem.calculateHash(archive.data);
    const isValid = currentHash === archive.hash;

    archive.integrityChecks++;

    archivingSystem.logActivity({
      type: 'ARCHIVE_VERIFIED',
      archiveId: id,
      documentName: archive.name,
      isValid,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      archiveId: id,
      isValid,
      hash: {
        current: currentHash,
        stored: archive.hash,
        match: isValid,
      },
      checksPerformed: archive.integrityChecks,
      message: isValid ? 'الأرشيف سليم وآمن' : 'تحذير: الأرشيف قد يكون تالفاً',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

