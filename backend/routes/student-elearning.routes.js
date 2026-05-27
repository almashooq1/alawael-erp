'use strict';
/**
 * Student E-Learning Routes — التعليم الإلكتروني والمحتوى التفاعلي
 * ══════════════════════════════════════════════════════════════════════════
 * Online learning: course catalog, enrollment, progress tracking,
 * lesson completion, assessments, and learning certificates.
 *
 *   GET    /courses              list course catalog
 *   POST   /courses              create a course (admin/manager)
 *   GET    /courses/:id          course details
 *   PUT    /courses/:id          update course (admin/manager)
 *   DELETE /courses/:id          delete course (admin)
 *   PATCH  /courses/:id/publish  publish/unpublish course
 *   POST   /courses/:id/enroll   enroll in course
 *   GET    /my-courses           enrolled courses for current user
 *   GET    /my-courses/:id       enrolled course with progress
 *   POST   /my-courses/:id/complete-lesson  mark lesson complete
 *   GET    /assessments          list available assessments
 *   POST   /assessments/:id/submit  submit assessment answers
 *   GET    /certificates         earned e-learning certificates
 *   GET    /stats                e-learning statistics
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

// ── GET /courses ───────────────────────────────────────────────────────────
router.get('/courses', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [], pagination: { total: 0 } });
    const { page = 1, limit = 20, category, level } = req.query;
    const filter = {
      branchId: req.user.branchId,
      activityType: 'elearning_course',
      'data.status': 'published',
    };
    if (category) filter['data.category'] = category;
    if (level) filter['data.level'] = level;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      StudentActivity.find(filter).sort({ 'data.title': 1 }).skip(skip).limit(Number(limit)).lean(),
      StudentActivity.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    safeError(res, err, 'list courses');
  }
});

// ── POST /courses ──────────────────────────────────────────────────────────
router.post('/courses', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level = 'beginner',
      lessons = [],
      assessmentIds = [],
      coverImage,
    } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.create({
      activityType: 'elearning_course',
      data: {
        title,
        description,
        category,
        level,
        lessons,
        assessmentIds,
        coverImage,
        status: 'draft',
        enrollmentCount: 0,
      },
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: new Date(),
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'create course');
  }
});

// ── GET /courses/:id ───────────────────────────────────────────────────────
router.get('/courses/:id', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'elearning_course',
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'get course');
  }
});

// ── PUT /courses/:id ───────────────────────────────────────────────────────
router.put('/courses/:id', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, activityType: 'elearning_course' },
      { $set: { data: { ...req.body } } },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'update course');
  }
});

// ── DELETE /courses/:id ────────────────────────────────────────────────────
router.delete('/courses/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const doc = await StudentActivity.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'elearning_course',
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    safeError(res, err, 'delete course');
  }
});

// ── PATCH /courses/:id/publish ─────────────────────────────────────────────
router.patch(
  '/courses/:id/publish',
  requireRole('admin', 'manager', 'supervisor'),
  async (req, res) => {
    try {
      const StudentActivity = safeModel('StudentActivity');
      if (!StudentActivity)
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
      const doc = await StudentActivity.findOne({
        _id: req.params.id,
        branchId: req.user.branchId,
        activityType: 'elearning_course',
      });
      if (!doc) return res.status(404).json({ success: false, message: 'Course not found' });
      const newStatus = doc.data?.status === 'published' ? 'draft' : 'published';
      doc.data = { ...doc.data, status: newStatus };
      await doc.save();
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'publish/unpublish course');
    }
  }
);

// ── POST /courses/:id/enroll ───────────────────────────────────────────────
router.post('/courses/:id/enroll', async (req, res) => {
  try {
    const { studentId = req.user._id } = req.body;
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    // Check course exists and is published
    const course = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'elearning_course',
      'data.status': 'published',
    }).lean();
    if (!course)
      return res.status(404).json({ success: false, message: 'Course not found or not published' });
    // Create enrollment record
    const existing = await StudentActivity.findOne({
      branchId: req.user.branchId,
      activityType: 'elearning_enrollment',
      studentId,
      'data.courseId': req.params.id,
    }).lean();
    if (existing)
      return res.status(409).json({ success: false, message: 'Already enrolled in this course' });
    const doc = await StudentActivity.create({
      activityType: 'elearning_enrollment',
      studentId,
      data: {
        courseId: req.params.id,
        courseTitle: course.data?.title,
        status: 'enrolled',
        completedLessons: [],
        progress: 0,
      },
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: new Date(),
    });
    // Increment enrollment count
    await StudentActivity.updateOne(
      { _id: req.params.id },
      { $inc: { 'data.enrollmentCount': 1 } }
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    safeError(res, err, 'enroll in course');
  }
});

// ── GET /my-courses ────────────────────────────────────────────────────────
router.get('/my-courses', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { beneficiaryId } = req.query;
    const targetId = beneficiaryId || req.user._id;
    const data = await StudentActivity.find({
      branchId: req.user.branchId,
      activityType: 'elearning_enrollment',
      studentId: targetId,
    })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'my courses');
  }
});

// ── GET /my-courses/:id ────────────────────────────────────────────────────
router.get('/my-courses/:id', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const enrollment = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'elearning_enrollment',
    }).lean();
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    // Also fetch the course details
    const course = enrollment.data?.courseId
      ? await StudentActivity.findOne({
          _id: enrollment.data.courseId,
          activityType: 'elearning_course',
        }).lean()
      : null;
    res.json({ success: true, data: { enrollment, course } });
  } catch (err) {
    safeError(res, err, 'get enrolled course');
  }
});

// ── POST /my-courses/:id/complete-lesson ─────────────────────────────────
router.post('/my-courses/:id/complete-lesson', async (req, res) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ success: false, message: 'lessonId is required' });
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const enrollment = await StudentActivity.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId, activityType: 'elearning_enrollment' },
      { $addToSet: { 'data.completedLessons': { lessonId, completedAt: new Date() } } },
      { returnDocument: 'after' }
    );
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    // Recalculate progress
    const course = enrollment.data?.courseId
      ? await StudentActivity.findById(enrollment.data.courseId).lean()
      : null;
    const totalLessons = course?.data?.lessons?.length || 1;
    const completedCount = enrollment.data?.completedLessons?.length || 0;
    const progress = Math.round((completedCount / totalLessons) * 100);
    await StudentActivity.updateOne(
      { _id: req.params.id },
      {
        'data.progress': progress,
        'data.status': progress >= 100 ? 'completed' : 'in_progress',
        ...(progress >= 100 ? { 'data.completedAt': new Date() } : {}),
      }
    );
    res.json({ success: true, data: { progress, lessonId, completed: progress >= 100 } });
  } catch (err) {
    safeError(res, err, 'complete lesson');
  }
});

// ── GET /assessments ───────────────────────────────────────────────────────
router.get('/assessments', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { courseId } = req.query;
    const filter = { branchId: req.user.branchId, activityType: 'elearning_assessment' };
    if (courseId) filter['data.courseId'] = courseId;
    const data = await StudentActivity.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'list assessments');
  }
});

// ── POST /assessments/:id/submit ───────────────────────────────────────────
router.post('/assessments/:id/submit', async (req, res) => {
  try {
    const { studentId = req.user._id, answers = [] } = req.body;
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    const assessment = await StudentActivity.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
      activityType: 'elearning_assessment',
    }).lean();
    if (!assessment)
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    // Simple auto-score if questions have correct answers
    const questions = assessment.data?.questions || [];
    let score = 0;
    if (questions.length > 0) {
      answers.forEach(ans => {
        const q = questions.find(q => String(q._id) === ans.questionId);
        if (q && q.correctAnswer === ans.answer) score++;
      });
    }
    const percentScore = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const submission = await StudentActivity.create({
      activityType: 'elearning_submission',
      studentId,
      data: {
        assessmentId: req.params.id,
        answers,
        score: percentScore,
        passed: percentScore >= (assessment.data?.passingScore || 60),
        submittedAt: new Date(),
      },
      branchId: req.user.branchId,
      recordedBy: req.user._id,
      date: new Date(),
    });
    res.status(201).json({
      success: true,
      data: submission,
      score: percentScore,
      passed: percentScore >= (assessment.data?.passingScore || 60),
    });
  } catch (err) {
    safeError(res, err, 'submit assessment');
  }
});

// ── GET /certificates ──────────────────────────────────────────────────────
router.get('/certificates', async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity) return res.json({ success: true, data: [] });
    const { beneficiaryId } = req.query;
    const targetId = beneficiaryId || req.user._id;
    const data = await StudentActivity.find({
      branchId: req.user.branchId,
      activityType: 'elearning_enrollment',
      studentId: targetId,
      'data.status': 'completed',
    })
      .select('data.courseTitle data.completedAt data.progress studentId')
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'e-learning certificates');
  }
});

// ── GET /stats ─────────────────────────────────────────────────────────────
router.get('/stats', requireRole('admin', 'manager', 'supervisor'), async (req, res) => {
  try {
    const StudentActivity = safeModel('StudentActivity');
    if (!StudentActivity)
      return res.json({ success: true, data: { courses: 0, enrollments: 0, completions: 0 } });
    const base = { branchId: req.user.branchId };
    const [courses, enrollments, completions] = await Promise.all([
      StudentActivity.countDocuments({
        ...base,
        activityType: 'elearning_course',
        'data.status': 'published',
      }),
      StudentActivity.countDocuments({ ...base, activityType: 'elearning_enrollment' }),
      StudentActivity.countDocuments({
        ...base,
        activityType: 'elearning_enrollment',
        'data.status': 'completed',
      }),
    ]);
    res.json({
      success: true,
      data: {
        courses,
        enrollments,
        completions,
        completionRate: enrollments ? Math.round((completions / enrollments) * 100) : 0,
      },
    });
  } catch (err) {
    safeError(res, err, 'e-learning stats');
  }
});

module.exports = router;
