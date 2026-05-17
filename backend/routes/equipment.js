'use strict';
/**
 * Equipment Routes — إدارة المعدات والأجهزة
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const { page = 1, limit = 20, category, status, location } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (location) filter.location = new RegExp(location, 'i');
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Equipment.find(filter).sort({ name: 1 }).skip(skip).limit(+limit).lean(),
      Equipment.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'inventory_manager'), async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const equipment = await Equipment.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const equipment = await Equipment.findById(req.params.id).lean();
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager', 'inventory_manager'), async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    await Equipment.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Equipment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/checkout', async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const { assignedTo, expectedReturnDate, purpose } = req.body;
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'in-use',
        assignedTo,
        expectedReturnDate,
        purpose,
        checkedOutAt: new Date(),
        checkedOutBy: req.user._id,
      },
      { new: true }
    );
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/return', async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const { condition, notes } = req.body;
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      {
        status: condition === 'damaged' ? 'maintenance' : 'available',
        assignedTo: null,
        returnedAt: new Date(),
        returnedBy: req.user._id,
        lastCondition: condition,
        returnNotes: notes,
      },
      { new: true }
    );
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-category', async (req, res) => {
  try {
    const Equipment = require('../models/Equipment/Equipment');
    const data = await Equipment.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
