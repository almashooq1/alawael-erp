'use strict';
/**
 * Employee Affairs Phase 3 Routes — شؤون الموظفين المرحلة الثالثة
 * Covers promotions, transfers, organizational changes, role transitions
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Promotions
router.get('/promotions', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const Promotion = require('../models/HR/Promotion');
    const { employeeId, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (department) filter.department = department;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Promotion.find(filter).sort({ effectiveDate: -1 }).skip(skip).limit(+limit).lean(),
      Promotion.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'employeeAffairsPhase3');
  }
});

router.post('/promotions', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Promotion = require('../models/HR/Promotion');
    const promotion = await Promotion.create({
      ...req.body,
      approvedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/promotions/:id/activate', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Promotion = require('../models/HR/Promotion');
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      { status: 'active', activatedAt: new Date(), activatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!promotion) return res.status(404).json({ success: false, message: 'Promotion not found' });
    // Update employee record
    const Employee = require('../models/HR/Employee');
    await Employee.findByIdAndUpdate(promotion.employeeId, {
      position: promotion.newPosition,
      jobGrade: promotion.newJobGrade,
      salary: promotion.newSalary,
    });
    res.json({ success: true, data: promotion });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Transfers
router.get('/transfers', authorize('admin', 'hr_manager', 'manager'), async (req, res) => {
  try {
    const Transfer = require('../models/HR/Transfer');
    const { employeeId, fromDept, toDept, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (fromDept) filter.fromDepartment = fromDept;
    if (toDept) filter.toDepartment = toDept;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Transfer.find(filter).sort({ effectiveDate: -1 }).skip(skip).limit(+limit).lean(),
      Transfer.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'employeeAffairsPhase3');
  }
});

router.post('/transfers', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Transfer = require('../models/HR/Transfer');
    const transfer = await Transfer.create({
      ...req.body,
      initiatedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/transfers/:id/execute', authorize('admin', 'hr_manager'), async (req, res) => {
  try {
    const Transfer = require('../models/HR/Transfer');
    const transfer = await Transfer.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', executedAt: new Date(), executedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });
    // Update employee department
    const Employee = require('../models/HR/Employee');
    // W1567 — the Employee branch field is snake `branch_id`; writing `branch` was a
    // phantom no-op (strict mode dropped it) → an executed transfer silently never moved
    // the employee's branch. Use branch_id so the transfer actually takes effect.
    await Employee.findByIdAndUpdate(transfer.employeeId, {
      department: transfer.toDepartment,
      branch_id: transfer.toBranch,
    });
    res.json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
