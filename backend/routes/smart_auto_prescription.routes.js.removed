const express = require('express');
const router = express.Router();
const SmartAutoPrescriptionService = require('../services/smartAutoPrescription.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route POST /api/auto-prescription-smart/generate/:patientId
 * @desc AI generates a draft medical plan based on predictive models
 */
router.post('/generate/:patientId', mockAuth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const plan = await SmartAutoPrescriptionService.generateAutoPlan(patientId);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Auto-Prescription Error:', error);
    res.status(500).json({ success: false, message: 'Planning Engine Failed' });
  }
});

module.exports = router;

