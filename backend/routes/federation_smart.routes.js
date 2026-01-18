const express = require('express');
const router = express.Router();
const SmartFederationService = require('../services/smartFederation.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/federation-smart/dashboard
 * @desc Get HQ view of all branches
 */
router.get('/dashboard', authorizeRole(['SUPER_ADMIN', 'CEO']), async (req, res) => {
  try {
    const data = await SmartFederationService.getGlobalDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/federation-smart/transfer
 * @desc Move patient file between branches
 */
router.post('/transfer', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const { patientId, fromBranch, toBranch } = req.body;
    const result = await SmartFederationService.transferPatient(patientId, fromBranch, toBranch);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
