/**
 * yakeen-verification.routes.js — HTTP surface for Yakeen civil-registry
 * identity verification. Mount at /api/v1/yakeen/verify.
 *
 * Protected by authenticate. POST /verify is idempotent so UI retries
 * don't charge us for duplicate Yakeen lookups.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

const { authenticate, authorize } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency.middleware');
const safeError = require('../utils/safeError');
const { defaultService } = require('../services/yakeenVerificationService');

const router = express.Router();

router.use(authenticate);

const verifyIdempotency = idempotency({
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
];

// POST /verify — verify nationalId [+ optional name + optional Hijri DOB]
router.post('/verify', verifyIdempotency, authorize(WRITE_ROLES), async (req, res) => {
  try {
    const {
      nationalId,
      firstName_ar,
      dateOfBirthHijri,
      context,
      contextEntityType,
      contextEntityId,
      forceRefresh,
    } = req.body || {};
    const out = await defaultService.verify({
      nationalId,
      firstName_ar,
      dateOfBirthHijri,
      context,
      contextEntityType,
      contextEntityId,
      forceRefresh: !!forceRefresh,
      requestedBy: req.user?.id || req.user?._id,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });
    res.json({ success: true, ...out });
  } catch (err) {
    if (err.code === 'INVALID_ID') {
      return res.status(400).json({ success: false, code: err.code, message: err.message });
    }
    return safeError(res, err, 'yakeen.verify');
  }
});

// GET /history/:nationalId — last N verifications (admin/compliance only)
router.get(
  '/history/:nationalId',
  authorize(['admin', 'super_admin', 'superadmin', 'auditor', 'compliance']),
  async (req, res) => {
    try {
      const rows = await defaultService.getHistory({
        nationalId: req.params.nationalId,
        limit: Math.min(100, parseInt(req.query.limit, 10) || 20),
      });
      res.json({ success: true, items: rows });
    } catch (err) {
      return safeError(res, err, 'yakeen.history');
    }
  }
);

// GET /by-entity/:type/:id — fetch the latest verification tied to a domain entity
router.get('/by-entity/:type/:id', async (req, res) => {
  try {
    if (
      req.params.id &&
      !mongoose.isValidObjectId(req.params.id) &&
      typeof req.params.id !== 'string'
    ) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const row = await defaultService.getByContextEntity({
      contextEntityType: req.params.type,
      contextEntityId: req.params.id,
    });
    if (!row) return res.status(404).json({ success: false, message: 'لا يوجد تحقق' });
    res.json({ success: true, item: row });
  } catch (err) {
    return safeError(res, err, 'yakeen.byEntity');
  }
});

module.exports = router;
