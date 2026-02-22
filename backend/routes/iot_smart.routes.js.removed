const express = require('express');
const router = express.Router();
const SmartIoTService = require('../services/smartIoT.service');
const { authenticateToken } = require('../middleware/auth.middleware');

// Note: IoT devices might use API Keys instead of JWT, but utilizing middleware for now
// router.use(verifyDeviceApiKey);

/**
 * @route POST /api/iot-smart/vitals
 * @desc Webhook for Wearable Data (Watch/Band)
 */
router.post('/vitals', async (req, res) => {
  try {
    const { deviceId, data } = req.body;
    const result = await SmartIoTService.processVitalData(deviceId, data);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/iot-smart/nfc-scan
 * @desc Handle Kiosk/Gate NFC taps
 */
router.post('/nfc-scan', async (req, res) => {
  try {
    const { tagId, locationId } = req.body;
    const result = await SmartIoTService.handleNfcScan(tagId, locationId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

