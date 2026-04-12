'use strict';
/**
 * AppointmentEngine Routes
 * Auto-extracted from services/dddAppointmentEngine.js
 * 1 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAppointmentEngine');

  router.get('/appointment-engine/meta', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'appointment-engine');
    }
  });

module.exports = router;
