const express = require('express');
const router = express.Router();
const SmartWearableService = require('../services/smartWearable.service');

// Register a new wearable
router.post('/register', async (req, res) => {
  try {
    const { patientId, deviceId, deviceType } = req.body;
    const result = await SmartWearableService.registerDevice(patientId, deviceId, deviceType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Receive telemetry data
router.post('/telemetry', async (req, res) => {
  try {
    const { deviceId, data } = req.body;
    const result = await SmartWearableService.ingestTelemetry(deviceId, data);
    res.json({ success: true, analysis: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get daily summary
router.get('/summary/:patientId', async (req, res) => {
  try {
    const result = await SmartWearableService.getDailySummary(req.params.patientId);
    res.json({ success: true, summary: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

