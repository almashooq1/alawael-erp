'use strict';
/**
 * Fleet Tires Routes — مسارات إدارة الإطارات
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
    const FleetTire = require('../models/Fleet/FleetTire');
    const { page = 1, limit = 20, vehicleId, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetTire.find(filter).sort({ installedAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetTire.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetTires');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetTire = require('../models/Fleet/FleetTire');
    const tire = await FleetTire.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'installed',
    });
    res.status(201).json({ success: true, data: tire });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetTire = require('../models/Fleet/FleetTire');
    const tire = await FleetTire.findById(req.params.id).lean();
    if (!tire) return res.status(404).json({ success: false, message: 'Tire record not found' });
    res.json({ success: true, data: tire });
  } catch (err) {
    return safeError(res, err, 'fleetTires');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer', 'mechanic'), async (req, res) => {
  try {
    const FleetTire = require('../models/Fleet/FleetTire');
    const tire = await FleetTire.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!tire) return res.status(404).json({ success: false, message: 'Tire record not found' });
    res.json({ success: true, data: tire });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch(
  '/:id/replace',
  authorize('admin', 'manager', 'fleet_officer', 'mechanic'),
  async (req, res) => {
    try {
      const FleetTire = require('../models/Fleet/FleetTire');
      const { mileageAtReplacement, reason } = req.body;
      const tire = await FleetTire.findByIdAndUpdate(
        req.params.id,
        {
          status: 'replaced',
          replacedAt: new Date(),
          mileageAtReplacement,
          reason,
          replacedBy: req.user._id,
        },
        { returnDocument: 'after' }
      );
      if (!tire) return res.status(404).json({ success: false, message: 'Tire record not found' });
      res.json({ success: true, data: tire });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post('/:id/pressure-log', async (req, res) => {
  try {
    const FleetTire = require('../models/Fleet/FleetTire');
    const tire = await FleetTire.findByIdAndUpdate(
      req.params.id,
      {
        $push: { pressureLogs: { ...req.body, recordedAt: new Date(), recordedBy: req.user._id } },
      },
      { returnDocument: 'after' }
    );
    if (!tire) return res.status(404).json({ success: false, message: 'Tire record not found' });
    res.json({ success: true, data: tire });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
