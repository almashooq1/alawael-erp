/**
 * nafath-signing.routes.js — HTTP surface for the Nafath e-signature flow.
 *
 * Mount at /api/v1/nafath/signing.
 *
 * Endpoints (all require authenticate; specific roles per route):
 *   POST   /request              — initiate a signature (idempotent)
 *   GET    /:id/status           — poll + transition state
 *   POST   /:id/cancel           — user-initiated cancel
 *   GET    /:id/verify           — re-verify the stored JWS
 *   GET    /:id/evidence         — download auditor-ready evidence package
 *
 * The `request` endpoint is protected by the unified idempotency middleware
 * so a browser retry doesn't send two Nafath pushes to the signer's phone.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');

const { authenticate, authorize } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency.middleware');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');
const { defaultService } = require('../services/nafathSigningService');

const router = express.Router();

router.use(authenticate);

const signingIdempotency = idempotency({
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
  'finance',
  'parent',
  'guardian',
];

// ── POST /request ────────────────────────────────────────────────────────
router.post('/request', signingIdempotency, authorize(WRITE_ROLES), async (req, res) => {
  try {
    const {
      documentType,
      documentId,
      documentHash,
      purpose,
      signerNationalId,
      signerRole,
      signerUserId,
    } = req.body || {};

    const result = await defaultService.requestSignature({
      documentType,
      documentId,
      documentHash,
      purpose,
      signerNationalId,
      signerRole,
      signerUserId,
      initiatedBy: req.user?.id || req.user?._id,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });

    logger.info('[nafath-signing] requested', {
      requestId: result.requestId,
      mode: result.mode,
      documentType: result.documentType,
      reused: result.reused,
    });

    res.status(result.reused ? 200 : 201).json({ success: true, ...result });
  } catch (err) {
    if (
      err.code === 'INVALID_INPUT' ||
      err.code === 'INVALID_ID' ||
      err.code === 'INVALID_DOCUMENT_HASH'
    ) {
      return res.status(400).json({ success: false, code: err.code, message: err.message });
    }
    if (err.code === 'NAFATH_UNCONFIGURED') {
      return res.status(503).json({ success: false, code: err.code, message: err.message });
    }
    return safeError(res, err, 'nafath-signing.request');
  }
});

// ── GET /:id/status ──────────────────────────────────────────────────────
router.get('/:id/status', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const result = await defaultService.pollSignature(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.code === 'NAFATH_JWS_INVALID') {
      return res.status(502).json({ success: false, code: err.code, message: err.message });
    }
    return safeError(res, err, 'nafath-signing.status');
  }
});

// ── POST /:id/cancel ─────────────────────────────────────────────────────
router.post('/:id/cancel', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const result = await defaultService.cancelSignature(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: err.message });
    }
    return safeError(res, err, 'nafath-signing.cancel');
  }
});

// ── GET /:id/verify ──────────────────────────────────────────────────────
router.get('/:id/verify', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const result = await defaultService.verifySignature(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: err.message });
    }
    return safeError(res, err, 'nafath-signing.verify');
  }
});

// ── GET /:id/evidence ────────────────────────────────────────────────────
router.get(
  '/:id/evidence',
  authorize(['admin', 'super_admin', 'superadmin', 'manager', 'auditor']),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
      }
      const evidence = await defaultService.buildEvidencePackage(req.params.id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nafath-evidence-${req.params.id}.json"`
      );
      res.send(JSON.stringify(evidence, null, 2));
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: err.message });
      }
      return safeError(res, err, 'nafath-signing.evidence');
    }
  }
);

module.exports = router;
