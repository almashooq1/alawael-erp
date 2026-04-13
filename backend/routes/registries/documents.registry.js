/**
 * Documents, Archive & Media Sub-Registry
 * سجل مسارات المستندات والأرشيف والوسائط
 * ══════════════════════════════════════════════════════════════════════════
 * ~15 modules: Documents, Documents Smart, Document Advanced,
 * Archive, Form Templates, Media Library,
 * Document Enhanced, Documents Pro (V3-V9 = 8 tiers),
 * Files Module
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all document, archive & media routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerDocumentRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Imports ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM: const documentsRoutes = safeRequire('../routes/documents');
  // PHANTOM: const documentsSmartRouter = safeRequire('../routes/documents.smart.routes');
  const documentAdvancedRoutes = safeRequire('../routes/documentAdvanced.routes');
  // PHANTOM: const archiveRoutes = safeRequire('../routes/archive.routes');
  // PHANTOM: const formTemplateRoutes = safeRequire('../routes/formTemplate.routes');
  const mediaRoutes = safeRequire('../routes/media.routes');
  // PHANTOM: const documentEnhancedRoutes = safeRequire('../api/routes/document-enhanced.routes');
  const documentsProRoutes = safeRequire('../api/routes/documents-pro.routes');
  const documentsProExtRoutes = safeRequire('../api/routes/documents-pro-extended.routes');
  const documentsProV3Routes = safeRequire('../api/routes/documents-pro-phase3.routes');
  const documentsProV4Routes = safeRequire('../api/routes/documents-pro-phase4.routes');
  const documentsProV5Routes = safeRequire('../api/routes/documents-pro-phase5.routes');
  const documentsProV6Routes = safeRequire('../api/routes/documents-pro-phase6.routes');
  const documentsProV7Routes = safeRequire('../api/routes/documents-pro-phase7.routes');
  const documentsProV8Routes = safeRequire('../api/routes/documents-pro-phase8.routes');
  const documentsProV9Routes = safeRequire('../api/routes/documents-pro-phase9.routes');
  const filesModuleRoutes = safeRequire('../routes/files-module.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Core Documents ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'documents', documentsRoutes);
  dualMount(app, 'documents-smart', documentsSmartRouter);
  logger.info('[Docs] Core documents + smart-documents mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Document Advanced Services (خدمات المستندات المتقدمة) ──────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'documents-advanced', documentAdvancedRoutes);
  logger.info('[Docs] Document Advanced routes mounted (10 services, 60+ endpoints)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Electronic Archive System (نظام الأرشفة الإلكتروني) ────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'archive', archiveRoutes);
  logger.info('[Docs] Archive routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Form Templates System (نظام النماذج الجاهزة) ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'form-templates', formTemplateRoutes);
  logger.info('[Docs] Form template routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Media Library System (نظام مكتبة الوسائط) ─────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'media', mediaRoutes);
  logger.info('[Docs] Media library routes mounted');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Files Module (prompt_08) ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'files-module', filesModuleRoutes);
  logger.info('[Docs] Files Module mounted (folders/files/versioning/archive — 18+ endpoints)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Documents Pro Series (Enhanced → Pro → V3 → V9, 11 tiers) ────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'documents-enhanced', documentEnhancedRoutes);
  dualMount(app, 'documents-pro', documentsProRoutes);
  dualMount(app, 'documents-pro-ext', documentsProExtRoutes);
  dualMount(app, 'documents-pro-v3', documentsProV3Routes);
  dualMount(app, 'documents-pro-v4', documentsProV4Routes);
  dualMount(app, 'documents-pro-v5', documentsProV5Routes);
  dualMount(app, 'documents-pro-v6', documentsProV6Routes);
  dualMount(app, 'documents-pro-v7', documentsProV7Routes);
  dualMount(app, 'documents-pro-v8', documentsProV8Routes);
  dualMount(app, 'documents-pro-v9', documentsProV9Routes);
  logger.info('[Docs] Documents Pro mounted (11 tiers: enhanced → pro → ext → V3-V9)');
  logger.info(
    '[Docs] V9: lifecycle, digital certificates, classification AI, workflow orchestration, forensics (85+ endpoints)'
  );
  logger.info(
    '[Docs] V8: translation, dynamic forms, approval chains, encryption/DLP, backup/recovery (80+ endpoints)'
  );
  logger.info(
    '[Docs] V7: watermark, import/export, compliance monitor, knowledge graph, automation RPA (80+ endpoints)'
  );
  logger.info(
    '[Docs] V6: OCR, archiving, reporting engine, email gateway, AI assistant (70+ endpoints)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── OCR Document Processing (Phase 18) ─────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(app, ['/api/ocr-documents', '/api/v1/ocr-documents'], '../routes/ocrDocument.routes');
  logger.info('[Docs] OCR Document Processing mounted (Phase 18)');

  logger.info('[Docs] All ~15 documents/archive/media modules mounted successfully');
};
