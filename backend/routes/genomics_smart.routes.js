const express = require('express');
const router = express.Router();
const SmartGenomicsService = require('../services/smartGenomics.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/genomics-smart/analyze
 * @desc Analyze raw genetic markers (from 23andMe or Clinical Lab)
 */
router.post('/analyze', authorizeRole(['DOCTOR', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const result = SmartGenomicsService.analyzeGeneticRisks(req.body.geneticProfile);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/genomics-smart/optimize-plan
 * @desc Re-generate therapy plan based on genetic constraints
 */
router.post('/optimize-plan', authorizeRole(['DOCTOR', 'THERAPIST']), async (req, res) => {
  try {
    // req.body: { standardPlan: {...}, geneticAnalysis: {...} }
    const result = await SmartGenomicsService.generatePrecisionPlan(req.body.standardPlan, req.body.geneticAnalysis);
    res.json({ success: true, optimizedPlan: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
