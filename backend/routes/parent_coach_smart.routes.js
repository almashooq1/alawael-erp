const express = require('express');
const router = express.Router();
const SmartParentCoachService = require('../services/smartParentCoach.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/parent-coach-smart/ask
 * @desc Parent asks a question to the AI specific to their child
 */
router.post('/ask', async (req, res) => {
  try {
    const { beneficiaryId, question } = req.body;
    // In real app, beneficiaryId should be linked to the logged-in parent user
    const response = await SmartParentCoachService.askCoach(beneficiaryId, question);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route GET /api/parent-coach-smart/tip/:id
 * @desc Get daily personalized advice
 */
router.get('/tip/:id', async (req, res) => {
  try {
    const tip = await SmartParentCoachService.generateDailyTip(req.params.id);
    res.json({ success: true, data: tip });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
