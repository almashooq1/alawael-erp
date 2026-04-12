'use strict';
/**
 * ShiftScheduler Routes
 * Auto-extracted from services/dddShiftScheduler.js
 * 17 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddShiftScheduler');


  // Service imported as singleton above;

  /* Templates */
  router.get('/shifts/templates', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.post('/shifts/templates', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.put('/shifts/templates/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTemplate(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });

  /* Assignments */
  router.get('/shifts/assignments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAssignments(req.query) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.get('/shifts/assignments/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getAssignment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.post('/shifts/assignments', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAssignment(req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.put('/shifts/assignments/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAssignment(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.post('/shifts/assignments/:id/cancel', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelAssignment(req.params.id) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.post('/shifts/assignments/:id/swap', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.swapShift(req.params.id, req.body.withStaffId) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });

  /* Time Records */
  router.post('/time/clock-in', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.clockIn(req.body.staffId, req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.post('/time/clock-out', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.clockOut(req.body.staffId, req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.get('/time/records/:staffId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTimeRecords(req.params.staffId, req.query) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });

  /* Attendance */
  router.post('/attendance', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordAttendance(req.body) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.get('/attendance/:staffId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getAttendance(req.params.staffId, req.query) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.get('/attendance/daily/:date', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getDailyAttendance(req.params.date) });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });

  /* Analytics & Health */
  router.get('/shifts/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSchedulingAnalytics() });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });
  router.get('/shifts/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'shift-scheduler');
    }
  });


module.exports = router;
