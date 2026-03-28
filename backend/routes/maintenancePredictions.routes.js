/**
 * Maintenance Prediction Routes — مسارات الصيانة التنبؤية
 * Predictive maintenance alerts, risk tracking
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const MaintenancePrediction = require('../models/MaintenancePrediction');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

/** GET /api/maintenance-predictions — list predictions */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { assetId, predictionType, riskLevel, status, urgency, page = 1, limit = 25 } = req.query;
    const filter = {};
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
    logger.error('maintenancePrediction list error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-predictions/dashboard — prediction dashboard */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [byStatus, byRisk, byUrgency, upcoming] = await Promise.all([
      MaintenancePrediction.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      MaintenancePrediction.aggregate([
        { $match: { status: { $nin: ['resolved', 'ignored'] } } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
      MaintenancePrediction.aggregate([
        { $match: { status: { $nin: ['resolved', 'ignored'] } } },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
      ]),
      MaintenancePrediction.find({
        status: { $nin: ['resolved', 'ignored'] },
        predictedDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      })
        .populate('assetId', 'name')
        .sort({ predictedDate: 1 })
        .limit(10),
    ]);
    res.json({ success: true, data: { byStatus, byRisk, byUrgency, upcoming } });
  } catch (err) {
    logger.error('maintenancePrediction dashboard error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/maintenance-predictions/:id — get single prediction */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findById(req.params.id)
      .populate('assetId')
      .populate('acknowledgedBy', 'name');
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction get error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-predictions — create prediction */
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'supervisor', 'fleet_manager']),
  async (req, res) => {
    try {
      const prediction = await MaintenancePrediction.create(req.body);
      res.status(201).json({ success: true, data: prediction });
    } catch (err) {
      logger.error('maintenancePrediction create error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/** PUT /api/maintenance-predictions/:id — update prediction */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction update error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/** DELETE /api/maintenance-predictions/:id — delete prediction (admin) */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findByIdAndDelete(req.params.id);
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, message: 'Prediction deleted' });
  } catch (err) {
    logger.error('maintenancePrediction delete error:', err);
    res.status(500).json({ success: false, message: safeError(err) });
  }
});

/** PATCH /api/maintenance-predictions/:id/acknowledge — acknowledge prediction */
router.patch('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const prediction = await MaintenancePrediction.findByIdAndUpdate(
      req.params.id,
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
    res.status(400).json({ success: false, message: err.message });
  }
});

/** PATCH /api/maintenance-predictions/:id/resolve — resolve prediction */
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { actualResult } = req.body;
    const prediction = await MaintenancePrediction.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolutionDate: new Date(), actualResult },
      { new: true }
    );
    if (!prediction)
      return res.status(404).json({ success: false, message: 'Prediction not found' });
    res.json({ success: true, data: prediction });
  } catch (err) {
    logger.error('maintenancePrediction resolve error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
