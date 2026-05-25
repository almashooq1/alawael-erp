'use strict';
/**
 * Cargo Routes — مسارات إدارة الشحن والبضائع
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
    const Cargo = require('../models/Fleet/Cargo');
    const { page = 1, limit = 20, status, tripId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tripId) filter.tripId = tripId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Cargo.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Cargo.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'cargo');
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Cargo = require('../models/Fleet/Cargo');
    const cargo = await Cargo.create({ ...req.body, createdBy: req.user._id, status: 'pending' });
    res.status(201).json({ success: true, data: cargo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Cargo = require('../models/Fleet/Cargo');
    const cargo = await Cargo.findById(req.params.id).lean();
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found' });
    res.json({ success: true, data: cargo });
  } catch (err) {
    return safeError(res, err, 'cargo');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Cargo = require('../models/Fleet/Cargo');
    const cargo = await Cargo.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found' });
    res.json({ success: true, data: cargo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch(
  '/:id/deliver',
  authorize('admin', 'manager', 'driver', 'dispatcher'),
  async (req, res) => {
    try {
      const Cargo = require('../models/Fleet/Cargo');
      const { signature, notes } = req.body;
      const cargo = await Cargo.findByIdAndUpdate(
        req.params.id,
        {
          status: 'delivered',
          deliveredAt: new Date(),
          deliverySignature: signature,
          deliveryNotes: notes,
          deliveredBy: req.user._id,
        },
        { new: true }
      );
      if (!cargo) return res.status(404).json({ success: false, message: 'Cargo not found' });
      res.json({ success: true, data: cargo });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const Cargo = require('../models/Fleet/Cargo');
    await Cargo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Cargo deleted' });
  } catch (err) {
    return safeError(res, err, 'cargo');
  }
});

module.exports = router;
