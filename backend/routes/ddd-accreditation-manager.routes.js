'use strict';
/**
 * AccreditationManager Routes
 * Auto-extracted from services/dddAccreditationManager.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAccreditationManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/accreditation-manager.validation');


  // Service imported as singleton above;

  router.get('/accreditation-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

  router.post('/accreditation-manager/cycles', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCycle(req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/cycles', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCycles(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/cycles/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getCycleById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.put('/accreditation-manager/cycles/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCycle(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

  router.post('/accreditation-manager/self-assessments', authenticate, validate(v.createSelfAssessment), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSelfAssessment(req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/self-assessments', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listSelfAssessments(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

  router.post('/accreditation-manager/findings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFinding(req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/findings', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listFindings(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

  router.post('/accreditation-manager/corrective-actions', authenticate, validate(v.createCorrectiveAction), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCorrectiveAction(req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/corrective-actions', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCorrectiveActions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.put('/accreditation-manager/corrective-actions/:id', authenticate, validate(v.updateCorrectiveAction), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCorrectiveAction(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

  router.get('/accreditation-manager/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getAccreditationSummary() });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });
  router.get('/accreditation-manager/overdue', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOverdueActions() });
    } catch (e) {
      safeError(res, e, 'accreditation-manager');
    }
  });

module.exports = router;
