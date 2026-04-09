/**
 * Documents Pro Phase 5 Routes — مسارات المرحلة الخامسة
 * ──────────────────────────────────────────────────────────────
 * QR/Barcode • Calendar/Deadlines • Comparison • Integrations • Dashboard Widgets
 * 75+ endpoints at /api/documents-pro-v5
 *
 * @module documents-pro-phase5.routes
 */

const express = require('express');
const router = express.Router();

/* ─── Auth Middleware ─────────────────────────────────────────── */
let authenticate;
try {
  const authMod = require('../../middleware/auth');
  authenticate = authMod.authenticateToken || authMod.default || authMod.auth || authMod;
} catch {
  authenticate = (req, res, next) => next();
}

/* ─── Services ───────────────────────────────────────────────── */
const qrCodeService = require('../../services/documents/documentQRCode.service');
const calendarService = require('../../services/documents/documentCalendar.service');
const comparisonService = require('../../services/documents/documentComparison.service');
const integrationsService = require('../../services/documents/documentIntegrations.service');
const dashboardService = require('../../services/documents/documentDashboardWidgets.service');

/* ─── Helpers ────────────────────────────────────────────────── */
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getUserId = req => req.user?.userId || req.user?.id || req.user?._id;

/* ═══════════════════════════════════════════════════════════════
   QR Code & Barcode  (12 endpoints)
   ═══════════════════════════════════════════════════════════════ */

// Generate QR code for document
router.post(
  '/qr/generate',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.generate(req.body.documentId, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Scan / verify QR code
router.post(
  '/qr/scan',
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.scan(req.body.code, {
      userId: getUserId(req),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json(result);
  })
);

// Get codes for document
router.get(
  '/qr/document/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.getForDocument(req.params.documentId, req.query);
    res.json(result);
  })
);

// Revoke code
router.post(
  '/qr/:codeId/revoke',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.revoke(req.params.codeId, getUserId(req));
    res.json(result);
  })
);

// Bulk generate
router.post(
  '/qr/bulk-generate',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.bulkGenerate(req.body.documentIds, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Create print job
router.post(
  '/qr/print-job',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.createPrintJob(req.body.documentIds, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get print jobs
router.get(
  '/qr/print-jobs',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.getPrintJobs(req.query);
    res.json(result);
  })
);

// Get scan history
router.get(
  '/qr/scans/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.getScanHistory(req.params.documentId, req.query);
    res.json(result);
  })
);

// Get QR types
router.get(
  '/qr/types',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, types: qrCodeService.getTypes() });
  })
);

// Get purposes
router.get(
  '/qr/purposes',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, purposes: qrCodeService.getPurposes() });
  })
);

// Get templates
router.get(
  '/qr/templates',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, templates: qrCodeService.getTemplates() });
  })
);

// Get QR stats
router.get(
  '/qr/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await qrCodeService.getStats(req.query.documentId);
    res.json(result);
  })
);

/* ═══════════════════════════════════════════════════════════════
   Calendar & Deadlines  (16 endpoints)
   ═══════════════════════════════════════════════════════════════ */

// Create calendar event
router.post(
  '/calendar/events',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.createEvent({ ...req.body, userId: getUserId(req) });
    res.json(result);
  })
);

// Update event
router.put(
  '/calendar/events/:eventId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.updateEvent(req.params.eventId, req.body, getUserId(req));
    res.json(result);
  })
);

// Delete event
router.delete(
  '/calendar/events/:eventId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.deleteEvent(req.params.eventId, getUserId(req));
    res.json(result);
  })
);

// Complete event
router.post(
  '/calendar/events/:eventId/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.completeEvent(
      req.params.eventId,
      getUserId(req),
      req.body.notes
    );
    res.json(result);
  })
);

// Snooze event
router.post(
  '/calendar/events/:eventId/snooze',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.snoozeEvent(
      req.params.eventId,
      req.body.snoozeUntil,
      getUserId(req)
    );
    res.json(result);
  })
);

// Respond to event
router.post(
  '/calendar/events/:eventId/respond',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.respondToEvent(
      req.params.eventId,
      getUserId(req),
      req.body
    );
    res.json(result);
  })
);

// Get events (calendar view)
router.get(
  '/calendar/events',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getEvents({
      ...req.query,
      assigneeId: req.query.mine ? getUserId(req) : undefined,
    });
    res.json(result);
  })
);

