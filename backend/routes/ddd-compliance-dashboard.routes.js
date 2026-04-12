'use strict';
/**
 * ComplianceDashboard Routes
 * Auto-extracted from services/dddComplianceDashboard.js
 * 6 endpoints — Auth required on all
 */

const { Router } = require('express');
const router = Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

const { assessBeneficiaryCompliance, assessBranchCompliance, getLatestCompliance, getComplianceHistory, getComplianceDashboard } = require('../services/dddComplianceDashboard');

  router.post('/compliance/assess/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const result = await assessBeneficiaryCompliance(req.params.beneficiaryId, {
    framework: req.body.framework,
    assessedBy: 'user_request',
    });
    res.json({ success: true, assessment: result });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

  router.post('/compliance/assess-branch/:branchId', authenticate, async (req, res) => {
    try {
    const result = await assessBranchCompliance(req.params.branchId);
    res.json({ success: true, ...result });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

  router.get('/compliance/latest/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const assessment = await getLatestCompliance(req.params.beneficiaryId);
    res.json({ success: true, assessment });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

  router.get('/compliance/history/:beneficiaryId', authenticate, async (req, res) => {
    try {
    const history = await getComplianceHistory(
    req.params.beneficiaryId,
    parseInt(req.query.limit, 10) || 10
    );
    res.json({ success: true, history });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

  router.get('/compliance/dashboard', authenticate, async (req, res) => {
    try {
    const dashboard = await getComplianceDashboard(req.query.branchId);
    res.json({ success: true, dashboard });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

  router.get('/compliance/rules', authenticate, async (_req, res) => {
    try {
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'compliance-dashboard');
    }
  });

module.exports = router;
