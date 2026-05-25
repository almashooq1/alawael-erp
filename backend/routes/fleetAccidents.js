'use strict';
/**
 * Fleet Accidents Routes — مسارات حوادث المركبات
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
    const FleetAccident = require('../models/Fleet/FleetAccident');
    const { page = 1, limit = 20, vehicleId, driverId, severity, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetAccident.find(filter).sort({ accidentDate: -1 }).skip(skip).limit(+limit).lean(),
      FleetAccident.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetAccidents');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetAccident = require('../models/Fleet/FleetAccident');
    const accident = await FleetAccident.create({
      ...req.body,
      reportedBy: req.user._id,
      status: 'open',
    });
    res.status(201).json({ success: true, data: accident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetAccident = require('../models/Fleet/FleetAccident');
    const accident = await FleetAccident.findById(req.params.id).lean();
    if (!accident)
      return res.status(404).json({ success: false, message: 'Accident report not found' });
    res.json({ success: true, data: accident });
  } catch (err) {
    return safeError(res, err, 'fleetAccidents');
  }
});

router.put(
  '/:id',
  authorize('admin', 'manager', 'safety_officer', 'fleet_officer'),
  async (req, res) => {
    try {
      const FleetAccident = require('../models/Fleet/FleetAccident');
      const accident = await FleetAccident.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!accident)
        return res.status(404).json({ success: false, message: 'Accident report not found' });
      res.json({ success: true, data: accident });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.patch('/:id/close', authorize('admin', 'manager', 'safety_officer'), async (req, res) => {
  try {
    const FleetAccident = require('../models/Fleet/FleetAccident');
    const { resolution, totalRepairCost, liabilityDetermination } = req.body;
    const accident = await FleetAccident.findByIdAndUpdate(
      req.params.id,
      {
        status: 'closed',
        resolution,
        totalRepairCost,
        liabilityDetermination,
        closedAt: new Date(),
        closedBy: req.user._id,
      },
      { new: true }
    );
    if (!accident)
      return res.status(404).json({ success: false, message: 'Accident report not found' });
    res.json({ success: true, data: accident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const FleetAccident = require('../models/Fleet/FleetAccident');
    const [total, open, bySeverity] = await Promise.all([
      FleetAccident.countDocuments(),
      FleetAccident.countDocuments({ status: 'open' }),
      FleetAccident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { total, open, bySeverity } });
  } catch (err) {
    return safeError(res, err, 'fleetAccidents');
  }
});

module.exports = router;
