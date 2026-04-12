'use strict';
/**
 * PolicyGovernance Routes
 * Auto-extracted from services/dddPolicyGovernance.js
 * 10 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPolicyGovernance');


  // Service imported as singleton above;

  router.get('/policies', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/policies/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPolicy(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.post('/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/policies/:policyId/versions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVersions(req.params.policyId) });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/policies/:policyId/acknowledgments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAcknowledgments(req.params.policyId) });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.post('/policies/:policyId/acknowledgments', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.requestAcknowledgment({ ...req.body, policyId: req.params.policyId }),
        });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/governance/committees', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listCommittees() });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.post('/governance/committees', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCommittee(req.body) });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/policies/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPolicyAnalytics() });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });
  router.get('/policies/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'policy-governance');
    }
  });


module.exports = router;
