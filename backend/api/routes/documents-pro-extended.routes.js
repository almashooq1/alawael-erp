'use strict';

/**
 * Document Pro Extended Routes — مسارات إدارة المستندات الاحترافية (موسعة)
 * ═══════════════════════════════════════════════════════════════════════════
 * المرحلة الثانية: التوقيع الرقمي، الإصدارات، القوالب، التدقيق، العمليات المجمعة
 *
 * Base URL: /api/documents-pro-ext
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// الخدمات
const signatureService = require('../../services/documents/documentSignature.service');
const versioningService = require('../../services/documents/documentVersioning.service');
const templatesEngine = require('../../services/documents/documentTemplates.engine');
const auditService = require('../../services/documents/documentAudit.service');
const bulkService = require('../../services/documents/documentBulk.service');

// Authentication middleware
let authenticateToken;
try {
  authenticateToken = require('../../middleware/auth');
  if (typeof authenticateToken !== 'function') {
    authenticateToken =
      authenticateToken.authenticateToken || authenticateToken.default || authenticateToken.auth;
  }
} catch (e) {
  authenticateToken = (req, res, next) => next();
}

// ─── Helper ─────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

// ══════════════════════════════════════════════════════════
//  █  التوقيع الرقمي — Digital Signatures
// ══════════════════════════════════════════════════════════

/**
 * POST /signatures/sign
 * توقيع مستند
 */
router.post(
  '/signatures/sign',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentId, signatureType, signatureData, position } = req.body;

    if (!documentId) return res.status(400).json({ success: false, error: 'معرّف المستند مطلوب' });

    const result = await signatureService.signDocument(documentId, userId, {
      signatureType: signatureType || 'electronic',
      signatureData,
      position,
      signerName: req.user?.name || '',
      signerEmail: req.user?.email || '',
    });

    // تسجيل في سجل التدقيق
    auditService.log({
      documentId,
      action: 'sign',
      userId,
      userName: req.user?.name,
      details: { description: `توقيع ${signatureType || 'electronic'}` },
    });

    res.json(result);
  })
);

/**
 * GET /signatures/document/:documentId
 * جلب توقيعات المستند
 */
router.get(
  '/signatures/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await signatureService.getDocumentSignatures(req.params.documentId);
    res.json(result);
  })
);

/**
 * POST /signatures/verify/:signatureId
 * التحقق من التوقيع
 */
router.post(
  '/signatures/verify/:signatureId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await signatureService.verifySignature(req.params.signatureId);
    res.json(result);
  })
);

/**
 * POST /signatures/request
 * إنشاء طلب توقيع
 */
router.post(
  '/signatures/request',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentId, signers, message, deadline } = req.body;

    const result = await signatureService.createSignatureRequest(documentId, userId, {
      signers,
      message,
      deadline,
      requesterName: req.user?.name || '',
    });
    res.json(result);
  })
);

/**
 * GET /signatures/pending
 * التوقيعات المعلقة للمستخدم
 */
router.get(
  '/signatures/pending',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await signatureService.getPendingSignatures(userId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  إدارة الإصدارات — Version Management
// ══════════════════════════════════════════════════════════

/**
 * POST /versions/create
 * إنشاء إصدار جديد
 */
router.post(
  '/versions/create',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentId, changeType, changeDescription, versionLabel } = req.body;

    if (!documentId) return res.status(400).json({ success: false, error: 'معرّف المستند مطلوب' });

    const result = await versioningService.createVersion(documentId, userId, {
      changeType,
      changeDescription,
      versionLabel,
      createdByName: req.user?.name || '',
    });

    auditService.log({
      documentId,
      action: 'version_create',
      userId,
      userName: req.user?.name,
      details: { description: `إنشاء إصدار ${changeType || 'minor'}` },
    });

    res.json(result);
  })
);

/**
 * GET /versions/document/:documentId
 * سجل إصدارات المستند
 */
router.get(
  '/versions/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await versioningService.getVersionHistory(req.params.documentId, {
      changeType: req.query.changeType,
    });
    res.json(result);
  })
);

/**
 * GET /versions/document/:documentId/:versionNumber
 * جلب إصدار محدد
 */
router.get(
  '/versions/document/:documentId/:versionNumber',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await versioningService.getVersion(
      req.params.documentId,
      parseInt(req.params.versionNumber)
    );
    if (!result) return res.status(404).json({ success: false, error: 'الإصدار غير موجود' });
    res.json({ success: true, version: result });
  })
);

/**
 * POST /versions/compare
 * مقارنة إصدارين
 */
