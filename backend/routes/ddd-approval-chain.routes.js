'use strict';
/**
 * ApprovalChain Routes
 * Auto-extracted from services/dddApprovalChain.js
 * 1 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddApprovalChain');

  router.get('/approval-chain/meta', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'approval-chain');
    }
  });

module.exports = router;
