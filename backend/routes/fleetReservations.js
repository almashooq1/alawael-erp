'use strict';
/**
 * Fleet Reservations Routes — مسارات حجز المركبات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const { page = 1, limit = 20, vehicleId, status, requestedBy } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (requestedBy) filter.requestedBy = requestedBy;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetReservation.find(filter).sort({ startTime: 1 }).skip(skip).limit(+limit).lean(),
      FleetReservation.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const { vehicleId, startTime, endTime } = req.body;
    if (!vehicleId || !startTime || !endTime) {
      return res
        .status(400)
        .json({ success: false, message: 'vehicleId, startTime, endTime are required' });
    }
    // Check for conflicts
    const conflict = await FleetReservation.findOne({
      vehicleId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startTime: { $lt: new Date(endTime), $gte: new Date(startTime) } },
        { endTime: { $gt: new Date(startTime), $lte: new Date(endTime) } },
      ],
    });
    if (conflict) {
      return res
        .status(409)
        .json({ success: false, message: 'Vehicle already reserved for this time slot' });
    }
    const reservation = await FleetReservation.create({
      ...req.body,
      requestedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const reservation = await FleetReservation.findById(req.params.id).lean();
    if (!reservation)
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    res.json({ success: true, data: reservation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/approve', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const reservation = await FleetReservation.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id },
      { new: true }
    );
    if (!reservation)
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    res.json({ success: true, data: reservation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const { reason } = req.body;
    const reservation = await FleetReservation.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelReason: reason, cancelledBy: req.user._id },
      { new: true }
    );
    if (!reservation)
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    res.json({ success: true, data: reservation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/vehicle/:vehicleId/availability', async (req, res) => {
  try {
    const FleetReservation = require('../models/Fleet/FleetReservation');
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ success: false, message: 'from and to dates required' });
    const conflicts = await FleetReservation.find({
      vehicleId: req.params.vehicleId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startTime: { $lt: new Date(to), $gte: new Date(from) } },
        { endTime: { $gt: new Date(from), $lte: new Date(to) } },
      ],
    }).lean();
    res.json({ success: true, data: { available: conflicts.length === 0, conflicts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
