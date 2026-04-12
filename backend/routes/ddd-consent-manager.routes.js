'use strict';
/**
 * ConsentManager Routes
 * Auto-extracted from services/dddConsentManager.js
 * 14 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const safeError = require('../utils/safeError');
const v = require('../validations/consent-manager.validation');

const {
  grantConsent,
  withdrawConsent,
  getConsentStatus,
  checkConsent,
  getConsentDashboard,
  createDSAR,
  processDSARAccess,
  processDSARErasure,
  getDSARList,
  getDSARDashboard,
  getRetentionPolicies,
  seedRetentionPolicies,
  updateRetentionPolicy,
} = require('../services/dddConsentManager');

router.post(
  '/consent/grant/:beneficiaryId',
  authenticate,
  validate(v.grantConsent),
  async (req, res) => {
    try {
      const consent = await grantConsent(req.params.beneficiaryId, {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.json({ success: true, consent });
    } catch (e) {
      safeError(res, e, 'consent-manager');
    }
  }
);

router.post(
  '/consent/withdraw/:beneficiaryId',
  authenticate,
  validate(v.withdrawConsent),
  async (req, res) => {
    try {
      const consent = await withdrawConsent(req.params.beneficiaryId, req.body.purpose, req.body);
      res.json({ success: true, consent });
    } catch (e) {
      safeError(res, e, 'consent-manager');
    }
  }
);

router.get('/consent/status/:beneficiaryId', authenticate, async (req, res) => {
  try {
    const status = await getConsentStatus(req.params.beneficiaryId);
    res.json({ success: true, consents: status });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/consent/check/:beneficiaryId/:purpose', authenticate, async (req, res) => {
  try {
    const result = await checkConsent(req.params.beneficiaryId, req.params.purpose);
    res.json({ success: true, ...result });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/consent/purposes', authenticate, async (_req, res) => {
  try {
    res.json({ success: true });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/consent/dashboard', authenticate, async (req, res) => {
  try {
    const dashboard = await getConsentDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.post('/dsar', authenticate, validate(v.createDSAR), async (req, res) => {
  try {
    const dsar = await createDSAR(req.body.beneficiaryId, req.body);
    res.json({ success: true, dsar });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.post('/dsar/:id/process-access', authenticate, async (req, res) => {
  try {
    const result = await processDSARAccess(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.post('/dsar/:id/process-erasure', authenticate, async (req, res) => {
  try {
    const result = await processDSARErasure(req.params.id);
    res.json({ success: true, dsar: result });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/dsar', authenticate, async (req, res) => {
  try {
    const list = await getDSARList({
      status: req.query.status,
      requestType: req.query.requestType,
      branchId: req.query.branchId,
      limit: parseInt(req.query.limit, 10) || 50,
    });
    res.json({ success: true, requests: list });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/dsar/dashboard', authenticate, async (req, res) => {
  try {
    const dashboard = await getDSARDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.get('/retention-policies', authenticate, async (_req, res) => {
  try {
    const policies = await getRetentionPolicies();
    res.json({ success: true, policies });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.post('/retention-policies/seed', authenticate, async (_req, res) => {
  try {
    const policies = await seedRetentionPolicies();
    res.json({ success: true, policies });
  } catch (e) {
    safeError(res, e, 'consent-manager');
  }
});

router.put(
  '/retention-policies/:domain',
  authenticate,
  validate(v.updateRetentionPolicy),
  async (req, res) => {
    try {
      const policy = await updateRetentionPolicy(req.params.domain, req.body);
      res.json({ success: true, policy });
    } catch (e) {
      safeError(res, e, 'consent-manager');
    }
  }
);

module.exports = router;
