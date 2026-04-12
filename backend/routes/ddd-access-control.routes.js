'use strict';
/**
 * AccessControl Routes
 * Auto-extracted from services/dddAccessControl.js
 * 10 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { getAccessControlDashboard, evaluateAccessWithDB } = require('../services/dddAccessControl');
const { DDDAccessPolicy, DDDPermissionMatrix, DDDAccessLog } = require('../models/DddAccessControl');

  router.get('/access-control/dashboard', authenticate, async (_req, res) => {
    try {
    res.json({ success: true, ...(await getAccessControlDashboard()) });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.get('/access-control/policies', authenticate, async (req, res) => {
    try {
    const dbPolicies = await DDDAccessPolicy.find({ isDeleted: { $ne: true } })
    .sort({ priority: -1 })
    .lean();
    res.json({ success: true, builtin: BUILTIN_ABAC_POLICIES, custom: dbPolicies });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.post('/access-control/policies', authenticate, async (req, res) => {
    try {
    const policy = await DDDAccessPolicy.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, policy });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.put('/access-control/policies/:id', authenticate, async (req, res) => {
    try {
    const policy = await DDDAccessPolicy.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    }).lean();
    res.json({ success: true, policy });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.get('/access-control/matrix', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.role) query.role = req.query.role;
    if (req.query.domain) query.domain = req.query.domain;
    const matrix = await DDDPermissionMatrix.find(query).sort({ role: 1, domain: 1 }).lean();
    res.json({ success: true, count: matrix.length, matrix });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.post('/access-control/matrix', authenticate, async (req, res) => {
    try {
    const entry = await DDDPermissionMatrix.findOneAndUpdate(
    { role: req.body.role, domain: req.body.domain },
    req.body,
    { upsert: true, new: true }
    );
    res.json({ success: true, entry });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.post('/access-control/evaluate', authenticate, async (req, res) => {
    try {
    const result = await evaluateAccessWithDB({ ...req.body, dryRun: req.body.dryRun });
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.get('/access-control/logs', authenticate, async (req, res) => {
    try {
    const query = { isDeleted: { $ne: true } };
    if (req.query.decision) query.decision = req.query.decision;
    if (req.query.domain) query.domain = req.query.domain;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const logs = await DDDAccessLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, count: logs.length, logs });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.get('/access-control/roles', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

  router.get('/access-control/attributes', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'access-control');
    }
  });

module.exports = router;
