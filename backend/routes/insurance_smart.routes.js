const express = require('express');
const router = express.Router();
const SmartInsuranceService = require('../services/smartInsurance.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/insurance-smart/scrub/:id
 * @desc Pre-validate an invoice/claim before sending to insurance
 */
router.post('/scrub/:id', authorizeRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    const report = await SmartInsuranceService.scrubClaim(req.params.id);
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/insurance-smart/reconcile
 * @desc Upload Payment File (ERA) for auto-matching
 */
router.post('/reconcile', authorizeRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    // In real app, upload file middleware here
    const result = await SmartInsuranceService.reconcilePayment(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