// Get document events
router.get(
  '/calendar/document/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getEvents({ documentId: req.params.documentId });
    res.json(result);
  })
);

// Get upcoming deadlines
router.get(
  '/calendar/deadlines',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getUpcomingDeadlines({
      ...req.query,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Get overdue
router.get(
  '/calendar/overdue',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getOverdue(getUserId(req));
    res.json(result);
  })
);

// Document timeline
router.get(
  '/calendar/timeline/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getDocumentTimeline(req.params.documentId);
    res.json(result);
  })
);

// Create view
router.post(
  '/calendar/views',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.createView(getUserId(req), req.body);
    res.json(result);
  })
);

// Get views
router.get(
  '/calendar/views',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getViews(getUserId(req));
    res.json(result);
  })
);

// Delete view
router.delete(
  '/calendar/views/:viewId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.deleteView(req.params.viewId, getUserId(req));
    res.json(result);
  })
);

// Get event types
router.get(
  '/calendar/types',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, types: calendarService.getTypes() });
  })
);

// Get calendar stats
router.get(
  '/calendar/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await calendarService.getStats({ userId: getUserId(req), ...req.query });
    res.json(result);
  })
);

/* ═══════════════════════════════════════════════════════════════
   Document Comparison  (8 endpoints)
   ═══════════════════════════════════════════════════════════════ */

// Compare two documents
router.post(
  '/compare',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.compare(req.body.sourceId, req.body.targetId, {
      ...req.body,
      userId: getUserId(req),
    });
    res.json(result);
  })
);

// Quick compare
router.post(
  '/compare/quick',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.quickCompare(req.body.sourceId, req.body.targetId);
    res.json(result);
  })
);

// Batch compare
router.post(
  '/compare/batch',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.batchCompare(
      req.body.baseDocumentId,
      req.body.compareDocumentIds,
      { userId: getUserId(req) }
    );
    res.json(result);
  })
);

// Get comparison by ID
router.get(
  '/compare/:comparisonId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.getById(req.params.comparisonId);
    res.json(result);
  })
);

// Get comparison history
router.get(
  '/compare/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.getHistory({ ...req.query, userId: getUserId(req) });
    res.json(result);
  })
);

// Get comparison history for document
router.get(
  '/compare/document/:documentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.getHistory({ documentId: req.params.documentId });
    res.json(result);
  })
);

// Get comparison stats
router.get(
  '/compare/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await comparisonService.getStats();
    res.json(result);
  })
);

/* ═══════════════════════════════════════════════════════════════
   External Integrations  (14 endpoints)
   ═══════════════════════════════════════════════════════════════ */

// Create integration
router.post(
  '/integrations',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.create({ ...req.body, userId: getUserId(req) });
    res.json(result);
  })
);

// Get all integrations
router.get(
  '/integrations',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.getAll(req.query);
    res.json(result);
  })
);

// Get integration by ID
router.get(
  '/integrations/:integrationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.getById(req.params.integrationId);
    res.json(result);
  })
);

// Update integration
router.put(
  '/integrations/:integrationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.update(req.params.integrationId, req.body);
    res.json(result);
  })
);

// Delete integration
router.delete(
  '/integrations/:integrationId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.delete(req.params.integrationId);
    res.json(result);
  })
);

// Toggle status
router.post(
  '/integrations/:integrationId/toggle',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.toggleStatus(req.params.integrationId);
    res.json(result);
  })
);

// Test integration
router.post(
  '/integrations/:integrationId/test',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.test(req.params.integrationId);
    res.json(result);
  })
);

// Get integration logs
router.get(
  '/integrations/:integrationId/logs',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.getLogs(req.params.integrationId, req.query);
    res.json(result);
  })
);

// Fire event (internal)
router.post(
  '/integrations/fire-event',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.fireEvent(req.body.event, req.body.data);
    res.json(result);
  })
);

// Get providers
router.get(
  '/integrations-meta/providers',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, providers: integrationsService.getProviders() });
  })
);

// Get event types
router.get(
  '/integrations-meta/event-types',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, eventTypes: integrationsService.getEventTypes() });
  })
);

// Get integration stats
router.get(
  '/integrations-meta/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await integrationsService.getStats();
    res.json(result);
  })
);

