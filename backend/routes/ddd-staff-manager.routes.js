'use strict';
/**
 * StaffManager Routes
 * Auto-extracted from services/dddStaffManager.js
 * 19 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddStaffManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/staff-manager.validation');


  // Service imported as singleton above;

  /* Staff */
  router.get('/staff', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listStaff(req.query) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.get('/staff/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getStaff(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.post('/staff', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createStaff(req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.put('/staff/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateStaff(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.post('/staff/:id/deactivate', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.deactivateStaff(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });

  /* Departments */
  router.get('/departments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDepartments(req.query) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.get('/departments/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getDepartment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.post('/departments', authenticate, validate(v.createDepartment), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createDepartment(req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.put('/departments/:id', authenticate, validate(v.updateDepartment), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateDepartment(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });

  /* Positions */
  router.get('/positions', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPositions(req.query) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.get('/positions/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getPosition(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.post('/positions', authenticate, validate(v.createPosition), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPosition(req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.put('/positions/:id', authenticate, validate(v.updatePosition), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePosition(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });

  /* Qualifications */
  router.get('/staff/:staffId/qualifications', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listQualifications(req.params.staffId) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.post('/qualifications', authenticate, validate(v.createQualification), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addQualification(req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.put('/qualifications/:id', authenticate, validate(v.updateQualification), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateQualification(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.get('/qualifications/expiring', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringQualifications(req.query.daysAhead) });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });

  /* Analytics & Health */
  router.get('/staff/analytics/summary', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getStaffAnalytics() });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });
  router.get('/staff/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'staff-manager');
    }
  });


module.exports = router;
