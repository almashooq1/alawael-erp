/**
 * 🏢 Visitor Registry Advanced Routes — مسارات سجل الزوار المتقدمة
 * AlAwael ERP — Full CRUD + Analytics + Blacklist + Audit
 *
 * Endpoints:
 *   /stats/today       — Today's stats
 *   /analytics         — Advanced analytics (period: 7d/30d/90d)
 *   /currently-inside  — Visitors currently inside
 *   /expected-today    — Pre-registered expected today
 *   /logs/recent       — Recent audit logs
 *   /blacklist         — CRUD blacklist
 *   /seed              — Demo data
 *   /                  — List + Create visitors
 *   /:id               — Get/Update single visitor
 *   /:id/check-in      — Check in
 *   /:id/check-out     — Check out
 *   /:id/cancel        — Cancel visit
 *   /:id/no-show       — Mark as no-show
 *   /:id/logs          — Visitor audit logs
 */
const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { visitorAdvancedService } = require('../services/visitor-advanced.service');
const logger = require('../utils/logger');

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Helpers ─────────────────────────────────────────────────────────────────
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('Visitor route error:', err.message);
    const status = err.message.includes('غير موجود')
      ? 404
      : err.message.includes('محظور')
        ? 403
        : 500;
    res.status(status).json({ success: false, message: safeError(err) });
  }
};

const getUserInfo = req => ({
  userId: req.user?.userId || req.user?._id || req.user?.id,
  userName: req.user?.name || req.user?.fullName || 'مستخدم النظام',
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATS & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /visitors/stats/today
router.get(
  '/stats/today',
  wrap(async _req => {
    return visitorAdvancedService.getTodayStats();
  })
);

// GET /visitors/analytics
router.get(
  '/analytics',
  wrap(async req => {
    return visitorAdvancedService.getAnalytics(req.query);
  })
);

// GET /visitors/currently-inside
router.get(
  '/currently-inside',
  wrap(async _req => {
    return visitorAdvancedService.getCurrentlyInside();
  })
);

// GET /visitors/expected-today
router.get(
  '/expected-today',
  wrap(async _req => {
    return visitorAdvancedService.getExpectedToday();
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// LOGS / AUDIT
// ═══════════════════════════════════════════════════════════════════════════════

// GET /visitors/logs/recent
router.get(
  '/logs/recent',
  wrap(async req => {
    return visitorAdvancedService.getRecentLogs(req.query);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// BLACKLIST
// ═══════════════════════════════════════════════════════════════════════════════

// GET /visitors/blacklist
router.get(
  '/blacklist',
  wrap(async req => {
    return visitorAdvancedService.getBlacklist(req.query);
  })
);

// POST /visitors/blacklist
router.post(
  '/blacklist',
  authorize(['admin', 'super_admin', 'manager']),
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.addToBlacklist(req.body, userId, userName);
  })
);

// DELETE /visitors/blacklist/:id
router.delete(
  '/blacklist/:id',
  authorize(['admin', 'super_admin', 'manager']),
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.removeFromBlacklist(req.params.id, userId, userName);
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════════

// POST /visitors/seed
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/seed',
    authorize(['admin', 'super_admin']),
    wrap(async _req => {
      return visitorAdvancedService.seedDemoData();
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISITORS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /visitors
router.get(
  '/',
  wrap(async req => {
    return visitorAdvancedService.getVisitors(req.query);
  })
);

// POST /visitors
router.post(
  '/',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.registerVisitor(req.body, userId, userName);
  })
);

// GET /visitors/:id
router.get(
  '/:id',
  wrap(async req => {
    return visitorAdvancedService.getVisitorById(req.params.id);
  })
);

// PUT /visitors/:id
router.put(
  '/:id',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.updateVisitor(req.params.id, req.body, userId, userName);
  })
);

// POST /visitors/:id/check-in
router.post(
  '/:id/check-in',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.checkIn(req.params.id, req.body, userId, userName);
  })
);

// POST /visitors/:id/check-out
router.post(
  '/:id/check-out',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.checkOut(req.params.id, req.body, userId, userName);
  })
);

// POST /visitors/:id/cancel
router.post(
  '/:id/cancel',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.cancelVisit(req.params.id, req.body.reason, userId, userName);
  })
);

// POST /visitors/:id/no-show
router.post(
  '/:id/no-show',
  wrap(async req => {
    const { userId, userName } = getUserInfo(req);
    return visitorAdvancedService.markNoShow(req.params.id, userId, userName);
  })
);

// GET /visitors/:id/logs
router.get(
  '/:id/logs',
  wrap(async req => {
    return visitorAdvancedService.getVisitorLogs(req.params.id, req.query);
  })
);

module.exports = router;
