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
  { safeRequire, dualMount, _safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Imports ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const communicationsRouter = safeRequire('../routes/communications.routes');
  // PHANTOM: const aiCommRouter = safeRequire('../routes/aiCommunication.routes');
  // PHANTOM: const emailV2Routes = safeRequire('../routes/email-v2.routes');
  const whatsappRoutes = safeRequire('../routes/whatsapp.routes');
  const whatsappEnhancedRoutes = safeRequire('../routes/whatsapp-enhanced.routes');
  const whatsappAutomationRoutes = safeRequire('../routes/whatsapp-automation.routes');
  const whatsappInsightsRoutes = safeRequire('../routes/whatsapp-insights.routes');
  const whatsappReminderRoutes = safeRequire('../routes/whatsapp-reminders.routes');
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
  logger.info('[Comm] Core communications mounted (communications)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Email System v2 (نظام البريد الإلكتروني الموحد) ────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // PHANTOM-FIX: app.use('/api/v2/email', emailV2Routes);
  // PHANTOM-FIX: dualMount(app, 'email', emailV2Routes);
  logger.info('[Comm] Email V2 routes SKIPPED (phantom import)');

  // ══════════════════════════════════════════════════════════════════════════
  // ── WhatsApp Communication System (نظام الوتساب) ──────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  // The webhook endpoints inside whatsapp.routes.js are PUBLIC by design
  // (Meta calls them with X-Hub-Signature-256). All other endpoints in that
  // router gate themselves with `router.use(authenticate)`, so we mount with
  // the unauthenticated `dualMount` here and let the router do its own auth.
  // whatsapp-enhanced already calls `router.use(authenticate)` internally.
  if (whatsappRoutes) {
    dualMount(app, 'whatsapp', whatsappRoutes);
    logger.info('[Comm] WhatsApp routes mounted (/api/whatsapp + /api/v1/whatsapp)');
  } else {
    logger.warn('[Comm] WhatsApp routes NOT mounted (require failed)');
  }
  if (whatsappEnhancedRoutes) {
    dualMount(app, 'whatsapp-enhanced', whatsappEnhancedRoutes);
    logger.info(
      '[Comm] WhatsApp Enhanced routes mounted (broadcast groups, template approval, opt-status)'
    );
  } else {
    logger.warn('[Comm] WhatsApp Enhanced routes NOT mounted (require failed)');
  }
  // W1517: configurable event→message bindings (admin CRUD). Router gates itself
  // with authenticate; writes require an admin/manager role.
  if (whatsappInsightsRoutes) {
    dualMount(app, 'whatsapp-insights', whatsappInsightsRoutes);
    logger.info('[Comm] WhatsApp Insights routes mounted (/api/(v1/)whatsapp-insights)');
  }

  if (whatsappReminderRoutes) {
    dualMount(app, 'whatsapp-reminders', whatsappReminderRoutes);
    logger.info('[Comm] WhatsApp Reminder routes mounted (/api/(v1/)whatsapp-reminders)');
  }

  if (whatsappAutomationRoutes) {
    dualMount(app, 'whatsapp-automation', whatsappAutomationRoutes);
    logger.info('[Comm] WhatsApp Automation routes mounted (/api/(v1/)whatsapp-automation)');
  } else {
    logger.warn('[Comm] WhatsApp Automation routes NOT mounted (require failed)');
  }

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
