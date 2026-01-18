const express = require('express');
const router = express.Router();
const SmartEnvironmentService = require('../services/smartEnvironment.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/environment-smart/room-profile
 * @desc Set Sensory Room Mood (Calm/Focus/Alert)
 */
router.post('/room-profile', authorizeRole(['THERAPIST', 'ADMIN']), async (req, res) => {
  try {
    const result = await SmartEnvironmentService.setRoomProfile(req.body.roomId, req.body.profile);
    res.json({ success: true, status: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/environment-smart/sensor-data
 * @desc Check air quality and temp
 */
router.get('/sensor-data', async (req, res) => {
  try {
    const result = await SmartEnvironmentService.getRoomConditions(req.query.roomId);
    res.json({ success: true, conditions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/environment-smart/optimize
 * @desc Trigger energy saving protocols (Admin/System)
 */
router.post('/optimize', authorizeRole(['ADMIN', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const result = await SmartEnvironmentService.optimizeEnergy();
    res.json({ success: true, report: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
