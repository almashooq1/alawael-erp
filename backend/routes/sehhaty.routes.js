/**
 * sehhaty.routes.js — Sehhaty/Tawakkalna HTTP surface (W280b).
 *
 * MFA tiers (per W273 pattern):
 *   - POST /import / /vaccinations / /tawakkalna-link → tier 1
 *     (PHI mutation but consent already checked; service does deep validation)
 *
 * NOTE: tier 1 + service-layer enforceMfa:true is the consistent rule
 * for "PHI fetch with consent already on file" operations. Tier 2 is
 * reserved for actions that BYPASS consent (admin override / DSAR
 * fulfillment / signed DPIA / etc.).
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function getService(req) {
  return req.app._sehhatyService;
}

function getAdapter(req) {
  return req.app._sehhatyAdapter;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── Health probe (config + mode) — open to authenticated users ──────────
router.get('/health', (req, res) => {
  const adapter = getAdapter(req);
  if (!adapter) return res.status(503).json({ success: false, code: 'SEHHATY_NOT_WIRED' });
  return res.json({ success: true, ...adapter.getConfig() });
});

// ── Import health summary (the PHI gate) ────────────────────────────────
router.post('/import', requireMfaTier(1), async (req, res) => {
  try {
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'SEHHATY_NOT_WIRED' });
    const actor = {
      userId: req.user?._id || req.user?.id,
      mfaTier: req.actor?.mfaLevel || 0,
      mfaChallengeId: req.actor?.mfaChallengeId,
    };
    const result = await svc.importHealthSummary({
      beneficiaryId: req.body.beneficiaryId,
      nationalId: req.body.nationalId,
      consentRecordId: req.body.consentRecordId,
      actor,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'SEHHATY_INVALID_INPUT'
        ? 400
        : err.code === 'SEHHATY_MFA_INSUFFICIENT'
          ? 403
          : err.code === 'SEHHATY_CONSENT_NOT_FOUND'
            ? 404
            : err.code === 'SEHHATY_CONSENT_MISMATCH'
              ? 403
              : err.code === 'SEHHATY_CONSENT_TYPE_INSUFFICIENT'
                ? 403
                : err.code === 'SEHHATY_CONSENT_REVOKED'
                  ? 403
                  : err.code === 'SEHHATY_CONSENT_EXPIRED'
                    ? 403
                    : err.code === 'SEHHATY_CONSENT_REVOKED_AT_SOURCE'
                      ? 409
                      : err.code === 'SEHHATY_LIVE_NOT_CONFIGURED'
                        ? 503
                        : 500;
    logger.warn('[sehhaty] import error', { code: err.code, status });
    return res
      .status(status)
      .json({ success: false, code: err.code || 'IMPORT_FAILED', error: safeError(err) });
  }
});

// ── Pull vaccinations (lighter PHI — list of vaccine names + dates) ─────
router.post('/vaccinations', requireMfaTier(1), async (req, res) => {
  try {
    const adapter = getAdapter(req);
    if (!adapter) return res.status(503).json({ success: false, code: 'SEHHATY_NOT_WIRED' });
    // Vaccinations also require consent (same gate as importHealthSummary).
    // For simplicity we go through the service so the gate is consistent.
    const svc = getService(req);
    if (!svc) return res.status(503).json({ success: false, code: 'SEHHATY_NOT_WIRED' });
    // Reuse the service's public checkConsent then call the adapter directly.
    await svc.checkConsent(req.body.beneficiaryId, req.body.consentRecordId);
    const result = await adapter.pullVaccinationRecords({
      nationalId: req.body.nationalId,
      consentRecordId: req.body.consentRecordId,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'SEHHATY_INVALID_INPUT'
        ? 400
        : err.code?.startsWith('SEHHATY_CONSENT')
          ? 403
          : err.code === 'SEHHATY_LIVE_NOT_CONFIGURED'
            ? 503
            : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'VAX_FAILED', error: safeError(err) });
  }
});

// ── Link Tawakkalna for parent portal SSO ───────────────────────────────
router.post('/tawakkalna-link', requireMfaTier(1), async (req, res) => {
  try {
    const adapter = getAdapter(req);
    if (!adapter) return res.status(503).json({ success: false, code: 'SEHHATY_NOT_WIRED' });
    const result = await adapter.linkTawakkalna({
      nationalId: req.body.nationalId,
      guardianTawakkalnaToken: req.body.guardianTawakkalnaToken,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'SEHHATY_INVALID_INPUT'
        ? 400
        : err.code === 'SEHHATY_INVALID_TAWAKKALNA_TOKEN'
          ? 400
          : err.code === 'SEHHATY_LIVE_NOT_CONFIGURED'
            ? 503
            : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'LINK_FAILED', error: safeError(err) });
  }
});

module.exports = router;
