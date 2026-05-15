'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { getDefault: getService } = require('../services/quality/commandCenter.service');

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  '/',
  authenticate,
  requireBranchAccess,
  wrap(async (req, res) => {
    try {
      const data = await getService().build({ branchId: req.query.branchId || null });
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err);
    }
  })
);

module.exports = router;
