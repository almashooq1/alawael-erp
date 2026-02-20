/**
 * AI Recommendations Controller
 * متحكم توصيات الذكاء الاصطناعي
 * 
 * REST endpoints for AI-powered recommendations
 * نقاط نهاية الويب لتوصيات مدعومة بالذكاء الاصطناعي
 */

const { Router } = require('express');
const Logger = require('../utils/logger');
const aiModels = require('../services/aiModels.service');
const recommendationsEngine = require('../services/recommendationsEngine.service');

const router = Router();

// ==================== RECOMMENDATIONS ====================

/**
 * Generate recommendations for user
 * توليد التوصيات للمستخدم
 * 
 * POST /api/ai/recommendations
 * Body: { userId, limit, cacheMaxAge }
 */
router.post('/', async (req, res) => {
  try {
    const { userId, limit = 10, cacheMaxAge = 300000 } = req.body;
    const tenantId = req.tenant?.id || req.body.tenantId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب | User ID required'
      });
    }

    const recommendations = recommendationsEngine.generateRecommendations(
      tenantId,
      userId,
      { limit, cacheMaxAge }
    );

    res.json({
      success: true,
      message: 'تم توليد التوصيات بنجاح | Recommendations generated successfully',
      data: recommendations
    });
  } catch (error) {
    Logger.error(`Error generating recommendations: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في توليد التوصيات | Failed to generate recommendations',
      error: error.message
    });
  }
});

/**
 * Get personalized recommendations for tenant users
 * الحصول على التوصيات الشخصية لمستخدمي الالتزام
 * 
 * POST /api/ai/recommendations/tenant
 * Body: { users: [{ id, name }], options }
 */
router.post('/tenant/personalize', async (req, res) => {
  try {
    const { users, options = {} } = req.body;
    const tenantId = req.tenant?.id || req.body.tenantId;

    if (!users || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'قائمة المستخدمين مطلوبة | Users list required'
      });
    }

    const personalized = recommendationsEngine.personalizeForTenant(
      tenantId,
      users,
      options
    );

    res.json({
      success: true,
      message: 'تم شخصنة التوصيات بنجاح | Personalized successfully',
      data: personalized
    });
  } catch (error) {
    Logger.error(`Error personalizing: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في الشخصنة | Personalization failed',
      error: error.message
    });
  }
});

/**
 * Get recommendation history for user
 * الحصول على سجل التوصيات للمستخدم
 * 
 * GET /api/ai/recommendations/:userId/history
 */
router.get('/:userId/history', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.query.tenantId;
    const { limit, startDate, endDate } = req.query;

    const history = recommendationsEngine.getRecommendationHistory(
      tenantId,
      req.params.userId,
      { limit: limit ? parseInt(limit) : 50, startDate, endDate }
    );

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    Logger.error(`Error fetching history: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب السجل | Failed to fetch history',
      error: error.message
    });
  }
});

// ==================== USER FEEDBACK ====================

/**
 * Record feedback on recommendation
 * تسجيل ردود فعل على التوصية
 * 
 * POST /api/ai/feedback
 * Body: { userId, recommendationId, rating, helpful, comment, action }
 */
router.post('/feedback/record', async (req, res) => {
  try {
    const { userId, recommendationId, rating, helpful, comment, action } = req.body;
    const tenantId = req.tenant?.id || req.body.tenantId;

    if (!userId || !recommendationId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم والتوصية والتقييم مطلوبة | User ID, recommendation ID, and rating required'
      });
    }

    const feedback = recommendationsEngine.recordFeedback(
      tenantId,
      userId,
      recommendationId,
      { rating, helpful, comment, action }
    );

    res.status(201).json({
      success: true,
      message: 'تم تسجيل ردود الفعل بنجاح | Feedback recorded successfully',
      data: feedback
    });
  } catch (error) {
    Logger.error(`Error recording feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل ردود الفعل | Failed to record feedback',
      error: error.message
    });
  }
});

/**
 * Get user feedback
 * الحصول على ردود فعل المستخدم
 * 
 * GET /api/ai/feedback/:userId
 */
