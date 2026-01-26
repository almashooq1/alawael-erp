const express = require('express');
const router = express.Router();
const SmartIntegrationService = require('../services/smartIntegration.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/integration-smart/moh-submit
 * @desc Submit official record to Ministry of Health
 */
router.post('/moh-submit', authorizeRole(['ADMIN', 'MEDICAL_DIRECTOR']), async (req, res) => {
  try {
    const result = await SmartIntegrationService.submitToMoH(req.body.type, req.body.payload);
    res.json({ success: true, gatewayResponse: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/integration-smart/fhir/patient/:id
 * @desc Get Patient Record in FHIR Standard Format
 */
router.get('/fhir/patient/:id', async (req, res) => {
  try {
    // Mock fetching patient from DB
    const mockPatient = {
      id: req.params.id,
      firstName: 'Ali',
      lastName: 'Al-Ahmed',
      phone: '+966500000000',
      gender: 'M',
      nationalId: '1010101010',
      dateOfBirth: new Date('2015-05-15'),
    };
    const fhirRecord = SmartIntegrationService.convertToFHIR(mockPatient);
    res.json(fhirRecord);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

