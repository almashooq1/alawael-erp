'use strict';
/**
 * Vehicle Insurance Routes — مسارات تأمين المركبات
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
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const { page = 1, limit = 20, vehicleId, status, expiringBefore } = req.query;
    const filter = {};
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    if (expiringBefore) filter.expiryDate = { $lte: new Date(expiringBefore) };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      VehicleInsurance.find(filter).sort({ expiryDate: 1 }).skip(skip).limit(+limit).lean(),
      VehicleInsurance.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'vehicleInsurance');
  }
});

router.post('/', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const policy = await VehicleInsurance.create({
      ...req.body,
      createdBy: req.user._id,
      status: 'active',
    });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const policy = await VehicleInsurance.findById(req.params.id).lean();
    if (!policy)
      return res.status(404).json({ success: false, message: 'Insurance policy not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    return safeError(res, err, 'vehicleInsurance');
  }
});

router.put('/:id', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const policy = await VehicleInsurance.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );
    if (!policy)
      return res.status(404).json({ success: false, message: 'Insurance policy not found' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/expiring/soon', async (req, res) => {
  try {
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const { days = 30 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + +days);
    const data = await VehicleInsurance.find({ expiryDate: { $lte: cutoff }, status: 'active' })
      .sort({ expiryDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    return safeError(res, err, 'vehicleInsurance');
  }
});

router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const VehicleInsurance = require('../models/Fleet/VehicleInsurance');
    const data = await VehicleInsurance.find({ vehicleId: req.params.vehicleId })
      .sort({ expiryDate: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'vehicleInsurance');
  }
});

module.exports = router;
