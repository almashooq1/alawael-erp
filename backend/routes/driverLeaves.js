'use strict';
/**
 * Driver Leaves Routes — مسارات إجازات السائقين
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
    const DriverLeave = require('../models/Fleet/DriverLeave');
    const { page = 1, limit = 20, driverId, status, type } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      DriverLeave.find(filter).sort({ startDate: -1 }).skip(skip).limit(+limit).lean(),
      DriverLeave.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'driverLeaves');
  }
});

router.post('/', async (req, res) => {
  try {
    const DriverLeave = require('../models/Fleet/DriverLeave');
    const { driverId, type, startDate, endDate, reason } = req.body;
    if (!driverId || !type || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: 'driverId, type, startDate, endDate are required' });
    }
    const leave = await DriverLeave.create({
      driverId,
      type,
      startDate,
      endDate,
      reason,
      status: 'pending',
      requestedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const DriverLeave = require('../models/Fleet/DriverLeave');
    const leave = await DriverLeave.findById(req.params.id).lean();
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (err) {
    return safeError(res, err, 'driverLeaves');
  }
});

router.patch('/:id/approve', authorize('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const DriverLeave = require('../models/Fleet/DriverLeave');
    const leave = await DriverLeave.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/reject', authorize('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const DriverLeave = require('../models/Fleet/DriverLeave');
    const { reason } = req.body;
    const leave = await DriverLeave.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason, rejectedBy: req.user._id },
      { new: true }
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
