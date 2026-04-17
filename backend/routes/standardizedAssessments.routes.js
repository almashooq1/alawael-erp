/**
 * Standardized Assessment Routes — مسارات التقييمات المعيارية
 * CRUD for standardized clinical assessments (GMFM-88, CARS, Vineland-3, etc.)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const StandardizedAssessment = require('../models/StandardizedAssessment');
const logger = require('../utils/logger');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

/** GET /api/standardized-assessments — list assessments */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { beneficiary, evaluator, name, startDate, endDate, page = 1, limit = 25 } = req.query;
    const filter = { ...branchFilter(req) };
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
    safeError(res, err, 'standardizedAssessment list error');
  }
});

/** GET /api/standardized-assessments/tools — list distinct test names */
router.get('/tools', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const tools = await StandardizedAssessment.aggregate([
      { $match: scope },
      { $group: { _id: '$name', count: { $sum: 1 }, lastUsed: { $max: '$date' } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: tools });
  } catch (err) {
    safeError(res, err, 'standardizedAssessment tools error');
  }
});

/** GET /api/standardized-assessments/beneficiary/:beneficiaryId/history — assessment history */
router.get(
  '/beneficiary/:beneficiaryId/history',
  requireAuth,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { name } = req.query;
      const filter = { beneficiary: req.params.beneficiaryId, ...branchFilter(req) };
      if (name) filter.name = name;

      const data = await StandardizedAssessment.find(filter)
        .populate('evaluator', 'name')
        .sort({ date: 1 })
        .select('name date totalScore interpretation');
      res.json({ success: true, data });
    } catch (err) {
      safeError(res, err, 'standardizedAssessment history error');
    }
  }
);

/** GET /api/standardized-assessments/:id — get single assessment */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const assessment = await StandardizedAssessment.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    })
      .populate('beneficiary', 'name fileNumber')
      .populate('evaluator', 'name');
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    safeError(res, err, 'standardizedAssessment get error');
  }
});

/** POST /api/standardized-assessments — create assessment */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.evaluator) data.evaluator = req.user?._id || req.user?.id;
    if (req.branchScope && req.branchScope.branchId) {
      data.branchId = req.branchScope.branchId;
    }
    const assessment = await StandardizedAssessment.create(data);
    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    logger.error('standardizedAssessment create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/standardized-assessments/:id — update assessment */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const assessment = await StandardizedAssessment.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: assessment });
  } catch (err) {
    logger.error('standardizedAssessment update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/standardized-assessments/:id — delete assessment (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor']),
  async (req, res) => {
    try {
      const assessment = await StandardizedAssessment.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!assessment)
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      res.json({ success: true, message: 'Assessment deleted' });
    } catch (err) {
      safeError(res, err, 'standardizedAssessment delete error');
    }
  }
);

module.exports = router;
