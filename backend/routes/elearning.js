'use strict';
/**
 * E-Learning Routes — التعلم الإلكتروني
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Courses
router.get('/courses', async (req, res) => {
  try {
    const ELearningCourse = require('../models/ELearning/Course');
    const { page = 1, limit = 20, category, status, level } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (level) filter.level = level;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      ELearningCourse.find(filter).sort({ title: 1 }).skip(skip).limit(+limit).lean(),
      ELearningCourse.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'elearning');
  }
});

router.post('/courses', authorize('admin', 'trainer', 'hr_manager'), async (req, res) => {
  try {
    const ELearningCourse = require('../models/ELearning/Course');
    const course = await ELearningCourse.create({
      ...req.body,
      status: 'draft',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const ELearningCourse = require('../models/ELearning/Course');
    const course = await ELearningCourse.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    return safeError(res, err, 'elearning');
  }
});

router.put('/courses/:id', authorize('admin', 'trainer', 'hr_manager'), async (req, res) => {
  try {
    const ELearningCourse = require('../models/ELearning/Course');
    const course = await ELearningCourse.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Enrollments
router.get('/enrollments', async (req, res) => {
  try {
    const Enrollment = require('../models/ELearning/Enrollment');
    const { userId, courseId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Enrollment.find(filter).sort({ enrolledAt: -1 }).skip(skip).limit(+limit).lean(),
      Enrollment.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    return safeError(res, err, 'elearning');
  }
});

router.post('/enrollments', async (req, res) => {
  try {
    const Enrollment = require('../models/ELearning/Enrollment');
    const enrollment = await Enrollment.create({
      ...req.body,
      userId: req.body.userId || req.user._id,
      enrolledAt: new Date(),
      status: 'enrolled',
    });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Progress tracking
router.patch('/enrollments/:id/progress', async (req, res) => {
  try {
    const Enrollment = require('../models/ELearning/Enrollment');
    const { progressPercent, completedLessons } = req.body;
    const updates = { progressPercent };
    if (completedLessons !== undefined) updates.completedLessons = completedLessons;
    if (progressPercent >= 100) {
      updates.status = 'completed';
      updates.completedAt = new Date();
    }
    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    res.json({ success: true, data: enrollment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Certificates
router.get('/certificates/:userId', async (req, res) => {
  try {
    const Certificate = require('../models/ELearning/Certificate');
    const data = await Certificate.find({ userId: req.params.userId }).lean();
    res.json({ success: true, data });
  } catch (err) {
    return safeError(res, err, 'elearning');
  }
});

module.exports = router;
