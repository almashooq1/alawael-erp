'use strict';
/**
 * Fleet Parts Routes — مسارات قطع الغيار
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
    const FleetPart = require('../models/Fleet/FleetPart');
    const { page = 1, limit = 20, category, lowStock } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minQuantity'] };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetPart.find(filter).sort({ name: 1 }).skip(skip).limit(+limit).lean(),
      FleetPart.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetParts');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetPart = require('../models/Fleet/FleetPart');
    const part = await FleetPart.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetPart = require('../models/Fleet/FleetPart');
    const part = await FleetPart.findById(req.params.id).lean();
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: part });
  } catch (err) {
    return safeError(res, err, 'fleetParts');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetPart = require('../models/Fleet/FleetPart');
    const part = await FleetPart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch(
  '/:id/use',
  authorize('admin', 'manager', 'fleet_officer', 'mechanic'),
  async (req, res) => {
    try {
      const FleetPart = require('../models/Fleet/FleetPart');
      const { quantity = 1, vehicleId, notes } = req.body;
      const part = await FleetPart.findById(req.params.id);
      if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
      if (part.quantity < quantity) {
        return res
          .status(400)
          .json({ success: false, message: `Insufficient stock: only ${part.quantity} available` });
      }
      part.quantity -= quantity;
      part.usageLogs = part.usageLogs || [];
      part.usageLogs.push({ quantity, vehicleId, notes, usedAt: new Date(), usedBy: req.user._id });
      await part.save();
      res.json({ success: true, data: part });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.patch('/:id/restock', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetPart = require('../models/Fleet/FleetPart');
    const { quantity, notes } = req.body;
    const part = await FleetPart.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { quantity },
        $push: {
          restockLogs: { quantity, notes, restockedAt: new Date(), restockedBy: req.user._id },
        },
      },
      { new: true }
    );
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
