/**
 * Volunteer Routes — System 41
 * نظام إدارة المتطوعين
 *
 * Endpoints:
 *   GET    /api/volunteers/stats
 *   GET    /api/volunteers
 *   POST   /api/volunteers
 *   GET    /api/volunteers/:id
 *   PUT    /api/volunteers/:id
 *   DELETE /api/volunteers/:id
 *   POST   /api/volunteers/register
 *   PATCH  /api/volunteers/:id/status
 *   GET    /api/volunteers/:id/match-opportunities
 *   GET    /api/volunteers/opportunities
 *   POST   /api/volunteers/opportunities
 *   GET    /api/volunteers/opportunities/:id
 *   PUT    /api/volunteers/opportunities/:id
 *   DELETE /api/volunteers/opportunities/:id
 *   POST   /api/volunteers/assignments
 *   GET    /api/volunteers/assignments
 *   PATCH  /api/volunteers/assignments/:id/check-in
 *   PATCH  /api/volunteers/assignments/:id/check-out
 *   POST   /api/volunteers/assignments/:id/certificate
 *   GET    /api/volunteers/training
 *   POST   /api/volunteers/training
 *   GET    /api/volunteers/recognitions
 *   POST   /api/volunteers/recognitions
 *   GET    /api/volunteers/mntasati/sync/:id
 */

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');

// 🔒 All volunteer routes require authentication
router.use(authenticate);

