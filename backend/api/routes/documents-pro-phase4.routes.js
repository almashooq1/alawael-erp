'use strict';

/**
 * Document Pro Phase 4 Routes — مسارات المرحلة الرابعة
 * ═══════════════════════════════════════════════════════
 * الربط، الوسوم، الصلاحيات، PDF، التعاون الفوري
 *
 * Base URL: /api/documents-pro-v4
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

// الخدمات
const linkingService = require('../../services/documents/documentLinking.service');
const tagsService = require('../../services/documents/documentTags.service');
const aclService = require('../../services/documents/documentACL.service');
const pdfEngine = require('../../services/documents/documentPDF.engine');
const realtimeEngine = require('../../services/documents/documentRealtime.engine');

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

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

// ══════════════════════════════════════════════════════════
//  █  ربط المستندات — Linking
// ══════════════════════════════════════════════════════════

router.post(
  '/links',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await linkingService.createLink(
      req.body.sourceDocumentId,
      req.body.targetDocumentId,
      req.body.linkType,
      userId,
      req.body.metadata
    );
    res.status(result.success ? 201 : 400).json(result);
  })
);

router.delete(
  '/links/:linkId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await linkingService.removeLink(req.params.linkId, userId);
    res.json(result);
  })
);

router.get(
  '/links/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await linkingService.getLinkedDocuments(req.params.documentId, {
      direction: req.query.direction || 'both',
      linkType: req.query.linkType,
      activeOnly: req.query.activeOnly !== 'false',
    });
    res.json(result);
  })
);

router.get(
  '/links/graph/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await linkingService.getDocumentGraph(
      req.params.documentId,
      parseInt(req.query.depth) || 3
    );
    res.json(result);
  })
);

router.post(
  '/links/bulk',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await linkingService.bulkLink(
      req.body.sourceDocumentId,
      req.body.targetDocumentIds,
      req.body.linkType,
      userId,
      req.body.metadata
    );
    res.json(result);
  })
);

router.get(
  '/links/types',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(linkingService.getLinkTypes());
  })
);

router.get(
  '/links/orphans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await linkingService.findOrphans({
      category: req.query.category,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.get(
  '/links/suggestions/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await linkingService.suggestLinks(req.params.documentId, {
      limit: parseInt(req.query.limit) || 10,
    });
    res.json(result);
  })
);

router.get(
  '/links/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await linkingService.getStats(req.query.documentId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  الوسوم — Tags
// ══════════════════════════════════════════════════════════

router.post(
  '/tags/initialize',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.initializeDefaults(userId);
    res.json(result);
  })
);

router.get(
  '/tags',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getTags({
      categoryId: req.query.categoryId,
      search: req.query.search,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 200,
    });
    res.json(result);
  })
);

router.post(
  '/tags',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.createTag(req.body, userId);
    res.status(result.success ? 201 : 400).json(result);
  })
);

router.put(
  '/tags/:tagId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.updateTag(req.params.tagId, req.body, userId);
    res.json(result);
  })
);

router.delete(
  '/tags/:tagId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.deleteTag(req.params.tagId, req.body.replacementTagId);
    res.json(result);
  })
);

router.post(
  '/tags/merge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.mergeTags(req.body.sourceTagIds, req.body.targetTagId, userId);
    res.json(result);
  })
);

router.get(
  '/tags/cloud',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getTagCloud({
      categoryId: req.query.categoryId,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.get(
  '/tags/suggestions/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.suggestTags(req.params.documentId, {
      limit: parseInt(req.query.limit) || 10,
    });
    res.json(result);
  })
);

router.post(
  '/tags/bulk',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.bulkTag(
      req.body.documentIds,
      req.body.tags,
      req.body.operation || 'add'
    );
    res.json(result);
  })
);

router.get(
  '/tags/:tagId/documents',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getDocumentsByTag(req.params.tagId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  })
);

router.get(
  '/tags/analytics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getAnalytics({
      timeRange: parseInt(req.query.timeRange) || 30,
    });
    res.json(result);
  })
);

// فئات الوسوم
router.get(
  '/tag-categories',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getCategories(req.query.activeOnly !== 'false');
    res.json(result);
  })
);

router.post(
  '/tag-categories',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.createCategory(req.body, userId);
    res.status(201).json(result);
  })
);

router.put(
  '/tag-categories/:categoryId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.updateCategory(req.params.categoryId, req.body);
    res.json(result);
  })
);

// قواعد الأتمتة
router.get(
  '/tag-rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await tagsService.getRules(req.query.activeOnly !== 'false');
    res.json(result);
  })
);

router.post(
  '/tag-rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await tagsService.createRule(req.body, userId);
    res.status(201).json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  الصلاحيات — ACL
// ══════════════════════════════════════════════════════════

router.post(
  '/acl/initialize',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.initializeTemplates(userId);
    res.json(result);
  })
);

router.post(
  '/acl',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.setACL(
      req.body.resourceId,
      req.body.resourceType || 'document',
      req.body.principalId,
      req.body.principalType,
      req.body.permissions,
      userId,
      {
        principalName: req.body.principalName,
        grantedByName: req.user?.name,
        expiresAt: req.body.expiresAt,
        conditions: req.body.conditions,
        reason: req.body.reason,
        templateId: req.body.templateId,
      }
    );
    res.json(result);
  })
);

router.post(
  '/acl/apply-template',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.applyTemplate(
      req.body.templateId,
      req.body.resourceId,
      req.body.principalId,
      req.body.principalType,
      userId
    );
    res.json(result);
  })
);

router.get(
  '/acl/check',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.query.userId || getUserId(req);
    const result = await aclService.checkPermission(userId, req.query.documentId, req.query.action);
    res.json(result);
  })
);

router.get(
  '/acl/effective',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.query.userId || getUserId(req);
    const result = await aclService.getEffectivePermissions(userId, req.query.documentId);
    res.json(result);
  })
);

router.get(
  '/acl/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aclService.getDocumentACL(req.params.documentId);
    res.json(result);
  })
);

router.delete(
  '/acl/:aclId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.revokeACL(req.params.aclId, userId);
    res.json(result);
  })
);

router.post(
  '/acl/revoke-all/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.revokeAll(req.params.documentId, userId, req.body.reason);
    res.json(result);
  })
);

router.get(
  '/acl/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aclService.getTemplates();
    res.json(result);
  })
);

router.post(
  '/acl/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.createTemplate(req.body, userId);
    res.status(201).json(result);
  })
);

router.get(
  '/acl/actions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(aclService.getAvailableActions());
  })
);

// طلبات الوصول
router.post(
  '/acl/access-request',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.requestAccess(userId, req.body.documentId, {
      requesterName: req.user?.name,
      permissions: req.body.permissions,
      justification: req.body.justification,
      expiresAt: req.body.expiresAt,
    });
    res.json(result);
  })
);

router.post(
  '/acl/access-request/:requestId/review',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await aclService.reviewAccessRequest(
      req.params.requestId,
      userId,
      req.body.decision,
      req.body.reviewNote
    );
    res.json(result);
  })
);

router.get(
  '/acl/access-requests',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aclService.getAccessRequests({
      documentId: req.query.documentId,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.get(
  '/acl/compliance/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aclService.getComplianceReport(req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/acl/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aclService.getStats();
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  PDF — معالجة المستندات
// ══════════════════════════════════════════════════════════

router.post(
  '/pdf/convert/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.convertToPDF(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/merge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.mergePDFs(req.body.documentIds, userId, req.body.options || {});
    res.json(result);
  })
);

router.post(
  '/pdf/split/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.splitPDF(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/protect/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.protectPDF(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/cover/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.addCoverPage(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/page-numbers/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.addPageNumbers(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/stamp/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.stampPDF(req.params.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/pdf/batch-convert',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.batchConvert(
      req.body.documentIds,
      userId,
      req.body.options || {}
    );
    res.json(result);
  })
);

router.get(
  '/pdf/jobs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await pdfEngine.getJobs({
      userId: req.query.all === 'true' ? undefined : userId,
      type: req.query.type,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.get(
  '/pdf/cover-templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(pdfEngine.getCoverTemplates());
  })
);

router.get(
  '/pdf/numbering-formats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json(pdfEngine.getNumberingFormats());
  })
);

router.get(
  '/pdf/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await pdfEngine.getStats();
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  التعاون الفوري — Real-Time
// ══════════════════════════════════════════════════════════

router.post(
  '/collab/join/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.joinDocument(userId, req.params.documentId, {
      userName: req.user?.name || req.body.userName,
      avatar: req.body.avatar,
      socketId: req.body.socketId,
    });
    res.json(result);
  })
);

router.post(
  '/collab/leave/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.leaveDocument(userId, req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/collab/collaborators/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await realtimeEngine.getActiveCollaborators(req.params.documentId);
    res.json(result);
  })
);

router.put(
  '/collab/status/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.updateUserStatus(
      userId,
      req.params.documentId,
      req.body.status
    );
    res.json(result);
  })
);

router.put(
  '/collab/cursor/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.updateCursorPosition(
      userId,
      req.params.documentId,
      req.body.position
    );
    res.json(result);
  })
);

router.post(
  '/collab/lock/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.lockSection(
      userId,
      req.params.documentId,
      req.body.sectionId,
      req.user?.name
    );
    res.json(result);
  })
);

router.post(
  '/collab/unlock/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.unlockSection(
      userId,
      req.params.documentId,
      req.body.sectionId
    );
    res.json(result);
  })
);

router.post(
  '/collab/heartbeat/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.heartbeat(userId, req.params.documentId);
    res.json(result);
  })
);

router.post(
  '/collab/broadcast/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await realtimeEngine.broadcastEvent(
      req.params.documentId,
      req.body.eventType,
      req.body.eventData,
      userId
    );
    res.json(result);
  })
);

router.get(
  '/collab/activity/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await realtimeEngine.getActivityLog(req.params.documentId, {
      limit: parseInt(req.query.limit) || 50,
      since: req.query.since,
    });
    res.json(result);
  })
);

router.post(
  '/collab/cleanup',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await realtimeEngine.cleanupStaleSessions();
    res.json(result);
  })
);

router.get(
  '/collab/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await realtimeEngine.getStats();
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  لوحة تحكم V4
// ══════════════════════════════════════════════════════════

router.get(
  '/v4-dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const [linkStats, tagAnalytics, aclStats, pdfStats, collabStats] = await Promise.all([
      linkingService.getStats().catch(() => ({ stats: {} })),
      tagsService.getAnalytics().catch(() => ({ analytics: {} })),
      aclService.getStats().catch(() => ({ stats: {} })),
      pdfEngine.getStats().catch(() => ({ stats: {} })),
      realtimeEngine.getStats().catch(() => ({ stats: {} })),
    ]);

    res.json({
      success: true,
      dashboard: {
        links: linkStats.stats || {},
        tags: tagAnalytics.analytics || {},
        acl: aclStats.stats || {},
        pdf: pdfStats.stats || {},
        collaboration: collabStats.stats || {},
      },
    });
  })
);

// ─── Error handler ──────────────────────────
router.use((err, req, res, _next) => {
  logger.error(`[Documents-Pro-V4] Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ success: false, error: err.message || 'خطأ في الخادم' });
});

module.exports = router;
