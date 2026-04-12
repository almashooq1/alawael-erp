'use strict';
/**
 * PatientTransport Routes
 * Auto-extracted from services/dddPatientTransport.js
 * 13 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddPatientTransport');


  // Service imported as singleton above;

  /* Requests */
  router.get('/patient-transport/requests', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.get('/patient-transport/requests/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/requests', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/requests/:id/cancel', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelRequest(req.params.id, req.body.reason) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });

  /* Trips */
  router.get('/patient-transport/trips', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTrips(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/trips/start', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.startTrip(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/trips/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeTrip(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });

  /* Accessibility */
  router.get('/patient-transport/accessibility', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAccessibilityNeeds(req.query.beneficiaryId) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/accessibility', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.setAccessibilityNeed(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });

  /* Escorts */
  router.get('/patient-transport/escorts', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEscorts(req.query) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.post('/patient-transport/escorts', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.assignEscort(req.body) });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });

  /* Analytics & Health */
  router.get('/patient-transport/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getPatientTransportAnalytics() });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });
  router.get('/patient-transport/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'patient-transport');
    }
  });


module.exports = router;
