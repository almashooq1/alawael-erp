'use strict';
/**
 * InsuranceManager Routes
 * Auto-extracted from services/dddInsuranceManager.js
 * 22 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/insurance-manager.validation');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddInsuranceManager');

// Service imported as singleton above;

/* ── Providers ── */
router.get('/insurance/providers', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listProviders(req.query) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.get('/insurance/providers/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getProvider(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.post('/insurance/providers', authenticate, validate(v.createProvider), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createProvider(req.body) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.put(
  '/insurance/providers/:id',
  authenticate,
  validate(v.updateProvider),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProvider(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);

/* ── Policies ── */
router.get('/insurance/policies', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listPolicies(req.query) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.get('/insurance/policies/expiring', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: await svc.getExpiringPolicies(Number(req.query.days) || 30),
    });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.get('/insurance/policies/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getPolicy(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.post('/insurance/policies', authenticate, validate(v.createPolicy), async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.put('/insurance/policies/:id', authenticate, validate(v.updatePolicy), async (req, res) => {
  try {
    res.json({ success: true, data: await svc.updatePolicy(req.params.id, req.body) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.post(
  '/insurance/policies/:id/verify',
  authenticate,
  validate(v.verifyPolicy),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.verifyPolicy(req.params.id, req.body.userId, req.body.notes),
      });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);
router.post(
  '/insurance/policies/:id/check-coverage',
  authenticate,
  validate(v.checkCoverage),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.checkCoverage(req.params.id, req.body.category) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);

/* ── Pre-Authorizations ── */
router.get('/insurance/pre-authorizations', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listPreAuths(req.query) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.get('/insurance/pre-authorizations/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getPreAuth(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.post(
  '/insurance/pre-authorizations',
  authenticate,
  validate(v.createPreAuth),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPreAuth(req.body) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);
router.post(
  '/insurance/pre-authorizations/:id/submit',
  authenticate,
  validate(v.submitPreAuth),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitPreAuth(req.params.id, req.body.userId) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);
router.post(
  '/insurance/pre-authorizations/:id/approve',
  authenticate,
  validate(v.approvePreAuth),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approvePreAuth(req.params.id, req.body.reviewer, req.body.approvals),
      });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);
router.post(
  '/insurance/pre-authorizations/:id/deny',
  authenticate,
  validate(v.denyPreAuth),
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.denyPreAuth(req.params.id, req.body.reviewer, req.body.reason),
      });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);

/* ── Coverage Rules ── */
router.get('/insurance/coverage-rules', authenticate, async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listCoverageRules(req.query) });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.get('/insurance/coverage-rules/:id', authenticate, async (req, res) => {
  try {
    const d = await svc.getCoverageRule(req.params.id);
    d
      ? res.json({ success: true, data: d })
      : res.status(404).json({ success: false, error: 'Not found' });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});
router.post(
  '/insurance/coverage-rules',
  authenticate,
  validate(v.createCoverageRule),
  async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCoverageRule(req.body) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);
router.put(
  '/insurance/coverage-rules/:id',
  authenticate,
  validate(v.updateCoverageRule),
  async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCoverageRule(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'insurance-manager');
    }
  }
);

/* ── Health ── */
router.get('/insurance/health', authenticate, async (_req, res) => {
  try {
    res.json({ success: true, data: await svc.healthCheck() });
  } catch (e) {
    safeError(res, e, 'insurance-manager');
  }
});

module.exports = router;
