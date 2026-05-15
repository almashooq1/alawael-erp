'use strict';
/**
 * Employee Affairs Phase 2 Routes — شؤون الموظفين المرحلة الثانية
 * Covers disciplinary actions, grievances, counseling sessions
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

router.use(authenticate);
router.use(requireBranchAccess);

// Disciplinary Actions
router.get('/disciplinary', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const DisciplinaryAction = require('../models/HR/DisciplinaryAction');
    const { employeeId, type, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      DisciplinaryAction.find(filter).sort({ actionDate: -1 }).skip(skip).limit(+limit).lean(),
      DisciplinaryAction.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/disciplinary', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const DisciplinaryAction = require('../models/HR/DisciplinaryAction');
    const action = await DisciplinaryAction.create({
      ...req.body,
      initiatedBy: req.user._id,
      status: 'open',
    });
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/disciplinary/:id/resolve', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const DisciplinaryAction = require('../models/HR/DisciplinaryAction');
    const action = await DisciplinaryAction.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: req.body.resolution,
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
      },
      { new: true }
    );
    if (!action) return res.status(404).json({ success: false, message: 'Action not found' });
    res.json({ success: true, data: action });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Grievances
router.get('/grievances', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const Grievance = require('../models/HR/Grievance');
    const { employeeId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Grievance.find(filter).sort({ filedAt: -1 }).skip(skip).limit(+limit).lean(),
      Grievance.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/grievances', async (req, res) => {
  try {
    const Grievance = require('../models/HR/Grievance');
    const grievance = await Grievance.create({
      ...req.body,
      filedBy: req.user._id,
      filedAt: new Date(),
      status: 'submitted',
    });
    res.status(201).json({ success: true, data: grievance });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/grievances/:id/respond', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Grievance = require('../models/HR/Grievance');
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        response: req.body.response,
        status: 'resolved',
        respondedAt: new Date(),
        respondedBy: req.user._id,
      },
      { new: true }
    );
    if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
    res.json({ success: true, data: grievance });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
