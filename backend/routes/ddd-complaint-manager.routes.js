'use strict';
/**
 * ComplaintManager Routes
 * Auto-extracted from services/dddComplaintManager.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddComplaintManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/complaint-manager.validation');

  router.get('/complaint-manager/complaints', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listComplaints(req.query) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.get('/complaint-manager/complaints/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplaint(req.params.id) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.post('/complaint-manager/complaints', authenticate, validate(v.createComplaint), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.fileComplaint(req.body) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.put('/complaint-manager/complaints/:id', authenticate, validate(v.updateComplaint), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateComplaint(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.get('/complaint-manager/resolutions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listResolutions(req.query) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.post('/complaint-manager/resolutions', authenticate, validate(v.createResolution), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createResolution(req.body) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.put('/complaint-manager/resolutions/:id', authenticate, validate(v.updateResolution), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateResolution(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.get('/complaint-manager/escalations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEscalations(req.query) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.post('/complaint-manager/escalations', authenticate, validate(v.createEscalation), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.escalate(req.body) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.put('/complaint-manager/escalations/:id/resolve', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveEscalation(req.params.id, req.body.outcome) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.get('/complaint-manager/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplaintAnalytics(req.query) });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

  router.get('/complaint-manager/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'complaint-manager');
    }
  });

module.exports = router;
