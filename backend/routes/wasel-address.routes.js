/**
 * wasel-address.routes.js — Saudi National Address (SPL / Wasel) verification.
 *
 * Mount at /api/v1/wasel/address.
 *
 * Endpoints:
 *   POST /verify-short-code   — validate a 4-letter + 4-digit short code
 *   POST /search-by-id        — list addresses registered under a national ID
 *   GET  /health              — adapter connectivity + mode
 *
 * Auth: authenticate required. All routes return the adapter's mock/live
 * status so the client can tell if it's seeing real registry data.
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency.middleware');
const wasel = require('../services/waselAdapter');
const nas = require('../services/nationalAddressService');
const safeError = require('../utils/safeError');

router.use(authenticate);

const waselIdempotency = idempotency({
  scope: req => (req.user && (req.user.tenantId || req.user.branchId || req.user.id)) || 'global',
});

const WRITE_ROLES = [
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'case_manager',
  'therapist',
  'hr',
  'receptionist',
  'parent',
  'guardian',
];

router.post('/verify-short-code', waselIdempotency, authorize(WRITE_ROLES), async (req, res) => {
  try {
    const { shortCode, nationalId } = req.body || {};
    if (!shortCode) {
      return res
        .status(400)
        .json({ success: false, code: 'MISSING_SHORT_CODE', message: 'shortCode مطلوب' });
    }
    const result = await wasel.verifyShortCode({ shortCode, nationalId });
    res.json({ success: true, ...result });
  } catch (err) {
    return safeError(res, err, 'wasel.verifyShortCode');
  }
});

router.post('/search-by-id', waselIdempotency, authorize(WRITE_ROLES), async (req, res) => {
  try {
    const { nationalId } = req.body || {};
    if (!nationalId) {
      return res
        .status(400)
        .json({ success: false, code: 'MISSING_NATIONAL_ID', message: 'nationalId مطلوب' });
    }
    const result = await wasel.searchByNationalId({ nationalId });
    res.json({ success: true, ...result });
  } catch (err) {
    return safeError(res, err, 'wasel.searchByNationalId');
  }
});

/**
 * POST /verify-and-stamp
 *
 * UI-friendly endpoint. Accepts a partial address payload, runs the
 * Wasel verification, and returns the fully-stamped subdocument in the
 * exact shape that domain models embed as `nationalAddress`. The
 * client can store the returned object verbatim on the entity it is
 * editing — no reshaping required.
 *
 * Response: { success, address, verified }
 */
router.post('/verify-and-stamp', waselIdempotency, authorize(WRITE_ROLES), async (req, res) => {
  try {
    const coerced = nas.coerceFromPayload(req.body || {});
    if (!coerced.shortCode) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_SHORT_CODE',
        message: 'shortCode مطلوب',
      });
    }
    const stamped = await nas.verifyAndStamp(coerced, {
      actorId: req.user && req.user.id,
      nationalId: req.body && (req.body.nationalId || req.body.national_id),
    });
    res.json({
      success: true,
      verified: stamped.verification.verified === true,
      address: stamped,
    });
  } catch (err) {
    return safeError(res, err, 'wasel.verifyAndStamp');
  }
});

router.get('/health', async (_req, res) => {
  try {
    const [conn, cfg] = await Promise.all([
      wasel.testConnection(),
      Promise.resolve(wasel.getConfig && wasel.getConfig()),
    ]);
    res.json({ success: true, connection: conn, config: cfg });
  } catch (err) {
    return safeError(res, err, 'wasel.health');
  }
});

module.exports = router;
