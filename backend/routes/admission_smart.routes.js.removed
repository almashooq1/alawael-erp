const express = require('express');
const router = express.Router();
const SmartAdmissionService = require('../services/smartAdmission.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/admission-smart/simulate
 * @desc Run a scenario simulation for strategic planning
 */
router.post('/simulate', authorizeRole(['ADMIN', 'CEO', 'OPERATIONS_MANAGER']), async (req, res) => {
  try {
    // body: { count: 5, discipline: 'SPEECH', neededSessionsPerWeek: 3 }
    const result = await SmartAdmissionService.simulateAdmissionScenario(req.body);
    res.json({ success: true, analysis: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

