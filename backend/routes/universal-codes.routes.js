'use strict';

/**
 * Universal Codes — HTTP endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   POST   /api/v1/codes/generate         issue/lookup a code for an entity
 *   GET    /api/v1/codes/resolve/:code    return entity info (no scan-log)
 *   POST   /api/v1/codes/scan/:code       mark scanned + return entity info
 *   POST   /api/v1/codes/revoke/:code     soft-revoke
 *   GET    /api/v1/codes/render/:code.png?type=qr|barcode   PNG image
 *
 * All routes require authentication. `/render` is the only one that
 * returns binary; the rest return JSON.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const svc = require('../services/universalCode');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticate);

router.post('/generate', async (req, res) => {
  try {
    const { entityType, entityId, entityLabel } = req.body || {};
    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, message: 'entityType + entityId required' });
    }
    const doc = await svc.generate(entityType, entityId, {
      entityLabel,
      issuedBy: req.user?.userId || req.user?.id,
    });
    res.json({ success: true, data: doc });
  } catch (error) {
    safeError(res, error, 'universal-codes');
  }
});

router.get('/resolve/:code', async (req, res) => {
  try {
    const doc = await svc.resolve(req.params.code);
    res.json({ success: true, data: doc });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status < 500) {
      return res.status(status).json({ success: false, message: error.message });
    }
    safeError(res, error, 'universal-codes');
  }
});

router.post('/scan/:code', async (req, res) => {
  try {
    const doc = await svc.scan(req.params.code, req.user?.userId || req.user?.id);
    res.json({ success: true, data: doc });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status < 500) {
      return res.status(status).json({ success: false, message: error.message });
    }
    safeError(res, error, 'universal-codes');
  }
});

router.post('/revoke/:code', async (req, res) => {
  try {
    const doc = await svc.revoke(req.params.code, req.user?.userId || req.user?.id);
    logger.info(`[UniversalCode] revoked ${req.params.code} by ${req.user?.userId || 'unknown'}`);
    res.json({ success: true, data: doc });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status < 500) {
      return res.status(status).json({ success: false, message: error.message });
    }
    safeError(res, error, 'universal-codes');
  }
});

/**
 * POST /api/v1/codes/admin/backfill
 *   body: { entityTypes?: ['BNF', ...], dryRun?: true }
 * Issues codes for entities that existed BEFORE the plugin was installed.
 * Idempotent — already-issued codes are skipped. Admin-only.
 */
router.post('/admin/backfill', async (req, res) => {
  try {
    const userRole = req.user?.role || req.user?.roleCode;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'admin role required' });
    }
    const { runBackfill } = require('../services/universalCode/backfill');
    const summary = await runBackfill({
      entityTypes: Array.isArray(req.body?.entityTypes) ? req.body.entityTypes : undefined,
      dryRun: !!req.body?.dryRun,
    });
    logger.info(
      `[UniversalCode] backfill: scanned=${summary.totals.scanned} ` +
        `issued=${summary.totals.issued} skipped=${summary.totals.skipped} ` +
        `dryRun=${summary.dryRun}`
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    safeError(res, error, 'universal-codes');
  }
});

router.get('/render/:code.png', async (req, res) => {
  try {
    const code = req.params.code;
    const type = (req.query.type || 'qr').toLowerCase();
    const png =
      type === 'barcode'
        ? await svc.renderBarcode(code, { scale: Number(req.query.scale) || 3 })
        : await svc.renderQR(code, { width: Number(req.query.width) || 256 });
    res.type('image/png').set('Cache-Control', 'public, max-age=86400').send(png);
  } catch (error) {
    safeError(res, error, 'universal-codes');
  }
});

module.exports = router;
