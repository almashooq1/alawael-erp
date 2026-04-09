/**
 * Documents Pro Phase 8 Routes — المرحلة الثامنة
 * ترجمة • نماذج • سلاسل موافقات • تشفير/DLP • نسخ احتياطي
 */

const express = require('express');
const router = express.Router();

/* ─── Auth Middleware ─── */
let authMiddleware;
try {
  const auth = require('../../middleware/auth');
  authMiddleware = auth.authenticateToken || auth.default || auth.auth || auth;
} catch {
  authMiddleware = (req, res, next) => next();
}

/* ─── Helpers ─── */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

/* ─── Services ─── */
let translationService, formsService, approvalService, encryptionService, backupService;
try {
  translationService = require('../../services/documents/documentTranslation.service');
} catch (e) {
  console.warn('Translation service not loaded:', e.message);
}
try {
  formsService = require('../../services/documents/documentForms.service');
} catch (e) {
  console.warn('Forms service not loaded:', e.message);
}
try {
  approvalService = require('../../services/documents/documentApprovalChains.service');
} catch (e) {
  console.warn('ApprovalChains service not loaded:', e.message);
}
try {
  encryptionService = require('../../services/documents/documentEncryption.service');
} catch (e) {
  console.warn('Encryption service not loaded:', e.message);
}
try {
  backupService = require('../../services/documents/documentBackup.service');
} catch (e) {
  console.warn('Backup service not loaded:', e.message);
}

/* ══════════════════════════════════════════════════════════════
   TRANSLATION — ترجمة المستندات
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/translation/translate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, targetLanguage, ...options } = req.body;
    const result = await translationService.translateDocument(
      documentId,
      targetLanguage,
      options,
      getUserId(req)
    );
    res.json(result);
  })
);

router.post(
  '/translation/batch',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentIds, targetLanguage, ...options } = req.body;
    const result = await translationService.batchTranslate(
      documentIds,
      targetLanguage,
      options,
      getUserId(req)
    );
    res.json(result);
  })
);

router.post(
  '/translation/detect',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.detectLanguage(req.body.text);
    res.json(result);
  })
);

router.get(
  '/translation/languages',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getSupportedLanguages();
    res.json(result);
  })
);

router.get(
  '/translation/jobs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getJobs(req.query, getUserId(req));
    res.json(result);
  })
);

router.get(
  '/translation/jobs/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getJob(req.params.id);
    res.json(result);
  })
);

router.put(
  '/translation/jobs/:id/cancel',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.cancelJob(req.params.id, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/translation/jobs/:jobId/segments/:index/review',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.reviewSegment(
      req.params.jobId,
      parseInt(req.params.index),
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

// Translation Memory
router.get(
  '/translation/tm',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getTMEntries(req.query);
    res.json(result);
  })
);

router.post(
  '/translation/tm',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.addTMEntry(req.body, getUserId(req));
    res.json(result);
  })
);

router.delete(
  '/translation/tm/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.deleteTMEntry(req.params.id);
    res.json(result);
  })
);

router.post(
  '/translation/tm/import',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.importTM(req.body.entries, getUserId(req));
    res.json(result);
  })
);

// Glossary
router.get(
  '/translation/glossaries',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getGlossaries(req.query);
    res.json(result);
  })
);

router.post(
  '/translation/glossaries',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.createGlossary(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/translation/glossaries/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.updateGlossary(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/translation/glossaries/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.deleteGlossary(req.params.id);
    res.json(result);
  })
);

router.post(
  '/translation/glossaries/:id/entries',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.addGlossaryEntry(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/translation/glossaries/:id/entries/:index',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.removeGlossaryEntry(
      req.params.id,
      parseInt(req.params.index)
    );
    res.json(result);
  })
);

router.get(
  '/translation/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await translationService.getStats(getUserId(req));
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   FORMS — النماذج والحقول
   ══════════════════════════════════════════════════════════════ */

// Templates
router.get(
  '/forms/templates',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getTemplates(req.query);
    res.json(result);
  })
);

router.get(
  '/forms/templates/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getTemplate(req.params.id);
    res.json(result);
  })
);

router.post(
  '/forms/templates',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.createTemplate(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/forms/templates/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.updateTemplate(req.params.id, req.body, getUserId(req));
    res.json(result);
  })
);

router.delete(
  '/forms/templates/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.deleteTemplate(req.params.id);
    res.json(result);
  })
);

