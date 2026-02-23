const express = require('express');
const router = express.Router();
const SmartMarketingService = require('../services/smartMarketing.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/marketing-smart/score-lead
 * @desc Get AI Score for a new prospective patient
 */
router.post('/score-lead', authorizeRole(['ADMIN', 'CRM_MANAGER']), async (req, res) => {
  try {
    const lead = req.body; // { source: 'FACEBOOK', childDiagnosis: 'Autism' ... }
    const analysis = await SmartMarketingService.scoreLead(lead);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/marketing-smart/roi
 * @desc Analytics for Ad Campaigns
 */
router.get('/roi', authorizeRole(['ADMIN', 'CEO']), async (req, res) => {
  try {
    const { campaignId, spend } = req.query;
    if (!campaignId || !spend) return res.status(400).json({ message: 'campaignId and spend required' });

    const report = await SmartMarketingService.calculateROI(campaignId, Number(spend));
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

