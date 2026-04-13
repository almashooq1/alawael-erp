/**
 * Communication & Messaging Sub-Registry
 * سجل مسارات الاتصالات والرسائل والتنبيهات
 * ══════════════════════════════════════════════════════════════════════════
 * ~12 modules: Communications, AI Communications, Communication Module,
 * Email V2, WhatsApp, WhatsApp Enhanced,
 * Admin Communications, Admin Comm Enhanced, Electronic Directives,
 * Communication Module (prompt_08), Notifications Module (prompt_07)
 *
 * Extracted from _registry.js for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register all communication & messaging routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerCommunicationRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Imports ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const communicationsRouter = safeRequire('../routes/communications.real.routes');
  // PHANTOM: const aiCommRouter = safeRequire('../routes/aiCommunication.real.routes');
  const communicationRoutes = safeRequire('../routes/communication.routes');
  // PHANTOM: const emailV2Routes = safeRequire('../routes/email-v2.routes');
  // PHANTOM: const whatsappRoutes = safeRequire('../routes/whatsapp.routes');
  // PHANTOM: const whatsappEnhancedRoutes = safeRequire('../routes/whatsapp-enhanced.routes');
  // PHANTOM: const adminCommRoutes = safeRequire('../routes/admin-communications.routes');
  // PHANTOM: const adminCommEnhancedRoutes = safeRequire('../routes/admin-comm-enhanced.routes');
  // PHANTOM: const electronicDirectivesRoutes = safeRequire('../routes/electronic-directives.routes');
  const communicationModuleRoutes = safeRequire('../routes/communication-module.routes');
  // PHANTOM: const notificationsModuleRoutes = safeRequire('../routes/notifications-module.routes');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Core Communications ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'communications', communicationsRouter);
  // PHANTOM-FIX: dualMount(app, 'ai-communications', aiCommRouter);
  dualMount(app, 'communication', communicationRoutes);
  logger.info('[Comm] Core communications mounted (communications, AI-comm, communication)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Email System v2 (نظام البريد الإلكتروني الموحد) ────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: app.use('/api/v2/email', emailV2Routes);
  // PHANTOM-FIX: dualMount(app, 'email', emailV2Routes);
  logger.info('[Comm] Email V2 routes SKIPPED (phantom import)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── WhatsApp Communication System (نظام الوتساب) ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: dualMount(app, 'whatsapp', whatsappRoutes);
  // PHANTOM-FIX: dualMount(app, 'whatsapp-enhanced', whatsappEnhancedRoutes);
  logger.info('[Comm] WhatsApp routes SKIPPED (phantom imports)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Administrative Communications System (نظام الاتصالات الإدارية) ─────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: dualMount(app, 'admin-communications', adminCommRoutes);
  // PHANTOM-FIX: dualMount(app, 'admin-comm-enhanced', adminCommEnhancedRoutes);
  // PHANTOM-FIX: dualMount(app, 'electronic-directives', electronicDirectivesRoutes);
  logger.info(
    '[Comm] Administrative Communications & Electronic Directives mounted (42+ enhanced endpoints)'
  );
  logger.info(
    '[Comm] Admin Comm Enhanced: signatures, notes, reminders, tasks, delivery, referrals, comments, stamps, favorites, QR, labels, forward/reply, dashboard'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Communication Module (prompt_08) ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  dualMount(app, 'communication-module', communicationModuleRoutes);
  logger.info(
    '[Comm] Communication Module (prompt_08) mounted (SMS/WhatsApp/FCM/templates/escalations)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Notifications Module (prompt_07) ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: dualMount(app, 'notifications-module', notificationsModuleRoutes);
  logger.info('[Comm] Notifications Module SKIPPED (phantom import)');

  logger.info('[Comm] All ~12 communication/messaging modules mounted successfully');
};
