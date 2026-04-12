'use strict';
/**
 * VolunteerManagement Routes
 * Auto-extracted from services/dddVolunteerManagement.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddVolunteerManagement');


  // Service imported as singleton above;

  router.get('/volunteer-management/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.post('/volunteer-management/volunteers', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createVolunteer(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.get('/volunteer-management/volunteers', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listVolunteers(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.put('/volunteer-management/volunteers/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateVolunteer(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.post('/volunteer-management/shifts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createShift(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.get('/volunteer-management/shifts', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listShifts(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.post('/volunteer-management/training', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.assignTraining(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.get('/volunteer-management/training', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listTraining(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.post('/volunteer-management/recognitions', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.giveRecognition(req.body) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.get('/volunteer-management/recognitions', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listRecognitions(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });
  router.get('/volunteer-management/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getVolunteerStats() });
    } catch (e) {
      safeError(res, e, 'volunteer-management');
    }
  });

module.exports = router;
