'use strict';

/**
 * care/community.routes.js — Phase 17 Commit 4 (4.0.86).
 *
 * Mounted at /api/care/community (and /api/v1/care/community).
 *
 * Exposes two coupled surfaces:
 *
 *   /partners               → directory CRUD
 *   /linkages               → per-beneficiary linkage lifecycle
 *   /beneficiary/:id/linkages
 *   /partner/:id/linkages
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const registry = require('../../config/care/community.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

function mapError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'ILLEGAL_TRANSITION') {
    return res.status(409).json({
      success: false,
      error: err.message,
      from: err.from,
      to: err.to,
      status: err.status,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({ success: false, error: err.message, fields: err.fields });
  }
  if (err.code === 'CONFLICT') return res.status(409).json({ success: false, error: err.message });
  return safeError(res, err);
}

function getService() {
  return require('../../startup/careBootstrap')._getCommunityService?.() || _fallback();
}

let _fb = null;
function _fallback() {
  if (_fb) return _fb;
  const { createCommunityService } = require('../../services/care/community.service');
  _fb = createCommunityService({
    partnerModel: require('../../models/care/CommunityPartner.model'),
    linkageModel: require('../../models/care/CommunityLinkage.model'),
  });
  return _fb;
}

// ── reference ──────────────────────────────────────────────────────

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        partnerCategories: registry.PARTNER_CATEGORIES,
        partnerStatuses: registry.PARTNER_STATUSES,
        linkageTypes: registry.LINKAGE_TYPES,
        linkageStatuses: registry.LINKAGE_STATUSES,
        linkagePurposes: registry.LINKAGE_PURPOSES,
      },
    });
  })
);

// ── Partner directory ─────────────────────────────────────────────

router.get(
  '/partners',
  authenticate,
  [
    query('category').optional().isIn(registry.PARTNER_CATEGORIES),
    query('status').optional().isIn(registry.PARTNER_STATUSES),
    query('branchId').optional().isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listPartners({
        category: req.query.category,
        status: req.query.status,
        branchId: req.query.branchId,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/partners/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findPartnerById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Partner not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/partners',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [body('name').isString().notEmpty(), body('category').isIn(registry.PARTNER_CATEGORIES)],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createPartner(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/partners/:id',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updatePartner(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/partners/:id/deactivate',
  authenticate,
  authorize(['admin', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().deactivatePartner(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/partners/:id/contacts',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('name').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().addPartnerContact(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/partners/:id/linkages',
  authenticate,
  [param('id').isMongoId(), query('includeEnded').optional().isBoolean().toBoolean()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().partnerLinkages(req.params.id, {
        includeEnded: req.query.includeEnded === true,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── Linkages ───────────────────────────────────────────────────────

router.get(
  '/linkages',
  authenticate,
  [
    query('beneficiaryId').optional().isMongoId(),
    query('partnerId').optional().isMongoId(),
    query('caseId').optional().isMongoId(),
    query('status').optional().isIn(registry.LINKAGE_STATUSES),
    query('linkageType').optional().isIn(registry.LINKAGE_TYPES),
    query('primaryPurpose').optional().isIn(registry.LINKAGE_PURPOSES),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().listLinkages({
        beneficiaryId: req.query.beneficiaryId,
        partnerId: req.query.partnerId,
        caseId: req.query.caseId,
        status: req.query.status,
        linkageType: req.query.linkageType,
        primaryPurpose: req.query.primaryPurpose,
        limit: req.query.limit ? Number(req.query.limit) : 100,
        skip: req.query.skip ? Number(req.query.skip) : 0,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.get(
  '/linkages/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findLinkageById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Linkage not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [
    body('beneficiaryId').isMongoId(),
    body('partnerId').isMongoId(),
    body('linkageType').isIn(registry.LINKAGE_TYPES),
    body('primaryPurpose').isIn(registry.LINKAGE_PURPOSES),
    body('startDate').isISO8601(),
    body('caseId').optional().isMongoId(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().createLinkage(req.body, {
        actorId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.patch(
  '/linkages/:id',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().updateLinkage(req.params.id, req.body, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages/:id/contact',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().recordContact(req.params.id, {
        notes: req.body?.notes,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages/:id/pause',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().pauseLinkage(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages/:id/resume',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().resumeLinkage(req.params.id, {
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages/:id/end',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId(), body('endedReason').isString().notEmpty()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().endLinkage(req.params.id, {
        endedReason: req.body.endedReason,
        outcomeNotes: req.body.outcomeNotes,
        endDate: req.body.endDate,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

router.post(
  '/linkages/:id/cancel',
  authenticate,
  authorize(['admin', 'social_worker', 'social_supervisor', 'social_manager']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().cancelLinkage(req.params.id, {
        reason: req.body?.reason,
        actorId: req.user?._id,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      mapError(err, res);
    }
  })
);

// ── beneficiary view ──────────────────────────────────────────────

router.get(
  '/beneficiary/:beneficiaryId/linkages',
  authenticate,
  [param('beneficiaryId').isMongoId(), query('includeEnded').optional().isBoolean().toBoolean()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const rows = await getService().beneficiaryLinkages(req.params.beneficiaryId, {
        includeEnded: req.query.includeEnded === true,
      });
      res.json({ success: true, data: rows });
    } catch (err) {
      mapError(err, res);
    }
  })
);

module.exports = router;
