'use strict';
/**
 * InspectionTracker Routes
 * Auto-extracted from services/dddInspectionTracker.js
 * 14 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddInspectionTracker');
const { validate } = require('../middleware/validate');
const v = require('../validations/inspection-tracker.validation');


  // Service imported as singleton above;

  router.get('/inspection-tracker/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

  router.post('/inspection-tracker/inspections', authenticate, validate(v.createInspection), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createInspection(req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/inspections', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listInspections(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/inspections/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getInspectionById(req.params.id) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.put('/inspection-tracker/inspections/:id', authenticate, validate(v.updateInspection), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateInspection(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

  router.post('/inspection-tracker/items', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createItem(req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/inspections/:id/items', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listItems(req.params.id) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

  router.post('/inspection-tracker/follow-ups', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFollowUp(req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/follow-ups', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json({ success: true, data: await svc.listFollowUps(f, +page, +limit) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.put('/inspection-tracker/follow-ups/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateFollowUp(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

  router.post('/inspection-tracker/schedules', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSchedule(req.body) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/schedules', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSchedules(req.query) });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

  router.get('/inspection-tracker/stats', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getComplianceSummary() });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });
  router.get('/inspection-tracker/overdue', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOverdueFollowUps() });
    } catch (e) {
      safeError(res, e, 'inspection-tracker');
    }
  });

module.exports = router;
