/* eslint-disable no-unused-vars */
/**
 * AI Recommendation Routes for Disability Rehabilitation
 * مسارات API لتوصيات الذكاء الاصطناعي
 */

const express = require('express');
const router = express.Router();
const { AIRecommendationService } = require('./ai-recommendation-service');

const aiService = new AIRecommendationService();

// ============================================
// مسارات التوصيات
// ============================================

/**
 * @route GET /api/ai-recommendations/beneficiary/:id
 * @desc الحصول على توصيات لمستفيد
 * @access Private
 */
router.get('/beneficiary/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await aiService.generateRecommendations(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/ai-recommendations/analyze-progress/:id
 * @desc تحليل تقدم المستفيد
 * @access Private
 */
router.post('/analyze-progress/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const progressData = req.body;

    const result = await aiService.analyzeProgress(id, progressData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/ai-recommendations/personalize-plan
 * @desc تخصيص خطة علاجية
 * @access Private
 */
router.post('/personalize-plan', async (req, res) => {
  try {
    const { beneficiaryId, goals, constraints } = req.body;

    const result = await aiService.personalizeTreatmentPlan(beneficiaryId, goals, constraints);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

/**
 * @route POST /api/ai-recommendations/assess-risks/:id
 * @desc تقييم المخاطر
 * @access Private
 */
router.post('/assess-risks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const factors = req.body;

    const result = await aiService.assessRisks(id, factors);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي',
    });
  }
});

module.exports = router;
