/**
 * Documents Pro Phase 7 Routes — نقاط الوصول المرحلة السابعة
 * ──────────────────────────────────────────────────────────────
 * Watermark • Import/Export • Compliance Monitor
 * Knowledge Graph • Automation (RPA)
 *
 * Base path: /api/documents-pro-v7
 */

const express = require('express');
const router = express.Router();

/* ─── Auth Middleware ─────────────────────────────────────────── */
let authenticateToken;
try {
  const authMod = require('../../middleware/auth');
  authenticateToken = authMod.authenticateToken || authMod.default || authMod.auth || authMod;
} catch {
  authenticateToken = (req, _res, next) => next();
}

/* ─── Helpers ────────────────────────────────────────────────── */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

/* ─── Services ───────────────────────────────────────────────── */
const watermarkService = require('../../services/documents/documentWatermark.service');
const importExportService = require('../../services/documents/documentImportExport.service');
const complianceService = require('../../services/documents/documentComplianceMonitor.service');
const knowledgeGraph = require('../../services/documents/documentKnowledgeGraph.service');
const automationService = require('../../services/documents/documentAutomation.service');

/* ══════════════════════════════════════════════════════════════
   Watermark — العلامات المائية
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/watermark/apply',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.applyWatermark({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.post(
  '/watermark/batch',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.batchApply({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/watermark/verify/:trackingCode',
  asyncHandler(async (req, res) => {
    const result = await watermarkService.verifyWatermark(req.params.trackingCode);
    res.json(result);
  })
);

router.post(
  '/watermark/track/:trackingCode',
  asyncHandler(async (req, res) => {
    const result = await watermarkService.trackAccess(req.params.trackingCode, {
      action: req.body.action || 'view',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.json(result);
  })
);

router.put(
  '/watermark/revoke/:trackingCode',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.revokeWatermark(req.params.trackingCode, getUserId(req));
    res.json(result);
  })
);

router.get(
  '/watermark/logs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.getLogs(req.query);
    res.json(result);
  })
);

// Profiles
router.get(
  '/watermark/profiles',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.getProfiles(req.query);
    res.json(result);
  })
);

router.post(
  '/watermark/profiles',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.createProfile({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.put(
  '/watermark/profiles/:profileId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.updateProfile(req.params.profileId, req.body);
    res.json(result);
  })
);

router.delete(
  '/watermark/profiles/:profileId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await watermarkService.deleteProfile(req.params.profileId);
    res.json(result);
  })
);

router.get(
  '/watermark/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await watermarkService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Import/Export — الاستيراد والتصدير
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/import-export/export',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.exportDocuments({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.post(
  '/import-export/import',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.importDocuments({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/import-export/jobs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.getJobs({
      ...req.query,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/import-export/jobs/:jobId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.getJob(req.params.jobId);
    res.json(result);
  })
);

router.put(
  '/import-export/jobs/:jobId/cancel',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.cancelJob(req.params.jobId);
    res.json(result);
  })
);

// Mappings
router.get(
  '/import-export/mappings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.getMappings(req.query);
    res.json(result);
  })
);

router.post(
  '/import-export/mappings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.createMapping({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.put(
  '/import-export/mappings/:mappingId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.updateMapping(req.params.mappingId, req.body);
    res.json(result);
  })
);

router.delete(
  '/import-export/mappings/:mappingId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await importExportService.deleteMapping(req.params.mappingId);
    res.json(result);
  })
);

router.get(
  '/import-export/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await importExportService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Compliance Monitor — مراقبة الامتثال
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/compliance/scan',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.runScan({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/compliance/scans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.getScans(req.query);
    res.json(result);
  })
);

router.get(
  '/compliance/scans/:scanId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.getScan(req.params.scanId);
    res.json(result);
  })
);

router.get(
  '/compliance/alerts',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.getAlerts(req.query);
    res.json(result);
  })
);

router.put(
  '/compliance/alerts/:alertId/resolve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.resolveAlert(req.params.alertId, {
      userId: getUserId(req),
      notes: req.body.notes,
    });
    res.json(result);
  })
);

router.put(
  '/compliance/alerts/:alertId/dismiss',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.dismissAlert(req.params.alertId, req.body);
    res.json(result);
  })
);

// Rules
router.get(
  '/compliance/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.getRules(req.query);
    res.json(result);
  })
);

router.post(
  '/compliance/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.createRule({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.put(
  '/compliance/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.updateRule(req.params.ruleId, req.body);
    res.json(result);
  })
);

router.put(
  '/compliance/rules/:ruleId/toggle',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await complianceService.toggleRule(req.params.ruleId);
    res.json(result);
  })
);

router.get(
  '/compliance/health',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await complianceService.getHealthDashboard();
    res.json(result);
  })
);

router.get(
  '/compliance/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await complianceService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Knowledge Graph — الرسم البياني المعرفي
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/graph/nodes',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.addNode({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.post(
  '/graph/edges',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.addEdge({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.delete(
  '/graph/edges/:edgeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.removeEdge(req.params.edgeId);
    res.json(result);
  })
);

router.get(
  '/graph/document/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.getDocumentGraph(req.params.documentId, req.query);
    res.json(result);
  })
);

router.get(
  '/graph/full',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.getFullGraph(req.query);
    res.json(result);
  })
);

router.post(
  '/graph/auto-discover/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.autoDiscover({
      documentId: req.params.documentId,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/graph/impact/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.analyzeImpact(req.params.documentId, req.query);
    res.json(result);
  })
);

router.get(
  '/graph/recommendations/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await knowledgeGraph.getRecommendations(req.params.documentId, req.query);
    res.json(result);
  })
);

router.get(
  '/graph/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await knowledgeGraph.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Automation (RPA) — أتمتة العمليات
   ══════════════════════════════════════════════════════════════ */

router.post(
  '/automation/process-event',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.processEvent(req.body.event, {
      ...req.body.data,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.post(
  '/automation/rules/:ruleId/execute',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.manualExecute(req.params.ruleId, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Rules CRUD
router.get(
  '/automation/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.getRules(req.query);
    res.json(result);
  })
);

router.get(
  '/automation/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.getRule(req.params.ruleId);
    res.json(result);
  })
);

router.post(
  '/automation/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.createRule({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.put(
  '/automation/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.updateRule(req.params.ruleId, req.body);
    res.json(result);
  })
);

router.delete(
  '/automation/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.deleteRule(req.params.ruleId);
    res.json(result);
  })
);

router.put(
  '/automation/rules/:ruleId/toggle',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.toggleRule(req.params.ruleId);
    res.json(result);
  })
);

// Executions
router.get(
  '/automation/executions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.getExecutions(req.query);
    res.json(result);
  })
);

router.get(
  '/automation/executions/:executionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await automationService.getExecution(req.params.executionId);
    res.json(result);
  })
);

router.get(
  '/automation/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await automationService.getStats();
    res.json(result);
  })
);

/* ─── Dashboard Overview ─────────────────────────────────────── */
router.get(
  '/dashboard',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const [wmStats, ieStats, compStats, graphStats, autoStats] = await Promise.all([
      watermarkService.getStats().catch(() => ({})),
      importExportService.getStats().catch(() => ({})),
      complianceService.getStats().catch(() => ({})),
      knowledgeGraph.getStats().catch(() => ({})),
      automationService.getStats().catch(() => ({})),
    ]);

    res.json({
      success: true,
      dashboard: {
        watermark: wmStats.stats || {},
        importExport: ieStats.stats || {},
        compliance: compStats.stats || {},
        graph: graphStats.stats || {},
        automation: autoStats.stats || {},
      },
    });
  })
);

module.exports = router;