router.put(
  '/forms/templates/:id/publish',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.publishTemplate(req.params.id);
    res.json(result);
  })
);

router.post(
  '/forms/templates/:id/clone',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.cloneTemplate(req.params.id, getUserId(req));
    res.json(result);
  })
);

// Submissions
router.get(
  '/forms/submissions',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getSubmissions(req.query);
    res.json(result);
  })
);

router.get(
  '/forms/submissions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getSubmission(req.params.id);
    res.json(result);
  })
);

router.post(
  '/forms/:formId/submit',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.submitForm(
      req.params.formId,
      req.body.data,
      getUserId(req),
      req.body.options || {}
    );
    res.json(result);
  })
);

router.put(
  '/forms/submissions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.updateSubmission(
      req.params.id,
      req.body.data,
      getUserId(req)
    );
    res.json(result);
  })
);

router.put(
  '/forms/submissions/:id/review',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.reviewSubmission(
      req.params.id,
      req.body.approved,
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

router.delete(
  '/forms/submissions/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.deleteSubmission(req.params.id);
    res.json(result);
  })
);

// Custom Fields
router.get(
  '/forms/custom-fields',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getCustomFields(req.query);
    res.json(result);
  })
);

router.post(
  '/forms/custom-fields',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.createCustomField(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/forms/custom-fields/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.updateCustomField(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/forms/custom-fields/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.deleteCustomField(req.params.id);
    res.json(result);
  })
);

router.get(
  '/forms/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await formsService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   APPROVAL CHAINS — سلاسل الموافقات
   ══════════════════════════════════════════════════════════════ */

// Chains
router.get(
  '/approval/chains',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getChains(req.query);
    res.json(result);
  })
);

router.get(
  '/approval/chains/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getChain(req.params.id);
    res.json(result);
  })
);

router.post(
  '/approval/chains',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.createChain(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/approval/chains/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.updateChain(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/approval/chains/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.deleteChain(req.params.id);
    res.json(result);
  })
);

router.put(
  '/approval/chains/:id/activate',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.activateChain(req.params.id);
    res.json(result);
  })
);

// Requests
router.get(
  '/approval/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getRequests(req.query);
    res.json(result);
  })
);

router.get(
  '/approval/requests/my-pending',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getMyPendingApprovals(getUserId(req));
    res.json(result);
  })
);

router.get(
  '/approval/requests/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getRequest(req.params.id);
    res.json(result);
  })
);

router.post(
  '/approval/requests',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { chainId, ...data } = req.body;
    const result = await approvalService.submitRequest(chainId, data, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/approval/requests/:id/process',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { action, comment } = req.body;
    const result = await approvalService.processStep(
      req.params.id,
      action,
      comment,
      getUserId(req)
    );
    res.json(result);
  })
);

router.put(
  '/approval/requests/:id/cancel',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.cancelRequest(req.params.id, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/approval/requests/:id/resubmit',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.resubmitRequest(
      req.params.id,
      req.body.note,
      getUserId(req)
    );
    res.json(result);
  })
);

// Delegation
router.get(
  '/approval/delegations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getMyDelegations(getUserId(req));
    res.json(result);
  })
);

router.post(
  '/approval/delegations',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.createDelegation(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/approval/delegations/:id/revoke',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.revokeDelegation(req.params.id);
    res.json(result);
  })
);

// SLA Check
router.post(
  '/approval/sla-check',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.checkSLA();
    res.json(result);
  })
);

router.get(
  '/approval/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await approvalService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   ENCRYPTION & DLP — التشفير وحماية البيانات
   ══════════════════════════════════════════════════════════════ */

// Encryption
router.post(
  '/security/encrypt/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.encryptDocument(
      req.params.documentId,
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

router.post(
  '/security/decrypt/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.decryptDocument(
      req.params.documentId,
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

router.get(
  '/security/encryption-status/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getEncryptionStatus(req.params.documentId);
    res.json(result);
  })
);

router.post(
  '/security/batch-encrypt',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.batchEncrypt(
      req.body.documentIds,
      req.body.options || {},
      getUserId(req)
    );
    res.json(result);
  })
);

// Classification
router.post(
  '/security/classify/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { level, ...options } = req.body;
    const result = await encryptionService.classifyDocument(
      req.params.documentId,
      level,
      options,
      getUserId(req)
    );
    res.json(result);
  })
);

router.post(
  '/security/auto-classify/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.autoClassifyDocument(req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/security/classification/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getClassification(req.params.documentId);
    res.json(result);
  })
);

