'use strict';
/**
 * Fleet Parts Routes — مسارات قطع الغيار
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
    const part = await FleetPart.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
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
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Invalid quantity' });
      }
      // Atomic stock-check + decrement + log push. The previous
      // `findById` → `if (part.quantity < quantity)` → `part.quantity -=
      // quantity` → `save()` pattern was racy: two concurrent /use
      // requests for stock=15 with qty=10 each both read 15, both
      // pass the check, both deduct, both save → final stock would be
      // 5 instead of failing the second request, or worse, settle to a
      // negative value depending on Mongoose `__v` versioning state.
      // findOneAndUpdate with `quantity: {$gte: qty}` in the filter
      // makes the check-and-decrement a single Mongo op; if stock is
      // insufficient the update simply doesn't match (null result).
      const part = await FleetPart.findOneAndUpdate(
        { _id: req.params.id, quantity: { $gte: qty } },
        {
          $inc: { quantity: -qty },
          $push: {
            usageLogs: {
              quantity: qty,
              vehicleId,
              notes,
              usedAt: new Date(),
              usedBy: req.user._id,
            },
          },
        },
        { returnDocument: 'after' }
      );
      if (!part) {
        // Either the part doesn't exist OR it exists with quantity<qty.
        // Re-read the latest quantity (no race here — we're not mutating)
        // to give the caller an actionable message.
        const current = await FleetPart.findById(req.params.id).select('quantity').lean();
        if (!current) return res.status(404).json({ success: false, message: 'Part not found' });
        return res.status(400).json({
          success: false,
          message: `Insufficient stock: only ${current.quantity} available`,
        });
      }
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
      { returnDocument: 'after' }
    );
    if (!part) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: part });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
