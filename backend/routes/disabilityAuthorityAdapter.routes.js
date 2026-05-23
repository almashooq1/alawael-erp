/**
 * disabilityAuthorityAdapter.routes.js — HTTP surface for the W281 adapter (W281b).
 *
 * Distinct from `disabilityAuthority.routes.js` (which handles the
 * existing internal `DisabilityAuthorityService` for periodic reports
 * stored locally). This file exposes the 3 ADAPTER endpoints that talk
 * to the real Authority API (or mock-mode equivalent):
 *
 *   POST /verify-card            verify disability card by number + nationalId
 *   POST /referrals/pull         pull new referrals into our inbox
 *   POST /reports/submit         submit a periodic report to the Authority
 *
 * Mounted at /api/disability-authority/adapter (under both v1 + legacy
 * via dualMount in the bootstrap).
 *
 * MFA tiers (per W273 pattern):
 *   verify-card        → tier 1 (verification only, no PII written)
 *   referrals/pull     → tier 1 (admin sweep into inbox)
 *   reports/submit     → tier 2 (legal artefact, akin to DPIA sign — represents the center to the Authority)
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function getAdapter(req) {
  return req.app._disabilityAuthorityAdapter;
}

router.use(authenticate);
router.use(attachMfaActor);

// ── Health probe ───────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const adapter = getAdapter(req);
  if (!adapter) return res.status(503).json({ success: false, code: 'DA_NOT_WIRED' });
  return res.json({ success: true, ...adapter.getConfig() });
});

// ── Verify disability card ─────────────────────────────────────────────
router.post('/verify-card', requireMfaTier(1), async (req, res) => {
  try {
    const adapter = getAdapter(req);
    if (!adapter) return res.status(503).json({ success: false, code: 'DA_NOT_WIRED' });
    const result = await adapter.verifyDisabilityCard({
      cardNumber: req.body.cardNumber,
      nationalId: req.body.nationalId,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'DA_INVALID_INPUT' ? 400 : err.code === 'DA_LIVE_NOT_CONFIGURED' ? 503 : 500;
    logger.warn('[disability-authority] verify-card error', { code: err.code });
    return res
      .status(status)
      .json({ success: false, code: err.code || 'VERIFY_FAILED', error: safeError(err) });
  }
});

// ── Pull referral inbox ────────────────────────────────────────────────
router.post('/referrals/pull', requireMfaTier(1), async (req, res) => {
  try {
    const adapter = getAdapter(req);
    if (!adapter) return res.status(503).json({ success: false, code: 'DA_NOT_WIRED' });
    const branchId = req.body.branchId || req.user?.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, code: 'DA_BRANCH_REQUIRED' });
    }
    const result = await adapter.pullReferralInbox({
      branchId,
      sinceDate: req.body.sinceDate ? new Date(req.body.sinceDate) : null,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'DA_INVALID_INPUT' ? 400 : err.code === 'DA_LIVE_NOT_CONFIGURED' ? 503 : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'PULL_FAILED', error: safeError(err) });
  }
});

// ── Submit periodic report — MFA tier 2 (legal artefact) ───────────────
router.post('/reports/submit', requireMfaTier(2), async (req, res) => {
  try {
    const adapter = getAdapter(req);
    if (!adapter) return res.status(503).json({ success: false, code: 'DA_NOT_WIRED' });
    if (!req.body.reportNumber || !req.body.period?.startDate || !req.body.period?.endDate) {
      return res.status(400).json({ success: false, code: 'DA_INVALID_INPUT' });
    }
    const result = await adapter.submitPeriodicReport({
      reportNumber: req.body.reportNumber,
      period: {
        startDate: new Date(req.body.period.startDate),
        endDate: new Date(req.body.period.endDate),
      },
      payload: req.body.payload || {},
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    const status =
      err.code === 'DA_INVALID_INPUT' ? 400 : err.code === 'DA_LIVE_NOT_CONFIGURED' ? 503 : 500;
    return res
      .status(status)
      .json({ success: false, code: err.code || 'SUBMIT_FAILED', error: safeError(err) });
  }
});

module.exports = router;
