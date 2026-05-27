'use strict';
/**
 * Fleet Route Plans Routes — مسارات تخطيط المسارات
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
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    const { page = 1, limit = 20, status, vehicleId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (vehicleId) filter.vehicleId = vehicleId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetRoutePlan.find(filter).sort({ scheduledDate: 1 }).skip(skip).limit(+limit).lean(),
      FleetRoutePlan.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetRoutePlans');
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    const plan = await FleetRoutePlan.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'draft',
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    const plan = await FleetRoutePlan.findById(req.params.id).lean();
    if (!plan) return res.status(404).json({ success: false, message: 'Route plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    return safeError(res, err, 'fleetRoutePlans');
  }
});

router.put('/:id', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    const plan = await FleetRoutePlan.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!plan) return res.status(404).json({ success: false, message: 'Route plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/waypoints', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    const { waypoints } = req.body;
    if (!Array.isArray(waypoints)) {
      return res.status(400).json({ success: false, message: 'waypoints must be an array' });
    }
    const plan = await FleetRoutePlan.findByIdAndUpdate(
      req.params.id,
      { waypoints, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Route plan not found' });
    res.json({ success: true, data: plan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetRoutePlan = require('../models/Fleet/FleetRoutePlan');
    await FleetRoutePlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Route plan deleted' });
  } catch (err) {
    return safeError(res, err, 'fleetRoutePlans');
  }
});

module.exports = router;
