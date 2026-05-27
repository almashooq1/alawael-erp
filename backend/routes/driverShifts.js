'use strict';
/**
 * Driver Shifts Routes — مسارات جدول ورديات السائقين
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const { page = 1, limit = 20, driverId, date, status } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.startTime = { $gte: d, $lt: new Date(d.setDate(d.getDate() + 1)) };
    }
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      DriverShift.find(filter).sort({ startTime: -1 }).skip(skip).limit(+limit).lean(),
      DriverShift.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'driverShifts');
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const shift = await DriverShift.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'scheduled',
    });
    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const shift = await DriverShift.findById(req.params.id).lean();
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, data: shift });
  } catch (err) {
    return safeError(res, err, 'driverShifts');
  }
});

router.put('/:id', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const shift = await DriverShift.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/clock-in', async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const shift = await DriverShift.findByIdAndUpdate(
      req.params.id,
      { status: 'active', actualStartTime: new Date() },
      { returnDocument: 'after' }
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/clock-out', async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const { notes } = req.body;
    const shift = await DriverShift.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', actualEndTime: new Date(), notes },
      { returnDocument: 'after' }
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/driver/:driverId/today', async (req, res) => {
  try {
    const DriverShift = require('../models/Fleet/DriverShift');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const shift = await DriverShift.findOne({
      driverId: req.params.driverId,
      startTime: { $gte: today, $lt: tomorrow },
    }).lean();
    res.json({ success: true, data: shift });
  } catch (err) {
    return safeError(res, err, 'driverShifts');
  }
});

module.exports = router;