router.post(
  '/versions/compare',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { documentId, versionA, versionB } = req.body;
    const result = await versioningService.compareVersions(documentId, versionA, versionB);
    res.json(result);
  })
);

/**
 * POST /versions/restore
 * استعادة إصدار سابق
 */
router.post(
  '/versions/restore',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentId, versionNumber } = req.body;

    const result = await versioningService.restoreVersion(documentId, versionNumber, userId, {
      userName: req.user?.name || '',
    });

    auditService.log({
      documentId,
      action: 'version_restore',
      userId,
      userName: req.user?.name,
      details: { description: `استعادة الإصدار v${versionNumber}` },
    });

    res.json(result);
  })
);

/**
 * DELETE /versions/document/:documentId/:versionNumber
 * حذف إصدار
 */
router.delete(
  '/versions/document/:documentId/:versionNumber',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await versioningService.deleteVersion(
      req.params.documentId,
      parseInt(req.params.versionNumber)
    );
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  القوالب — Templates
// ══════════════════════════════════════════════════════════

/**
 * GET /templates
 * جلب جميع القوالب
 */
router.get(
  '/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.getTemplates({
      category: req.query.category,
      department: req.query.department,
      search: req.query.search,
    });
    res.json(result);
  })
);

/**
 * GET /templates/stats
 * إحصائيات القوالب
 */
router.get(
  '/templates/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.getTemplateStats();
    res.json(result);
  })
);

/**
 * POST /templates/initialize
 * تهيئة القوالب الافتراضية
 */
router.post(
  '/templates/initialize',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.initializeDefaults();
    res.json(result);
  })
);

/**
 * GET /templates/:templateId
 * جلب قالب بالتفصيل
 */
router.get(
  '/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.getTemplate(req.params.templateId);
    if (!result) return res.status(404).json({ success: false, error: 'القالب غير موجود' });
    res.json({ success: true, template: result });
  })
);

/**
 * POST /templates
 * إنشاء قالب جديد
 */
router.post(
  '/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await templatesEngine.createTemplate(req.body, userId);
    res.status(201).json(result);
  })
);

/**
 * PUT /templates/:templateId
 * تحديث قالب
 */
router.put(
  '/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await templatesEngine.updateTemplate(req.params.templateId, req.body, userId);
    res.json(result);
  })
);

/**
 * DELETE /templates/:templateId
 * حذف قالب
 */
router.delete(
  '/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.deleteTemplate(req.params.templateId);
    res.json(result);
  })
);

/**
 * POST /templates/:templateId/generate
 * إنشاء مستند من قالب
 */
router.post(
  '/templates/:templateId/generate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { variables, createDocument, documentTitle } = req.body;

    const result = await templatesEngine.generateFromTemplate(
      req.params.templateId,
      variables || {},
      userId,
      { createDocument, documentTitle }
    );

    if (result.success) {
      auditService.log({
        documentId: result.documentId,
        action: 'template_generate',
        userId,
        userName: req.user?.name,
        details: { description: `إنشاء من قالب: ${result.templateName}` },
      });
    }

    res.json(result);
  })
);

/**
 * GET /templates/:templateId/preview
 * معاينة قالب
 */
router.get(
  '/templates/:templateId/preview',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await templatesEngine.previewTemplate(req.params.templateId);
    res.json(result);
  })
);

/**
 * POST /templates/:templateId/duplicate
 * نسخ قالب
 */
router.post(
  '/templates/:templateId/duplicate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await templatesEngine.duplicateTemplate(req.params.templateId, userId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  سجل التدقيق — Audit Trail
// ══════════════════════════════════════════════════════════

/**
 * GET /audit/document/:documentId
 * سجل تدقيق مستند
 */
router.get(
  '/audit/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.getDocumentAuditLog(req.params.documentId, {
      action: req.query.action,
      severity: req.query.severity,
      from: req.query.from,
      to: req.query.to,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

/**
 * GET /audit/user/:userId
 * سجل تدقيق مستخدم
 */
router.get(
  '/audit/user/:userId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.getUserAuditLog(req.params.userId, {
      action: req.query.action,
      from: req.query.from,
      to: req.query.to,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

/**
 * GET /audit/suspicious
 * الأنشطة المشبوهة
 */
router.get(
  '/audit/suspicious',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.getSuspiciousActivities({
      from: req.query.from,
      to: req.query.to,
      limit: parseInt(req.query.limit) || 100,
    });
    res.json(result);
  })
);

/**
 * GET /audit/compliance
 * تقرير الامتثال
 */
router.get(
  '/audit/compliance',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.getComplianceReport({
      from: req.query.from,
      to: req.query.to,
    });
    res.json(result);
  })
);

