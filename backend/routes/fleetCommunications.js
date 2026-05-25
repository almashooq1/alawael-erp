'use strict';
/**
 * Fleet Communications Routes — مسارات مراسلات الأسطول مع السائقين
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
    const FleetCommunication = require('../models/Fleet/FleetCommunication');
    const { page = 1, limit = 20, driverId, type, priority } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetCommunication.find(filter).sort({ sentAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetCommunication.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetCommunications');
  }
});

router.post('/', authorize('admin', 'manager', 'dispatcher'), async (req, res) => {
  try {
    const FleetCommunication = require('../models/Fleet/FleetCommunication');
    const { driverId, type, subject, body, priority = 'normal' } = req.body;
    if (!driverId || !type || !body) {
      return res.status(400).json({ success: false, message: 'driverId, type, body are required' });
    }
    const msg = await FleetCommunication.create({
      driverId,
      type,
      subject,
      body,
      priority,
      sentBy: req.user._id,
      sentAt: new Date(),
      status: 'sent',
    });
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/broadcast', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetCommunication = require('../models/Fleet/FleetCommunication');
    const { driverIds, type, subject, body, priority = 'normal' } = req.body;
    if (!Array.isArray(driverIds) || driverIds.length === 0 || !body) {
      return res
        .status(400)
        .json({ success: false, message: 'driverIds (array) and body are required' });
    }
    const messages = driverIds.map(driverId => ({
      driverId,
      type,
      subject,
      body,
      priority,
      sentBy: req.user._id,
      sentAt: new Date(),
      status: 'sent',
    }));
    const created = await FleetCommunication.insertMany(messages);
    res.status(201).json({ success: true, data: { count: created.length } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetCommunication = require('../models/Fleet/FleetCommunication');
    const msg = await FleetCommunication.findById(req.params.id).lean();
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    return safeError(res, err, 'fleetCommunications');
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const FleetCommunication = require('../models/Fleet/FleetCommunication');
    const msg = await FleetCommunication.findByIdAndUpdate(
      req.params.id,
      { status: 'read', readAt: new Date() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
