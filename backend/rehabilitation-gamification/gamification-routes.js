/* eslint-disable no-unused-vars */
/**
 * Gamification Routes for Disability Rehabilitation
 * مسارات نظام الغمرة والتحفيز
 */

const express = require('express');
const router = express.Router();
const { GamificationService } = require('./gamification-service');

const gameService = new GamificationService();

/**
 * @route GET /api/gamification/beneficiary/:id/profile
 * @desc الحصول على ملف المستفيد في النظام
 */
router.get('/beneficiary/:id/profile', async (req, res) => {
  try {
    const result = await gameService.getUserProfile(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/gamification/complete-task
 * @desc إكمال مهمة وكسب نقاط
 */
router.post('/complete-task', async (req, res) => {
  try {
    const { beneficiaryId, taskId } = req.body;
    const result = await gameService.completeTask(beneficiaryId, taskId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route GET /api/gamification/beneficiary/:id/badges
 * @desc الحصول على شارات المستفيد
 */
router.get('/beneficiary/:id/badges', async (req, res) => {
  try {
    const result = await gameService.getUserBadges(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route GET /api/gamification/leaderboard
 * @desc لوحة المتصدرين
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await gameService.getLeaderboard();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
