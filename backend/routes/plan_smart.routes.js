const express = require('express');
const router = express.Router();
const SmartPlanGeneratorService = require('../services/smartPlanGenerator.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/plan-smart/generate/:id
 * @desc Generate a full 3-month draft plan based on Patient Diagnosis & Age
 */
router.post('/generate/:id', authorizeRole(['THERAPIST', 'CLINICAL_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const breakdown = await SmartPlanGeneratorService.generateDraftPlan(req.params.id);

    res.json({
      success: true,
      message: 'Draft Plan Generated Successfully',
      data: breakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
