/**
 * Documents Pro Phase 6 Routes — نقاط الوصول المرحلة السادسة
 * ──────────────────────────────────────────────────────────────
 * OCR • Archiving & Compliance • Reporting Engine
 * Email Gateway • AI Assistant
 *
 * Base path: /api/documents-pro-v6
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
const ocrService = require('../../services/documents/documentOCR.service');
const archivingService = require('../../services/documents/documentArchiving.service');
const reportingEngine = require('../../services/documents/documentReporting.engine');
const emailGateway = require('../../services/documents/documentEmailGateway.service');
const aiAssistant = require('../../services/documents/documentAIAssistant.service');

/* ══════════════════════════════════════════════════════════════
   OCR — استخراج النصوص
   ══════════════════════════════════════════════════════════════ */

// Extract text from document
router.post(
  '/ocr/extract',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.extractText({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Batch OCR
router.post(
  '/ocr/batch',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.batchExtract({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get OCR result
router.get(
  '/ocr/result/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.getResult(req.params.documentId);
    res.json(result);
  })
);

// Get OCR jobs
router.get(
  '/ocr/jobs',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.getJobs({
      ...req.query,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Search OCR text
router.get(
  '/ocr/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.searchText(req.query);
    res.json(result);
  })
);

// Extract tables from document
router.post(
  '/ocr/tables',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await ocrService.extractTables(req.body);
    res.json(result);
  })
);

// OCR stats
router.get(
  '/ocr/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await ocrService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Archiving & Compliance — الأرشفة والامتثال
   ══════════════════════════════════════════════════════════════ */

// Archive document
router.post(
  '/archive/document',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.archiveDocument({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get archive record
router.get(
  '/archive/record/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.getArchiveRecord(req.params.documentId);
    res.json(result);
  })
);

// Search archive
router.get(
  '/archive/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.searchArchive(req.query);
    res.json(result);
  })
);

// Verify integrity
router.get(
  '/archive/verify/:documentId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.verifyIntegrity(req.params.documentId);
    res.json(result);
  })
);

// --- Policies
router.post(
  '/archive/policies',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.createPolicy({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/archive/policies',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await archivingService.getPolicies();
    res.json(result);
  })
);

router.put(
  '/archive/policies/:policyId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.updatePolicy(req.params.policyId, req.body);
    res.json(result);
  })
);

router.delete(
  '/archive/policies/:policyId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.deletePolicy(req.params.policyId);
    res.json(result);
  })
);

// --- Legal Holds
router.post(
  '/archive/legal-holds',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.createLegalHold({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/archive/legal-holds',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.getLegalHolds(req.query);
    res.json(result);
  })
);

router.put(
  '/archive/legal-holds/:holdId/release',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.releaseLegalHold(req.params.holdId, getUserId(req));
    res.json(result);
  })
);

// Compliance report
router.get(
  '/archive/compliance-report',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.getComplianceReport(req.query);
    res.json(result);
  })
);

// Destruction certificate
router.post(
  '/archive/destruction',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await archivingService.createDestructionCertificate({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Archive stats
router.get(
  '/archive/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await archivingService.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Reporting Engine — محرك التقارير
   ══════════════════════════════════════════════════════════════ */

// Generate report
router.post(
  '/reports/generate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.generateReport({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Run from template
router.post(
  '/reports/run/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.runFromTemplate(req.params.templateId, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get report execution
router.get(
  '/reports/execution/:executionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.getExecution(req.params.executionId);
    res.json(result);
  })
);

// Get report history
router.get(
  '/reports/history',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.getHistory(req.query);
    res.json(result);
  })
);

// Export report
router.get(
  '/reports/export/:executionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.exportReport(
      req.params.executionId,
      req.query.format || 'json'
    );
    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename || 'report'}"`);
    }
    res.json(result);
  })
);

// --- Templates CRUD
router.post(
  '/reports/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.createTemplate({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/reports/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.getTemplates(req.query);
    res.json(result);
  })
);

router.put(
  '/reports/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.updateTemplate(req.params.templateId, req.body);
    res.json(result);
  })
);

router.delete(
  '/reports/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.deleteTemplate(req.params.templateId);
    res.json(result);
  })
);

// --- Schedules
router.post(
  '/reports/schedules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.createSchedule({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/reports/schedules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.getSchedules(req.query);
    res.json(result);
  })
);

router.put(
  '/reports/schedules/:scheduleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.updateSchedule(req.params.scheduleId, req.body);
    res.json(result);
  })
);

router.delete(
  '/reports/schedules/:scheduleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.deleteSchedule(req.params.scheduleId);
    res.json(result);
  })
);

router.put(
  '/reports/schedules/:scheduleId/toggle',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await reportingEngine.toggleSchedule(req.params.scheduleId);
    res.json(result);
  })
);

