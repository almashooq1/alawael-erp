'use strict';
/**
 * WorkflowEngine Routes
 * Auto-extracted from services/dddWorkflowEngine.js
 * 1 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddWorkflowEngine');

  router.get('/workflow-engine/meta', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'workflow-engine');
    }
  });

module.exports = router;
