'use strict';
/**
 * Maintenance Routes — صيانة المنشآت والمعدات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Maintenance Requests
router.get('/requests', async (req, res) => {
  try {
    const MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
    const { page = 1, limit = 20, status, priority, assetId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assetId) filter.assetId = assetId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      MaintenanceRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      MaintenanceRequest.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'maintenance');
  }
});

router.post('/requests', async (req, res) => {
  try {
    const MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
    const request = await MaintenanceRequest.create({
      ...req.body,
      status: 'open',
      reportedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
    const request = await MaintenanceRequest.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (err) {
    return safeError(res, err, 'maintenance');
  }
});

router.patch(
  '/requests/:id/assign',
  authorize('admin', 'maintenance_manager'),
  async (req, res) => {
    try {
      const MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
      const { technicianId, scheduledDate } = req.body;
      const request = await MaintenanceRequest.findByIdAndUpdate(
        req.params.id,
        { status: 'assigned', technicianId, scheduledDate, assignedBy: req.user._id },
        { returnDocument: 'after' }
      );
      if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
      res.json({ success: true, data: request });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.patch('/requests/:id/complete', async (req, res) => {
  try {
    const MaintenanceRequest = require('../models/Maintenance/MaintenanceRequest');
    const { resolution, laborCost, partsCost, notes } = req.body;
    const request = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        resolution,
        laborCost,
        partsCost,
        notes,
        completedAt: new Date(),
        completedBy: req.user._id,
      },
      { returnDocument: 'after' }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Maintenance Schedule (preventive)
router.get('/schedule', async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/Maintenance/MaintenanceSchedule');
    const { assetId, upcoming, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (assetId) filter.assetId = assetId;
    if (upcoming === 'true')
      filter.nextDueDate = { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      MaintenanceSchedule.find(filter).sort({ nextDueDate: 1 }).skip(skip).limit(+limit).lean(),
      MaintenanceSchedule.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'maintenance');
  }
});

router.post('/schedule', authorize('admin', 'maintenance_manager'), async (req, res) => {
  try {
    const MaintenanceSchedule = require('../models/Maintenance/MaintenanceSchedule');
    const schedule = await MaintenanceSchedule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
