const express = require('express');
const router = express.Router();
const SmartTrainingService = require('../services/smartTraining.service');
const Training = require('../models/training.model');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/training-smart/analyze-gaps
 * @desc AI Trigger to check quality/feedback and assign courses
 */
router.post('/analyze-gaps', authorizeRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const result = await SmartTrainingService.runSkillGapAnalysis(req.user.id);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/training-smart/analyze-outcomes/:therapistId
 * @desc Check if a therapist needs clinical training based on patient stagnation
 */
router.post('/analyze-outcomes/:therapistId', authorizeRole(['ADMIN', 'HR', 'CLINICAL_MANAGER']), async (req, res) => {
  try {
    const result = await SmartTrainingService.analyzeClinicalOutcomes(req.params.therapistId);
    res.json({ success: true, actionTaken: !!result, details: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/training-smart/my-courses
 * @desc Get courses for the logged-in employee
 */
router.get('/my-courses', async (req, res) => {
  try {
    // Need to find Employee ID from User ID first
    const Employee = require('../models/Employee');
    const emp = await Employee.findOne({ userId: req.user.id });

    if (!emp) return res.status(404).json({ message: 'Employee profile not found' });

    const courses = await Training.find({
      'participants.employeeId': emp._id,
    });

    res.json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT /api/training-smart/complete/:id
 * @desc Mark course as completed (Self-paced)
 */
router.put('/complete/:id', async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const emp = await Employee.findOne({ userId: req.user.id });
    if (!emp) return res.status(404).json({ message: 'Employee profile not found' });

    const course = await Training.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const participant = course.participants.find(p => p.employeeId.toString() === emp._id.toString());
    if (!participant) return res.status(403).json({ message: 'Not enrolled' });

    participant.status = 'completed';
    participant.completionDate = new Date();
    participant.score = 100; // Mock score for self-paced

    await course.save();
    res.json({ success: true, message: 'Course completed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

