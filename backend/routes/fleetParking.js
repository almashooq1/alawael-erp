'use strict';
/**
 * Fleet Parking Routes — مسارات مواقف المركبات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const { page = 1, limit = 20, location, occupied } = req.query;
    const filter = {};
    if (location) filter.location = location;
    if (occupied !== undefined) filter.occupied = occupied === 'true';
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetParking.find(filter).sort({ spotNumber: 1 }).skip(skip).limit(+limit).lean(),
      FleetParking.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const spot = await FleetParking.create({
      ...req.body,
      occupied: false,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: spot });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const spot = await FleetParking.findById(req.params.id).lean();
    if (!spot) return res.status(404).json({ success: false, message: 'Parking spot not found' });
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/park', async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'vehicleId required' });
    const spot = await FleetParking.findByIdAndUpdate(
      req.params.id,
      { occupied: true, vehicleId, parkedAt: new Date(), parkedBy: req.user._id },
      { new: true }
    );
    if (!spot) return res.status(404).json({ success: false, message: 'Parking spot not found' });
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/release', async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const spot = await FleetParking.findByIdAndUpdate(
      req.params.id,
      {
        occupied: false,
        vehicleId: null,
        parkedAt: null,
        releasedAt: new Date(),
        releasedBy: req.user._id,
      },
      { new: true }
    );
    if (!spot) return res.status(404).json({ success: false, message: 'Parking spot not found' });
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/occupancy', async (req, res) => {
  try {
    const FleetParking = require('../models/Fleet/FleetParking');
    const [total, occupied] = await Promise.all([
      FleetParking.countDocuments(),
      FleetParking.countDocuments({ occupied: true }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        occupied,
        available: total - occupied,
        occupancyRate: total ? ((occupied / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
