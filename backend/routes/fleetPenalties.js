'use strict';
/**
 * Fleet Penalties Routes — مسارات المخالفات المرورية للأسطول
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
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const { page = 1, limit = 20, vehicleId, driverId, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetPenalty.find(filter).sort({ violationDate: -1 }).skip(skip).limit(+limit).lean(),
      FleetPenalty.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetPenalties');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const penalty = await FleetPenalty.create({
      ...req.body,
      status: 'pending',
      reportedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: penalty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const penalty = await FleetPenalty.findById(req.params.id).lean();
    if (!penalty) return res.status(404).json({ success: false, message: 'Penalty not found' });
    res.json({ success: true, data: penalty });
  } catch (err) {
    return safeError(res, err, 'fleetPenalties');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const penalty = await FleetPenalty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!penalty) return res.status(404).json({ success: false, message: 'Penalty not found' });
    res.json({ success: true, data: penalty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/pay', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const { receiptNumber, paidAmount, notes } = req.body;
    const penalty = await FleetPenalty.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paidAt: new Date(),
        receiptNumber,
        paidAmount,
        notes,
        paidBy: req.user._id,
      },
      { new: true }
    );
    if (!penalty) return res.status(404).json({ success: false, message: 'Penalty not found' });
    res.json({ success: true, data: penalty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-driver', async (req, res) => {
  try {
    const FleetPenalty = require('../models/Fleet/FleetPenalty');
    const data = await FleetPenalty.aggregate([
      {
        $group: { _id: '$driverId', totalPenalties: { $sum: 1 }, totalAmount: { $sum: '$amount' } },
      },
      { $sort: { totalPenalties: -1 } },
      { $limit: 20 },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'fleetPenalties');
  }
});

module.exports = router;
