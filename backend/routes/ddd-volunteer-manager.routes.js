'use strict';
/**
 * VolunteerManager Routes
 * Auto-extracted from services/dddVolunteerManager.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddVolunteerManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/volunteer-manager.validation');


  // Service imported as singleton above;

  router.get('/volunteers', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVolunteers(req.query) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getVolunteer(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.post('/volunteers', authenticate, validate(v.createVolunteer), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerVolunteer(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/shifts/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listShifts(req.query) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.post('/volunteers/shifts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleShift(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/:id/skills', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSkills(req.params.id) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.post('/volunteers/skills', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addSkill(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/recognitions/list', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRecognitions(req.query.volunteerId) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.post('/volunteers/recognitions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.grantRecognition(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getVolunteerAnalytics() });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });
  router.get('/volunteers/health/check', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'volunteer-manager');
    }
  });


module.exports = router;
