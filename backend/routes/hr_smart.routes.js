const express = require('express');
const router = express.Router();
const SmartPayrollService = require('../services/smartPayroll.service');
const Payroll = require('../models/payroll.model');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/hr-smart/payroll/generate
 * @desc Generate Payroll for a specific month (Auto-calculates commissions)
 * @body month (1-12), year (2026)
 */
router.post('/payroll/generate', requireRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

    const result = await SmartPayrollService.generatePayroll(month, year, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/hr-smart/payroll
 * @desc Get Payroll List for a month
 */
router.get('/payroll', requireRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) return res.status(400).json({ message: 'Month query param (YYYY-MM) required' });

    const payrolls = await Payroll.find({ month }).populate('employeeId', 'firstName lastName position department').sort({ totalNet: -1 });

    const stats = await SmartPayrollService.getMonthStats(month);

    res.json({ success: true, stats: stats[0] || {}, data: payrolls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT /api/hr-smart/payroll/:id/approve
 * @desc Approve and Lock a payroll record
 */
router.put('/payroll/:id/approve', requireRole(['ADMIN']), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.id);
    if (!payroll) return res.status(404).json({ message: 'Not found' });

    payroll.status = 'APPROVED';
    payroll.approvedBy = req.user.id;
    payroll.approvedAt = new Date();
    await payroll.save();

    res.json({ success: true, message: 'Payroll approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
