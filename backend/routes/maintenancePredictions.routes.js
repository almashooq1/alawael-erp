/**
 * Maintenance Prediction Routes — مسارات الصيانة التنبؤية
 * Predictive maintenance alerts, risk tracking
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const MaintenancePrediction = require('../models/MaintenancePrediction');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/maintenance-predictions — list predictions */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { assetId, predictionType, riskLevel, status, urgency, page = 1, limit = 25 } = req.query;
    const filter = { ...branchFilter(req) };
    if (assetId) filter.assetId = assetId;
    if (predictionType) filter.predictionType = predictionType;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      MaintenancePrediction.find(filter)
        .populate('assetId', 'name type')
        .populate('acknowledgedBy', 'name')
        .sort({ predictedDate: 1 })
        .skip(skip)
        .limit(Number(limit)),
      MaintenancePrediction.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'maintenancePrediction list error');
  }
});

/** GET /api/maintenance-predictions/dashboard — prediction dashboard */
router.get('/dashboard', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const [byStatus, byRisk, byUrgency, upcoming] = await Promise.all([
      MaintenancePrediction.aggregate([
        { $match: { ...scope } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      MaintenancePrediction.aggregate([
        { $match: { ...scope, status: { $nin: ['resolved', 'ignored'] } } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
      MaintenancePrediction.aggregate([
        { $match: { ...scope, status: { $nin: ['resolved', 'ignored'] } } },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
      ]),
      MaintenancePrediction.find({
        ...scope,
        status: { $nin: ['resolved', 'ignored'] },
        predictedDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      })
        .populate('assetId', 'name')
        .sort({ predictedDate: 1 })
        .limit(10),
    ]);
    res.json({ success: true, data: { byStatus, byRisk, byUrgency, upcoming } });
  } catch (err) {
    safeError(res, err, 'maintenancePrediction dashboard error');
  }
});

/** GET /api/maintenance-predictions/:id — get single prediction */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    })
      .populate('assetId')
      .populate('acknowledgedBy', 'name');
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    safeError(res, err, 'maintenancePrediction get error');
  }
});

/** POST /api/maintenance-predictions — create prediction */
router.post(
  '/',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      const body = { ...stripUpdateMeta(req.body) };
      if (req.branchScope && req.branchScope.branchId) {
        body.branchId = req.branchScope.branchId;
      }
      const prediction = await MaintenancePrediction.create(body);
      res.status(201).json({ success: true, data: prediction });
    } catch (err) {
      logger.error('maintenancePrediction create error:', err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  }
);

/** PUT /api/maintenance-predictions/:id — update prediction */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/maintenance-predictions/:id — delete prediction (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const prediction = await MaintenancePrediction.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!prediction)
        return res.status(404).json({ success: false, message: 'Prediction not found' });
      res.json({ success: true, message: 'Prediction deleted' });
    } catch (err) {
      safeError(res, err, 'maintenancePrediction delete error');
    }
  }
);

/** PATCH /api/maintenance-predictions/:id/acknowledge — acknowledge prediction */
router.patch('/:id/acknowledge', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      {
        status: 'acknowledged',
        acknowledgedBy: req.user?._id || req.user?.id,
        acknowledgedDate: new Date(),
      },
      { new: true }
    );
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction acknowledge error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/maintenance-predictions/:id/resolve — resolve prediction */
router.patch('/:id/resolve', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { actualResult } = req.body;
    const prediction = await MaintenancePrediction.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      { status: 'resolved', resolutionDate: new Date(), actualResult },
      { new: true }
    );
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction resolve error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
