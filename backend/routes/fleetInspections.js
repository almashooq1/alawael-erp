'use strict';
/**
 * Fleet Inspections Routes — مسارات تفتيش المركبات
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
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const { page = 1, limit = 20, vehicleId, result, type } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (result) filter.result = result;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetInspection.find(filter).sort({ inspectedAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetInspection.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetInspections');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const inspection = await FleetInspection.create({
      ...req.body,
      inspectedBy: req.user._id,
      inspectedAt: req.body.inspectedAt || new Date(),
    });
    res.status(201).json({ success: true, data: inspection });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const inspection = await FleetInspection.findById(req.params.id).lean();
    if (!inspection)
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    res.json({ success: true, data: inspection });
  } catch (err) {
    return safeError(res, err, 'fleetInspections');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const inspection = await FleetInspection.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!inspection)
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/vehicle/:vehicleId/latest', async (req, res) => {
  try {
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const inspection = await FleetInspection.findOne({ vehicleId: req.params.vehicleId })
      .sort({ inspectedAt: -1 })
      .lean();
    res.json({ success: true, data: inspection });
  } catch (err) {
    return safeError(res, err, 'fleetInspections');
  }
});

router.get('/stats/pass-rate', async (req, res) => {
  try {
    const FleetInspection = require('../models/Fleet/FleetInspection');
    const data = await FleetInspection.aggregate([
      { $group: { _id: '$result', count: { $sum: 1 } } },
    ]);
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const passed = (data.find(d => d._id === 'pass') || { count: 0 }).count;
    res.json({
      success: true,
      data: {
        total,
        passed,
        failed: total - passed,
        passRate: total ? ((passed / total) * 100).toFixed(1) : 0,
      },
    });
  } catch (err) {
    return safeError(res, err, 'fleetInspections');
  }
});

module.exports = router;
