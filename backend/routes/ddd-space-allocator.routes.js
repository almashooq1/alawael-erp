'use strict';
/**
 * SpaceAllocator Routes
 * Auto-extracted from services/dddSpaceAllocator.js
 * 19 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddSpaceAllocator');


  // Service imported as singleton above;

  /* Reservations */
  router.get('/spaces/reservations', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReservations(req.query) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.get('/spaces/reservations/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getReservation(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/reservations', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReservation(req.body) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/reservations/:id/confirm', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.confirmReservation(req.params.id) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/reservations/:id/cancel', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelReservation(req.params.id) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/reservations/:id/check-in', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.checkIn(req.params.id) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/reservations/:id/check-out', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.checkOut(req.params.id, req.body.actualAttendees),
      });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });

  /* Schedules */
  router.get('/spaces/schedules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSchedules(req.query) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/schedules', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSchedule(req.body) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.put('/spaces/schedules/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSchedule(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });

  /* Utilization */
  router.get('/spaces/utilization/:roomId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getUtilization(req.params.roomId, req.query) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/utilization', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordUtilization(req.body) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });

  /* Requests */
  router.get('/spaces/requests', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.get('/spaces/requests/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/requests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/requests/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequest(req.params.id, req.body.userId, req.body.roomId),
      });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.post('/spaces/requests/:id/reject', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.rejectRequest(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });

  /* Analytics & Health */
  router.get('/spaces/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSpaceAnalytics() });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });
  router.get('/spaces/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'space-allocator');
    }
  });


module.exports = router;