router.get('/feedback/:userId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.query.tenantId;
    const feedback = recommendationsEngine.getUserFeedback(tenantId, req.params.userId);

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    Logger.error(`Error fetching feedback: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب ردود الفعل | Failed to fetch feedback',
      error: error.message
    });
  }
});

// ==================== USER PREFERENCES ====================

/**
 * Get user preferences
 * الحصول على تفضيلات المستخدم
 * 
 * GET /api/ai/preferences/:userId
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.query.tenantId;
    const preferences = recommendationsEngine.getUserPreferences(tenantId, req.params.userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    Logger.error(`Error fetching preferences: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التفضيلات | Failed to fetch preferences',
      error: error.message
    });
  }
});

/**
 * Update user preferences
 * تحديث تفضيلات المستخدم
 * 
 * PUT /api/ai/preferences/:userId
 * Body: { categories, excludeCategories, topics, maxRecommendations, diversity, freshness }
 */
router.put('/preferences/:userId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.body.tenantId;
    const preferences = recommendationsEngine.updateUserPreferences(
      tenantId,
      req.params.userId,
      req.body
    );

    res.json({
      success: true,
      message: 'تم تحديث التفضيلات بنجاح | Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    Logger.error(`Error updating preferences: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث التفضيلات | Failed to update preferences',
      error: error.message
    });
  }
});

// ==================== AI MODELS ====================

/**
 * Register new AI model
 * تسجيل نموذج ذكاء اصطناعي جديد
 * 
 * POST /api/ai/models
 */
router.post('/models/register', async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      algorithm,
      inputs,
      outputs,
      accuracy,
      precision,
      recall,
      trainingDataSize
    } = req.body;

    if (!name || !type || !algorithm) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والنوع والخوارزمية مطلوبة | Name, type, and algorithm required'
      });
    }

    const model = aiModels.registerModel({
      name,
      type,
      description,
      algorithm,
      inputs,
      outputs,
      accuracy,
      precision,
      recall,
      trainingDataSize
    });

    res.status(201).json({
      success: true,
      message: 'تم تسجيل النموذج بنجاح | Model registered successfully',
      data: model
    });
  } catch (error) {
    Logger.error(`Error registering model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل النموذج | Failed to register model',
      error: error.message
    });
  }
});

/**
 * Get all models
 * الحصول على جميع النماذج
 * 
 * GET /api/ai/models
 */
router.get('/models/all', async (req, res) => {
  try {
    const models = aiModels.getAllModels();

    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    Logger.error(`Error fetching models: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب النماذج | Failed to fetch models',
      error: error.message
    });
  }
});

/**
 * Get model by ID
 * الحصول على النموذج حسب المعرف
 * 
 * GET /api/ai/models/:modelId
 */
router.get('/models/:modelId', async (req, res) => {
  try {
    const model = aiModels.getModel(req.params.modelId);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'النموذج غير موجود | Model not found'
      });
    }

    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    Logger.error(`Error fetching model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب النموذج | Failed to fetch model',
      error: error.message
    });
  }
});

/**
 * Get models by type
 * الحصول على النماذج حسب الحسب
 * 
 * GET /api/ai/models/type/:type
 */
router.get('/models/type/:type', async (req, res) => {
  try {
    const models = aiModels.getModelsByType(req.params.type);

    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    Logger.error(`Error fetching models by type: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب النماذج | Failed to fetch models',
      error: error.message
    });
  }
});

/**
 * Deploy model
 * نشر النموذج
 * 
 * POST /api/ai/models/:modelId/deploy
 */
router.post('/models/:modelId/deploy', async (req, res) => {
  try {
    const deployed = aiModels.deployModel(req.params.modelId);

    res.json({
      success: true,
      message: 'تم نشر النموذج بنجاح | Model deployed successfully',
      data: deployed
    });
  } catch (error) {
    Logger.error(`Error deploying model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في نشر النموذج | Failed to deploy model',
      error: error.message
    });
  }
});

/**
 * Undeploy model
 * إزالة نشر النموذج
 * 
 * POST /api/ai/models/:modelId/undeploy
 */
router.post('/models/:modelId/undeploy', async (req, res) => {
  try {
    const success = aiModels.undeployModel(req.params.modelId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'فشل في إزالة النشر | Failed to undeploy'
      });
    }

    res.json({
      success: true,
      message: 'تم إزالة نشر النموذج بنجاح | Model undeployed successfully'
    });
  } catch (error) {
    Logger.error(`Error undeploying model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إزالة نشر النموذج | Failed to undeploy model',
      error: error.message
    });
  }
});

