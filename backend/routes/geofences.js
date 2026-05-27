'use strict';
/**
 * Geofences Routes — مسارات المناطق الجغرافية المحددة
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
    const Geofence = require('../models/Fleet/Geofence');
    const { page = 1, limit = 20, type, active } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Geofence.find(filter).sort({ name: 1 }).skip(skip).limit(+limit).lean(),
      Geofence.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'geofences');
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    const geofence = await Geofence.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: geofence });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    const geofence = await Geofence.findById(req.params.id).lean();
    if (!geofence) return res.status(404).json({ success: false, message: 'Geofence not found' });
    res.json({ success: true, data: geofence });
  } catch (err) {
    return safeError(res, err, 'geofences');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    const geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!geofence) return res.status(404).json({ success: false, message: 'Geofence not found' });
    res.json({ success: true, data: geofence });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    await Geofence.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Geofence deleted' });
  } catch (err) {
    return safeError(res, err, 'geofences');
  }
});

// Toggle active state
router.patch('/:id/toggle', authorize('admin', 'manager'), async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    const geofence = await Geofence.findById(req.params.id);
    if (!geofence) return res.status(404).json({ success: false, message: 'Geofence not found' });
    geofence.isActive = !geofence.isActive;
    await geofence.save();
    res.json({ success: true, data: geofence });
  } catch (err) {
    return safeError(res, err, 'geofences');
  }
});

// Check if a point is inside any geofence
router.post('/check-point', async (req, res) => {
  try {
    const Geofence = require('../models/Fleet/Geofence');
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }
    const geofences = await Geofence.find({ isActive: true }).lean();
    res.json({ success: true, data: geofences, count: geofences.length });
  } catch (err) {
    return safeError(res, err, 'geofences');
  }
});

module.exports = router;
