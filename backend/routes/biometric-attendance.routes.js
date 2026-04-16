/**
 * Biometric Attendance Routes — مسارات نظام الحضور البيومتري
 * النظام 37: الحضور البيومتري ZKTeco
 * Endpoints: /api/biometric-attendance/*
 */
'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// 🔒 All biometric attendance routes require authentication
router.use(authenticate);
router.use(requireBranchAccess);
const ZktecoDevice = require('../models/ZktecoDevice');
const AttendanceLog = require('../models/AttendanceLog');
const DailyAttendance = require('../models/DailyAttendance');
const WorkShift = require('../models/WorkShift');
const EmployeeShiftAssignment = require('../models/EmployeeShiftAssignment');
const AttendancePolicyModel = require('../models/AttendancePolicyModel');
const OvertimeRequest = require('../models/OvertimeRequest');

const zktecoSdk = require('../services/zktecoSdk.service');
const attendanceProcessing = require('../services/attendanceProcessing.service');
const { stripUpdateMeta } = require('../utils/sanitize');

// ═══════════════════════════════════════════════════════════════════════
// أجهزة ZKTeco — ZKTeco Devices
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/devices — قائمة الأجهزة
router.get('/devices', async (req, res) => {
  try {
    const { branchId, status, isActive } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const devices = await ZktecoDevice.find(query)
      .populate('branchId', 'name nameAr')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: devices });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/biometric-attendance/devices/:id — تفاصيل جهاز
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await ZktecoDevice.findById(req.params.id).populate('branchId');
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    res.json({ success: true, data: device });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/devices — إضافة جهاز جديد
router.post('/devices', async (req, res) => {
  try {
    const device = await ZktecoDevice.create({ ...stripUpdateMeta(req.body), createdBy: req.user?._id });
    res.status(201).json({ success: true, data: device });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/biometric-attendance/devices/:id — تعديل جهاز
router.put('/devices/:id', async (req, res) => {
  try {
    const device = await ZktecoDevice.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?._id },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    res.json({ success: true, data: device });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/biometric-attendance/devices/:id — حذف جهاز
router.delete('/devices/:id', async (req, res) => {
  try {
    await ZktecoDevice.findByIdAndUpdate(req.params.id, { deletedAt: new Date(), isActive: false });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/devices/:id/ping — فحص اتصال الجهاز
router.post('/devices/:id/ping', async (req, res) => {
  try {
    const device = await ZktecoDevice.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    const online = await zktecoSdk.connect(device);
    res.json({
      success: true,
      online,
      device: { id: device._id, name: device.name, status: device.status },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/devices/:id/sync — مزامنة سجلات الجهاز
router.post('/devices/:id/sync', async (req, res) => {
  try {
    const device = await ZktecoDevice.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    const logs = await zktecoSdk.pullAttendanceLogs(device);
    const result = await attendanceProcessing.processBatch(logs);

    res.json({ success: true, message: `تمت المزامنة: ${result.processed} سجل`, data: result });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/devices/:id/enroll — تسجيل موظف في الجهاز
router.post('/devices/:id/enroll', async (req, res) => {
  try {
    const device = await ZktecoDevice.findById(req.params.id);
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    const Employee = require('../models/Employee');
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

    const success = await zktecoSdk.enrollEmployee(device, employee);
    res.json({ success, message: success ? 'تم تسجيل الموظف بنجاح' : 'فشل التسجيل' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/devices/push-data — استقبال Push من الجهاز
router.post('/devices/push-data', async (req, res) => {
  try {
    await zktecoSdk.handlePushData(req.body);
    res.json({ success: true, status: 'ok' });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/biometric-attendance/devices/health-check — فحص جميع الأجهزة
router.get('/devices/health-check', async (req, res) => {
  try {
    const results = await zktecoSdk.healthCheck();
    res.json({ success: true, data: results });
  } catch (err) {
    safeError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// الدوامات — Work Shifts
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/shifts — قائمة الدوامات
router.get('/shifts', async (req, res) => {
  try {
    const { branchId, shiftType, isActive } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (shiftType) query.shiftType = shiftType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const shifts = await WorkShift.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: shifts });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/shifts — إنشاء دوام
router.post('/shifts', async (req, res) => {
  try {
    const shift = await WorkShift.create({ ...stripUpdateMeta(req.body), createdBy: req.user?._id });
    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/biometric-attendance/shifts/:id — تعديل دوام
router.put('/shifts/:id', async (req, res) => {
  try {
    const shift = await WorkShift.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?._id },
      { new: true }
    );
    if (!shift) return res.status(404).json({ success: false, message: 'الدوام غير موجود' });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/biometric-attendance/shifts/:id — حذف دوام
router.delete('/shifts/:id', async (req, res) => {
  try {
    await WorkShift.findByIdAndUpdate(req.params.id, { deletedAt: new Date(), isActive: false });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/shifts/assign — تعيين دوام لموظف
router.post('/shifts/assign', async (req, res) => {
  try {
    const { employeeId, shiftId, effectiveFrom, effectiveTo, assignmentType, reason } = req.body;

    const Employee = require('../models/Employee');
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

    // تعطيل التعيين السابق
    await EmployeeShiftAssignment.updateMany(
      { employeeId, isActive: true },
      { isActive: false, effectiveTo: new Date(effectiveFrom) }
    );

    const assignment = await EmployeeShiftAssignment.create({
      branchId: employee.branchId,
      employeeId,
      shiftId,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      assignmentType: assignmentType || 'permanent',
      reason,
      assignedBy: req.user?._id,
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// سجلات الحضور — Attendance Logs
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/logs — سجلات الحضور الخام
router.get('/logs', async (req, res) => {
  try {
    const { branchId, employeeId, dateFrom, dateTo, punchType, page = 1, perPage = 20 } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (employeeId) query.employeeId = employeeId;
    if (punchType) query.punchType = punchType;
    if (dateFrom || dateTo) {
      query.punchTime = {};
      if (dateFrom) query.punchTime.$gte = new Date(dateFrom);
      if (dateTo) query.punchTime.$lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      AttendanceLog.find(query)
        .populate('employeeId', 'name nameAr')
        .populate('deviceId', 'name serialNumber')
        .sort({ punchTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(perPage))
        .limit(parseInt(perPage)),
      AttendanceLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(perPage)),
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/logs/manual — تسجيل حضور يدوي
router.post('/logs/manual', async (req, res) => {
  try {
    const { employeeId, punchTime, punchType, reason } = req.body;

    const Employee = require('../models/Employee');
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'الموظف غير موجود' });

    const log = await AttendanceLog.create({
      branchId: employee.branchId,
      employeeId,
      punchTime: new Date(punchTime),
      punchType: punchType || 'checkin',
      verificationMethod: 'pin',
      isManual: true,
      manualBy: req.user?._id,
      manualReason: reason,
      isSynced: true,
      createdBy: req.user?._id,
    });

    const daily = await attendanceProcessing.processLog(log);
    res.status(201).json({ success: true, data: { log, daily } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// الملخص اليومي — Daily Attendance
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/daily — الملخص اليومي
router.get('/daily', async (req, res) => {
  try {
    const { branchId, employeeId, status, dateFrom, dateTo, page = 1, perPage = 15 } = req.query;
    const result = await attendanceProcessing.list({
      branchId,
      employeeId,
      status,
      dateFrom,
      dateTo,
      page: parseInt(page),
      perPage: parseInt(perPage),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/biometric-attendance/live-monitor — لوحة المراقبة الحية
router.get('/live-monitor', async (req, res) => {
  try {
    const { branchId } = req.query;
    const stats = await attendanceProcessing.getStats(branchId);

    const recentLogs = await AttendanceLog.find({
      ...(branchId ? { branchId } : {}),
      punchTime: { $gte: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    })
      .populate('employeeId', 'name nameAr')
      .sort({ punchTime: -1 })
      .limit(20);

    res.json({ success: true, data: { stats, recentLogs } });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /api/biometric-attendance/monthly-report — التقرير الشهري
router.get('/monthly-report', async (req, res) => {
  try {
    const { branchId, year, month } = req.query;
    if (!branchId) return res.status(400).json({ success: false, message: 'branchId مطلوب' });

    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const report = await attendanceProcessing.generateMonthlyReport(branchId, y, m);
    res.json({ success: true, data: report });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/mobile-checkin — حضور موبايل مع GPS
router.post('/mobile-checkin', async (req, res) => {
  try {
    const { latitude, longitude, punchType } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'الموقع الجغرافي مطلوب' });
    }

    // الحصول على الموظف من المستخدم الحالي
    const Employee = require('../models/Employee');
    const employee = await Employee.findOne({ userId: req.user?._id });
    if (!employee) return res.status(404).json({ success: false, message: 'سجل الموظف غير موجود' });

    // التحقق من النطاق الجغرافي
    const policy = await AttendancePolicyModel.findOne({
      branchId: employee.branchId,
      isActive: true,
    });
    let isWithinGeofence = null;

    if (policy?.geofenceCoordinates) {
      // حساب المسافة (Haversine formula مبسطة)
      const { lat: centerLat, lng: centerLng } = policy.geofenceCoordinates;
      const R = 6371; // km
      const dLat = ((latitude - centerLat) * Math.PI) / 180;
      const dLng = ((longitude - centerLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((centerLat * Math.PI) / 180) *
          Math.cos((latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      isWithinGeofence = distance <= (policy.geofenceRadiusKm || 0.1);
    }

    const log = await AttendanceLog.create({
      branchId: employee.branchId,
      employeeId: employee._id,
      punchTime: new Date(),
      punchType: punchType || 'checkin',
      verificationMethod: 'mobile',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      isMobile: true,
      isWithinGeofence,
      isSynced: true,
      createdBy: req.user?._id,
    });

    const daily = await attendanceProcessing.processLog(log);

    res.json({
      success: true,
      message: punchType === 'checkin' ? 'تم تسجيل الحضور' : 'تم تسجيل الانصراف',
      time: new Date().toLocaleTimeString('ar-SA'),
      withinGeofence: isWithinGeofence,
      daily,
    });
  } catch (err) {
    safeError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// الوقت الإضافي — Overtime
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/overtime — قائمة طلبات الوقت الإضافي
router.get('/overtime', async (req, res) => {
  try {
    const { branchId, employeeId, status, page = 1, perPage = 15 } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const [data, total] = await Promise.all([
      OvertimeRequest.find(query)
        .populate('employeeId', 'name nameAr')
        .sort({ overtimeDate: -1 })
        .skip((parseInt(page) - 1) * parseInt(perPage))
        .limit(parseInt(perPage)),
      OvertimeRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(perPage)),
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/overtime — طلب وقت إضافي
router.post('/overtime', async (req, res) => {
  try {
    const overtime = await OvertimeRequest.create({ ...stripUpdateMeta(req.body), createdBy: req.user?._id });
    res.status(201).json({ success: true, data: overtime });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/biometric-attendance/overtime/:id/approve — اعتماد وقت إضافي
router.put('/overtime/:id/approve', async (req, res) => {
  try {
    const overtime = await OvertimeRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user?._id, approvedAt: new Date() },
      { new: true }
    );
    if (!overtime) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    res.json({ success: true, data: overtime });
  } catch (err) {
    safeError(res, err);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// سياسات الحضور — Attendance Policies
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/policies — قائمة السياسات
router.get('/policies', async (req, res) => {
  try {
    const { branchId } = req.query;
    const query = branchId ? { branchId } : {};
    const policies = await AttendancePolicyModel.find(query).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, data: policies });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /api/biometric-attendance/policies — إنشاء سياسة حضور
router.post('/policies', async (req, res) => {
  try {
    const policy = await AttendancePolicyModel.create({ ...stripUpdateMeta(req.body), createdBy: req.user?._id });
    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/biometric-attendance/policies/:id — تعديل سياسة
router.put('/policies/:id', async (req, res) => {
  try {
    const policy = await AttendancePolicyModel.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?._id },
      { new: true }
    );
    if (!policy) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// إحصائيات عامة
// ═══════════════════════════════════════════════════════════════════════

// GET /api/biometric-attendance/stats — إحصائيات الحضور
router.get('/stats', async (req, res) => {
  try {
    const { branchId } = req.query;
    const stats = await attendanceProcessing.getStats(branchId);
    res.json({ success: true, data: stats });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
