const express = require('express');
const router = express.Router();
const SmartFeedbackService = require('../services/smartFeedback.service');
const Feedback = require('../models/Feedback');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/feedback-smart/submit
 * @desc Parent submits feedback after session
 */
router.post('/submit', async (req, res) => {
  try {
    const feedback = await SmartFeedbackService.processFeedback(req.body);
    res.status(201).json({ success: true, message: 'Feedback received', data: feedback });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route GET /api/feedback-smart/nps
 * @desc Get Net Promoter Score stats
 */
router.get('/nps', authorizeRole(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'Month/Year required' });

    const stats = await SmartFeedbackService.getNPSAnalytics(month, year);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/feedback-smart/alerts
 * @desc Get Unresolved Negative Feedback (Detractors)
 */
router.get('/alerts', authorizeRole(['ADMIN', 'CARE_MANAGER']), async (req, res) => {
  try {
    const alerts = await SmartFeedbackService.getDetractors();
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT /api/feedback-smart/resolve/:id
 * @desc Close the feedback loop (Call the parent)
 */
router.put('/resolve/:id', authorizeRole(['ADMIN', 'CARE_MANAGER']), async (req, res) => {
  try {
    const { notes } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(req.params.id, { followUpStatus: 'RESOLVED', followUpNotes: notes }, { new: true });
    res.json({ success: true, message: 'Case Resolved', data: feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
