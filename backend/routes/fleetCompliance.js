'use strict';
/**
 * Fleet Compliance Routes — مسارات الامتثال التنظيمي للأسطول
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
    const FleetCompliance = require('../models/Fleet/FleetCompliance');
    const { page = 1, limit = 20, vehicleId, status, type } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetCompliance.find(filter).sort({ dueDate: 1 }).skip(skip).limit(+limit).lean(),
      FleetCompliance.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetCompliance');
  }
});

router.post('/', authorize('admin', 'manager', 'compliance_officer'), async (req, res) => {
  try {
    const FleetCompliance = require('../models/Fleet/FleetCompliance');
    const record = await FleetCompliance.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetCompliance = require('../models/Fleet/FleetCompliance');
    const record = await FleetCompliance.findById(req.params.id).lean();
    if (!record)
      return res.status(404).json({ success: false, message: 'Compliance record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    return safeError(res, err, 'fleetCompliance');
  }
});

router.put('/:id', authorize('admin', 'manager', 'compliance_officer'), async (req, res) => {
  try {
    const FleetCompliance = require('../models/Fleet/FleetCompliance');
    const record = await FleetCompliance.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!record)
      return res.status(404).json({ success: false, message: 'Compliance record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch(
  '/:id/resolve',
  authorize('admin', 'manager', 'compliance_officer'),
  async (req, res) => {
    try {
      const FleetCompliance = require('../models/Fleet/FleetCompliance');
      const { resolution, notes } = req.body;
      const record = await FleetCompliance.findByIdAndUpdate(
        req.params.id,
        { status: 'resolved', resolution, notes, resolvedAt: new Date(), resolvedBy: req.user._id },
        { returnDocument: 'after' }
      );
      if (!record)
        return res.status(404).json({ success: false, message: 'Compliance record not found' });
      res.json({ success: true, data: record });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/overdue/list', async (req, res) => {
  try {
    const FleetCompliance = require('../models/Fleet/FleetCompliance');
    const data = await FleetCompliance.find({ dueDate: { $lt: new Date() }, status: 'pending' })
      .sort({ dueDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    return safeError(res, err, 'fleetCompliance');
  }
});

module.exports = router;