// Report stats
router.get(
  '/reports/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await reportingEngine.getStats();
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   Email Gateway — بوابة البريد الإلكتروني
   ══════════════════════════════════════════════════════════════ */

// Send email
router.post(
  '/email/send',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.send({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get messages
router.get(
  '/email/messages',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.getMessages(req.query);
    res.json(result);
  })
);

// Get thread
router.get(
  '/email/thread/:threadId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.getThread(req.params.threadId);
    res.json(result);
  })
);

// Track open (pixel / webhook)
router.get(
  '/email/track/:messageId',
  asyncHandler(async (req, res) => {
    await emailGateway.trackOpen(req.params.messageId);
    // Return transparent 1px GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.writeHead(200, { 'Content-Type': 'image/gif' });
    res.end(pixel);
  })
);

// Email stats
router.get(
  '/email/stats',
  authenticateToken,
  asyncHandler(async (_req, res) => {
    const result = await emailGateway.getStats();
    res.json(result);
  })
);

// --- Templates
router.post(
  '/email/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.createTemplate(req.body);
    res.json(result);
  })
);

router.get(
  '/email/templates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.getTemplates(req.query);
    res.json(result);
  })
);

router.put(
  '/email/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.updateTemplate(req.params.templateId, req.body);
    res.json(result);
  })
);

router.delete(
  '/email/templates/:templateId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.deleteTemplate(req.params.templateId);
    res.json(result);
  })
);

// --- Forwarding Rules
router.post(
  '/email/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.createRule({
      ...req.body,
      createdBy: getUserId(req),
    });
    res.json(result);
  })
);

router.get(
  '/email/rules',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.getRules(req.query);
    res.json(result);
  })
);

router.put(
  '/email/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.updateRule(req.params.ruleId, req.body);
    res.json(result);
  })
);

router.delete(
  '/email/rules/:ruleId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.deleteRule(req.params.ruleId);
    res.json(result);
  })
);

router.put(
  '/email/rules/:ruleId/toggle',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.toggleRule(req.params.ruleId);
    res.json(result);
  })
);

// Process event (internal hook)
router.post(
  '/email/process-event',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await emailGateway.processEvent(req.body.event, req.body.data);
    res.json(result);
  })
);

/* ══════════════════════════════════════════════════════════════
   AI Assistant — المساعد الذكي
   ══════════════════════════════════════════════════════════════ */

// Chat / Q&A
router.post(
  '/ai/chat',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.chat({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Auto-classify
router.post(
  '/ai/classify',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.classifyDocument({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Summarize
router.post(
  '/ai/summarize',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.summarize({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Extract metadata
router.post(
  '/ai/extract',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.extractMetadata({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Detect duplicates
router.post(
  '/ai/duplicates',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.detectDuplicates({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Smart suggestions
router.post(
  '/ai/suggestions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.getSuggestions({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// NL search
router.get(
  '/ai/search',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.naturalLanguageSearch({
      ...req.query,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Content analysis
router.post(
  '/ai/analyze',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.analyzeContent({
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Feedback
router.post(
  '/ai/feedback/:interactionId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.submitFeedback(req.params.interactionId, req.body);
    res.json(result);
  })
);

// Interaction history
router.get(
  '/ai/history',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.getHistory({
      ...req.query,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// AI stats
router.get(
  '/ai/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.getStats({
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// --- Knowledge Base CRUD
router.post(
  '/ai/knowledge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.addKnowledge(req.body);
    res.json(result);
  })
);

router.get(
  '/ai/knowledge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.getKnowledgeBase(req.query);
    res.json(result);
  })
);

router.put(
  '/ai/knowledge/:knowledgeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.updateKnowledge(req.params.knowledgeId, req.body);
    res.json(result);
  })
);

router.delete(
  '/ai/knowledge/:knowledgeId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const result = await aiAssistant.deleteKnowledge(req.params.knowledgeId);
    res.json(result);
  })
);

/* ─── Dashboard Overview ─────────────────────────────────────── */
router.get(
  '/dashboard',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const [ocrStats, archiveStats, reportStats, emailStats, aiStats] = await Promise.all([
      ocrService.getStats().catch(() => ({})),
      archivingService.getStats().catch(() => ({})),
      reportingEngine.getStats().catch(() => ({})),
      emailGateway.getStats().catch(() => ({})),
      aiAssistant.getStats({ userId: getUserId(req) }).catch(() => ({})),
    ]);

    res.json({
      success: true,
      dashboard: {
        ocr: ocrStats.stats || {},
        archive: archiveStats.stats || {},
        reports: reportStats.stats || {},
        email: emailStats.stats || {},
        ai: aiStats.stats || {},
      },
    });
  })
);

module.exports = router;
