'use strict';
/**
 * GPS Tracking Routes — مسارات تتبع GPS
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// Live positions for all active vehicles
router.get('/live', async (req, res) => {
  try {
    const GPSTrack = require('../models/Fleet/GPSTrack');
    const { vehicleIds } = req.query;
    const filter = { isLatest: true };
    if (vehicleIds) filter.vehicleId = { $in: vehicleIds.split(',') };
    const data = await GPSTrack.find(filter).sort({ timestamp: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Record a GPS ping
router.post('/ping', async (req, res) => {
  try {
    const GPSTrack = require('../models/Fleet/GPSTrack');
    const { vehicleId, lat, lng, speed, heading, timestamp } = req.body;
    if (!vehicleId || lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'vehicleId, lat, lng are required' });
    }
    await GPSTrack.updateMany({ vehicleId, isLatest: true }, { isLatest: false });
    const ping = await GPSTrack.create({
      vehicleId,
      lat,
      lng,
      speed,
      heading,
      timestamp: timestamp || new Date(),
      isLatest: true,
    });
    res.status(201).json({ success: true, data: ping });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// History for a vehicle
router.get('/history/:vehicleId', async (req, res) => {
  try {
    const GPSTrack = require('../models/Fleet/GPSTrack');
    const { from, to, limit = 500 } = req.query;
    const filter = { vehicleId: req.params.vehicleId };
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const data = await GPSTrack.find(filter).sort({ timestamp: 1 }).limit(+limit).lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Latest position for a single vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const GPSTrack = require('../models/Fleet/GPSTrack');
    const data = await GPSTrack.findOne({ vehicleId: req.params.vehicleId, isLatest: true }).lean();
    if (!data)
      return res.status(404).json({ success: false, message: 'No GPS data for this vehicle' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Trip path reconstruction
router.get('/trip-path/:tripId', async (req, res) => {
  try {
    const GPSTrack = require('../models/Fleet/GPSTrack');
    const data = await GPSTrack.find({ tripId: req.params.tripId }).sort({ timestamp: 1 }).lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
