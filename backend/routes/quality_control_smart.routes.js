const express = require('express');
const router = express.Router();
const SmartQualityControlService = require('../services/smartQualityControl.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/quality-smart/audit
 * @desc Launch a mock accreditation survey (JCI/CARF)
 */
router.post('/audit', authorizeRole(['ADMIN', 'QUALITY_MANAGER', 'DIRECTOR']), async (req, res) => {
  try {
    const result = await SmartQualityControlService.runMockSurvey(req.body.standardBody || 'JCI');
    res.json({ success: true, auditReport: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/quality-smart/compliance/:deptId
 * @desc Check live compliance status of a department
 */
router.get('/compliance/:deptId', authorizeRole(['ADMIN', 'Quality Manager']), async (req, res) => {
  try {
    const result = await SmartQualityControlService.checkDepartmentCompliance(req.params.deptId);
    res.json({ success: true, status: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

