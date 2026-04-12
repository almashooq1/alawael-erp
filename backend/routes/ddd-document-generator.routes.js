'use strict';
/**
 * DocumentGenerator Routes
 * Auto-extracted from services/dddDocumentGenerator.js
 * 1 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddDocumentGenerator');

  router.get('/document-generator/meta', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'document-generator');
    }
  });

module.exports = router;
