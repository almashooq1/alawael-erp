'use strict';
/**
 * Driver Training Routes — مسارات تدريب السائقين
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
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const { page = 1, limit = 20, driverId, status, type } = req.query;
    const filter = {};
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      DriverTraining.find(filter).sort({ scheduledDate: -1 }).skip(skip).limit(+limit).lean(),
      DriverTraining.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'driverTraining');
  }
});

router.post('/', authorize('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const training = await DriverTraining.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'scheduled',
    });
    res.status(201).json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const training = await DriverTraining.findById(req.params.id).lean();
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (err) {
    return safeError(res, err, 'driverTraining');
  }
});

router.put('/:id', authorize('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const training = await DriverTraining.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/complete', authorize('admin', 'manager', 'hr'), async (req, res) => {
  try {
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const { score, passed, certificationNumber, notes } = req.body;
    const training = await DriverTraining.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date(),
        score,
        passed,
        certificationNumber,
        notes,
        completedBy: req.user._id,
      },
      { returnDocument: 'after' }
    );
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    res.json({ success: true, data: training });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/driver/:driverId', async (req, res) => {
  try {
    const DriverTraining = require('../models/Fleet/DriverTraining');
    const data = await DriverTraining.find({ driverId: req.params.driverId })
      .sort({ scheduledDate: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'driverTraining');
  }
});

module.exports = router;
