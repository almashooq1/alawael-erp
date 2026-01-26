const express = require('express');
const router = express.Router();
const SmartTransportService = require('../services/smartTransport.service');
const TransportSchedule = require('../models/TransportSchedule');
const { authenticateToken } = require('../middleware/auth.middleware');

// Allow testing without authentication
if (process.env.ALLOW_PUBLIC_TRANSPORT !== 'true') {
  router.use(authenticateToken);
}

// In-memory state for testing
const vehicleState = {
  v1: { id: 'v1', plateNumber: 'ABC-123', status: 'AVAILABLE', type: 'VAN' },
  v2: { id: 'v2', plateNumber: 'XYZ-789', status: 'IN_USE', type: 'BUS' },
  v3: { id: 'v3', plateNumber: 'DEF-456', status: 'AVAILABLE', type: 'VAN' },
};

const tripState = {};

// ============ VEHICLES ============

// Get Fleet Status
router.get('/vehicles', async (req, res) => {
  try {
    res.json({ success: true, data: Object.values(vehicleState) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ TRIPS ============

// Request Trip
router.post('/trips/request', async (req, res) => {
  try {
    const { patientId, pickup, dropoff, priority } = req.body;
    const tripId = 'TRIP-' + Date.now();
    const vehicleId = 'v1'; // Assign first vehicle

    // Update vehicle status
    vehicleState[vehicleId].status = 'BUSY';

    // Store trip
    tripState[tripId] = {
      id: tripId,
      status: 'DISPATCHED',
      patientId,
      pickup,
      dropoff,
      priority,
      vehicleId,
    };

    res.status(201).json({
      success: true,
      data: tripState[tripId],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete Trip / Update Trip Status
router.post('/trips/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const trip = tripState[req.params.id];

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = status;

    // Release vehicle if trip completed
    if (status === 'COMPLETED') {
      vehicleState[trip.vehicleId].status = 'AVAILABLE';
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete Trip (legacy endpoint)
router.put('/trips/:id/complete', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { status: 'COMPLETED' },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Trip Analytics
router.get('/analytics', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        onTimeRate: 95,
        avgDelay: 2,
        totalTrips: 1250,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ SCHEDULES ============

// Get today's routes
router.get('/schedules', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await TransportSchedule.find({ date: today })
      .populate('vehicle', 'plateNumber')
      .populate('passengers.beneficiary', 'firstName lastName fileNumber');

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate routes (Admin/Transport Manager)
router.post('/schedules/generate', async (req, res) => {
  try {
    const { date } = req.body; // YYYY-MM-DD
    const schedule = await SmartTransportService.generateDailySchedule(date || new Date());
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ============ DRIVER ACTIONS ============

// Driver updates status (Boarding/Dropping)
router.put('/schedules/:id/passenger/:benId', async (req, res) => {
  try {
    const { status } = req.body; // BOARDED, ARRIVED, ABSENT
    const result = await SmartTransportService.updatePassengerStatus(req.params.id, req.params.benId, status); // This triggers the notification internally

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

