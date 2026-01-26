const express = require('express');
const router = express.Router();
const SmartVRService = require('../services/smartVR.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route POST /api/vr-smart/init-session
 * @desc Initialize VR Headset and load therapeutic prescription
 */
router.post('/init-session', mockAuth, async (req, res) => {
  try {
    const { patientId, deviceId } = req.body;
    if (!patientId || !deviceId) return res.status(400).json({ message: 'Missing ID or Device' });

    const config = await SmartVRService.initializeVRSession(patientId, deviceId);

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('VR Init Error:', error);
    res.status(500).json({ success: false, message: 'VR Handshake Failed' });
  }
});

/**
 * @route POST /api/vr-smart/telemetry
 * @desc Receive real-time EEG/Focus data from VR headset
 */
router.post('/telemetry', mockAuth, async (req, res) => {
  try {
    const { sessionToken, telemetry } = req.body;

    const feedback = await SmartVRService.processRealTimeTelemetry(sessionToken, telemetry);

    res.json({
      success: true,
      feedback,
    });
  } catch (error) {
    // console.error("VR Telemetry Error:", error);
    res.status(404).json({ success: false, message: error.message });
  }
});

module.exports = router;

