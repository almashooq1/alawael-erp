'use strict';
/**
 * Fleet Warranties Routes — مسارات ضمانات المركبات والمعدات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const { page = 1, limit = 20, vehicleId, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetWarranty.find(filter).sort({ expiryDate: 1 }).skip(skip).limit(+limit).lean(),
      FleetWarranty.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const warranty = await FleetWarranty.create({
      ...req.body,
      status: 'active',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: warranty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const warranty = await FleetWarranty.findById(req.params.id).lean();
    if (!warranty) return res.status(404).json({ success: false, message: 'Warranty not found' });
    res.json({ success: true, data: warranty });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const warranty = await FleetWarranty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!warranty) return res.status(404).json({ success: false, message: 'Warranty not found' });
    res.json({ success: true, data: warranty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/claim', async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const { description, claimDate } = req.body;
    if (!description)
      return res.status(400).json({ success: false, message: 'description required' });
    const warranty = await FleetWarranty.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          claims: { description, claimDate: claimDate || new Date(), claimedBy: req.user._id },
        },
      },
      { new: true }
    );
    if (!warranty) return res.status(404).json({ success: false, message: 'Warranty not found' });
    res.json({ success: true, data: warranty });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/expiring/soon', async (req, res) => {
  try {
    const FleetWarranty = require('../models/Fleet/FleetWarranty');
    const { days = 60 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + +days);
    const data = await FleetWarranty.find({
      expiryDate: { $lte: cutoff, $gte: new Date() },
      status: 'active',
    })
      .sort({ expiryDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