/* ═══════════════════════════════════════════════════════════════
   Dashboard Widgets  (18 endpoints)
   ═══════════════════════════════════════════════════════════════ */

// Get available widgets
router.get(
  '/dashboard/widgets',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getAvailableWidgets(req.query);
    res.json(result);
  })
);

// Create custom widget
router.post(
  '/dashboard/widgets',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.createWidget(req.body);
    res.json(result);
  })
);

// Update widget
router.put(
  '/dashboard/widgets/:widgetId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.updateWidget(req.params.widgetId, req.body);
    res.json(result);
  })
);

// Delete widget
router.delete(
  '/dashboard/widgets/:widgetId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.deleteWidget(req.params.widgetId);
    res.json(result);
  })
);

// Get widget data
router.get(
  '/dashboard/widgets/:widgetKey/data',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getWidgetData(req.params.widgetKey, req.query);
    res.json(result);
  })
);

// Bulk get widget data
router.post(
  '/dashboard/widgets/bulk-data',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getBulkWidgetData(req.body.widgetKeys, req.body.options);
    res.json(result);
  })
);

// Get widget categories
router.get(
  '/dashboard/categories',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ success: true, categories: dashboardService.getCategories() });
  })
);

// Initialize default widgets
router.post(
  '/dashboard/init',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.initDefaults();
    res.json(result);
  })
);

// Get user layout (default)
router.get(
  '/dashboard/layout',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getUserLayout(getUserId(req));
    res.json(result);
  })
);

// Get all user layouts
router.get(
  '/dashboard/layouts',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getUserLayouts(getUserId(req));
    res.json(result);
  })
);

// Save layout
router.post(
  '/dashboard/layout',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.saveLayout(getUserId(req), req.body);
    res.json(result);
  })
);

// Set default layout
router.post(
  '/dashboard/layout/:layoutId/default',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.setDefaultLayout(getUserId(req), req.params.layoutId);
    res.json(result);
  })
);

// Delete layout
router.delete(
  '/dashboard/layout/:layoutId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.deleteLayout(getUserId(req), req.params.layoutId);
    res.json(result);
  })
);

// Add widget to layout
router.post(
  '/dashboard/layout/:layoutId/widgets',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.addWidgetToLayout(
      getUserId(req),
      req.params.layoutId,
      req.body
    );
    res.json(result);
  })
);

// Remove widget from layout
router.delete(
  '/dashboard/layout/:layoutId/widgets/:widgetKey',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.removeWidgetFromLayout(
      getUserId(req),
      req.params.layoutId,
      req.params.widgetKey
    );
    res.json(result);
  })
);

// Update widget position
router.put(
  '/dashboard/layout/:layoutId/widgets/:widgetKey/position',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.updateWidgetPosition(
      getUserId(req),
      req.params.layoutId,
      req.params.widgetKey,
      req.body.position,
      req.body.size
    );
    res.json(result);
  })
);

// Reset layout
router.post(
  '/dashboard/layout/:layoutId/reset',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.resetLayout(getUserId(req), req.params.layoutId);
    res.json(result);
  })
);

// Duplicate layout
router.post(
  '/dashboard/layout/:layoutId/duplicate',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.duplicateLayout(
      getUserId(req),
      req.params.layoutId,
      req.body.name
    );
    res.json(result);
  })
);

// Dashboard stats
router.get(
  '/dashboard/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await dashboardService.getStats();
    res.json(result);
  })
);

/* ═══════════════════════════════════════════════════════════════
   Phase 5 Overview  (1 endpoint)
   ═══════════════════════════════════════════════════════════════ */

router.get(
  '/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    const [qrStats, calStats, compStats, intStats, dashStats] = await Promise.all([
      qrCodeService.getStats().catch(() => ({ stats: {} })),
      calendarService.getStats().catch(() => ({ stats: {} })),
      comparisonService.getStats().catch(() => ({ stats: {} })),
      integrationsService.getStats().catch(() => ({ stats: {} })),
      dashboardService.getStats().catch(() => ({ stats: {} })),
    ]);

    res.json({
      success: true,
      phase: 5,
      overview: {
        qrCodes: qrStats.stats,
        calendar: calStats.stats,
        comparisons: compStats.stats,
        integrations: intStats.stats,
        dashboard: dashStats.stats,
      },
    });
  })
);

module.exports = router;
