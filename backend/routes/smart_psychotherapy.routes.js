const express = require('express');
const router = express.Router();
const SmartPsychotherapyService = require('../services/smartPsychotherapy.service');

// Mock Auth
const mockAuth = (req, res, next) => {
  next();
};

/**
 * @route GET /api/psychotherapy-smart/cbt-flow/:type
 * @desc Get a structured CBT session template
 */
router.get('/cbt-flow/:type', mockAuth, (req, res) => {
  const flow = SmartPsychotherapyService.getCBTFlow(req.params.type.toUpperCase());
  res.json({ success: true, data: flow });
});

/**
 * @route POST /api/psychotherapy-smart/assessment
 * @desc Submit GAD-7, PHQ-9, etc.
 */
router.post('/assessment', mockAuth, async (req, res) => {
  try {
    const { patientId, type, responses } = req.body;
    const result = await SmartPsychotherapyService.submitQuestionnaire(patientId, type, responses);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @route POST /api/psychotherapy-smart/mood
 * @desc Track mood
 */
router.post('/mood', mockAuth, async (req, res) => {
  try {
    const { patientId, moodData } = req.body;
    const result = await SmartPsychotherapyService.recordMood(patientId, moodData);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @route POST /api/psychotherapy-smart/thought-record
 * @desc Log CBT thought record
 */
router.post('/thought-record', mockAuth, async (req, res) => {
  try {
    const { patientId, thoughtData } = req.body;
    const result = await SmartPsychotherapyService.recordThought(patientId, thoughtData);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