/**
 * Get model metrics
 * الحصول على مقاييس النموذج
 * 
 * GET /api/ai/models/:modelId/metrics
 */
router.get('/models/:modelId/metrics', async (req, res) => {
  try {
    const metrics = aiModels.getModelMetrics(req.params.modelId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'النموذج غير موجود | Model not found'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    Logger.error(`Error fetching metrics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المقاييس | Failed to fetch metrics',
      error: error.message
    });
  }
});

/**
 * Train model
 * تدريب النموذج
 * 
 * POST /api/ai/models/:modelId/train
 * Body: { size, epochs, batchSize, learningRate }
 */
router.post('/models/:modelId/train', async (req, res) => {
  try {
    const trainingJob = aiModels.trainModel(req.params.modelId, req.body);

    res.status(202).json({
      success: true,
      message: 'بدء التدريب | Training started',
      data: trainingJob
    });
  } catch (error) {
    Logger.error(`Error training model: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تدريب النموذج | Failed to train model',
      error: error.message
    });
  }
});

/**
 * Make prediction
 * إجراء التنبؤ
 * 
 * POST /api/ai/models/:modelId/predict
 * Body: { input data }
 */
router.post('/models/:modelId/predict', async (req, res) => {
  try {
    const prediction = aiModels.predict(req.params.modelId, req.body);

    res.json({
      success: true,
      message: 'تم إجراء التنبؤ بنجاح | Prediction made successfully',
      data: prediction
    });
  } catch (error) {
    Logger.error(`Error making prediction: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إجراء التنبؤ | Failed to make prediction',
      error: error.message
    });
  }
});

// ==================== A/B TESTING ====================

/**
 * Create A/B test
 * إنشاء اختبار A/B
 * 
 * POST /api/ai/tests
 * Body: { name, description, variants, startDate, endDate }
 */
router.post('/tests/create', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.body.tenantId;
    const test = recommendationsEngine.createABTest(tenantId, req.body);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاختبار بنجاح | A/B test created successfully',
      data: test
    });
  } catch (error) {
    Logger.error(`Error creating A/B test: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الاختبار | Failed to create test',
      error: error.message
    });
  }
});

/**
 * Record A/B test event
 * تسجيل حدث اختبار A/B
 * 
 * POST /api/ai/tests/:testId/event
 * Body: { variant, eventType }
 */
router.post('/tests/:testId/event', async (req, res) => {
  try {
    const { variant, eventType } = req.body;

    if (!variant || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'البديل وحدث الكم مطلوب | Variant and event type required'
      });
    }

    recommendationsEngine.recordABTestEvent(req.params.testId, variant, eventType);

    res.json({
      success: true,
      message: 'تم تسجيل الحدث بنجاح | Event recorded successfully'
    });
  } catch (error) {
    Logger.error(`Error recording event: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في تسجيل الحدث | Failed to record event',
      error: error.message
    });
  }
});

/**
 * Get A/B test results
 * الحصول على نتائج اختبار A/B
 * 
 * GET /api/ai/tests/:testId
 */
router.get('/tests/:testId', async (req, res) => {
  try {
    const results = recommendationsEngine.getABTestResults(req.params.testId);

    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'الاختبار غير موجود | Test not found'
      });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    Logger.error(`Error fetching test results: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب نتائج الاختبار | Failed to fetch test results',
      error: error.message
    });
  }
});

// ==================== STATISTICS ====================

/**
 * Get AI system statistics
 * الحصول على إحصائيات نظام الذكاء الاصطناعي
 * 
 * GET /api/ai/stats
 */
router.get('/stats/all', async (req, res) => {
  try {
    const recommendationStats = recommendationsEngine.getStatistics();
    const modelStats = aiModels.getStatistics();

    res.json({
      success: true,
      data: {
        recommendations: recommendationStats,
        models: modelStats,
        timestamp: new Date()
      }
    });
  } catch (error) {
    Logger.error(`Error fetching statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات | Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * Get active models
 * الحصول على النماذج النشطة
 * 
 * GET /api/ai/models/active/list
 */
router.get('/models/active/list', async (req, res) => {
  try {
    const activeModels = aiModels.getActiveModels();

    res.json({
      success: true,
      data: activeModels,
      count: activeModels.length
    });
  } catch (error) {
    Logger.error(`Error fetching active models: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب النماذج النشطة | Failed to fetch active models',
      error: error.message
    });
  }
});

module.exports = router;
