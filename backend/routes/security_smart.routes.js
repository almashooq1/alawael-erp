const express = require('express');
const router = express.Router();
const SmartSecurityService = require('../services/smartSecurity.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/security-smart/audit
 * @desc Middleware hook to check anomaly on sensitive actions
 */
router.post('/audit', async (req, res) => {
  try {
    const { resource } = req.body;
    const scan = await SmartSecurityService.detectAccessAnomaly(req.user.id, resource);

    if (scan.status !== 'CLEAN') {
      // In strict mode, we might block the request here
      return res.status(200).json({ success: true, warning: 'Security Alert Logged', scan });
    }
    res.json({ success: true, scan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
