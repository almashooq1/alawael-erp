'use strict';
/**
 * PatientCommunity Routes
 * Auto-extracted from services/dddPatientCommunity.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPatientCommunity');


  // Service imported as singleton above;

  router.get('/patient-community/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

  router.post('/patient-community/groups', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createGroup(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });
  router.get('/patient-community/groups', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listGroups(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });
  router.put('/patient-community/groups/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateGroup(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

  router.post('/patient-community/posts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPost(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });
  router.get('/patient-community/posts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listPosts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

  router.post('/patient-community/members', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addMember(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });
  router.get('/patient-community/members', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json({ success: true, data: await svc.listMembers(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

  router.post('/patient-community/moderation', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logModeration(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });
  router.get('/patient-community/moderation', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listModerationLogs(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

  router.get('/patient-community/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getCommunityStats() });
    } catch (e) {
      safeError(res, e, 'patient-community');
    }
  });

module.exports = router;
