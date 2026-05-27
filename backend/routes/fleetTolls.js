'use strict';
/**
 * Fleet Tolls Routes — مسارات رسوم العبور
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
    const FleetToll = require('../models/Fleet/FleetToll');
    const { page = 1, limit = 20, vehicleId, driverId, from, to } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetToll.find(filter).sort({ date: -1 }).skip(skip).limit(+limit).lean(),
      FleetToll.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetTolls');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetToll = require('../models/Fleet/FleetToll');
    const toll = await FleetToll.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: toll });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetToll = require('../models/Fleet/FleetToll');
    const toll = await FleetToll.findById(req.params.id).lean();
    if (!toll) return res.status(404).json({ success: false, message: 'Toll record not found' });
    res.json({ success: true, data: toll });
  } catch (err) {
    return safeError(res, err, 'fleetTolls');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetToll = require('../models/Fleet/FleetToll');
    const toll = await FleetToll.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!toll) return res.status(404).json({ success: false, message: 'Toll record not found' });
    res.json({ success: true, data: toll });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const FleetToll = require('../models/Fleet/FleetToll');
    await FleetToll.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Toll record deleted' });
  } catch (err) {
    return safeError(res, err, 'fleetTolls');
  }
});

router.get('/stats/total', async (req, res) => {
  try {
    const FleetToll = require('../models/Fleet/FleetToll');
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const data = await FleetToll.aggregate([
      { $match: match },
      { $group: { _id: '$vehicleId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'fleetTolls');
  }
});

module.exports = router;
