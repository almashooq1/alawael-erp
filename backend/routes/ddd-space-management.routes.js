'use strict';
/**
 * SpaceManagement Routes
 * Auto-extracted from services/dddSpaceManagement.js
 * 11 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSpaceManagement');


  // Service imported as singleton above;

  router.get('/space-management/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.post('/space-management/spaces', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSpace(req.body) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.get('/space-management/spaces', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listSpaces(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.put('/space-management/spaces/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSpace(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.post('/space-management/bookings', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBooking(req.body) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.get('/space-management/bookings', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listBookings(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.post('/space-management/utilization', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordUtilization(req.body) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.get('/space-management/utilization', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 30, ...f } = req.query;
      res.json({ success: true, data: await svc.listUtilization(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.post('/space-management/maintenance-requests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createMaintenanceReq(req.body) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.get('/space-management/maintenance-requests', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listMaintenanceReqs(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });
  router.get('/space-management/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSpaceStats() });
    } catch (e) {
      safeError(res, e, 'space-management');
    }
  });

module.exports = router;
