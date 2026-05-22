'use strict';

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
// W277f — MFA tier-2 step-up on e-signature operations.
// 21 CFR Part 11 §11.200(a)(1)(i) requires that the act of signing be
// authenticated by at least two distinct identification components, with
// the first signing of a session executed using ALL components and
// subsequent signings using at least one. requireMfaTier(2) is the
// server-side enforcement of that re-auth (the existing `reAuthConfirmed`
// body flag on /sign was advisory; this guard makes it binding).
const { attachMfaActor, requireMfaTier } = require('../middleware/requireMfaTier');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/controlledDocument.service');
const registry = require('../config/controlled-document.registry');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'INVALID_PHASE') {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === 'INCOMPLETE') {
    return res.status(422).json({ success: false, error: err.message, missing: err.missing });
  }
  if (err.code === 'VALIDATION')
    return res.status(422).json({ success: false, error: err.message });
  if (err.code === 'FORBIDDEN') return res.status(403).json({ success: false, error: err.message });
  return safeError(res, err);
}

router.get(
  '/reference',
  authenticate,
  wrap((req, res) => {
    res.json({
      success: true,
      data: {
        documentTypes: registry.DOCUMENT_TYPES,
        documentStatuses: registry.DOCUMENT_STATUSES,
        signatureMeanings: registry.SIGNATURE_MEANINGS,
        requiredSignaturesForEffective: registry.REQUIRED_SIGNATURES_FOR_EFFECTIVE,
        readAcknowledgementSlaDays: registry.READ_ACKNOWLEDGEMENT_SLA_DAYS,
      },
    });
  })
);

router.get(
  '/dashboard',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().getDashboard({ branchId: req.query.branchId });
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const items = await getService().list({
        branchId: req.query.branchId,
        type: req.query.type,
        q: req.query.q,
        limit: Number(req.query.limit) || 50,
        skip: Number(req.query.skip) || 0,
      });
      res.json({ success: true, data: items });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const doc = await getService().findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
      const integrity = getService().verifyIntegrity(doc);
      res.json({ success: true, data: doc, meta: { integrity } });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [
    body('title').isString().isLength({ min: 3, max: 200 }),
    body('type').isIn(registry.DOCUMENT_TYPES.map(t => t.code)),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().createDocument(req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/versions',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'department_head']),
  [param('id').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().draftNewVersion(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/versions/:vn/sign',
  authenticate,
  attachMfaActor,
  requireMfaTier(2),
  [
    param('id').isMongoId(),
    param('vn').isInt({ min: 1 }),
    body('meaning').isIn(registry.SIGNATURE_MEANINGS.map(m => m.code)),
    body('reAuthConfirmed').equals('true').optional(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      // Caller MUST set `reAuthConfirmed: true` after the route layer
      // re-verifies credentials. For now we simply trust the flag and
      // expect the route guard or front-end re-auth modal to provide it.
      const signer = {
        _id: req.user?._id || req.user?.id,
        name: req.user?.name || req.user?.email,
        role: req.user?.role,
        email: req.user?.email,
      };
      const payload = {
        ...req.body,
        reAuthConfirmed: req.body.reAuthConfirmed === true || req.body.reAuthConfirmed === 'true',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };
      const doc = await getService().signVersion(
        req.params.id,
        Number(req.params.vn),
        payload,
        signer
      );
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/versions/:vn/revoke-signature/:sigId',
  authenticate,
  attachMfaActor,
  authorize(['admin', 'ceo', 'quality_manager']),
  requireMfaTier(2),
  [
    param('id').isMongoId(),
    param('vn').isInt({ min: 1 }),
    param('sigId').isMongoId(),
    body('reason').isString().isLength({ min: 3 }),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().revokeSignature(
        req.params.id,
        Number(req.params.vn),
        req.params.sigId,
        req.body.reason,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/versions/:vn/transition',
  authenticate,
  attachMfaActor,
  authorize(['admin', 'ceo', 'quality_manager']),
  requireMfaTier(2),
  [
    param('id').isMongoId(),
    param('vn').isInt({ min: 1 }),
    body('to').isIn(registry.DOCUMENT_STATUSES),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().transitionVersion(
        req.params.id,
        Number(req.params.vn),
        req.body.to,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:id/versions/:vn/acknowledge',
  authenticate,
  [param('id').isMongoId(), param('vn').isInt({ min: 1 })],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().acknowledgeRead(req.params.id, Number(req.params.vn), userId);
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;
