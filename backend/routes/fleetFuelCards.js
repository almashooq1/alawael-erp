'use strict';
/**
 * Fleet Fuel Cards Routes — مسارات بطاقات الوقود
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const { page = 1, limit = 20, status, driverId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (driverId) filter.assignedTo = driverId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetFuelCard.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetFuelCard.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const card = await FleetFuelCard.create({
      ...req.body,
      status: 'active',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: card });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const card = await FleetFuelCard.findById(req.params.id).lean();
    if (!card) return res.status(404).json({ success: false, message: 'Fuel card not found' });
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const card = await FleetFuelCard.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!card) return res.status(404).json({ success: false, message: 'Fuel card not found' });
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/assign', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const { driverId } = req.body;
    const card = await FleetFuelCard.findByIdAndUpdate(
      req.params.id,
      { assignedTo: driverId, assignedAt: new Date(), assignedBy: req.user._id },
      { new: true }
    );
    if (!card) return res.status(404).json({ success: false, message: 'Fuel card not found' });
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/transactions', async (req, res) => {
  try {
    const FleetFuelCard = require('../models/Fleet/FleetFuelCard');
    const card = await FleetFuelCard.findByIdAndUpdate(
      req.params.id,
      {
        $push: { transactions: { ...req.body, recordedAt: new Date(), recordedBy: req.user._id } },
      },
      { new: true }
    );
    if (!card) return res.status(404).json({ success: false, message: 'Fuel card not found' });
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
