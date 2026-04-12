'use strict';
/**
 * CommunityOutreach Routes
 * Auto-extracted from services/dddCommunityOutreach.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCommunityOutreach');
const { validate } = require('../middleware/validate');
const v = require('../validations/community-outreach.validation');


  // Service imported as singleton above;

  router.get('/community-outreach/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.post('/community-outreach/programs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProgram(req.body) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.get('/community-outreach/programs', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPrograms(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.put('/community-outreach/programs/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateProgram(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.post('/community-outreach/partners', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPartner(req.body) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.get('/community-outreach/partners', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPartners(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.post('/community-outreach/events', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.get('/community-outreach/events', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEvents(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.post('/community-outreach/impact-reports', authenticate, validate(v.createImpactReport), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createImpactReport(req.body) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.get('/community-outreach/impact-reports', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listImpactReports(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });
  router.get('/community-outreach/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOutreachStats() });
    } catch (e) {
      safeError(res, e, 'community-outreach');
    }
  });

module.exports = router;
