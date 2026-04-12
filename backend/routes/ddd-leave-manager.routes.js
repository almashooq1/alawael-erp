'use strict';
/**
 * LeaveManager Routes
 * Auto-extracted from services/dddLeaveManager.js
 * 18 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddLeaveManager');


  // Service imported as singleton above;

  /* Requests */
  router.get('/leave/requests', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.get('/leave/requests/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/requests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/requests/:id/submit', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitRequest(req.params.id) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/requests/:id/approve', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequest(req.params.id, req.body.approverId),
      });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/requests/:id/reject', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.rejectRequest(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/requests/:id/cancel', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelRequest(req.params.id) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });

  /* Balances */
  router.get('/leave/balances/:staffId', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getBalance(req.params.staffId, req.query.year || new Date().getFullYear()),
      });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/balances/accrue', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.accrueLeave(
          req.body.staffId,
          req.body.leaveType,
          req.body.year,
          req.body.days
        ),
      });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });

  /* Policies */
  router.get('/leave/policies', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/policies', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.put('/leave/policies/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePolicy(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });

  /* Holidays */
  router.get('/leave/holidays', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHolidays(req.query.year) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.post('/leave/holidays', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createHoliday(req.body) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.put('/leave/holidays/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateHoliday(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.delete('/leave/holidays/:id', authenticate, async (req, res) => {
    try {
      await svc.deleteHoliday(req.params.id);
      res.json({ success: true });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });

  /* Analytics & Health */
  router.get('/leave/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getLeaveAnalytics() });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });
  router.get('/leave/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'leave-manager');
    }
  });


module.exports = router;
