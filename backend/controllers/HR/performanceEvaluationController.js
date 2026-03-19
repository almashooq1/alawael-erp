/* eslint-disable no-unused-vars */
// HR Performance Evaluation Controller
const PerformanceEvaluation = require('../../models/HR/PerformanceEvaluation');

// Create new evaluation
exports.createEvaluation = async (req, res) => {
  try {
    const evaluation = new PerformanceEvaluation(req.body);
    await evaluation.save();
    res.status(201).json(evaluation);
  } catch (err) {
    res.status(400).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Get all evaluations
exports.getEvaluations = async (req, res) => {
  try {
    const evaluations = await PerformanceEvaluation.find();
    res.json(evaluations);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Get evaluation by ID
exports.getEvaluationById = async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Update evaluation
exports.updateEvaluation = async (req, res) => {
  try {
    const { employee, evaluator, period, rating, goals, strengths, improvements, notes, status } =
      req.body;
    const evaluation = await PerformanceEvaluation.findByIdAndUpdate(
      req.params.id,
      { employee, evaluator, period, rating, goals, strengths, improvements, notes, status },
      {
        new: true,
      }
    );
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json(evaluation);
  } catch (err) {
    res.status(400).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Delete evaluation
exports.deleteEvaluation = async (req, res) => {
  try {
    const evaluation = await PerformanceEvaluation.findByIdAndDelete(req.params.id);
    if (!evaluation) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
