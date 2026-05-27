'use strict';
/**
 * Fleet Fuel Routes — مسارات سجلات الوقود
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
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
      FleetFuel.find(filter).sort({ date: -1 }).skip(skip).limit(+limit).lean(),
      FleetFuel.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetFuel');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
    const entry = await FleetFuel.create({ ...req.body, recordedBy: req.user._id });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
    const entry = await FleetFuel.findById(req.params.id).lean();
    if (!entry) return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    return safeError(res, err, 'fleetFuel');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
    const entry = await FleetFuel.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/consumption', async (req, res) => {
  try {
    const FleetFuel = require('../models/Fleet/FleetFuel');
    const { from, to, vehicleId } = req.query;
    const match = {};
    if (vehicleId) match.vehicleId = vehicleId;
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const data = await FleetFuel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$vehicleId',
          totalLiters: { $sum: '$liters' },
          totalCost: { $sum: '$cost' },
          entries: { $sum: 1 },
        },
      },
      { $sort: { totalCost: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'fleetFuel');
  }
});

module.exports = router;
