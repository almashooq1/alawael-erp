'use strict';
/**
 * Traffic Fines Routes — مسارات المخالفات المرورية
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const { page = 1, limit = 20, driverId, vehicleId, status, from, to } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (from || to) {
      filter.violationDate = {};
      if (from) filter.violationDate.$gte = new Date(from);
      if (to) filter.violationDate.$lte = new Date(to);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      TrafficFine.find(filter).sort({ violationDate: -1 }).skip(skip).limit(+limit).lean(),
      TrafficFine.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'trafficFines');
  }
});

router.post('/', async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const fine = await TrafficFine.create({
      ...req.body,
      status: 'unpaid',
      reportedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: fine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const fine = await TrafficFine.findById(req.params.id).lean();
    if (!fine) return res.status(404).json({ success: false, message: 'Traffic fine not found' });
    res.json({ success: true, data: fine });
  } catch (err) {
    return safeError(res, err, 'trafficFines');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const fine = await TrafficFine.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!fine) return res.status(404).json({ success: false, message: 'Traffic fine not found' });
    res.json({ success: true, data: fine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/pay', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const { receiptNumber, paidAmount } = req.body;
    const fine = await TrafficFine.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date(), receiptNumber, paidAmount, paidBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!fine) return res.status(404).json({ success: false, message: 'Traffic fine not found' });
    res.json({ success: true, data: fine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/contest', async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const { contestReason } = req.body;
    const fine = await TrafficFine.findByIdAndUpdate(
      req.params.id,
      { status: 'contested', contestReason, contestedAt: new Date(), contestedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!fine) return res.status(404).json({ success: false, message: 'Traffic fine not found' });
    res.json({ success: true, data: fine });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const TrafficFine = require('../models/Fleet/TrafficFine');
    const [total, unpaid, totalAmount] = await Promise.all([
      TrafficFine.countDocuments(),
      TrafficFine.countDocuments({ status: 'unpaid' }),
      TrafficFine.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({
      success: true,
      data: { total, unpaid, totalAmount: (totalAmount[0] || { total: 0 }).total },
    });
  } catch (err) {
    return safeError(res, err, 'trafficFines');
  }
});

module.exports = router;
