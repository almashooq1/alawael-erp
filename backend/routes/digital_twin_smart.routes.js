const express = require('express');
const router = express.Router();
const SmartDigitalTwinService = require('../services/smartDigitalTwin.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/twin-smart/:patientId
 * @desc Get the full Digital Twin JSON
 */
router.get('/:patientId', authorizeRole(['CLINICAL_DIRECTOR', 'ADMIN', 'THERAPIST']), async (req, res) => {
  try {
    const twin = await SmartDigitalTwinService.getDigitalTwin(req.params.patientId);
    // Also run conflict check
    const conflicts = await SmartDigitalTwinService.detectConflicts(twin);

    res.json({ success: true, twin, conflicts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
