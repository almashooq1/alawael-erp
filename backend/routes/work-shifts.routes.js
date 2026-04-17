/**
 * work-shifts.routes.js
 * النظام 37: إدارة جداول الدوام وتعيينها للموظفين
 * Work shifts CRUD + employee shift assignments + overtime requests
 */
'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const WorkShift = require('../models/WorkShift');
const OvertimeRequest = require('../models/OvertimeRequest');
const Employee = require('../models/HR/Employee');
const escapeRegex = require('../utils/escapeRegex');
const safeError = require('../utils/safeError');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. جداول الدوام — Work Shifts CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /
 * قائمة جداول الدوام
 */
router.get('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { branchId, shiftType, isActive, search, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };

    if (branchId) filter.branchId = branchId;
    if (shiftType) filter.shiftType = shiftType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search)
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { code: { $regex: escapeRegex(search), $options: 'i' } },
      ];

    const [shifts, total] = await Promise.all([
      WorkShift.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      WorkShift.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shifts,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /
 * إنشاء جدول دوام جديد
 */
router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'hr']),
  async (req, res) => {
    try {
      const shift = await WorkShift.create({ ...req.body, createdBy: req.user._id });
      res.status(201).json({ success: true, message: 'تم إنشاء جدول الدوام بنجاح', data: shift });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /:id
 * تفاصيل جدول دوام
 */
router.get('/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const shift = await WorkShift.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!shift) return res.status(404).json({ success: false, message: 'جدول الدوام غير موجود' });
    res.json({ success: true, data: shift });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * PUT /:id
 * تحديث جدول دوام
 */
router.put(
  '/:id',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'hr']),
  async (req, res) => {
    try {
      const shift = await WorkShift.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null },
        { ...req.body, updatedBy: req.user._id, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      if (!shift) return res.status(404).json({ success: false, message: 'جدول الدوام غير موجود' });
      res.json({ success: true, message: 'تم التحديث بنجاح', data: shift });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * DELETE /:id
 * حذف ناعم لجدول الدوام
 */
router.delete('/:id', authenticate, requireBranchAccess, authorize(['admin']), async (req, res) => {
  try {
    await WorkShift.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user._id }
    );
    res.json({ success: true, message: 'تم حذف جدول الدوام بنجاح' });
  } catch (err) {
    safeError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. تعيين الدوامات للموظفين — Employee Shift Assignments
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /assignments/list
 * قائمة تعيينات الدوامات
 */
router.get(
  '/assignments/list',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['admin', 'hr', 'manager']),
  async (req, res) => {
    try {
      const { branchId, employeeId, shiftId, page = 1, limit = 20 } = req.query;

      // استخدام الموظف مباشرة مع populate لجلب بيانات الدوام
      const empFilter = { deletedAt: null };
      if (branchId) empFilter.branchId = branchId;
      if (employeeId) empFilter._id = employeeId;

      const employees = await Employee.find(empFilter)
        .select('name employeeNumber currentShiftId shiftHistory')
        .populate('currentShiftId', 'name nameAr code startTime endTime')
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

      const total = await Employee.countDocuments(empFilter);

      res.json({
        success: true,
        data: employees,
        meta: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (err) {
      safeError(res, err);
    }
  }
);

/**
 * POST /assignments
 * تعيين دوام لموظف
 */
router.post(
  '/assignments',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'hr']),
  async (req, res) => {
    try {
      const { employeeId, shiftId, effectiveFrom, effectiveTo, reason } = req.body;

      if (!employeeId || !shiftId || !effectiveFrom) {
        return res
          .status(400)
          .json({ success: false, message: 'employeeId و shiftId و effectiveFrom مطلوبة' });
      }

      const [employee, shift] = await Promise.all([
        Employee.findOne({ _id: employeeId, deletedAt: null }),
        WorkShift.findOne({ _id: shiftId, deletedAt: null }),
      ]);

      if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      if (!shift) return res.status(404).json({ success: false, message: 'جدول الدوام غير موجود' });

      // تحديث دوام الموظف الحالي
      await Employee.findOneAndUpdate(
        { _id: employeeId },
        {
          currentShiftId: shiftId,
          $push: {
            shiftHistory: {
              shiftId,
              effectiveFrom: new Date(effectiveFrom),
              effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
              reason: reason || null,
              assignedBy: req.user._id,
              assignedAt: new Date(),
            },
          },
          updatedBy: req.user._id,
          updatedAt: new Date(),
        }
      );

      res.status(201).json({
        success: true,
        message: `تم تعيين دوام "${shift.nameAr}" للموظف بنجاح`,
        data: { employeeId, shiftId, effectiveFrom, effectiveTo },
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /assignments/:employeeId/current
 * الدوام الحالي لموظف
 */
router.get(
  '/assignments/:employeeId/current',
  authenticate,
  requireBranchAccess,
  async (req, res) => {
    try {
      const employee = await Employee.findOne({
        _id: req.params.employeeId,
        deletedAt: null,
      })
        .select('name currentShiftId shiftHistory')
        .populate('currentShiftId')
        .lean();

      if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

      res.json({
        success: true,
        data: { shift: employee.currentShiftId, history: employee.shiftHistory },
      });
    } catch (err) {
      safeError(res, err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 3. طلبات الوقت الإضافي — Overtime Requests
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /overtime/list
 * قائمة طلبات الوقت الإضافي
 */
router.get('/overtime/list', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { branchId, employeeId, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };

    if (branchId) filter.branchId = branchId;
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.overtimeDate = {};
      if (dateFrom) filter.overtimeDate.$gte = new Date(dateFrom);
      if (dateTo) filter.overtimeDate.$lte = new Date(dateTo);
    }

    const [records, total] = await Promise.all([
      OvertimeRequest.find(filter)
        .sort({ overtimeDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('employeeId', 'name employeeNumber')
        .populate('approvedBy', 'name')
        .lean(),
      OvertimeRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /overtime
 * تقديم طلب وقت إضافي
 */
router.post('/overtime', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.body.employeeId, deletedAt: null });
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

    const overtime = await OvertimeRequest.create({
      ...req.body,
      branchId: employee.branchId,
      status: 'pending',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, message: 'تم تقديم طلب الوقت الإضافي', data: overtime });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /overtime/:id/approve
 * اعتماد طلب الوقت الإضافي
 */
router.post(
  '/overtime/:id/approve',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['admin', 'hr', 'manager']),
  async (req, res) => {
    try {
      const overtime = await OvertimeRequest.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null, status: 'pending' },
        {
          status: 'approved',
          approvedBy: req.user._id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );
      if (!overtime)
        return res
          .status(404)
          .json({ success: false, message: 'الطلب غير موجود أو ليس في حالة انتظار' });
      res.json({ success: true, message: 'تم اعتماد الوقت الإضافي', data: overtime });
    } catch (err) {
      safeError(res, err);
    }
  }
);

/**
 * POST /overtime/:id/reject
 * رفض طلب الوقت الإضافي
 */
router.post(
  '/overtime/:id/reject',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize(['admin', 'hr', 'manager']),
  async (req, res) => {
    try {
      const overtime = await OvertimeRequest.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null, status: 'pending' },
        {
          status: 'rejected',
          approvedBy: req.user._id,
          approvedAt: new Date(),
          notes: req.body.reason || 'مرفوض',
          updatedAt: new Date(),
        },
        { new: true }
      );
      if (!overtime)
        return res
          .status(404)
          .json({ success: false, message: 'الطلب غير موجود أو ليس في حالة انتظار' });
      res.json({ success: true, message: 'تم رفض طلب الوقت الإضافي', data: overtime });
    } catch (err) {
      safeError(res, err);
    }
  }
);

/**
 * GET /overtime/summary
 * ملخص الوقت الإضافي الشهري
 */
router.get(
  '/overtime/summary',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'hr']),
  async (req, res) => {
    try {
      const { branchId, year, month } = req.query;
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || new Date().getMonth() + 1;

      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);

      const filter = {
        deletedAt: null,
        status: 'approved',
        overtimeDate: { $gte: start, $lte: end },
      };
      if (branchId) filter.branchId = branchId;

      const summary = await OvertimeRequest.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$employeeId',
            totalMinutes: { $sum: '$durationMinutes' },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: { path: '$employee', preserveNullAndEmpty: true } },
        {
          $project: {
            employeeName: '$employee.name',
            employeeNumber: '$employee.employeeNumber',
            totalMinutes: 1,
            totalHours: { $divide: ['$totalMinutes', 60] },
            totalAmount: 1,
            count: 1,
          },
        },
        { $sort: { totalMinutes: -1 } },
      ]);

      res.json({ success: true, data: summary, period: { year: y, month: m } });
    } catch (err) {
      safeError(res, err);
    }
  }
);

module.exports = router;
