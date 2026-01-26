const express = require('express');
const router = express.Router();
const SmartWorkflowOrchestrator = require('../services/smartWorkflowOrchestrator.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/orchestrator-smart/trigger/staff-absence
 * @desc Manually trigger the "Staff Sick" workflow (usually auto-triggered by HR)
 */
router.post('/trigger/staff-absence', authorizeRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const result = await SmartWorkflowOrchestrator.handleSuddenAbsence(req.body.therapistId, new Date());
    res.json({ success: true, workflow: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/orchestrator-smart/trigger/equipment-failure
 * @desc IoT triggering the "Machine Broken" workflow
 */
router.post('/trigger/equipment-failure', authorizeRole(['ADMIN', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const result = await SmartWorkflowOrchestrator.handleEquipmentFailure(req.body.equipmentId, 'CRITICAL');
    res.json({ success: true, workflow: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

