'use strict';
/**
 * MentorshipProgram Routes
 * Auto-extracted from services/dddMentorshipProgram.js
 * 12 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddMentorshipProgram');


  // Service imported as singleton above;

  router.get('/mentorship-program/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

  /* Pairs */
  router.post('/mentorship-program/pairs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPair(req.body) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.get('/mentorship-program/pairs', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listPairs(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.get('/mentorship-program/pairs/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getPairById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.put('/mentorship-program/pairs/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePair(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

  /* Meetings */
  router.post('/mentorship-program/meetings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMeeting(req.body) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.get('/mentorship-program/meetings', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listMeetings(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

  /* Feedback */
  router.post('/mentorship-program/feedback', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFeedback(req.body) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.get('/mentorship-program/feedback', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...filter } = req.query;
      res.json({ success: true, data: await svc.listFeedback(filter, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

  /* Programs */
  router.post('/mentorship-program/programs', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createProgram(req.body) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });
  router.get('/mentorship-program/programs', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPrograms(req.query) });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

  /* Analytics */
  router.get('/mentorship-program/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getProgramStats() });
    } catch (e) {
      safeError(res, e, 'mentorship-program');
    }
  });

module.exports = router;
