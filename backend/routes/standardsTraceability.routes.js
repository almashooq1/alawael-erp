'use strict';

/**
 * standardsTraceability.routes.js — World-Class QMS Phase 29 Commit 5.
 *
 * Mounted at /api/standards + /api/v1/standards via dualMount.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');

const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/standardsTraceability.service');

const router = express.Router();

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};
function mapStatusError(err, res) {
  if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: err.message });
  if (err.code === 'VALIDATION')
    return res.status(422).json({ success: false, error: err.message });
  if (err.code === 'UNKNOWN_STANDARD') {
    return res.status(404).json({ success: false, error: err.message });
  }
  return safeError(res, err);
}

router.get(
  '/',
  authenticate,
  wrap((req, res) => {
    res.json({ success: true, data: getService().listStandards() });
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
  '/:standardCode/reference',
  authenticate,
  wrap((req, res) => {
    try {
      res.json({
        success: true,
        data: getService().getStandardDefinition(req.params.standardCode),
      });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.get(
  '/:standardCode/matrix',
  authenticate,
  requireBranchAccess,
  [param('standardCode').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const data = await getService().getTraceabilityMatrix(
        req.params.standardCode,
        req.query.branchId || null
      );
      res.json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:standardCode/initialise',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('standardCode').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const data = await getService().initialiseForBranch(
        req.params.standardCode,
        req.body.branchId || null,
        userId
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.put(
  '/:standardCode/clauses/:clauseCode/status',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [param('standardCode').isString(), param('clauseCode').isString(), body('status').isString()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().setStatus(
        req.params.standardCode,
        req.params.clauseCode,
        req.body.branchId || null,
        req.body,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.post(
  '/:standardCode/clauses/:clauseCode/evidence',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager', 'patient_safety_officer', 'department_head']),
  [
    param('standardCode').isString(),
    param('clauseCode').isString(),
    body('title').isString().isLength({ min: 3 }),
    body('kind').isString(),
  ],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().attachEvidence(
        req.params.standardCode,
        req.params.clauseCode,
        req.body.branchId || null,
        req.body,
        userId
      );
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

router.delete(
  '/:standardCode/clauses/:clauseCode/evidence/:linkId',
  authenticate,
  authorize(['admin', 'ceo', 'quality_manager']),
  [param('standardCode').isString(), param('clauseCode').isString(), param('linkId').isMongoId()],
  handleValidation,
  wrap(async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const doc = await getService().removeEvidence(
        req.params.standardCode,
        req.params.clauseCode,
        req.query.branchId || null,
        req.params.linkId,
        userId
      );
      res.json({ success: true, data: doc });
    } catch (err) {
      mapStatusError(err, res);
    }
  })
);

module.exports = router;
