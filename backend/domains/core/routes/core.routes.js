/**
 * Core Domain — Combined Router (Beneficiary CRUD + 360° Dashboard)
 *
 * يجمع مسارات CRUD للمستفيد مع مسارات لوحة 360°
 * ويصدّر راوتر Express جاهز للتسجيل في _registry.js
 *
 * Mount: dualMount(app, 'core', require('./core.routes'))
 * → /api/core/beneficiaries, /api/core/beneficiaries/:beneficiaryId/360, …
 *
 * @module domains/core/routes/core.routes
 */

const express = require('express');
const router = express.Router();

// ── W1146 (W269-class): branch isolation for the core beneficiary surface ──
// Every :beneficiaryId URL param is ownership-checked BEFORE handlers run
// (403 cross-branch / 404 missing / 503 fail-closed), and body-carried
// beneficiary ids are checked on write paths. Both no-op for unrestricted
// callers (no req.branchScope). See middleware/assertBranchMatch.js.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../../../middleware/assertBranchMatch');
const { requireBranchAccess } = require('../../../middleware/branchScope.middleware');

// W1560 — CRITICAL: populate req.branchScope so the param/body guards below (and
// effectiveBranchScope() in the handlers) actually FIRE. The live /api/v1/core
// registry mount applies `authenticate` ONLY (no requireBranchAccess), so
// req.branchScope was NEVER set and EVERY branch-isolation guard on the central
// beneficiary-PHI surface silently no-op'd → a cross-tenant PHI read/write leak
// (same class as #769). authenticate runs earlier in the mount chain, so req.user
// is set here; on the DDD /api/v2/core mount this is idempotent.
router.use(requireBranchAccess);
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);

// ── Beneficiary CRUD (factory pattern) ───────────────────────────────────────
try {
  const { BeneficiaryRepository } = require('../repositories/beneficiary.repository');
  const { BeneficiaryService } = require('../services/beneficiary.service');
  const { createBeneficiaryRoutes } = require('./beneficiary.routes');

  const repo = new BeneficiaryRepository();
  const service = new BeneficiaryService(repo);
  createBeneficiaryRoutes(router, service);
} catch (err) {
  // Graceful degradation — log and serve empty router for this section
  const logger = require('../../../utils/logger');
  logger.warn(`[Core Domain] Beneficiary routes failed to load: ${err.message}`);
}

// ── Beneficiary 360° Dashboard ────────────────────────────────────────────────
try {
  const beneficiary360Router = require('./beneficiary360.routes');
  router.use(beneficiary360Router);
} catch (err) {
  const logger = require('../../../utils/logger');
  logger.warn(`[Core Domain] Beneficiary 360 routes failed to load: ${err.message}`);
}

module.exports = router;
