const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const eLearningService = require('../services/eLearningService');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const sanitizeInput = require('../middleware/sanitize');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation error', errors: errors.array() });
  }
  next();
};

// Public routes (or semi-public)
router.get(
  '/courses',
  query('search').optional().trim().isLength({ max: 200 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const courses = await eLearningService.getAllCourses(req.query);
      res.json({ success: true, data: courses });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get(
  '/courses/:id',
  param('id').trim().isLength({ min: 2, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const course = await eLearningService.getCourseById(req.params.id);
      res.json({ success: true, data: course });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }
);

// Protected routes
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// Create Course (Instructor/Admin)
router.post(
  '/courses',
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isIn(['technology', 'business', 'healthcare', 'other']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await eLearningService.createCourse({
        ...req.body,
        instructor: req.user._id || req.user.id,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update Course
router.put(
  '/courses/:id',
  param('id').trim().isLength({ min: 2, max: 100 }),
  body('title').optional().trim().isLength({ min: 3, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await eLearningService.updateCourse(req.params.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Delete Course
router.delete(
  '/courses/:id',
  param('id').trim().isLength({ min: 2, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      await eLearningService.deleteCourse(req.params.id);
      res.json({ success: true, message: 'Course deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Add Lesson
router.post(
  '/courses/:id/lessons',
  param('id').trim().isLength({ min: 2, max: 100 }),
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('content').optional().trim().isLength({ max: 5000 }),
  body('videoUrl').optional().isURL(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await eLearningService.addLesson({
        ...req.body,
        courseId: req.params.id,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Student Enrollment
router.post(
  '/courses/:id/enroll',
  param('id').trim().isLength({ min: 2, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await eLearningService.enrollStudent(
        req.user._id || req.user.id,
        req.params.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.get('/my-courses', async (req, res) => {
  try {
    const enrollments = await eLearningService.getStudentEnrollments(req.user._id || req.user.id);
    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/courses/:id/lessons/:lessonId/complete',
  param('id').trim().isLength({ min: 2, max: 100 }),
  param('lessonId').trim().isLength({ min: 2, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await eLearningService.completeLesson(
        req.user._id || req.user.id,
        req.params.id,
        req.params.lessonId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

