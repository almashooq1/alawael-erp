const express = require('express');
const router = express.Router();
const SmartCrisisService = require('../services/smartCrisis.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/crisis-smart/trigger
 * @desc Trigger an emergency code (Red/Blue/Gray)
 */
router.post('/trigger', async (req, res) => {
  try {
    // Any authenticated staff can trigger, but we record WHO
    const result = await SmartCrisisService.triggerCode(req.body.code, req.body.location, req.user.id);
    res.json({ success: true, alert: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/crisis-smart/log-action
 * @desc Log an action taken during an active crisis
 */
router.post('/log-action', async (req, res) => {
  try {
    const result = await SmartCrisisService.logResponseAction(req.body.incidentId, req.user.id, req.body.action);
    res.json({ success: true, log: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/crisis-smart/resolve
 * @desc Close the incident (Admin/Manager only)
 */
router.post('/resolve', authorizeRole(['ADMIN', 'MANAGER', 'SECURITY_HEAD']), async (req, res) => {
  try {
    const result = await SmartCrisisService.resolveIncident(req.body.incidentId, req.body.summary, req.body.outcome);
    res.json({ success: true, report: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
