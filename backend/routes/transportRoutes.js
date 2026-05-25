'use strict';
/**
 * Transport Routes — مسارات خطوط النقل
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
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      TransportRoute.find(filter).sort({ name: 1 }).skip(skip).limit(+limit).lean(),
      TransportRoute.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'transportRoutes');
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: route });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.findById(req.params.id).lean();
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) {
    return safeError(res, err, 'transportRoutes');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    );
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, message: 'Route deactivated' });
  } catch (err) {
    return safeError(res, err, 'transportRoutes');
  }
});

router.get('/:id/stops', async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.findById(req.params.id).select('stops').lean();
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route.stops || [] });
  } catch (err) {
    return safeError(res, err, 'transportRoutes');
  }
});

router.get('/:id/schedule', async (req, res) => {
  try {
    const TransportRoute = require('../models/Fleet/TransportRoute');
    const route = await TransportRoute.findById(req.params.id).select('schedule').lean();
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, data: route.schedule || {} });
  } catch (err) {
    return safeError(res, err, 'transportRoutes');
  }
});

module.exports = router;
