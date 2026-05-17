'use strict';
/**
 * Dispatch Routes — مسارات إدارة التوزيع والإرسال
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/queue', async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Dispatch.find({ status })
        .sort({ priority: -1, createdAt: 1 })
        .skip(skip)
        .limit(+limit)
        .lean(),
      Dispatch.countDocuments({ status }),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const order = await Dispatch.create({
      ...req.body,
      status: 'pending',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const order = await Dispatch.findById(req.params.id).lean();
    if (!order)
      return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/assign', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const { driverId, vehicleId } = req.body;
    if (!driverId || !vehicleId) {
      return res
        .status(400)
        .json({ success: false, message: 'driverId and vehicleId are required' });
    }
    const order = await Dispatch.findByIdAndUpdate(
      req.params.id,
      { driverId, vehicleId, status: 'assigned', assignedAt: new Date(), assignedBy: req.user._id },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/status', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const { status, notes } = req.body;
    const order = await Dispatch.findByIdAndUpdate(
      req.params.id,
      { status, notes, updatedBy: req.user._id },
      { new: true }
    );
    if (!order)
      return res.status(404).json({ success: false, message: 'Dispatch order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const Dispatch = require('../models/Fleet/Dispatch');
    const [total, pending, assigned, inProgress, completed] = await Promise.all([
      Dispatch.countDocuments(),
      Dispatch.countDocuments({ status: 'pending' }),
      Dispatch.countDocuments({ status: 'assigned' }),
      Dispatch.countDocuments({ status: 'in_progress' }),
      Dispatch.countDocuments({ status: 'completed' }),
    ]);
    res.json({ success: true, data: { total, pending, assigned, inProgress, completed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
