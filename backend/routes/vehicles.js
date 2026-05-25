'use strict';
/**
 * Vehicle Routes — مسارات إدارة المركبات
 * CRUD + status, documents, assignment history, mileage tracking
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const { page = 1, limit = 20, status, type, branchId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (branchId) filter.branchId = branchId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Vehicle.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id).lean();
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status: 'retired' },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, message: 'Vehicle retired' });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

// ── Status & Mileage ─────────────────────────────────────────────────────────
router.patch('/:id/status', authorize('admin', 'manager', 'fleet_officer'), async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const { status } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post(
  '/:id/mileage',
  authorize('admin', 'manager', 'driver', 'fleet_officer'),
  async (req, res) => {
    try {
      const Vehicle = require('../models/Fleet/Vehicle');
      const { reading, date, notes } = req.body;
      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            mileageLogs: { reading, date: date || new Date(), notes, recordedBy: req.user._id },
          },
          currentMileage: reading,
        },
        { new: true }
      );
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
      res.json({ success: true, data: vehicle });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── Documents & Assignments ───────────────────────────────────────────────────
router.get('/:id/documents', async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id).select('documents').lean();
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle.documents || [] });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

router.get('/:id/assignment-history', async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const vehicle = await Vehicle.findById(req.params.id).select('assignmentHistory').lean();
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle.assignmentHistory || [] });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats/overview', async (req, res) => {
  try {
    const Vehicle = require('../models/Fleet/Vehicle');
    const [total, active, maintenance, retired] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'active' }),
      Vehicle.countDocuments({ status: 'maintenance' }),
      Vehicle.countDocuments({ status: 'retired' }),
    ]);
    res.json({ success: true, data: { total, active, maintenance, retired } });
  } catch (err) {
    return safeError(res, err, 'vehicles');
  }
});

module.exports = router;
