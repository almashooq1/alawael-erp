'use strict';
/**
 * AdvocacyProgram Routes
 * Auto-extracted from services/dddAdvocacyProgram.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddAdvocacyProgram');


  // Service imported as singleton above;

  router.get('/advocacy-program/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.post('/advocacy-program/campaigns', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCampaign(req.body) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.get('/advocacy-program/campaigns', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listCampaigns(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.put('/advocacy-program/campaigns/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCampaign(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.post('/advocacy-program/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.get('/advocacy-program/policies', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPolicies(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.post('/advocacy-program/training', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleTraining(req.body) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.get('/advocacy-program/training', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listTraining(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.post('/advocacy-program/engagements', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logEngagement(req.body) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.get('/advocacy-program/engagements', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listEngagements(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });
  router.get('/advocacy-program/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getAdvocacyStats() });
    } catch (e) {
      safeError(res, e, 'advocacy-program');
    }
  });

module.exports = router;
