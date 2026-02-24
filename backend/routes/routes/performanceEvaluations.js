const express = require('express');
const router = express.Router();
const PerformanceEvaluationController = require('../controllers/PerformanceEvaluationController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// إنشاء تقييم جديد
router.post('/', PerformanceEvaluationController.createEvaluation);
// جلب تقييمات موظف
router.get('/employee/:employeeId', PerformanceEvaluationController.getEmployeeEvaluations);
// توليد توصية ذكية لتقييم
router.get('/:id/ai-recommendation', PerformanceEvaluationController.getAIRecommendation);

module.exports = router;
