const express = require('express');
const router = express.Router();
const SmartArchivingService = require('../services/smartArchiving.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/archiving-smart/run
 * @desc Trigger the "Cold Storage" job manually
 */
router.post('/run', authorizeRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const result = await SmartArchivingService.runArchivalJob();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route  GET /api/archiving-smart/research-export
 * @desc Get Anonymized Dataset for Scientific Research
 */
router.get('/research-export', authorizeRole(['ADMIN', 'CLINICAL_DIRECTOR']), async (req, res) => {
  try {
    const data = await SmartArchivingService.exportResearchData(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

