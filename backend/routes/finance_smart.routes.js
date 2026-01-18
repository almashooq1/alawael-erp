const express = require('express');
const router = express.Router();
const SmartFinanceService = require('../services/smartFinance.service');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/finance-smart/unbilled
 * @desc Get list of patients with unbilled completed sessions
 */
router.get('/unbilled', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    const data = await SmartFinanceService.getUnbilledSessions();
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/finance-smart/generate-invoices
 * @desc Generate invoices for unbilled sessions
 * @body { beneficiaryId: "ID" } (Optional, if omitted generates for ALL)
 */
router.post('/generate-invoices', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const result = await SmartFinanceService.generateInvoices(req.user.id, beneficiaryId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/finance-smart/metrics
 * @query month, year
 */
router.get('/metrics', requireRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'month & year required' });

    const metrics = await SmartFinanceService.getRevenueMetrics(month, year);
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
