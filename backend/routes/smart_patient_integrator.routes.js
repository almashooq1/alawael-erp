const express = require('express');
const router = express.Router();
const SmartPatientIntegratorService = require('../services/smartPatientIntegrator.service');

// GET /api/patient-integrator/digital-twin/:patientId
router.get('/digital-twin/:patientId', async (req, res) => {
  try {
    const twinData = await SmartPatientIntegratorService.getPatientDigitalTwin(req.params.patientId);
    res.json({
      success: true,
      data: twinData,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
