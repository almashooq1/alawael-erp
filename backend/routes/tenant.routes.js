/**
 * Tenant Routes
 * مسارات الالتزام
 *
 * API Routes for multi-tenant support
 * مسارات API لدعم متعدد الالتزام
 */

const express = require('express');
const tenantController = require('../controllers/tenant.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// W707 — Tenant management is a platform-owner surface (create/suspend whole
// organisations + manage their users). The controller carries NO internal auth
// (it only reads `req.user?.id`), and safeMount adds none, so EVERY tenant
// route MUST be gated here. Without this, un-gating the controller below would
// expose unauthenticated tenant CRUD. authenticate → requireAdmin (admin /
// superadmin / super_admin) on the whole surface.
router.use(authenticate);
router.use(requireAdmin);

// W707 — `tenant.controller` IS a fully-built Express Router (create / list /
// get / update / delete / suspend / reactivate / users / settings, ~590 LOC
// over tenant.service + tenantIsolation.service). The prior gate tested an
// app-only internal property (which Express *Routers* don't carry — only the
// app does) AND treated `typeof === 'function'` (which a Router IS) as the
// "not a router" branch — so EVERY request fell through to a 501 stub and the
// entire multi-tenant surface was dark. An Express Router is a middleware
// function exposing a `.stack` array; mount it directly when present.
const isMountable =
  typeof tenantController === 'function' ||
  (tenantController && Array.isArray(tenantController.stack));
if (isMountable) {
  router.use('/', tenantController);
} else {
  // Defensive fallback only when the controller genuinely failed to load.
  router.use((_req, res) => {
    res.status(501).json({
      success: false,
      message: 'Tenant routes not fully initialized',
      status: 'NOT_IMPLEMENTED',
    });
  });
}

module.exports = router;
