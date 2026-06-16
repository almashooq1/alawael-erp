'use strict';

/**
 * launch-readiness.routes.js — W1375.
 *
 * Read-only HTTP surface over services/launchReadiness.service.js so the
 * web-admin /launch-readiness page can show the operator the same GO / NOT-YET
 * verdict the `npm run launch:readiness` CLI produces — without shelling out.
 *
 *   GET / → { go, generatedAt, summary, checks }
 *
 * READ-ONLY (the evaluator only counts + reads env). Admin-scoped: launch
 * readiness is a system/ops view. Mounted via features.registry dualMountAuth
 * at /api(/v1)/launch-readiness.
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { evaluateLaunchReadiness } = require('../services/launchReadiness.service');

const router = express.Router();

const ADMIN_ROLES = ['admin', 'superadmin', 'super_admin', 'manager'];

router.use(authenticateToken);

// ── GET / — launch-readiness verdict (read-only) ─────────────────────────────
router.get('/', requireRole(ADMIN_ROLES), async (_req, res) => {
  try {
    const db = mongoose.connection && mongoose.connection.db;
    if (!db) return res.status(503).json({ success: false, message: 'قاعدة البيانات غير متاحة' });
    const data = await evaluateLaunchReadiness({ db, env: process.env });
    return res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'launch-readiness');
  }
});

module.exports = router;
