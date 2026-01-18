const express = require('express');
const router = express.Router();
const SmartSimulationService = require('../services/smartSimulation.service');
const SmartAccessibilityService = require('../services/smartAccessibility.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// === STRATEGY (DIGITAL TWIN) ===
router.post('/strategy/simulate-day', authorizeRole(['ADMIN', 'CEO', 'FACILITY_MANAGER']), async (req, res) => {
  try {
    const result = await SmartSimulationService.runDailyFlowSimulation(new Date(), req.body.profile);
    res.json({ success: true, simulation: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/strategy/chaos-test', authorizeRole(['ADMIN']), async (req, res) => {
  try {
    const result = await SmartSimulationService.simulateDisruption(req.body.type);
    res.json({ success: true, impactAnalysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === ACCESSIBILITY ===
router.post('/accessibility/easy-read', async (req, res) => {
  try {
    const result = SmartAccessibilityService.convertToEasyRead(req.body.text);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accessibility/audio-guide', async (req, res) => {
  try {
    const result = SmartAccessibilityService.generateAudioGuide(req.body.planId, req.body.steps);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/accessibility/visual-schedule', async (req, res) => {
  try {
    const result = SmartAccessibilityService.getVisualSchedule(req.body.tasks);
    res.json({ success: true, schedule: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
