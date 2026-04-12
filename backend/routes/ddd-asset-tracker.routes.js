'use strict';
/**
 * AssetTracker Routes
 * Auto-extracted from services/dddAssetTracker.js
 * 1 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAssetTracker');

  router.get('/asset-tracker/meta', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'asset-tracker');
    }
  });

module.exports = router;
