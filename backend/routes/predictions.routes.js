const express = require('express');
const router = express.Router();
const Prediction = require('../models/prediction.model');
const aiService = require('../services/ai-predictions.service');
const { authenticateToken } = require('../middleware/auth');

// توقع الأداء
router.post('/predict-performance', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    const userId = req.user.id || req.user._id;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الإدخال مطلوبة',
      });
    }

    const prediction = await aiService.predictPerformance(userId, data);

    res.json({
      success: true,
      message: 'تم توقع الأداء بنجاح',
      data: prediction,
    });
  } catch (error) {
    console.error('خطأ في توقع الأداء:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل توقع الأداء',
    });
  }
});

// توقع الانسحاب
router.get('/predict-churn/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await aiService.predictChurn(req.params.userId);

    res.json({
      success: true,
      message: 'تم تحليل احتمالية الانسحاب',
      data: result,
    });
  } catch (error) {
    console.error('خطأ في توقع الانسحاب:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل توقع الانسحاب',
    });
  }
});

// توقع السلوك
router.get('/predict-behavior/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await aiService.predictBehavior(req.params.userId);

    res.json({
      success: true,
      message: 'تم توقع السلوك',
      data: result,
    });
  } catch (error) {
    console.error('خطأ في توقع السلوك:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل توقع السلوك',
    });
  }
});

// توقع الاتجاهات
router.get('/predict-trends/:category', authenticateToken, async (req, res) => {
  try {
    const { timeframe } = req.query;
    const result = await aiService.predictTrends(req.params.category, parseInt(timeframe) || 30);

    res.json({
      success: true,
      message: 'تم تحليل الاتجاهات',
      data: result,
    });
  } catch (error) {
    console.error('خطأ في توقع الاتجاهات:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل توقع الاتجاهات',
    });
  }
});

// الحصول على التنبؤات السابقة
router.get('/predictions/:userId', authenticateToken, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.params.userId });

    // Handle both real MongoDB and mock models
    const result = Array.isArray(predictions) ? predictions : predictions.slice ? predictions : [];

    res.json({
      success: true,
      data: result.slice(0, 10),
    });
  } catch (error) {
    console.error('خطأ في جلب التنبؤات:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل جلب التنبؤات',
    });
  }
});

// التوصيات المخصصة
router.get('/recommendations/:userId', authenticateToken, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.params.userId });

    // Handle both real MongoDB and mock models
    const predArray = Array.isArray(predictions) ? predictions : [];
    const recommendations = predArray.length > 0 ? predArray[0].recommendations || [] : [];

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error('خطأ في جلب التوصيات:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'فشل جلب التوصيات',
    });
  }
});

module.exports = router;
