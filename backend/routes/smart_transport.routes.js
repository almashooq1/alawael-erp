const express = require('express');
const router = express.Router();
const SmartTransportService = require('../services/smartTransport.service');

// Mock Auth
const mockAuth = (req, res, next) => next();

// GET /api/transport-smart/vehicles
router.get('/vehicles', mockAuth, (req, res) => {
  try {
    const data = SmartTransportService.getAllVehicles();
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/transport-smart/trips
router.get('/trips', mockAuth, (req, res) => {
  try {
    const data = SmartTransportService.getAllTrips();
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/transport-smart/trips/request
router.post('/trips/request', mockAuth, (req, res) => {
  try {
    // { patientId, pickup, dropoff, priority }
    const { patientId, pickup, dropoff, priority } = req.body;
    const trip = SmartTransportService.requestTrip(patientId, pickup, dropoff, priority);
    res.json({ success: true, data: trip });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/transport-smart/trips/:id/status
router.post('/trips/:id/status', mockAuth, (req, res) => {
  try {
    const { status } = req.body;
    const trip = SmartTransportService.updateTripStatus(req.params.id, status);
    res.json({ success: true, data: trip });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

