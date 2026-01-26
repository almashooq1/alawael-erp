const express = require('express');
const router = express.Router();
const SmartRoboticsService = require('../services/smartRobotics.service');

// Register Device
router.post('/register', async (req, res) => {
  try {
    const { deviceId, type, specs } = req.body;
    const result = await SmartRoboticsService.registerDevice(deviceId, type, specs);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start Session
router.post('/session/start', async (req, res) => {
  try {
    const { deviceId, patientId, mode } = req.body;
    const result = await SmartRoboticsService.startSession(deviceId, patientId, mode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send Control Command (Low Latency Endpoint)
router.post('/command', async (req, res) => {
  try {
    const { deviceId, command } = req.body;
    const result = await SmartRoboticsService.sendCommand(deviceId, command);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

