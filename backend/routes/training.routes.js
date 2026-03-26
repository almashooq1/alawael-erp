/**
 * Training & Development Routes — مسارات التدريب والتطوير
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

/** Max page size to prevent memory exhaustion */
const MAX_PAGE_LIMIT = 100;
const clampLimit = v => Math.max(1, Math.min(parseInt(v, 10) || 20, MAX_PAGE_LIMIT));

/** Guard: reject invalid ObjectIds early (400 instead of CastError 500) */
const validObjectId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'معرف غير صالح' });
    return false;
  }
  return true;
};

const safeModel = n => (mongoose.models[n] ? mongoose.model(n) : require(`../models/Training`)[n]);

// ── Dashboard ────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (_req, res) => {
  try {
    const Course = safeModel('TrainingCourse');
    const Session = safeModel('TrainingSession');
    const Plan = safeModel('TrainingPlan');

    const [totalCourses, activeSessions, completedSessions, plans] = await Promise.all([
      Course.countDocuments().catch(() => 0),
      Session.countDocuments({ status: 'in_progress' }).catch(() => 0),
      Session.countDocuments({ status: 'completed' }).catch(() => 0),
      Plan.countDocuments({ status: { $in: ['approved', 'in_progress'] } }).catch(() => 0),
    ]);

    const byCategory = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).catch(() => []);
    const upcoming = await Session.find({ status: 'scheduled', startDate: { $gte: new Date() } })
      .sort({ startDate: 1 })
      .limit(5)
      .populate('course', 'titleAr courseCode')
      .lean()
      .catch(() => []);

    res.json({
      success: true,
      data: {
        summary: { totalCourses, activeSessions, completedSessions, activePlans: plans },
        coursesByCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
        upcomingSessions: upcoming,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Courses CRUD ─────────────────────────────────────────────
router.get('/courses', authenticate, async (req, res) => {
  try {
    const Course = safeModel('TrainingCourse');
    const { status, category, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = clampLimit(rawLimit);
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/courses', authenticate, async (req, res) => {
  try {
    const Course = safeModel('TrainingCourse');
    const doc = await Course.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/courses/:id', authenticate, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const Course = safeModel('TrainingCourse');
    if (!doc) return res.status(404).json({ success: false, message: 'الدورة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/courses/:id', authenticate, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const Course = safeModel('TrainingCourse');
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Sessions CRUD ────────────────────────────────────────────
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const Session = safeModel('TrainingSession');
    const { status, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = clampLimit(rawLimit);
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Session.find(filter)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate('course', 'titleAr courseCode category')
        .lean(),
      Session.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: docs,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sessions', authenticate, async (req, res) => {
  try {
    const Session = safeModel('TrainingSession');
    const doc = await Session.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/sessions/:id', authenticate, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const Session = safeModel('TrainingSession');
    if (!doc) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Plans CRUD ───────────────────────────────────────────────
router.get('/plans', authenticate, async (req, res) => {
  try {
    const Plan = safeModel('TrainingPlan');
    const docs = await Plan.find().sort({ year: -1 }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/plans', authenticate, async (req, res) => {
  try {
    const Plan = safeModel('TrainingPlan');
    const doc = await Plan.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/plans/:id', authenticate, async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const Plan = safeModel('TrainingPlan');
    if (!doc) return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
