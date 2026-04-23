'use strict';

/**
 * evidence.routes.js — Phase 13 Commit 2 (4.0.56).
 *
 * HTTP surface for the compliance-evidence vault.
 *
 * Mounted by `_registry.js` at `/api/evidence` and `/api/v1/evidence`.
 *
 * This commit deliberately does NOT wire multipart upload — raw
 * binary bodies go through the existing `/api/v1/documents`
 * uploader (which already has size limits + MIME sniffing) and the
 * caller passes the resulting storage key + sha256. A follow-up
 * commit can add a direct `/upload` endpoint if needed.
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/evidenceVault.service');
const registry = require('../config/evidence.registry');

const router = express.Router();

// ── helpers ────────────────────────────────────────────────────────

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'BAD_HASH' || err.code === 'NO_HASH') {
    return res.status(422).json({ success: false, error: err.message });
  }
  return safeError(res, err);
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        types: registry.EVIDENCE_TYPES,
        statuses: registry.EVIDENCE_STATUSES,
        sourceModules: registry.SOURCE_MODULES,
        storageClasses: registry.STORAGE_CLASSES,
        hashAlgorithms: registry.HASH_ALGORITHMS,
        retentionPolicies: Object.entries(registry.RETENTION_POLICIES).map(([key, pol]) => ({
          key,
          years: pol.years,
          reason: pol.reason,
        })),
        expiryWarningDays: registry.EXPIRY_WARNING_DAYS,
      },
    });
  })
);

// ── stats ──────────────────────────────────────────────────────────

router.get(
  '/stats',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getStats({ branchId: req.query.branchId });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/expiring',
  authenticate,
  requireBranchAccess,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const days = req.query.days ? Number(req.query.days) : undefined;
      const data = await getService().findExpiring(days);
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── list / get ─────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  [
    query('type').optional().isIn(registry.EVIDENCE_TYPES),
    query('status').optional().isIn(registry.EVIDENCE_STATUSES),
    query('sourceModule').optional().isIn(registry.SOURCE_MODULES),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().list({
        branchId: req.query.branchId,
        type: req.query.type,
        status: req.query.status,
        sourceModule: req.query.sourceModule,
        standard: req.query.standard,
        tag: req.query.tag,
        limit: req.query.limit,
        skip: req.query.skip,
      });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/by-control/:controlId',
  authenticate,
  requireBranchAccess,
  [param('controlId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().findByControl(req.params.controlId);
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/by-regulation/:standard',
  authenticate,
  requireBranchAccess,
  [param('standard').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().findByRegulation(req.params.standard, req.query.clause);
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:id',
  authenticate,
  requireBranchAccess,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'not found' });
      res.json({
        success: true,
        data: { ...doc.toJSON(), effectiveStatus: getService().effectiveStatus(doc) },
      });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── ingest ─────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [
    body('title').isString().trim().notEmpty(),
    body('type').isIn(registry.EVIDENCE_TYPES),
    body('sourceModule').isIn(registry.SOURCE_MODULES),
    body('controlIds').optional().isArray(),
    body('regulationRefs').optional().isArray(),
    body('validFrom').optional().isISO8601(),
    body('validUntil').optional().isISO8601(),
    body('retentionPolicy').optional().isString(),
    body('branchId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().ingest(req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── verify (accepts optional base64 body for re-hashing) ───────────

router.post(
  '/:id/verify',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer', 'auditor'),
  [param('id').isMongoId(), body('contentBase64').optional().isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const buf = req.body.contentBase64 ? Buffer.from(req.body.contentBase64, 'base64') : null;
      const result = await getService().verify(req.params.id, buf);
      res.json({ success: true, data: result });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── supersede ──────────────────────────────────────────────────────

router.post(
  '/:id/supersede',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [
    param('id').isMongoId(),
    body('title').isString().trim().notEmpty(),
    body('type').optional().isIn(registry.EVIDENCE_TYPES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const { old, new: newDoc } = await getService().supersede(
        req.params.id,
        req.body,
        req.user._id
      );
      res.status(201).json({ success: true, data: { old, new: newDoc } });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── revoke ─────────────────────────────────────────────────────────

router.post(
  '/:id/revoke',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'quality_manager', 'compliance_officer'),
  [param('id').isMongoId(), body('reason').isString().trim().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().revoke(req.params.id, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── sign ───────────────────────────────────────────────────────────

router.post(
  '/:id/sign',
  authenticate,
  requireBranchAccess,
  [
    param('id').isMongoId(),
    body('role').isString().notEmpty(),
    body('signatureHash').optional().isString(),
    body('intent').optional().isIn(['approval', 'witness', 'review']),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().sign(req.params.id, req.body, req.user._id);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

// ── legal hold ─────────────────────────────────────────────────────

router.post(
  '/:id/legal-hold',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer', 'legal'),
  [param('id').isMongoId(), body('reason').optional().isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().setLegalHold(req.params.id, req.body.reason, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.delete(
  '/:id/legal-hold',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'compliance_officer', 'legal'),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().clearLegalHold(req.params.id, req.user._id);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;
