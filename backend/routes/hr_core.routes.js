const express = require('express');
const router = express.Router();
const HRCoreService = require('../services/hrCore.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/hr-core/contracts/expiring
 * @desc Get dashboard of contracts needing renewal in 60 days
 */
router.get('/contracts/expiring', authorizeRole(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const list = await HRCoreService.checkExpiringContracts();
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/hr-core/payroll/preview
 * @desc Generate payroll preview including attendance deductions
 */
router.post('/payroll/preview', authorizeRole(['ADMIN', 'HR_MANAGER']), async (req, res) => {
  try {
    const { month, year } = req.body;
    const slip = await HRCoreService.generatePayrollRun(month, year);
    res.json({ success: true, data: slip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

