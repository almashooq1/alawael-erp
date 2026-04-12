'use strict';
/**
 * ContractManager Routes
 * Auto-extracted from services/dddContractManager.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddContractManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/contract-manager.validation');


  // Service imported as singleton above;

  router.get('/contracts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listContracts(req.query) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getContract(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.post('/contracts', authenticate, validate(v.createContract), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createContract(req.body) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.put('/contracts/:id', authenticate, validate(v.updateContract), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateContract(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/templates/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.post('/contracts/templates', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/:contractId/amendments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAmendments(req.params.contractId) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.post('/contracts/:contractId/amendments', authenticate, async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.createAmendment({ ...req.body, contractId: req.params.contractId }),
        });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/obligations/all', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listObligations(req.query.contractId) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.post('/contracts/obligations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createObligation(req.body) });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getContractAnalytics() });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });
  router.get('/contracts/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'contract-manager');
    }
  });


module.exports = router;
