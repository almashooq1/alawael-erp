'use strict';
/**
 * Fleet Safety Routes — مسارات السلامة والحوادث
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const { page = 1, limit = 20, vehicleId, driverId, severity, status } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (driverId) filter.driverId = driverId;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetSafety.find(filter).sort({ incidentDate: -1 }).skip(skip).limit(+limit).lean(),
      FleetSafety.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const incident = await FleetSafety.create({
      ...req.body,
      reportedBy: req.user._id,
      status: 'open',
    });
    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const incident = await FleetSafety.findById(req.params.id).lean();
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authorize('admin', 'manager', 'safety_officer'), async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const incident = await FleetSafety.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/close', authorize('admin', 'manager', 'safety_officer'), async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const { resolution } = req.body;
    const incident = await FleetSafety.findByIdAndUpdate(
      req.params.id,
      { status: 'closed', resolution, closedAt: new Date(), closedBy: req.user._id },
      { new: true }
    );
    if (!incident)
      return res.status(404).json({ success: false, message: 'Safety incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/stats/by-severity', async (req, res) => {
  try {
    const FleetSafety = require('../models/Fleet/FleetSafety');
    const data = await FleetSafety.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