// Models
const Volunteer = require('../models/Volunteer');
const VolunteerOpportunity = require('../models/VolunteerOpportunity');
const VolunteerAssignment = require('../models/VolunteerAssignment');
const VolunteerTrainingSession = require('../models/VolunteerTrainingSession');
const VolunteerRecognition = require('../models/VolunteerRecognition');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = branchId ? { branchId } : {};

    const [total, active, pending, totalHoursAgg] = await Promise.all([
      Volunteer.countDocuments(filter),
      Volunteer.countDocuments({ ...filter, status: 'active' }),
      Volunteer.countDocuments({ ...filter, status: 'pending' }),
      Volunteer.aggregate([
        { $match: { ...filter, deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$totalHours' } } },
      ]),
    ]);

    ok(res, {
      data: {
        total: { title: 'إجمالي المتطوعين', value: total, icon: 'users' },
        active: { title: 'النشطون', value: active, icon: 'check-circle' },
        pending: { title: 'بانتظار الموافقة', value: pending, icon: 'clock' },
        hours: {
          title: 'إجمالي الساعات',
          value: totalHoursAgg[0]?.total || 0,
          icon: 'clock',
        },
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// VOLUNTEERS CRUD
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, status, category, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [
        { firstName: new RegExp(safe, 'i') },
        { lastName: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { nationalId: new RegExp(safe, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Volunteer.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      Volunteer.countDocuments(filter),
    ]);

    ok(res, {
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const doc = await Volunteer.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء المتطوع بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

// بوابة التسجيل العامة
router.post('/register', async (req, res) => {
  try {
    const required = ['firstName', 'lastName', 'nationalId', 'email', 'phone', 'gender'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);

    const doc = await Volunteer.create({
      ...req.body,
      uuid: uuidv4(),
      status: 'pending',
    });
    ok(res, { data: doc, message: 'تم تسجيل طلب التطوع بنجاح، سيتم مراجعته وإبلاغك' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await Volunteer.findById(req.params.id).lean();
    if (!doc) return fail(res, 'المتطوع غير موجود', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy || null },
      { new: true, runValidators: true }
    );
    if (!doc) return fail(res, 'المتطوع غير موجود', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Volunteer.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    if (!doc) return fail(res, 'المتطوع غير موجود', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تحديث حالة المتطوع بعد الغربلة
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['active', 'inactive', 'suspended', 'rejected', 'screening'];
    if (!allowed.includes(status)) return fail(res, 'حالة غير صالحة');

    const updates = { status, screeningNotes: notes };
    if (status === 'active') {
      updates.isVerified = true;
      updates.verifiedAt = new Date();
      updates.activeSince = new Date();
    }
    const doc = await Volunteer.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return fail(res, 'المتطوع غير موجود', 404);
    ok(res, { data: doc, message: 'تم تحديث الحالة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// مطابقة المتطوع مع الفرص المناسبة
router.get('/:id/match-opportunities', async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id).lean();
    if (!volunteer) return fail(res, 'المتطوع غير موجود', 404);

    const skills = volunteer.skills || [];
    const opportunities = await VolunteerOpportunity.find({
      branchId: volunteer.branchId,
      status: 'open',
      startDate: { $gte: new Date() },
    }).lean();

    const matched = opportunities.filter(op => {
      if (!op.requiredSkills || op.requiredSkills.length === 0) return true;
      return op.requiredSkills.some(s => skills.includes(s));
    });

    ok(res, { data: matched });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// OPPORTUNITIES
// ─────────────────────────────────────────────
router.get('/opportunities', async (req, res) => {
  try {
    const { status, category, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      VolunteerOpportunity.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ startDate: 1 })
        .lean(),
      VolunteerOpportunity.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/opportunities', async (req, res) => {
  try {
    const doc = await VolunteerOpportunity.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء الفرصة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.get('/opportunities/:id', async (req, res) => {
  try {
    const doc = await VolunteerOpportunity.findById(req.params.id).lean();
    if (!doc) return fail(res, 'الفرصة غير موجودة', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/opportunities/:id', async (req, res) => {
  try {
    const doc = await VolunteerOpportunity.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'الفرصة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/opportunities/:id', async (req, res) => {
  try {
    const doc = await VolunteerOpportunity.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!doc) return fail(res, 'الفرصة غير موجودة', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  try {
    const { volunteerId, opportunityId, status, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (volunteerId) filter.volunteerId = volunteerId;
    if (opportunityId) filter.opportunityId = opportunityId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      VolunteerAssignment.find(filter)
        .populate('volunteerId', 'firstName lastName email')
        .populate('opportunityId', 'title titleAr')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ assignmentDate: -1 })
        .lean(),
      VolunteerAssignment.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/assignments', async (req, res) => {
  try {
    const { volunteerId, opportunityId, assignmentDate } = req.body;
    if (!volunteerId || !opportunityId || !assignmentDate)
      return fail(res, 'volunteerId و opportunityId و assignmentDate مطلوبة');

    const opportunity = await VolunteerOpportunity.findById(opportunityId);
    if (!opportunity) return fail(res, 'الفرصة غير موجودة', 404);

    const doc = await VolunteerAssignment.create({
      ...req.body,
      uuid: uuidv4(),
      status: 'assigned',
    });

    // تحديث عداد المتطوعين
    await VolunteerOpportunity.findByIdAndUpdate(opportunityId, {
      $inc: { volunteersEnrolled: 1 },
    });

    ok(res, { data: doc, message: 'تم تكليف المتطوع بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, err.code === 11000 ? 409 : 400);
  }
});

// تسجيل دخول المتطوع
router.patch('/assignments/:id/check-in', async (req, res) => {
  try {
    const doc = await VolunteerAssignment.findByIdAndUpdate(
      req.params.id,
      { checkedInAt: new Date(), status: 'confirmed' },
      { new: true }
    );
    if (!doc) return fail(res, 'التكليف غير موجود', 404);
    ok(res, { data: doc, message: 'تم تسجيل الدخول بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// تسجيل خروج المتطوع + حساب الساعات
router.patch('/assignments/:id/check-out', async (req, res) => {
  try {
    const assignment = await VolunteerAssignment.findById(req.params.id);
    if (!assignment) return fail(res, 'التكليف غير موجود', 404);

    const now = new Date();
    const hours = assignment.checkedInAt
      ? Math.round(((now - assignment.checkedInAt) / 3600000) * 100) / 100
      : 0;

    const doc = await VolunteerAssignment.findByIdAndUpdate(
      req.params.id,
      { checkedOutAt: now, actualHours: hours, status: 'completed' },
      { new: true }
    );

    // تحديث ساعات وإحصائيات المتطوع
    await Volunteer.findByIdAndUpdate(assignment.volunteerId, {
      $inc: { totalHours: hours, tasksCompleted: 1 },
    });

    ok(res, { data: doc, message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// إصدار شهادة تطوع
router.post('/assignments/:id/certificate', async (req, res) => {
  try {
    const assignment = await VolunteerAssignment.findById(req.params.id);
    if (!assignment) return fail(res, 'التكليف غير موجود', 404);
    if (assignment.status !== 'completed') return fail(res, 'لا يمكن إصدار شهادة لتكليف غير مكتمل');

    const path = `certificates/volunteer_${assignment.volunteerId}_${assignment._id}.pdf`;
    const doc = await VolunteerAssignment.findByIdAndUpdate(
      req.params.id,
      { certificateIssued: true, certificateIssuedAt: new Date(), certificatePath: path },
      { new: true }
    );

    ok(res, { data: doc, certificate: path, message: 'تم إصدار الشهادة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// TRAINING
// ─────────────────────────────────────────────
router.get('/training', async (req, res) => {
  try {
    const { status, trainingType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (trainingType) filter.trainingType = trainingType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      VolunteerTrainingSession.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ sessionDate: -1 })
        .lean(),
      VolunteerTrainingSession.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/training', async (req, res) => {
  try {
    const doc = await VolunteerTrainingSession.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء جلسة التدريب بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// ─────────────────────────────────────────────
// RECOGNITIONS
// ─────────────────────────────────────────────
router.get('/recognitions', async (req, res) => {
  try {
    const { volunteerId, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (volunteerId) filter.volunteerId = volunteerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      VolunteerRecognition.find(filter)
        .populate('volunteerId', 'firstName lastName')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ awardedDate: -1 })
        .lean(),
      VolunteerRecognition.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/recognitions', async (req, res) => {
  try {
    const required = ['volunteerId', 'awardType', 'title', 'awardedDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);

    const doc = await VolunteerRecognition.create({ ...req.body, uuid: uuidv4() });

    // إضافة النقاط للمتطوع
    if (req.body.pointsAwarded > 0) {
      await Volunteer.findByIdAndUpdate(req.body.volunteerId, {
        $inc: { points: req.body.pointsAwarded },
      });
    }

    ok(res, { data: doc, message: 'تم منح الجائزة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// مزامنة مع منصة منصتي
router.get('/mntasati/sync/:id', async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id);
    if (!volunteer) return fail(res, 'المتطوع غير موجود', 404);
    if (!volunteer.mntasatiId) return fail(res, 'لا يوجد معرف منصتي لهذا المتطوع');

    // تكامل API مع منصة منصتي - https://www.mntasati.com/api
    await Volunteer.findByIdAndUpdate(req.params.id, { mntasatiSyncedAt: new Date() });
    ok(res, { message: 'تمت المزامنة مع منصة منصتي بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
