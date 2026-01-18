const express = require('express');
const router = express.Router();
const SmartClinicalService = require('../services/smartClinical.service');
const GoalBank = require('../models/GoalBank');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Auto-seed on load (for convenience) - Skipped in Test Env or Mock DB to prevent open handles/hangs
if (process.env.NODE_ENV !== 'test' && process.env.USE_MOCK_DB !== 'true') {
  SmartClinicalService.initSeed();
}

// ============ GOAL BANK ============

/**
 * @route GET /api/clinical-smart/goals/suggest
 * @query domain (SPEECH, OT, PT)
 * @query age (years)
 */
router.get('/goals/suggest', async (req, res) => {
  try {
    const { domain, age } = req.query;
    if (!domain || !age) return res.status(400).json({ message: 'domain and age params required' });

    const suggestions = await SmartClinicalService.suggestGoals(domain, Number(age));
    res.json({ success: true, count: suggestions.length, data: suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route POST /api/clinical-smart/goals
 * @desc Add new template to bank (Therapists contributing knowledge)
 */
router.post('/goals', async (req, res) => {
  try {
    const goal = new GoalBank(req.body);
    await goal.save();
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ============ CLINICAL MONITORING ============

/**
 * @route POST /api/clinical-smart/run-checks
 * @desc Manual trigger for Clinical Quality Checks
 */
router.post('/run-checks', async (req, res) => {
  try {
    const result = await SmartClinicalService.checkStalledProgress(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
