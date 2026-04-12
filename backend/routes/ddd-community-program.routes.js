'use strict';
/**
 * CommunityProgram Routes
 * Auto-extracted from services/dddCommunityProgram.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddCommunityProgram');
const { validate } = require('../middleware/validate');
const v = require('../validations/community-program.validation');


  // Service imported as singleton above;

  router.get('/community/programs', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPrograms(req.query) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/programs/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getProgram(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.post('/community/programs', authenticate, validate(v.createProgram), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProgram(req.body) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/enrollments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEnrollments(req.query) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.post('/community/enrollments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollParticipant(req.body) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/activities', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listActivities(req.query.programId) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.post('/community/activities', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createActivity(req.body) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/outcomes', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listOutcomes(req.query.programId) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.post('/community/outcomes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordOutcome(req.body) });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getProgramAnalytics() });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });
  router.get('/community/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'community-program');
    }
  });


module.exports = router;
