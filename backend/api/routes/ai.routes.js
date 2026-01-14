/**
 * AI Analytics Routes
 * مسارات تحليلات الذكاء الاصطناعي
 */

const express = require('express');
const router = express.Router();
const AIAnalyticsService = require('../../services/aiAnalyticsService');

const aiService = new AIAnalyticsService();

/**
 * POST /api/ai/predict/attendance
 * التنبؤ بأنماط الحضور
 */
router.post('/ai/predict/attendance', (req, res, next) => {
  try {
    const { employeeData, historyData } = req.body;

    if (!employeeData || !historyData) {
      return res.status(400).json({ success: false, error: 'بيانات الموظف والسجل مطلوبة' });
    }

    const result = aiService.predictAttendancePatterns(employeeData, historyData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/predict/performance
 * التنبؤ بالأداء
 */
router.post('/ai/predict/performance', (req, res, next) => {
  try {
    const { employeeId, metrics } = req.body;

    if (!employeeId || !metrics) {
      return res.status(400).json({ success: false, error: 'معرف الموظف والمقاييس مطلوبة' });
    }

    const result = aiService.predictPerformance(employeeId, metrics);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/detect/anomalies
 * كشف الشذوذ
 */
router.post('/ai/detect/anomalies', (req, res, next) => {
  try {
    const { data, type } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'البيانات مطلوبة' });
    }

    const result = aiService.detectAnomalies(data, type || 'general');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/recommendations
 * التوصيات الذكية
 */
router.post('/ai/recommendations', (req, res, next) => {
  try {
    const { userId, userProfile, contextData } = req.body;

    if (!userId || !userProfile) {
      return res.status(400).json({ success: false, error: 'معرف المستخدم وملفه مطلوبان' });
    }

    const result = aiService.generateSmartRecommendations(userId, userProfile, contextData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai/analyze/trends
 * تحليل الاتجاهات
 */
router.post('/ai/analyze/trends', (req, res, next) => {
  try {
    const { data, timeField } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: 'البيانات مطلوبة' });
    }

    const result = aiService.analyzeTrends(data, timeField || 'date');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/models
 * الحصول على قائمة النماذج
 */
router.get('/ai/models', (req, res, next) => {
  try {
    const models = Array.from(aiService.models.values()).map(model => ({
      name: model.name,
      accuracy: model.accuracy,
      lastTrained: model.lastTrained,
      features: model.features,
    }));

    res.json({
      success: true,
      total: models.length,
      models,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai/models/:id/info
 * معلومات نموذج معين
 */
router.get('/ai/models/:id/info', (req, res, next) => {
  try {
    const model = aiService.models.get(req.params.id);

    if (!model) {
      return res.status(404).json({ success: false, error: 'النموذج غير موجود' });
    }

    res.json({
      success: true,
      model,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
