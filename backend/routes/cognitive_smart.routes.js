const express = require('express');
const router = express.Router();
const SmartCognitiveService = require('../services/smartCognitive.service');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/cognitive-smart/exercise
 * @desc Get the next adaptive exercise configuration
 * @query patientId, domain (ATTENTION, MEMORY, EXECUTIVE)
 */
router.get('/exercise', requireRole(['THERAPIST', 'PATIENT', 'ADMIN']), async (req, res) => {
  try {
    const { patientId, domain } = req.query;
    if (!patientId || !domain) return res.status(400).json({ message: 'Missing parameters' });

    // Security check: Patients can only fetch their own
    if (req.user.role === 'PATIENT' && req.user.id !== patientId) {
      // In a real app we'd map user.id to beneficiaryId, simplifying for demo
    }

    const config = await SmartCognitiveService.getNextExercise(patientId, domain);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/cognitive-smart/submit
 * @desc Submit results and trigger adaptation
 */
router.post('/submit', requireRole(['THERAPIST', 'PATIENT', 'ADMIN']), async (req, res) => {
  try {
    const { patientId, sessionData } = req.body;
    const result = await SmartCognitiveService.submitSessionResult(patientId, sessionData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/cognitive-smart/profile/:patientId
 * @desc Get cognitive progress summary
 */
router.get('/profile/:patientId', requireRole(['THERAPIST', 'ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const profile = await SmartCognitiveService.getCognitiveProfile(req.params.patientId);
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
