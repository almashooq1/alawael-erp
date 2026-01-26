const express = require('express');
const router = express.Router();
const SmartPatientService = require('../services/smartPatient.service');
const StandardizedAssessment = require('../models/StandardizedAssessment');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/patient-smart/:id/unified-file
 * @desc Get the 360-Degree EMR View
 */
router.get('/:id/unified-file', async (req, res) => {
  try {
    const data = await SmartPatientService.getUnifiedFile(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * @route POST /api/patient-smart/assessment
 * @desc Log a Formal Assessment Result (CARS, GMFM, etc.)
 */
router.post('/assessment', async (req, res) => {
  try {
    const assessment = new StandardizedAssessment({
      ...req.body,
      evaluator: req.user.id,
    });
    await assessment.save();
    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route PUT /api/patient-smart/goal-progress
 * @desc Update progress for a specific goal (Usually from Session Note)
 */
router.put('/goal-progress', async (req, res) => {
  try {
    const { planId, goalId, percentage, note, sessionId } = req.body;
    const result = await SmartPatientService.updateGoalProgress(planId, goalId, percentage, note, req.user.id, sessionId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/patient-smart/goal-trend/:goalId
 * @desc Get history for charts
 */
router.get('/goal-trend/:goalId', async (req, res) => {
  try {
    const history = await SmartPatientService.getGoalTrend(req.params.goalId);
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

