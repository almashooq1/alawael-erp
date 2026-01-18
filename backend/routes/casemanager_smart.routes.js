const express = require('express');
const router = express.Router();
const SmartCaseManagerService = require('../services/smartCaseManager.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/casemanager-smart/mdt-plan
 * @desc Create Multi-Disciplinary Team Plan
 */
router.post('/mdt-plan', authorizeRole(['ADMIN', 'CASE_MANAGER']), async (req, res) => {
  try {
    const result = await SmartCaseManagerService.createMDTPlan(req.body.caseId, req.body.departments);
    res.json({ success: true, plan: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/casemanager-smart/detect-conflicts
 * @desc AI Goal Conflict Detection
 */
router.post('/detect-conflicts', async (req, res) => {
  try {
    const result = await SmartCaseManagerService.detectGoalConflicts(req.body.goals);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
