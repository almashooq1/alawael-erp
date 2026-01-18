const express = require('express');
const router = express.Router();
const SmartVocationalService = require('../services/smartVocational.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/vocational-smart/enroll
 * @desc Enroll in a vocational program
 */
router.post('/enroll', authorizeRole(['ADMIN', 'CASE_MANAGER']), async (req, res) => {
  try {
    const result = await SmartVocationalService.enrollBeneficiary(req.body.programId, req.body.beneficiaryId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/vocational-smart/match-jobs
 * @desc AI Job Matching
 */
router.get('/match-jobs', async (req, res) => {
  try {
    const result = await SmartVocationalService.matchJobOpportunity(req.query.beneficiaryId);
    res.json({ success: true, match: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
