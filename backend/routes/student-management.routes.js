'use strict';
/**
 * Student Management Routes — إدارة الطلاب والمستفيدين في الفروع التعليمية
 * ══════════════════════════════════════════════════════════════════════════
 * Core student lifecycle management: registration, class assignment,
 * activities tracking, progress monitoring, and scheduling.
 *
 *   GET    /                       list students (paginated)
 *   POST   /                       register new student
 *   GET    /:id                    get student profile
 *   PUT    /:id                    update student profile
 *   PATCH  /:id/status             change enrollment status
 *   GET    /:id/activities         student activities log
 *   POST   /:id/activities         log new activity
 *   GET    /:id/progress           academic/therapeutic progress
 *   GET    /:id/schedule           student schedule
 *   POST   /:id/schedule           add schedule entry
 *   GET    /classes                list classes/groups
 *   GET    /stats                  enrollment statistics
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac.v2.middleware');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const router = express.Router();
router.use(authenticate);
router.use(requireBranchAccess);

const safeModel = name => {
  try {
    return mongoose.model(name);
  } catch (_) {
    return null;
  }
};

// ── GET / ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, status, classId, search } = req.query;
    const filter = { branchId: req.user.branchId, type: 'student' };
    if (status) filter.enrollmentStatus = status;
    if (classId) filter.classId = classId;
    if (search)
      filter.$or = [
        { 'name.first': { $regex: search, $options: 'i' } },
        { 'name.last': { $regex: search, $options: 'i' } },
        { fileNumber: { $regex: search, $options: 'i' } },
      ];
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Beneficiary.find(filter).sort({ 'name.first': 1 }).skip(skip).limit(Number(limit)).lean(),
      Beneficiary.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list students');
  }
});

// ── POST / ─────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'manager', 'receptionist'), async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Beneficiary.create({
      ...req.body,
      type: 'student',
      enrollmentStatus: 'active',
      branchId: req.user.branchId,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'register student');
  }
});

// ── GET /classes ───────────────────────────────────────────────────────────
// NOTE: literal collection routes must precede /:id or Express casts them as ids.
router.get('/classes', async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary) return res.json({ success: true, data: [] });
    const classes = await Beneficiary.aggregate([
      { $match: { branchId: req.user.branchId, classId: { $exists: true, $ne: null } } },
      { $group: { _id: '$classId', studentCount: { $sum: 1 } } },
    ]);
    res.json({ success: true, data: classes });
  } catch (err) {
    safeError(res, err, 'list classes');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.json({ success: true, data: { total: 0, active: 0, inactive: 0 } });
    const base = { branchId: req.user.branchId, type: 'student' };
    const [total, active, graduated, transferred] = await Promise.all([
      Beneficiary.countDocuments(base),
      Beneficiary.countDocuments({ ...base, enrollmentStatus: 'active' }),
      Beneficiary.countDocuments({ ...base, enrollmentStatus: 'graduated' }),
      Beneficiary.countDocuments({ ...base, enrollmentStatus: 'transferred' }),
    ]);
    res.json({
      success: true,
      data: { total, active, graduated, transferred, inactive: total - active },
    });
  } catch (err) {
    safeError(res, err, 'student stats');
  }
});

// ── GET /:id ───────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const student = await Beneficiary.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    }).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    safeError(res, err, 'get student');
  }
});

// ── PUT /:id ───────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'manager', 'receptionist'), async (req, res) => {
  try {
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Beneficiary.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { ...req.body, updatedBy: req.user._id },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update student');
  }
});

// ── PATCH /:id/status ──────────────────────────────────────────────────────
router.patch('/:id/status', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowed = ['active', 'inactive', 'graduated', 'transferred', 'suspended'];
    if (!allowed.includes(status))
      return res
        .status(400)
        .json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
    const Beneficiary = safeModel('Beneficiary');
    if (!Beneficiary)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await Beneficiary.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      {
        enrollmentStatus: status,
        statusChangeReason: reason,
        statusChangedAt: new Date(),
        statusChangedBy: req.user._id,
      },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update student status');
  }
});

// ── GET /:id/activities ────────────────────────────────────────────────────
router.get('/:id/activities', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { page = 1, limit = 20, type } = req.query;
    const filter = { studentId: req.params.id, branchId: req.user.branchId };
    if (type) filter.activityType = type;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StudentActivity.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
      StudentActivity.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'student activities');
  }
});

// ── POST /:id/activities ───────────────────────────────────────────────────
router.post('/:id/activities', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.create({
      ...req.body,
      studentId: req.params.id,
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: req.body.date || new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'log student activity');
  }
});

// ── GET /:id/progress ──────────────────────────────────────────────────────
router.get('/:id/progress', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({ success: true, data: { goals: [], milestones: [], overallProgress: 0 } });
    const activities = await StudentActivity.find({
      studentId: req.params.id,
      branchId: req.user.branchId,
      activityType: { $in: ['assessment', 'goal_review', 'milestone'] },
    })
      .sort({ date: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: { activities, count: activities.length } });
  } catch (err) {
    safeError(res, err, 'student progress');
  }
});

// ── GET /:id/schedule ──────────────────────────────────────────────────────
router.get('/:id/schedule', async (req, res) => {
  try {
    const Appointment = safeModel('Appointment');
    if (!Appointment) return res.json({ success: true, data: [] });
    const { from, to } = req.query;
    const filter = { beneficiaryId: req.params.id, branchId: req.user.branchId };
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }
    const data = await Appointment.find(filter).sort({ scheduledAt: 1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'student schedule');
  }
});

// ── POST /:id/schedule ─────────────────────────────────────────────────────
router.post(
  '/:id/schedule',
  requireRole('admin', 'manager', 'supervisor', 'clinician'),
  async (req, res) => {
    try {
      const Appointment = safeModel('Appointment');
      if (!Appointment)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await Appointment.create({
        ...req.body,
        beneficiaryId: req.params.id,
        branchId: req.user.branchId,
        createdBy: req.user._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'add schedule entry');
    }
  }
);

module.exports = router;
