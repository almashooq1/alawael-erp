const express = require('express');
const router = express.Router();
const SmartCDSSService = require('../services/smartCDSS.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// === PHASE 45: Clinical Decision Support System ===

/**
 * @route POST /api/cdss-smart/validate-interaction
 * @desc Check for Drug-Therapy Interactions
 */
router.post('/validate-interaction', authenticateToken, async (req, res) => {
  try {
    const { medications, activityType } = req.body;
    // medications: ['Aspirin', 'Warfarin']
    // activityType: 'Balance Beam'

    const alerts = SmartCDSSService.checkDrugTherapyConflict(medications || [], activityType || '');
    res.json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/cdss-smart/cross-discipline/:patientId
 * @desc Analyze risk across multiple therapies (PT, OT, SLP)
 */
router.get('/cross-discipline/:patientId', authenticateToken, authorizeRole(['ADMIN', 'DOCTOR', 'THERAPIST']), async (req, res) => {
  try {
    const risks = await SmartCDSSService.analyzeCrossDisciplineRisks(req.params.patientId);
    res.json({ success: true, risks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/cdss-smart/analyze-vitals
 * @desc IoT Endpoint for Vital Sign Analysis
 */
router.post('/analyze-vitals', authenticateToken, (req, res) => {
  try {
    // req.body: { patientId: '...', vitals: [{hr: 110...}] }
    const result = SmartCDSSService.analyzeVitalTrends(req.body.patientId, req.body.vitals);
    res.json({ success: true, assessment: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

