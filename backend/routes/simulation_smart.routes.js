const express = require('express');
const router = express.Router();
const SmartSimulationService = require('../services/smartSimulation.service');
const SmartDigitalTwinService = require('../services/smartDigitalTwin.service'); // Need Twin to run sim
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/sim-smart/forecast
 * @desc Run "What If" Scenario
 */
router.post('/forecast', authorizeRole(['CLINICAL_DIRECTOR', 'ADMIN']), async (req, res) => {
  try {
    // 1. Fetch current state
    const twin = await SmartDigitalTwinService.getDigitalTwin(req.body.patientId);

    // 2. Run Sim
    const result = await SmartSimulationService.simulateIntervention(req.body.patientId, twin, req.body.proposedChange);

    res.json({ success: true, simulation: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/sim-smart/optimize
 * @desc Optimize budget/time allocation
 */
router.post('/optimize', async (req, res) => {
  try {
    const result = await SmartSimulationService.optimizeAllocation(req.body.budget);
    res.json({ success: true, plan: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
