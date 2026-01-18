const express = require('express');
const router = express.Router();
const SmartDeviceGatewayService = require('../services/smartDeviceGateway.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route POST /api/gateway-smart/fitbit/webhook
 * @desc Receive data push from Fitbit servers
 */
router.post('/fitbit/webhook', mockAuth, async (req, res) => {
  try {
    const { patientId, data } = req.body;
    const result = await SmartDeviceGatewayService.processFitbitWebHook(patientId, data);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * @route POST /api/gateway-smart/apple-health/upload
 * @desc Receive data upload from Patient App (Apple Health)
 */
router.post('/apple-health/upload', mockAuth, async (req, res) => {
  try {
    const { patientId, metrics } = req.body;
    const result = await SmartDeviceGatewayService.processAppleHealthUpload(patientId, { metrics });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
