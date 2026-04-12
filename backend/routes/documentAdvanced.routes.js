/**
 * Document Advanced Routes — مسارات المستندات المتقدمة
 *
 * REST API endpoints for all advanced document management services:
 * - Favorites (المفضلة)
 * - Audit Trail (سجل التدقيق)
 * - Watermarks (العلامات المائية)
 * - Approval Workflows (سير عمل الموافقات)
 * - Expiry & Retention (الصلاحية والاحتفاظ)
 * - Trash / Recycle Bin (سلة المحذوفات)
 * - Annotations & Comments (التعليقات التوضيحية)
 * - Comparison / Diff (المقارنة)
 * - Export / Import (التصدير والاستيراد)
 * - QR Codes (رموز الاستجابة السريعة)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Service Imports ──────────────────────────────────────────────────────────
const favoritesService = require('../services/documentFavoritesService');
const auditService = require('../services/documentAuditService');
const watermarkService = require('../services/documentWatermarkService');
const approvalService = require('../services/documentApprovalService');
const expiryService = require('../services/documentExpiryService');
const trashService = require('../services/documentTrashService');
const annotationService = require('../services/documentAnnotationService');
const comparisonService = require('../services/documentComparisonService');
const exportService = require('../services/documentExportService');
const qrService = require('../services/documentQRService');
const safeError = require('../utils/safeError');

// ── Helper ───────────────────────────────────────────────────────────────────
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const userId = req => req.user?.id || req.user?._id || 'anonymous';
const userName = req => req.user?.name || req.user?.fullName || 'مستخدم';

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  1. FAVORITES — المفضلة                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Toggle favorite
router.post(
  '/favorites/toggle',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.toggleFavorite(userId(req), req.body.documentId, {
      ...req.body,
      userName: userName(req),
    });
    res.json(result);
  })
);

// Get user favorites
router.get(
  '/favorites',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.getFavorites(userId(req), req.query);
    res.json(result);
  })
);

// Check if favorited
router.get(
  '/favorites/check/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.isFavorited(userId(req), req.params.documentId);
    res.json(result);
  })
);

// Get favorite statistics
router.get(
  '/favorites/stats',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.getStatistics(userId(req));
    res.json(result);
  })
);

// Create collection
router.post(
  '/favorites/collections',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.createCollection(userId(req), req.body);
    res.json(result);
  })
);

// Get collections
router.get(
  '/favorites/collections',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.getCollections(userId(req));
    res.json(result);
  })
);

// Add to collection
router.post(
  '/favorites/collections/:collectionId/add',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.updateFavorite(userId(req), req.body.documentId, {
      collection: req.params.collectionId,
      action: 'addToCollection',
    });
    res.json(result);
  })
);

// Remove from collection
router.post(
  '/favorites/collections/:collectionId/remove',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await favoritesService.updateFavorite(userId(req), req.body.documentId, {
      collection: null,
      action: 'removeFromCollection',
    });
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  2. AUDIT TRAIL — سجل التدقيق                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Log audit event (internal — also called by other services)
router.post(
  '/audit/log',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.logEvent({
      ...req.body,
      userId: userId(req),
      userName: userName(req),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  })
);

// Get document audit trail
router.get(
  '/audit/trail/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.getDocumentAuditTrail(req.params.documentId, req.query);
    res.json(result);
  })
);

// Get user activity log
router.get(
  '/audit/user-activity',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.getUserActivityReport(userId(req), req.query);
    res.json(result);
  })
);

// Get compliance report
router.get(
  '/audit/compliance',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.generateComplianceReport(req.query);
    res.json(result);
  })
);

// Export audit trail
router.get(
  '/audit/export',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.exportAuditLog(req.query);
    res.json(result);
  })
);

// Verify chain integrity
router.get(
  '/audit/verify-chain',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.getAuditLog({
      documentId: req.query.documentId,
      type: 'integrity_check',
    });
    res.json(result);
  })
);

// Detect suspicious activity
router.get(
  '/audit/suspicious',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.getAuditLog({ ...req.query, severity: 'high' });
    res.json(result);
  })
);

// Audit statistics
router.get(
  '/audit/stats',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await auditService.getStatistics(req.query);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  3. WATERMARKS — العلامات المائية                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Apply watermark
router.post(
  '/watermarks/apply',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.applyWatermark(req.body.documentId, {
      ...req.body.options,
      userName: userName(req),
    });
    res.json(result);
  })
);

// Remove watermark
router.delete(
  '/watermarks/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.removeWatermark(req.params.documentId, userId(req));
    res.json(result);
  })
);

// Get watermark presets
router.get(
  '/watermarks/presets',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await watermarkService.getPresets();
    res.json(result);
  })
);

// Get document watermarks
router.get(
  '/watermarks/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.getDocumentWatermarks(req.params.documentId);
    res.json(result);
  })
);

// Dynamic watermark generation
router.post(
  '/watermarks/dynamic',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.applyWatermark(req.body.documentId, {
      type: 'dynamic',
      userName: userName(req),
      userId: userId(req),
    });
    res.json(result);
  })
);

// Save custom template
router.post(
  '/watermarks/templates',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.createTemplate(req.body.orgId, req.body);
    res.json(result);
  })
);

// Get templates
router.get(
  '/watermarks/templates',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await watermarkService.getTemplates(req.query.orgId);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  4. APPROVAL WORKFLOWS — سير عمل الموافقات                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Create approval workflow
router.post(
  '/approvals/create',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.createApprovalRequest(
      req.body.documentId,
      req.body.template || req.body.config,
      { userId: userId(req), userName: userName(req) }
    );
    res.json(result);
  })
);

// Submit decision (approve / reject / comment)
router.post(
  '/approvals/:workflowId/decide',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.submitDecision(req.params.workflowId, userId(req), {
      ...req.body,
      userName: userName(req),
    });
    res.json(result);
  })
);

// Get workflow status
router.get(
  '/approvals/:workflowId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.getApprovalRequest(req.params.workflowId);
    res.json(result);
  })
);

// Get pending approvals for current user
router.get(
  '/approvals/pending/me',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.getPendingApprovals(userId(req));
    res.json(result);
  })
);

// Get available templates
router.get(
  '/approvals/templates/list',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await approvalService.getTemplates();
    res.json(result);
  })
);

// Delegate approval
router.post(
  '/approvals/:workflowId/delegate',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.delegateApproval(
      req.params.workflowId,
      userId(req),
      req.body.toUserId,
      req.body.reason
    );
    res.json(result);
  })
);

// Cancel workflow
router.post(
  '/approvals/:workflowId/cancel',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.cancelApprovalRequest(
      req.params.workflowId,
      userId(req),
      req.body.reason
    );
    res.json(result);
  })
);

// Approval statistics
router.get(
  '/approvals/stats/overview',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await approvalService.getStatistics(req.query);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  5. EXPIRY & RETENTION — الصلاحية والاحتفاظ                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Set document expiry
router.post(
  '/expiry/set',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await expiryService.trackExpiry(req.body.documentId, {
      ...req.body,
      setBy: userId(req),
      setByName: userName(req),
    });
    res.json(result);
  })
);

// Check document expiry
router.get(
  '/expiry/check/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await expiryService.checkExpiry();
    res.json(result);
  })
);

// Get expiring soon
router.get(
  '/expiry/upcoming',
  authenticateToken,
  wrap(async (req, res) => {
    const days = parseInt(req.query.days || '30');
    const result = await expiryService.getExpiringDocuments(days);
    res.json(result);
  })
);

// Renew document
router.post(
  '/expiry/renew/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await expiryService.renewDocument(req.params.documentId, {
      ...req.body,
      renewedBy: userId(req),
      renewedByName: userName(req),
    });
    res.json(result);
  })
);

// Get retention policies
router.get(
  '/expiry/policies',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await expiryService.getRetentionPolicies();
    res.json(result);
  })
);

// Apply retention policy
router.post(
  '/expiry/policies/apply',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await expiryService.upsertRetentionPolicy({
      documentId: req.body.documentId,
      policyId: req.body.policyId,
      appliedBy: userId(req),
      appliedByName: userName(req),
    });
    res.json(result);
  })
);

// Check all alerts
router.get(
  '/expiry/alerts',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await expiryService.getAlerts();
    res.json(result);
  })
);

// Expiry statistics
router.get(
  '/expiry/stats',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await expiryService.getStatistics();
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  6. TRASH / RECYCLE BIN — سلة المحذوفات                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Move to trash
router.post(
  '/trash/move',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.moveToTrash(req.body.documentId, userId(req), {
      reason: req.body.reason,
      deletedByName: userName(req),
    });
    res.json(result);
  })
);

// Restore from trash
router.post(
  '/trash/restore/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.restore(req.params.documentId, userId(req));
    res.json(result);
  })
);

// List trash items
router.get(
  '/trash',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.getTrash(req.query);
    res.json(result);
  })
);

// Permanent delete
router.delete(
  '/trash/permanent/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.permanentDelete(
      req.params.documentId,
      userId(req),
      req.body.confirmString
    );
    res.json(result);
  })
);

// Bulk restore
router.post(
  '/trash/bulk-restore',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.bulkRestore(req.body.documentIds, userId(req));
    res.json(result);
  })
);

// Empty trash
router.delete(
  '/trash/empty',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await trashService.emptyTrash(userId(req));
    res.json(result);
  })
);

// Trash statistics
router.get(
  '/trash/stats',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await trashService.getStatistics();
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  7. ANNOTATIONS & COMMENTS — التعليقات التوضيحية                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Add annotation
router.post(
  '/annotations',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.addAnnotation(req.body.documentId, {
      ...req.body,
      userId: userId(req),
      userName: userName(req),
    });
    res.json(result);
  })
);

// Get document annotations
router.get(
  '/annotations/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.getAnnotations(
      req.params.documentId,
      userId(req),
      req.query
    );
    res.json(result);
  })
);

// Update annotation
router.put(
  '/annotations/:annotationId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.updateAnnotation(
      req.body.documentId,
      req.params.annotationId,
      req.body
    );
    res.json(result);
  })
);

// Delete annotation
router.delete(
  '/annotations/:annotationId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.deleteAnnotation(
      req.body.documentId,
      req.params.annotationId,
      userId(req)
    );
    res.json(result);
  })
);

// Add comment to annotation
router.post(
  '/annotations/:annotationId/comments',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.addComment(req.body.documentId, {
      ...req.body,
      annotationId: req.params.annotationId,
      userId: userId(req),
      userName: userName(req),
    });
    res.json(result);
  })
);

// Add reaction to annotation
router.post(
  '/annotations/:annotationId/reactions',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.addReaction(
      req.body.documentId,
      req.params.annotationId,
      req.body.emoji,
      userId(req)
    );
    res.json(result);
  })
);

// Resolve annotation
router.post(
  '/annotations/:annotationId/resolve',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.toggleResolveComment(
      req.body.documentId,
      req.params.annotationId,
      userId(req)
    );
    res.json(result);
  })
);

// Get available stamps
router.get(
  '/annotations/stamps/list',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await annotationService.getStampTypes();
    res.json(result);
  })
);

// Annotation statistics
router.get(
  '/annotations/stats/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await annotationService.getStatistics(req.params.documentId);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  8. COMPARISON / DIFF — المقارنة                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Compare two documents
router.post(
  '/compare',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await comparisonService.compare(
      req.body.documentIdA,
      req.body.documentIdB,
      req.body.options
    );
    res.json(result);
  })
);

// Compare document versions
router.post(
  '/compare/versions',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await comparisonService.compare(req.body.documentId, null, {
      versionA: req.body.versionA,
      versionB: req.body.versionB,
      ...req.body.options,
    });
    res.json(result);
  })
);

// Batch compare
router.post(
  '/compare/batch',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await comparisonService.batchCompare(req.body.versions);
    res.json(result);
  })
);

// Compare metadata only
router.post(
  '/compare/metadata',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await comparisonService.compare(req.body.documentIdA, req.body.documentIdB, {
      metadataOnly: true,
    });
    res.json(result);
  })
);

// Get comparison history
router.get(
  '/compare/history',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await comparisonService.getHistory(req.query);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  9. EXPORT / IMPORT — التصدير والاستيراد                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Export documents
router.post(
  '/export',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await exportService.createExportJob(req.body.documentIds, {
      ...req.body.options,
      exportedBy: userId(req),
      exportedByName: userName(req),
    });
    res.json(result);
  })
);

// Import documents
router.post(
  '/import',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await exportService.createImportJob(req.body.data, {
      ...req.body.options,
      importedBy: userId(req),
      importedByName: userName(req),
    });
    res.json(result);
  })
);

// Get export/import jobs
router.get(
  '/export-import/jobs',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await exportService.getJobs(req.query);
    res.json(result);
  })
);

// Get job status
router.get(
  '/export-import/jobs/:jobId',
  authenticateToken,
  wrap(async (req, res) => {
    const result =
      (await exportService.getExportJob(req.params.jobId)) ||
      (await exportService.getImportJob(req.params.jobId));
    res.json(result);
  })
);

// Export as CSV
router.post(
  '/export/csv',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await exportService.exportToCSV(req.body.documentIds, req.body.options);
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  10. QR CODES — رموز الاستجابة السريعة                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Generate QR code for document
router.post(
  '/qr/generate',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await qrService.generateQR(req.body.documentId, {
      ...req.body.options,
      generatedBy: userId(req),
      generatedByName: userName(req),
    });
    res.json(result);
  })
);

// Scan / verify QR
router.post(
  '/qr/scan',
  wrap(async (req, res) => {
    const result = await qrService.scanQR(req.body.qrId || req.body.verificationCode, {
      userId: req.user?.id,
      userName: req.user?.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  })
);

// Disable QR code
router.post(
  '/qr/disable/:qrId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await qrService.disableQR(req.params.qrId);
    res.json(result);
  })
);

// Get document QR codes
router.get(
  '/qr/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await qrService.getDocumentQRCodes(req.params.documentId);
    res.json(result);
  })
);

// Batch generate QR codes
router.post(
  '/qr/batch',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await qrService.batchGenerateQR(req.body.documentIds, {
      ...req.body.options,
      generatedBy: userId(req),
      generatedByName: userName(req),
    });
    res.json(result);
  })
);

// QR scan analytics
router.get(
  '/qr/analytics/:documentId',
  authenticateToken,
  wrap(async (req, res) => {
    const result = await qrService.getScanAnalytics(req.params.documentId, req.query);
    res.json(result);
  })
);

// QR statistics
router.get(
  '/qr/stats',
  authenticateToken,
  wrap(async (_req, res) => {
    const result = await qrService.getStatistics();
    res.json(result);
  })
);

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  OVERVIEW / STATS — نظرة عامة                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Combined overview stats for all advanced features
router.get(
  '/overview',
  authenticateToken,
  wrap(async (req, res) => {
    try {
      const [favoriteStats, auditStats, approvalStats, expiryStats, trashStats, qrStats] =
        await Promise.all([
          favoritesService.getStatistics(userId(req)),
          auditService.getStatistics({}),
          approvalService.getStatistics({}),
          expiryService.getStatistics(),
          trashService.getStatistics(),
          qrService.getStatistics(),
        ]);

      res.json({
        success: true,
        data: {
          favorites: favoriteStats.data,
          audit: auditStats.data,
          approvals: approvalStats.data,
          expiry: expiryStats.data,
          trash: trashStats.data,
          qr: qrStats.data,
        },
        message: 'تم جلب الإحصائيات بنجاح',
      });
    } catch (err) {
      safeError(res, err, 'Document advanced overview error');
    }
  })
);

logger.info('Document Advanced routes loaded (10 services, 60+ endpoints)');

module.exports = router;
