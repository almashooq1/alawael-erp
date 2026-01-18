const express = require('express');
const router = express.Router();
const eLearningService = require('../services/eLearningService');
const { authenticateToken } = require('../middleware/auth');

// Public routes (or semi-public)
router.get('/courses', async (req, res) => {
  try {
    const courses = await eLearningService.getAllCourses(req.query);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/courses/:id', async (req, res) => {
  try {
    const course = await eLearningService.getCourseById(req.params.id);
    res.json(course);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Protected routes
router.use(authenticateToken);

// Create Course (Instructor/Admin)
router.post('/courses', async (req, res) => {
  try {
    const result = await eLearningService.createCourse({ ...req.body, instructor: req.user.id || req.user._id });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Course
router.put('/courses/:id', async (req, res) => {
  try {
    const result = await eLearningService.updateCourse(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Course
router.delete('/courses/:id', async (req, res) => {
  try {
    await eLearningService.deleteCourse(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add Lesson
router.post('/courses/:id/lessons', async (req, res) => {
  try {
    const result = await eLearningService.addLesson({ ...req.body, courseId: req.params.id });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Student Enrollment
router.post('/courses/:id/enroll', async (req, res) => {
  try {
    const result = await eLearningService.enrollStudent(req.user.id || req.user._id, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/my-courses', async (req, res) => {
  try {
    const enrollments = await eLearningService.getStudentEnrollments(req.user.id || req.user._id);
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/courses/:id/lessons/:lessonId/complete', async (req, res) => {
  try {
    const result = await eLearningService.completeLesson(req.user.id || req.user._id, req.params.id, req.params.lessonId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
