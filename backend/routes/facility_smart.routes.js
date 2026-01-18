const express = require('express');
const router = express.Router();
const SmartFacilityService = require('../services/smartFacility.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/facility-smart/eco-slots
 * @desc Get optimal times for high-energy therapy sessions
 */
router.get('/eco-slots', (req, res) => {
  try {
    const slots = SmartFacilityService.getEcoFriendlySlots(new Date());
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/facility-smart/iot-telemetry
 * @desc Receive status from Rehab Robotics
 */
router.post('/iot-telemetry/:equipmentId', async (req, res) => {
  try {
    const result = await SmartFacilityService.checkEquipmentHealth(req.params.equipmentId, req.body);
    res.json({ success: true, diagnostics: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/facility-smart/optimize-rooms
 * @desc Batch control for HVAC based on schedule
 */
router.post('/optimize-rooms', authorizeRole(['ADMIN', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const result = await SmartFacilityService.optimizeRoomEnergy(req.body.schedule);
    res.json({ success: true, optimization: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
