'use strict';
/**
 * Vehicle Assignments Routes — مسارات تخصيص المركبات للسائقين
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
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const { page = 1, limit = 20, driverId, vehicleId, status } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      VehicleAssignment.find(filter).sort({ assignedAt: -1 }).skip(skip).limit(+limit).lean(),
      VehicleAssignment.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'vehicleAssignments');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const { driverId, vehicleId } = req.body;
    if (!driverId || !vehicleId) {
      return res
        .status(400)
        .json({ success: false, message: 'driverId and vehicleId are required' });
    }
    // End any current active assignment for this driver
    await VehicleAssignment.updateMany(
      { driverId, status: 'active' },
      { status: 'ended', endedAt: new Date() }
    );
    const assignment = await VehicleAssignment.create({
      ...req.body,
      status: 'active',
      assignedAt: new Date(),
      assignedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const assignment = await VehicleAssignment.findById(req.params.id).lean();
    if (!assignment)
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    return safeError(res, err, 'vehicleAssignments');
  }
});

router.patch('/:id/end', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const { notes } = req.body;
    const assignment = await VehicleAssignment.findByIdAndUpdate(
      req.params.id,
      { status: 'ended', endedAt: new Date(), notes, endedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!assignment)
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: assignment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/driver/:driverId/current', async (req, res) => {
  try {
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const assignment = await VehicleAssignment.findOne({
      driverId: req.params.driverId,
      status: 'active',
    }).lean();
    res.json({ success: true, data: assignment });
  } catch (err) {
    return safeError(res, err, 'vehicleAssignments');
  }
});

router.get('/vehicle/:vehicleId/current', async (req, res) => {
  try {
    const VehicleAssignment = require('../models/Fleet/VehicleAssignment');
    const assignment = await VehicleAssignment.findOne({
      vehicleId: req.params.vehicleId,
      status: 'active',
    }).lean();
    res.json({ success: true, data: assignment });
  } catch (err) {
    return safeError(res, err, 'vehicleAssignments');
  }
});

module.exports = router;
