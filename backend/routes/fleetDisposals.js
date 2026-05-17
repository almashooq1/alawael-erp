'use strict';
/**
 * Fleet Disposals Routes — مسارات إتلاف وبيع المركبات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetDisposal = require('../models/Fleet/FleetDisposal');
    const { page = 1, limit = 20, status, method } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetDisposal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetDisposal.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetDisposal = require('../models/Fleet/FleetDisposal');
    const { vehicleId, method, reason } = req.body;
    if (!vehicleId || !method || !reason) {
      return res
        .status(400)
        .json({ success: false, message: 'vehicleId, method, reason are required' });
    }
    const disposal = await FleetDisposal.create({
      ...req.body,
      status: 'initiated',
      initiatedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: disposal });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetDisposal = require('../models/Fleet/FleetDisposal');
    const disposal = await FleetDisposal.findById(req.params.id).lean();
    if (!disposal)
      return res.status(404).json({ success: false, message: 'Disposal record not found' });
    res.json({ success: true, data: disposal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/approve', authorize('admin'), async (req, res) => {
  try {
    const FleetDisposal = require('../models/Fleet/FleetDisposal');
    const disposal = await FleetDisposal.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id },
      { new: true }
    );
    if (!disposal)
      return res.status(404).json({ success: false, message: 'Disposal record not found' });
    res.json({ success: true, data: disposal });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/complete', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetDisposal = require('../models/Fleet/FleetDisposal');
    const { saleAmount, buyerInfo, notes } = req.body;
    const disposal = await FleetDisposal.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        saleAmount,
        buyerInfo,
        notes,
        completedAt: new Date(),
        completedBy: req.user._id,
      },
      { new: true }
    );
    if (!disposal)
      return res.status(404).json({ success: false, message: 'Disposal record not found' });
    // Also mark the vehicle as disposed
    const Vehicle = require('../models/Fleet/Vehicle');
    await Vehicle.findByIdAndUpdate(disposal.vehicleId, { status: 'disposed' });
    res.json({ success: true, data: disposal });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
