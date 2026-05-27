'use strict';
/**
 * Fleet Costs Routes — مسارات تكاليف الأسطول
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
    const FleetCost = require('../models/Fleet/FleetCost');
    const { page = 1, limit = 20, vehicleId, category, from, to } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetCost.find(filter).sort({ date: -1 }).skip(skip).limit(+limit).lean(),
      FleetCost.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetCosts');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetCost = require('../models/Fleet/FleetCost');
    const cost = await FleetCost.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: cost });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetCost = require('../models/Fleet/FleetCost');
    const cost = await FleetCost.findById(req.params.id).lean();
    if (!cost) return res.status(404).json({ success: false, message: 'Cost record not found' });
    res.json({ success: true, data: cost });
  } catch (err) {
    return safeError(res, err, 'fleetCosts');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetCost = require('../models/Fleet/FleetCost');
    const cost = await FleetCost.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!cost) return res.status(404).json({ success: false, message: 'Cost record not found' });
    res.json({ success: true, data: cost });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const FleetCost = require('../models/Fleet/FleetCost');
    await FleetCost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Cost record deleted' });
  } catch (err) {
    return safeError(res, err, 'fleetCosts');
  }
});

router.get('/summary/by-category', async (req, res) => {
  try {
    const FleetCost = require('../models/Fleet/FleetCost');
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const data = await FleetCost.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'fleetCosts');
  }
});

module.exports = router;
