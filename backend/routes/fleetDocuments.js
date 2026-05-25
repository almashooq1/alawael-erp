'use strict';
/**
 * Fleet Documents Routes — مسارات مستندات الأسطول
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
    const FleetDocument = require('../models/Fleet/FleetDocument');
    const { page = 1, limit = 20, entityType, entityId, type } = req.query;
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      FleetDocument.find(filter).sort({ uploadedAt: -1 }).skip(skip).limit(+limit).lean(),
      FleetDocument.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'fleetDocuments');
  }
});

router.post('/', async (req, res) => {
  try {
    const FleetDocument = require('../models/Fleet/FleetDocument');
    const { entityType, entityId, type, name, url, expiryDate } = req.body;
    if (!entityType || !entityId || !type || !name || !url) {
      return res
        .status(400)
        .json({ success: false, message: 'entityType, entityId, type, name, url are required' });
    }
    const doc = await FleetDocument.create({
      entityType,
      entityId,
      type,
      name,
      url,
      expiryDate,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const FleetDocument = require('../models/Fleet/FleetDocument');
    const doc = await FleetDocument.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'fleetDocuments');
  }
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const FleetDocument = require('../models/Fleet/FleetDocument');
    await FleetDocument.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    return safeError(res, err, 'fleetDocuments');
  }
});

router.get('/expiring/soon', async (req, res) => {
  try {
    const FleetDocument = require('../models/Fleet/FleetDocument');
    const { days = 30 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + +days);
    const data = await FleetDocument.find({ expiryDate: { $lte: cutoff, $gte: new Date() } })
      .sort({ expiryDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    return safeError(res, err, 'fleetDocuments');
  }
});

module.exports = router;
