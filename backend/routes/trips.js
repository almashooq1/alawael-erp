'use strict';
/**
 * Trips Routes — مسارات إدارة الرحلات
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
    const Trip = require('../models/Fleet/Trip');
    const { page = 1, limit = 20, status, driverId, vehicleId, date } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (driverId) filter.driverId = driverId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (date)
      filter.scheduledDate = {
        $gte: new Date(date),
        $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
      };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Trip.find(filter).sort({ scheduledDate: -1 }).skip(skip).limit(+limit).lean(),
      Trip.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'trips');
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Trip = require('../models/Fleet/Trip');
    const trip = await Trip.create({ ...req.body, createdBy: req.user._id, status: 'scheduled' });
    res.status(201).json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Trip = require('../models/Fleet/Trip');
    const trip = await Trip.findById(req.params.id).lean();
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (err) {
    return safeError(res, err, 'trips');
  }
});

router.put('/:id', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Trip = require('../models/Fleet/Trip');
    const trip = await Trip.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch(
  '/:id/start',
  authorize('admin', 'manager', 'driver', 'dispatcher'),
  async (req, res) => {
    try {
      const Trip = require('../models/Fleet/Trip');
      const trip = await Trip.findByIdAndUpdate(
        req.params.id,
        { status: 'in_progress', actualStartTime: new Date(), startedBy: req.user._id },
        { returnDocument: 'after' }
      );
      if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
      res.json({ success: true, data: trip });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.patch(
  '/:id/complete',
  authorize('admin', 'manager', 'driver', 'dispatcher'),
  async (req, res) => {
    try {
      const Trip = require('../models/Fleet/Trip');
      const { actualEndTime, finalMileage, notes } = req.body;
      const trip = await Trip.findByIdAndUpdate(
        req.params.id,
        {
          status: 'completed',
          actualEndTime: actualEndTime || new Date(),
          finalMileage,
          notes,
          completedBy: req.user._id,
        },
        { returnDocument: 'after' }
      );
      if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
      res.json({ success: true, data: trip });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.patch('/:id/cancel', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const Trip = require('../models/Fleet/Trip');
    const { reason } = req.body;
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelReason: reason, cancelledBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    res.json({ success: true, data: trip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const Trip = require('../models/Fleet/Trip');
    const [total, scheduled, inProgress, completed, cancelled] = await Promise.all([
      Trip.countDocuments(),
      Trip.countDocuments({ status: 'scheduled' }),
      Trip.countDocuments({ status: 'in_progress' }),
      Trip.countDocuments({ status: 'completed' }),
      Trip.countDocuments({ status: 'cancelled' }),
    ]);
    res.json({ success: true, data: { total, scheduled, inProgress, completed, cancelled } });
  } catch (err) {
    return safeError(res, err, 'trips');
  }
});

module.exports = router;
