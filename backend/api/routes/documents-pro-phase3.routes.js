'use strict';

/**
 * Document Pro Phase 3 Routes — مسارات المرحلة الثالثة
 * ═══════════════════════════════════════════════════════
 * التعليقات، المشاركة، سياسات الاحتفاظ، المفضلة، التحليلات
 *
 * Base URL: /api/documents-pro-v3
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

// الخدمات
const commentsService = require('../../services/documents/documentComments.service');
const sharingService = require('../../services/documents/documentSharing.service');
const retentionService = require('../../services/documents/documentRetention.service');
const favoritesService = require('../../services/documents/documentFavorites.service');
const analyticsEngine = require('../../services/documents/documentAnalytics.engine');

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
//  █  التعليقات — Comments
// ══════════════════════════════════════════════════════════

router.post(
  '/comments',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.addComment(req.body.documentId, userId, {
      ...req.body,
      authorName: req.user?.name || '',
      authorRole: req.user?.role || '',
    });
    res.status(201).json(result);
  })
);

router.get(
  '/comments/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await commentsService.getComments(req.params.documentId, {
      type: req.query.type,
      topLevelOnly: req.query.topLevelOnly === 'true',
      sort: req.query.sort,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.put(
  '/comments/:commentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.updateComment(req.params.commentId, userId, req.body);
    res.json(result);
  })
);

router.delete(
  '/comments/:commentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.deleteComment(req.params.commentId, userId);
    res.json(result);
  })
);

router.post(
  '/comments/:commentId/reaction',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.addReaction(req.params.commentId, userId, req.body.emoji);
    res.json(result);
  })
);

router.delete(
  '/comments/:commentId/reaction',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.removeReaction(
      req.params.commentId,
      userId,
      req.body.emoji
    );
    res.json(result);
  })
);

router.post(
  '/comments/:commentId/resolve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.resolveComment(req.params.commentId, userId, true);
    res.json(result);
  })
);

router.post(
  '/comments/:commentId/unresolve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await commentsService.resolveComment(req.params.commentId, userId, false);
    res.json(result);
  })
);

router.post(
  '/comments/:commentId/pin',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await commentsService.togglePin(req.params.commentId);
    res.json(result);
  })
);

router.get(
  '/comments/stats/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await commentsService.getStats(req.params.documentId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  المشاركة — Sharing
// ══════════════════════════════════════════════════════════

router.post(
  '/sharing/user',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await sharingService.shareWithUser(req.body.documentId, userId, {
      ...req.body,
      sharedByName: req.user?.name || '',
    });
    res.json(result);
  })
);

router.post(
  '/sharing/department',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await sharingService.shareWithDepartment(req.body.documentId, userId, {
      ...req.body,
      sharedByName: req.user?.name || '',
    });
    res.json(result);
  })
);

router.post(
  '/sharing/public-link',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await sharingService.createPublicLink(req.body.documentId, userId, req.body);
    res.json(result);
  })
);

router.post(
  '/sharing/access-link',
  asyncHandler(async (req, res) => {
    const result = await sharingService.accessByLink(req.body.shareLink, req.body.password, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      userName: req.body.userName,
    });
    res.json(result);
  })
);

router.get(
  '/sharing/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await sharingService.getDocumentShares(req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/sharing/shared-with-me',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await sharingService.getSharedWithMe(userId, {
      permission: req.query.permission,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.delete(
  '/sharing/:shareId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await sharingService.revokeShare(req.params.shareId, userId);
    res.json(result);
  })
);

router.put(
  '/sharing/:shareId/permission',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await sharingService.updatePermission(req.params.shareId, req.body.permission);
    res.json(result);
  })
);

router.get(
  '/sharing/access-log/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await sharingService.getAccessLog(req.params.documentId, {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json(result);
  })
);

router.get(
  '/sharing/stats/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await sharingService.getShareStats(req.params.documentId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  سياسات الاحتفاظ — Retention
// ══════════════════════════════════════════════════════════

router.get(
  '/retention/policies',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.getPolicies({
      activeOnly: req.query.activeOnly !== 'false',
    });
    res.json(result);
  })
);

router.get(
  '/retention/policies/:policyId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.getPolicy(req.params.policyId);
    if (!result) return res.status(404).json({ success: false, error: 'السياسة غير موجودة' });
    res.json({ success: true, policy: result });
  })
);

router.post(
  '/retention/policies',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await retentionService.createPolicy(req.body, userId);
    res.status(201).json(result);
  })
);

router.put(
  '/retention/policies/:policyId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await retentionService.updatePolicy(req.params.policyId, req.body, userId);
    res.json(result);
  })
);

router.delete(
  '/retention/policies/:policyId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.deletePolicy(req.params.policyId);
    res.json(result);
  })
);

router.post(
  '/retention/initialize',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.initializeDefaults();
    res.json(result);
  })
);

router.post(
  '/retention/execute',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.executeRetentionPolicies();
    res.json(result);
  })
);

router.post(
  '/retention/legal-hold/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await retentionService.applyLegalHold(
      req.params.documentId,
      userId,
      req.body.reason
    );
    res.json(result);
  })
);

router.delete(
  '/retention/legal-hold/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await retentionService.releaseLegalHold(req.params.documentId, userId);
    res.json(result);
  })
);

router.get(
  '/retention/expiring',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.getExpiringDocuments({
      daysAhead: parseInt(req.query.daysAhead) || 30,
      limit: parseInt(req.query.limit) || 100,
    });
    res.json(result);
  })
);

router.get(
  '/retention/logs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.getRetentionLogs({
      policyId: req.query.policyId,
      documentId: req.query.documentId,
      limit: parseInt(req.query.limit) || 100,
    });
    res.json(result);
  })
);

router.get(
  '/retention/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await retentionService.getStats();
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  المفضلة والإشارات المرجعية — Favorites & Bookmarks
// ══════════════════════════════════════════════════════════

router.post(
  '/favorites/toggle/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.toggleFavorite(userId, req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/favorites',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getFavorites(userId, {
      type: req.query.type || 'favorite',
      limit: parseInt(req.query.limit) || 100,
    });
    res.json(result);
  })
);

router.get(
  '/favorites/check/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.isFavorite(userId, req.params.documentId);
    res.json(result);
  })
);

router.post(
  '/bookmarks',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.addBookmark(userId, req.body.documentId, req.body);
    res.json(result);
  })
);

router.delete(
  '/bookmarks/:bookmarkId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.removeBookmark(req.params.bookmarkId, userId);
    res.json(result);
  })
);

// المجموعات
router.get(
  '/collections',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getCollections(userId);
    res.json(result);
  })
);

router.post(
  '/collections',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.createCollection(userId, req.body);
    res.status(201).json(result);
  })
);

router.get(
  '/collections/:collectionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getCollectionDocuments(req.params.collectionId, userId);
    res.json(result);
  })
);

router.post(
  '/collections/:collectionId/add',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.addToCollection(
      req.params.collectionId,
      req.body.documentId,
      userId,
      req.body.note
    );
    res.json(result);
  })
);

router.post(
  '/collections/:collectionId/remove',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.removeFromCollection(
      req.params.collectionId,
      req.body.documentId,
      userId
    );
    res.json(result);
  })
);

router.delete(
  '/collections/:collectionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.deleteCollection(req.params.collectionId, userId);
    res.json(result);
  })
);

// المستندات الأخيرة
router.get(
  '/recent',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getRecentDocuments(userId, {
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  })
);

router.get(
  '/most-accessed',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getMostAccessed(userId, {
      limit: parseInt(req.query.limit) || 10,
    });
    res.json(result);
  })
);

router.post(
  '/recent/record',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.recordAccess(
      userId,
      req.body.documentId,
      req.body.accessType
    );
    res.json(result);
  })
);

router.delete(
  '/recent/clear',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.clearRecentHistory(userId);
    res.json(result);
  })
);

router.get(
  '/favorites/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await favoritesService.getStats(userId);
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  التحليلات — Analytics
// ══════════════════════════════════════════════════════════

router.get(
  '/analytics/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getDashboardAnalytics();
    res.json(result);
  })
);

router.get(
  '/analytics/users',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getUserAnalytics({
      limit: parseInt(req.query.limit) || 10,
    });
    res.json(result);
  })
);

router.get(
  '/analytics/storage',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getStorageAnalytics();
    res.json(result);
  })
);

router.get(
  '/analytics/productivity',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getProductivityAnalytics({
      days: parseInt(req.query.days) || 30,
    });
    res.json(result);
  })
);

router.get(
  '/analytics/workflow',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getWorkflowAnalytics();
    res.json(result);
  })
);

router.get(
  '/analytics/full-report',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await analyticsEngine.getFullReport({
      days: parseInt(req.query.days) || 30,
      limit: parseInt(req.query.limit) || 10,
    });
    res.json(result);
  })
);

// ══════════════════════════════════════════════════════════
//  █  لوحة التحكم الشاملة — V3 Dashboard
// ══════════════════════════════════════════════════════════

router.get(
  '/v3-dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    const [analytics, favStats, retStats, recentDocs] = await Promise.all([
      analyticsEngine.getDashboardAnalytics().catch(() => ({ analytics: {} })),
      favoritesService.getStats(userId).catch(() => ({ stats: {} })),
      retentionService.getStats().catch(() => ({ stats: {} })),
      favoritesService.getRecentDocuments(userId, { limit: 5 }).catch(() => ({ documents: [] })),
    ]);

    res.json({
      success: true,
      dashboard: {
        analytics: analytics.analytics?.overview || {},
        favorites: favStats.stats || {},
        retention: retStats.stats || {},
        recentDocuments: recentDocs.documents || [],
      },
    });
  })
);

// ─── Error handler ──────────────────────────
router.use((err, req, res, _next) => {
  logger.error(`[Documents-Pro-V3] Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ success: false, error: err.message || 'خطأ في الخادم' });
});

module.exports = router;
