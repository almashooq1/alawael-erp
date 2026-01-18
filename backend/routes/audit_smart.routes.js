const express = require('express');
const router = express.Router();
const SmartAuditService = require('../services/smartAudit.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/audit-smart/logs
 * @desc View audit trail for specific resource (Compliance Officer only)
 */
router.get('/logs', authorizeRole(['ADMIN', 'AUDITOR']), async (req, res) => {
  try {
    const { resourceId } = req.query;
    if (!resourceId) return res.status(400).json({ success: false, message: 'Resource ID required' });

    const logs = await SmartAuditService.getLogs(resourceId);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/audit-smart/check-consent
 * @desc Check if we can share this patient's data
 */
router.post('/check-consent', async (req, res) => {
  try {
    const result = await SmartAuditService.checkConsent(req.body.patientId, req.body.purpose);
    res.json({ success: true, consent: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
