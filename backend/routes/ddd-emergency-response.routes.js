'use strict';
/**
 * EmergencyResponse Routes
 * Auto-extracted from services/dddEmergencyResponse.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddEmergencyResponse');


  // Service imported as singleton above;

  /* Plans */
  router.get('/emergency/plans', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPlans(req.query) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.get('/emergency/plans/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPlan(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/plans', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPlan(req.body) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });

  /* Events */
  router.get('/emergency/events', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.query) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/events/activate', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.activateEmergency(req.body) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/events/:id/deactivate', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.deactivateEmergency(req.params.id, req.body.userId),
      });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });

  /* Teams */
  router.get('/emergency/teams', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.listTeams() });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/teams', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTeam(req.body) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });

  /* Drills */
  router.get('/emergency/drills', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrills(req.query) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/drills', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleDrill(req.body) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.post('/emergency/drills/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeDrill(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });

  /* Analytics & Health */
  router.get('/emergency/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEmergencyAnalytics() });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });
  router.get('/emergency/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'emergency-response');
    }
  });


module.exports = router;
