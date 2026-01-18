const express = require('express');
const router = express.Router();
const securityService = require('../services/securityService');
const { authenticateToken: protect } = require('../middleware/auth.middleware');

router.use(protect);

// Get MFA setup (generate secret)
router.post('/mfa/setup', async (req, res) => {
  try {
    const data = await securityService.generateMfaSecret(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify and Enable MFA
router.post('/mfa/enable', async (req, res) => {
  try {
    const { token, secret } = req.body;
    const isValid = await securityService.verifyMfaToken(req.user._id, token, secret);

    if (!isValid) {
      await securityService.logSecurityEvent({
        action: 'MFA_ENABLE_FAILED',
        userId: req.user._id,
        status: 'FAILURE',
        description: 'Failed attempt to enable MFA',
      });
      return res.status(400).json({ message: 'Invalid token' });
    }

    const result = await securityService.enableMfa(req.user._id, secret);
    res.json({ message: 'MFA Enabled', backupCodes: result.params.backupCodes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Disable MFA (requires password confirmation usually, simplified here)
router.post('/mfa/disable', async (req, res) => {
  // Implementation skipped for brevity, similar flow
  res.status(501).json({ message: 'Not implemented' });
});

// Get Security Logs (My Activity)
router.get('/logs/me', async (req, res) => {
  try {
    const logs = await securityService.getSecurityLogs({ 'actor.id': req.user._id });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
