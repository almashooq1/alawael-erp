const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const { generateAIRecommendation } = require('../services/performanceEvaluationAI');

const PerformanceEvaluationController = {
  // إنشاء تقييم جديد
  createEvaluation: async (req, res) => {
    try {
      const { employeeId, evaluationPeriod, evaluations, hrNotes } = req.body;
      const perfEval = new PerformanceEvaluation({
        employeeId,
        evaluationPeriod,
        evaluations,
        hrNotes,
        status: 'draft',
      });
      perfEval.calculateOverallScore();
      perfEval.summary.aiRecommendation = generateAIRecommendation(perfEval);
      await perfEval.save();
      res.json({ success: true, evaluation: perfEval });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // جلب تقييمات موظف
  getEmployeeEvaluations: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const evals = await PerformanceEvaluation.find({ employeeId }).sort({
        'evaluationPeriod.startDate': -1,
      });
      res.json({ success: true, evaluations: evals });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
  // توليد توصية ذكية لتقييم موجود
  getAIRecommendation: async (req, res) => {
    try {
      const { id } = req.params;
      const perfEval = await PerformanceEvaluation.findById(id);
      if (!perfEval) return res.status(404).json({ success: false, message: 'Not found' });
      perfEval.calculateOverallScore();
      const rec = generateAIRecommendation(perfEval);
      res.json({ success: true, recommendation: rec });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = PerformanceEvaluationController;
