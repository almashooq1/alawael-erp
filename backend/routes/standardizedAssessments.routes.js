/**
 * Standardized Assessment Routes — مسارات التقييمات المعيارية
 * CRUD for standardized clinical assessments (GMFM-88, CARS, Vineland-3, etc.)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const StandardizedAssessment = require('../models/StandardizedAssessment');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/standardized-assessments — list assessments */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { beneficiary, evaluator, name, startDate, endDate, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (beneficiary) filter.beneficiary = beneficiary;
    if (evaluator) filter.evaluator = evaluator;
    if (name) filter.name = { $regex: escapeRegex(String(name)), $options: 'i' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StandardizedAssessment.find(filter)
        .populate('beneficiary', 'name fileNumber')
        .populate('evaluator', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      StandardizedAssessment.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('standardizedAssessment list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/standardized-assessments/tools — list distinct test names */
router.get('/tools', requireAuth, async (req, res) => {
  try {
    const tools = await StandardizedAssessment.aggregate([
      { $group: { _id: '$name', count: { $sum: 1 }, lastUsed: { $max: '$date' } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: tools });
  } catch (err) {
    logger.error('standardizedAssessment tools error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/standardized-assessments/beneficiary/:beneficiaryId/history — assessment history */
router.get('/beneficiary/:beneficiaryId/history', requireAuth, async (req, res) => {
  try {
    const { name } = req.query;
    const filter = { beneficiary: req.params.beneficiaryId };
    if (name) filter.name = name;

    const data = await StandardizedAssessment.find(filter)
      .populate('evaluator', 'name')
      .sort({ date: 1 })
      .select('name date totalScore interpretation');
    res.json({ success: true, data });
  } catch (err) {
    logger.error('standardizedAssessment history error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/standardized-assessments/:id — get single assessment */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const assessment = await StandardizedAssessment.findById(req.params.id)
      .populate('beneficiary', 'name fileNumber')
      .populate('evaluator', 'name');
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    logger.error('standardizedAssessment get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/standardized-assessments — create assessment */
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.evaluator) data.evaluator = req.user?._id || req.user?.id;
    const assessment = await StandardizedAssessment.create(data);
    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    logger.error('standardizedAssessment create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/standardized-assessments/:id — update assessment */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const assessment = await StandardizedAssessment.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    logger.error('standardizedAssessment update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/standardized-assessments/:id — delete assessment (admin) */
router.delete('/:id', requireAuth, requireRole(['admin', 'supervisor']), async (req, res) => {
  try {
    const assessment = await StandardizedAssessment.findByIdAndDelete(req.params.id);
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, message: 'Assessment deleted' });
  } catch (err) {
    logger.error('standardizedAssessment delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
