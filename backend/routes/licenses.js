'use strict';
/**
 * Licenses Routes — إدارة التراخيص والاعتمادات
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
    const License = require('../models/License/License');
    const { page = 1, limit = 20, type, status, entityType } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      License.find(filter).sort({ expiryDate: 1 }).skip(skip).limit(+limit).lean(),
      License.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'licenses');
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const License = require('../models/License/License');
    const license = await License.create({
      ...req.body,
      status: 'active',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: license });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const License = require('../models/License/License');
    const license = await License.findById(req.params.id).lean();
    if (!license) return res.status(404).json({ success: false, message: 'License not found' });
    res.json({ success: true, data: license });
  } catch (err) {
    return safeError(res, err, 'licenses');
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const License = require('../models/License/License');
    const license = await License.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!license) return res.status(404).json({ success: false, message: 'License not found' });
    res.json({ success: true, data: license });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/:id/renew', authorize('admin', 'manager'), async (req, res) => {
  try {
    const License = require('../models/License/License');
    const { newExpiryDate, renewalNotes, documentUrl } = req.body;
    if (!newExpiryDate)
      return res.status(400).json({ success: false, message: 'newExpiryDate required' });
    const license = await License.findByIdAndUpdate(
      req.params.id,
      {
        expiryDate: new Date(newExpiryDate),
        status: 'active',
        renewedAt: new Date(),
        renewedBy: req.user._id,
        renewalNotes,
        $push: {
          renewalHistory: {
            renewedAt: new Date(),
            previousExpiry: null,
            newExpiry: newExpiryDate,
            renewedBy: req.user._id,
          },
        },
        ...(documentUrl ? { documentUrl } : {}),
      },
      { returnDocument: 'after' }
    );
    if (!license) return res.status(404).json({ success: false, message: 'License not found' });
    res.json({ success: true, data: license });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/expiring/soon', async (req, res) => {
  try {
    const License = require('../models/License/License');
    const { days = 60 } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + +days);
    const data = await License.find({
      expiryDate: { $lte: cutoff, $gte: new Date() },
      status: 'active',
    })
      .sort({ expiryDate: 1 })
      .lean();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    return safeError(res, err, 'licenses');
  }
});

module.exports = router;
