const express = require('express');
const router = express.Router();
const HomeAssignment = require('../models/HomeAssignment');
const SmartHomeCareService = require('../services/smartHomeCare.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/homecare-smart/list
 * @desc Get assignments for a child
 */
router.get('/list', async (req, res) => {
  try {
    const { beneficiaryId } = req.query;
    if (!beneficiaryId) return res.status(400).json({ message: 'Beneficiary ID required' });

    const list = await HomeAssignment.find({ beneficiary: beneficiaryId }).sort({ createdAt: -1 });

    // Calculate Score on the fly
    const adherence = await SmartHomeCareService.getAdherenceReport(beneficiaryId);

    res.json({ success: true, adherence, data: list });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/homecare-smart/assign
 * @desc Therapist assigns exercise
 */
router.post('/assign', async (req, res) => {
  try {
    const assignment = new HomeAssignment({
      ...req.body,
      assignedBy: req.user.id,
    });
    await assignment.save();
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/homecare-smart/submit-log
 * @desc Parent submits a log (Done/Skipped)
 */
router.post('/submit-log', async (req, res) => {
  try {
    const { assignmentId, status, note } = req.body;

    const assignment = await HomeAssignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    assignment.submissions.push({
      status,
      parentNote: note,
      date: new Date(),
    });

    await assignment.save();
    res.json({ success: true, message: 'Log submitted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/homecare-smart/run-monitor
 * @desc Manual trigger for inactivity check
 */
router.post('/run-monitor', async (req, res) => {
  try {
    const report = await SmartHomeCareService.checkDropoutRisk(req.user.id);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