/**
 * GET /audit/verify-chain
 * التحقق من سلامة سلسلة التدقيق
 */
router.get(
  '/audit/verify-chain',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.verifyChainIntegrity({
      limit: parseInt(req.query.limit) || 1000,
    });
    res.json(result);
  })
);

/**
 * GET /audit/stats
 * إحصائيات التدقيق
 */
router.get(
  '/audit/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await auditService.getAuditStats();
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  العمليات المجمعة — Bulk Operations
// ══════════════════════════════════════════════════════════

/**
 * POST /bulk/delete
 * حذف مجمع
 */
router.post(
  '/bulk/delete',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, softDelete } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkDelete(documentIds, userId, {
      softDelete,
      userName: req.user?.name,
    });

    auditService.log({
      action: 'bulk_operation',
      userId,
      userName: req.user?.name,
      details: { description: `حذف مجمع: ${documentIds.length} مستند` },
    });

    res.json(result);
  })
);

/**
 * POST /bulk/archive
 * أرشفة مجمعة
 */
router.post(
  '/bulk/archive',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkArchive(documentIds, userId, {
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/restore
 * استعادة مجمعة
 */
router.post(
  '/bulk/restore',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkRestore(documentIds, userId, {
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/classify
 * تصنيف مجمع
 */
router.post(
  '/bulk/classify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, category, confidence } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkClassify(documentIds, userId, {
      category,
      confidence,
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/tag
 * وسوم مجمعة
 */
router.post(
  '/bulk/tag',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, tags, mode } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkTag(documentIds, userId, {
      tags,
      mode: mode || 'add',
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/move
 * نقل مجمع
 */
router.post(
  '/bulk/move',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, targetFolder, targetCategory } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkMove(documentIds, userId, {
      targetFolder,
      targetCategory,
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/share
 * مشاركة مجمعة
 */
router.post(
  '/bulk/share',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, shareWith, permission } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkShare(documentIds, userId, {
      shareWith,
      permission,
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/update-status
 * تحديث حالة مجمع
 */
router.post(
  '/bulk/update-status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, status } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkUpdateStatus(documentIds, userId, {
      status,
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * POST /bulk/update-metadata
 * تحديث بيانات وصفية مجمع
 */
router.post(
  '/bulk/update-metadata',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const { documentIds, metadata } = req.body;

    if (!documentIds?.length)
      return res.status(400).json({ success: false, error: 'قائمة المستندات مطلوبة' });

    const result = await bulkService.bulkUpdateMetadata(documentIds, userId, {
      metadata,
      userName: req.user?.name,
    });
    res.json(result);
  })
);

/**
 * GET /bulk/jobs
 * المهام المجمعة للمستخدم
 */
router.get(
  '/bulk/jobs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await bulkService.getUserJobs(userId, {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  })
);

/**
 * GET /bulk/jobs/:jobId
 * حالة مهمة
 */
router.get(
  '/bulk/jobs/:jobId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await bulkService.getJobStatus(req.params.jobId);
    if (!result) return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
    res.json({ success: true, job: result });
  })
);

/**
 * POST /bulk/jobs/:jobId/cancel
 * إلغاء مهمة
 */
router.post(
  '/bulk/jobs/:jobId/cancel',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await bulkService.cancelJob(req.params.jobId, userId);
    res.json(result);
  })
);

/**
 * GET /bulk/stats
 * إحصائيات العمليات المجمعة
 */
router.get(
  '/bulk/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await bulkService.getBulkStats(userId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  لوحة التحكم الموسعة — Extended Dashboard
// ══════════════════════════════════════════════════════════

/**
 * GET /ext-dashboard
 * لوحة التحكم الشاملة (المرحلة 2)
 */
router.get(
  '/ext-dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    const [auditStats, templateStats, bulkStats] = await Promise.all([
      auditService.getAuditStats().catch(() => ({ stats: {} })),
      templatesEngine.getTemplateStats().catch(() => ({ stats: {} })),
      bulkService.getBulkStats(userId).catch(() => ({ stats: {} })),
    ]);

    let pendingSignatures = { total: 0 };
    try {
      pendingSignatures = await signatureService.getPendingSignatures(userId);
    } catch (_) {}

    res.json({
      success: true,
      dashboard: {
        audit: auditStats.stats,
        templates: templateStats.stats,
        bulk: bulkStats.stats,
        signatures: {
          pendingCount: pendingSignatures.total || 0,
        },
      },
    });
  })
);

// ─── Error handler ──────────────────────────
router.use((err, req, res, _next) => {
  logger.error(`[Documents-Pro-Ext] Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ success: false, error: err.message || 'خطأ في الخادم' });
});

module.exports = router;
