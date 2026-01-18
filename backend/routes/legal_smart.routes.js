const express = require('express');
const router = express.Router();
const SmartLegalService = require('../services/smartLegal.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/legal-smart/audit-access
 * @desc Check if a user action is suspicious (Simulated Middleware)
 */
router.post('/audit-access', async (req, res) => {
  try {
    // req.body: { resource: 'CLINICAL_NOTES', time: '2026-01-15T03:00:00Z' }
    const check = await SmartLegalService.detectAccessAnomaly(req.user.id, req.body.resource, req.body.time || new Date());

    if (!check.allowed) {
      return res.status(403).json({ success: false, accessDenied: true, reason: check.flags });
    }
    res.json({ success: true, accessGranted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/legal-smart/verify-consent/:patientId
 * @desc Check valid consent before procedure
 */
router.get('/verify-consent/:patientId', authorizeRole(['DOCTOR', 'THERAPIST', 'RECEPTION']), async (req, res) => {
  try {
    const consent = await SmartLegalService.verifyProcedureConsent(req.params.patientId, req.query.procedure);
    res.json({ success: true, status: consent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
