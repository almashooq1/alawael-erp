'use strict';
/**
 * FacilityManager Routes
 * Auto-extracted from services/dddFacilityManager.js
 * 17 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddFacilityManager');
const { validate } = require('../middleware/validate');
const v = require('../validations/facility-manager.validation');


  // Service imported as singleton above;

  /* Buildings */
  router.get('/facility/buildings', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBuildings(req.query) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.get('/facility/buildings/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getBuilding(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.post('/facility/buildings', authenticate, validate(v.createBuilding), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBuilding(req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.put('/facility/buildings/:id', authenticate, validate(v.updateBuilding), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateBuilding(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });

  /* Floors */
  router.get('/facility/buildings/:buildingId/floors', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFloors(req.params.buildingId) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.post('/facility/floors', authenticate, validate(v.createFloor), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createFloor(req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });

  /* Rooms */
  router.get('/facility/rooms', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRooms(req.query) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.get('/facility/rooms/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getRoom(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.post('/facility/rooms', authenticate, validate(v.createRoom), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoom(req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.put('/facility/rooms/:id', authenticate, validate(v.updateRoom), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoom(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.patch('/facility/rooms/:id/status', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoomStatus(req.params.id, req.body.status) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });

  /* Inspections */
  router.get('/facility/inspections', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.get('/facility/inspections/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getInspection(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.post('/facility/inspections', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createInspection(req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.post('/facility/inspections/:id/complete', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });

  /* Analytics & Health */
  router.get('/facility/analytics', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFacilityAnalytics() });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });
  router.get('/facility/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'facility-manager');
    }
  });


module.exports = router;
