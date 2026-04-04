/**
 * Leave Requests Routes — مسارات طلبات الإجازات
 * النظام 37: الحضور البيومتري ZKTeco
 * Endpoints: /api/leave-requests/*
 */
'use strict';

const express = require('express');
const router = express.Router();

const LeaveBalance = require('../models/LeaveBalance');
const leaveService = require('../services/leaveManagement.service');

// ─── طلبات الإجازات ──────────────────────────────────────────────────────────

// GET /api/leave-requests — قائمة الطلبات
router.get('/', async (req, res) => {
  try {
    const {
      branchId,
      employeeId,
      status,
      leaveType,
      dateFrom,
      dateTo,
      page = 1,
      perPage = 15,
    } = req.query;
    const result = await leaveService.list({
      branchId,
      employeeId,
      status,
      leaveType,
      dateFrom,
      dateTo,
      page: parseInt(page),
      perPage: parseInt(perPage),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leave-requests — تقديم طلب إجازة
router.post('/', async (req, res) => {
  try {
    const request = await leaveService.submitRequest({
      ...req.body,
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, message: 'تم تقديم طلب الإجازة بنجاح', data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/leave-requests/:id — تفاصيل طلب
router.get('/:id', async (req, res) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const request = await LeaveRequest.findById(req.params.id)
      .populate('employeeId', 'name nameAr')
      .populate('approvedBy', 'name');
    if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/leave-requests/:id — تعديل طلب (للموظف قبل المراجعة)
router.put('/:id', async (req, res) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'لا يمكن تعديل طلب تمت معالجته' });
    }
    Object.assign(request, req.body, { updatedBy: req.user?._id });
    await request.save();
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/leave-requests/:id — إلغاء طلب
router.delete('/:id', async (req, res) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const request = await LeaveRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'لا يمكن إلغاء طلب تمت معالجته' });
    }
    request.status = 'cancelled';
    await request.save();
    res.json({ success: true, message: 'تم إلغاء الطلب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── اعتماد / رفض ────────────────────────────────────────────────────────────

// POST /api/leave-requests/:id/approve — اعتماد طلب
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await leaveService.approve(req.params.id, req.user?._id);
    res.json({ success: true, message: 'تم اعتماد الإجازة', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/leave-requests/:id/reject — رفض طلب
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });

    const result = await leaveService.reject(req.params.id, reason, req.user?._id);
    res.json({ success: true, message: 'تم رفض الطلب', data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── أرصدة الإجازات ──────────────────────────────────────────────────────────

// GET /api/leave-requests/balance — رصيد إجازات موظف
router.get('/balance/check', async (req, res) => {
  try {
    const { employeeId, leaveType } = req.query;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId مطلوب' });

    if (leaveType) {
      const balance = await leaveService.getBalance(employeeId, leaveType);
      return res.json({ success: true, data: { leaveType, balance } });
    }

    // جميع أنواع الإجازات
    const year = new Date().getFullYear();
    const balances = await LeaveBalance.find({ employeeId, year });
    res.json({ success: true, data: balances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/leave-requests/balance/initialize — تهيئة أرصدة سنوية
router.post('/balance/initialize', async (req, res) => {
  try {
    const { branchId, year } = req.body;
    if (!branchId) return res.status(400).json({ success: false, message: 'branchId مطلوب' });

    await leaveService.initializeYearlyBalances(
      branchId,
      parseInt(year) || new Date().getFullYear()
    );
    res.json({ success: true, message: 'تم تهيئة الأرصدة السنوية بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/leave-requests/balance/all — جميع أرصدة الفرع
router.get('/balance/all', async (req, res) => {
  try {
    const { branchId, year } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (year) query.year = parseInt(year);
    else query.year = new Date().getFullYear();

    const balances = await LeaveBalance.find(query).populate('employeeId', 'name nameAr');
    res.json({ success: true, data: balances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── إحصائيات ─────────────────────────────────────────────────────────────────

// GET /api/leave-requests/stats — إحصائيات الإجازات
router.get('/stats/summary', async (req, res) => {
  try {
    const { branchId } = req.query;
    const stats = await leaveService.getStats(branchId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
