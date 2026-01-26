const express = require('express');
const router = express.Router();
const SmartClinicalCommandService = require('../services/smartClinicalCommand.service');

// Middleware would be injected here in a real scenario
// Using mock auth for the isolated environment
const mockAuth = (req, res, next) => {
  // req.user logic
  next();
};

/**
 * @route GET /api/command-center-smart/snapshot/:patientId
 * @desc Get the holistic 360-degree view of the patient's Smart Rehab status
 */
router.get('/snapshot/:patientId', mockAuth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const snapshot = await SmartClinicalCommandService.getPatientCommandSnapshot(patientId);
    res.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Command Center Error:', error);
    res.status(500).json({ success: false, message: 'Internal Command Center Error' });
  }
});

module.exports = router;

