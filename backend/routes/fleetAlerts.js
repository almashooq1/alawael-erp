'use strict';
/**
 * Fleet Alerts Routes — مسارات تنبيهات الأسطول
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

router.get('/', async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const { page = 1, limit = 20, type, severity, acknowledged } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetAlert.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const alert = await FleetAlert.create({
      ...req.body,
      acknowledged: false,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const alert = await FleetAlert.findById(req.params.id).lean();
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/acknowledge', async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const alert = await FleetAlert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.user._id },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/acknowledge/bulk', async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids array required' });
    }
    await FleetAlert.updateMany(
      { _id: { $in: ids } },
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.user._id }
    );
    res.json({ success: true, message: `${ids.length} alerts acknowledged` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/unread/count', async (req, res) => {
  try {
    const FleetAlert = require('../models/Fleet/FleetAlert');
    const count = await FleetAlert.countDocuments({ acknowledged: false });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
