const express = require('express');
const router = express.Router();
const SmartResearchService = require('../services/smartResearch.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/research-smart/cohort-id
 * @desc Identify patients for clinical trial
 */
router.post('/cohort-id', authorizeRole(['ADMIN', 'RESEARCHER']), async (req, res) => {
  try {
    const result = await SmartResearchService.identifyCohort(req.body.criteria);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/research-smart/export-data
 * @desc Export anonymized dataset
 */
router.post('/export-data', authorizeRole(['ADMIN', 'RESEARCHER']), async (req, res) => {
  try {
    const result = await SmartResearchService.exportAnonymizedDataset(req.body.cohortId);
    res.json({ success: true, exportJob: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
