const express = require('express');
const router = express.Router();
const SmartAppealsService = require('../services/smartAppeals.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/appeals-smart/generate
 * @desc Auto-write an appeal letter for a denied claim
 */
router.post('/generate', authorizeRole(['ADMIN', 'FINANCE']), async (req, res) => {
  try {
    const result = await SmartAppealsService.generateAppealLetter(req.body.invoiceId, req.body.rejectionCode);
    res.json({ success: true, appeal: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/appeals-smart/predict
 * @desc Should we fight this claim?
 */
router.get('/predict', async (req, res) => {
  try {
    const result = await SmartAppealsService.predictAppealSuccess(req.query.payer, req.query.code);
    res.json({ success: true, prediction: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
