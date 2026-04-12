'use strict';
/**
 * RegulatoryTracker Routes
 * Auto-extracted from services/dddRegulatoryTracker.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddRegulatoryTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/regulatory-tracker.validation');


  // Service imported as singleton above;

  router.get('/regulatory/requirements', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequirements(req.query) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/requirements/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequirement(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.post('/regulatory/requirements', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequirement(req.body) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/audits', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAudits(req.query) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.post('/regulatory/audits', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleAudit(req.body) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/certifications', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCertifications(req.query) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.post('/regulatory/certifications', authenticate, validate(v.createCertification), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addCertification(req.body) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/changes', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listChanges(req.query) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.post('/regulatory/changes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.trackChange(req.body) });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRegulatoryAnalytics() });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });
  router.get('/regulatory/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'regulatory-tracker');
    }
  });


module.exports = router;