router.get(
  '/security/classifications',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getClassifications(req.query);
    res.json(result);
  })
);

// DLP
router.post(
  '/security/dlp/scan',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.scanContent(req.body.content, req.body.options || {});
    res.json(result);
  })
);

router.get(
  '/security/dlp/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getDLPPolicies(req.query);
    res.json(result);
  })
);

router.post(
  '/security/dlp/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.createDLPPolicy(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/security/dlp/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.updateDLPPolicy(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/security/dlp/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.deleteDLPPolicy(req.params.id);
    res.json(result);
  })
);

// Access Logs
router.post(
  '/security/access-log',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { documentId, action, ...options } = req.body;
    const result = await encryptionService.logAccess(documentId, getUserId(req), action, options);
    res.json(result);
  })
);

router.get(
  '/security/access-logs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getAccessLogs(req.query);
    res.json(result);
  })
);

router.get(
  '/security/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await encryptionService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   BACKUP & RECOVERY — النسخ الاحتياطي والاسترداد
   ══════════════════════════════════════════════════════════════ */

// Backup Jobs
router.get(
  '/backup/jobs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getBackups(req.query);
    res.json(result);
  })
);

router.get(
  '/backup/jobs/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getBackup(req.params.id);
    res.json(result);
  })
);

router.post(
  '/backup/jobs',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.createBackup(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/backup/jobs/:id/cancel',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.cancelBackup(req.params.id);
    res.json(result);
  })
);

router.delete(
  '/backup/jobs/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.deleteBackup(req.params.id);
    res.json(result);
  })
);

router.get(
  '/backup/jobs/:id/verify',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.verifyBackup(req.params.id);
    res.json(result);
  })
);

// Recovery
router.get(
  '/backup/recoveries',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getRecoveries(req.query);
    res.json(result);
  })
);

router.get(
  '/backup/recoveries/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getRecovery(req.params.id);
    res.json(result);
  })
);

router.post(
  '/backup/recover/:backupId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.createRecovery(
      req.params.backupId,
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

// Snapshots
router.get(
  '/backup/snapshots/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getSnapshots(req.params.documentId, req.query);
    res.json(result);
  })
);

router.get(
  '/backup/snapshot/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getSnapshot(req.params.id);
    res.json(result);
  })
);

router.post(
  '/backup/snapshots/:documentId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.createSnapshot(
      req.params.documentId,
      req.body,
      getUserId(req)
    );
    res.json(result);
  })
);

router.post(
  '/backup/snapshots/:id/restore',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.restoreSnapshot(req.params.id, getUserId(req));
    res.json(result);
  })
);

router.delete(
  '/backup/snapshots/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.deleteSnapshot(req.params.id);
    res.json(result);
  })
);

router.post(
  '/backup/snapshots/compare',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.compareSnapshots(req.body.snapshotId1, req.body.snapshotId2);
    res.json(result);
  })
);

// Policies
router.get(
  '/backup/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getPolicies(req.query);
    res.json(result);
  })
);

router.post(
  '/backup/policies',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.createPolicy(req.body, getUserId(req));
    res.json(result);
  })
);

router.put(
  '/backup/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.updatePolicy(req.params.id, req.body);
    res.json(result);
  })
);

router.delete(
  '/backup/policies/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.deletePolicy(req.params.id);
    res.json(result);
  })
);

router.post(
  '/backup/policies/:id/run',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.runPolicy(req.params.id, getUserId(req));
    res.json(result);
  })
);

// Cleanup
router.post(
  '/backup/cleanup',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.cleanupExpired();
    res.json(result);
  })
);

router.get(
  '/backup/stats',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const result = await backupService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════ */

router.get(
  '/dashboard',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [translation, forms, approval, security, backup] = await Promise.allSettled([
      translationService?.getStats(getUserId(req)),
      formsService?.getStats(),
      approvalService?.getStats(),
      encryptionService?.getStats(),
      backupService?.getStats(),
    ]);

    res.json({
      success: true,
      translation: translation.status === 'fulfilled' ? translation.value : null,
      forms: forms.status === 'fulfilled' ? forms.value : null,
      approval: approval.status === 'fulfilled' ? approval.value : null,
      security: security.status === 'fulfilled' ? security.value : null,
      backup: backup.status === 'fulfilled' ? backup.value : null,
    });
  })
);

module.exports = router;
