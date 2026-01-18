const express = require('express');
const router = express.Router();
const FinanceCoreService = require('../services/financeCore.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/finance-core/journal
 * @desc Post a manual Journal Entry (Double Entry)
 */
router.post('/journal', authorizeRole(['ADMIN', 'ACCOUNTANT']), async (req, res) => {
  try {
    const { reference, description, entries } = req.body;
    const result = await FinanceCoreService.createJournalEntry(reference, description, entries, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/finance-core/profitability/:service
 * @desc Get Cost Accounting Analysis for a specific service (e.g., SPEECH, OT)
 */
router.get('/profitability/:service', authorizeRole(['ADMIN', 'CEO', 'ACCOUNTANT']), async (req, res) => {
  try {
    // e.g. service = 'Speech Therapy'
    const analysis = await FinanceCoreService.analyzeServiceProfitability(req.params.service, req.query.start, req.query.end);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
