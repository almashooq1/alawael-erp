'use strict';
/**
 * OutreachTracker Routes
 * Auto-extracted from services/dddOutreachTracker.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddOutreachTracker');


  // Service imported as singleton above;

  router.get('/outreach/campaigns', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCampaigns(req.query) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/campaigns/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCampaign(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.post('/outreach/campaigns', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCampaign(req.body) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/contacts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listContacts(req.query) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.post('/outreach/contacts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addContact(req.body) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/events', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.query.campaignId) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.post('/outreach/events', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createEvent(req.body) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/reports', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReports(req.query.campaignId) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.post('/outreach/reports', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.generateReport(req.body) });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOutreachAnalytics() });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });
  router.get('/outreach/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'outreach-tracker');
    }
  });


module.exports = router;
