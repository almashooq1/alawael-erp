'use strict';
/**
 * LearningManagement Routes
 * Auto-extracted from services/dddLearningManagement.js
 * 22 endpoints — Auth required on all
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

// Service singleton — use directly (no `new`)
const svc = require('../services/dddLearningManagement');
const { validate } = require('../middleware/validate');
const v = require('../validations/learning-management.validation');


  // Service imported as singleton above;

  /* ── Courses ── */
  router.get('/learning/courses', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listCourses(req.query) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.get('/learning/courses/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getCourse(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/courses', authenticate, validate(v.createCourse), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCourse(req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.put('/learning/courses/:id', authenticate, validate(v.updateCourse), async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateCourse(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/courses/:id/publish', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.publishCourse(req.params.id) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.get('/learning/courses/:id/analytics', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getCourseAnalytics(req.params.id) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });

  /* ── Learning Paths ── */
  router.get('/learning/paths', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listLearningPaths(req.query) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.get('/learning/paths/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getLearningPath(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/paths', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createLearningPath(req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.put('/learning/paths/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateLearningPath(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });

  /* ── Enrollments ── */
  router.get('/learning/enrollments', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEnrollments(req.query) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.get('/learning/enrollments/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getEnrollment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/enrollments', authenticate, validate(v.createEnrollment), async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.enrollUser(req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.put('/learning/enrollments/:id/progress', authenticate, async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateProgress(req.params.id, req.body.moduleId, req.body),
      });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/enrollments/:id/withdraw', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.withdrawEnrollment(req.params.id) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });

  /* ── Quizzes ── */
  router.get('/learning/quizzes', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listQuizzes(req.query) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.get('/learning/quizzes/:id', authenticate, async (req, res) => {
    try {
      const d = await svc.getQuiz(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/quizzes', authenticate, async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createQuiz(req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.put('/learning/quizzes/:id', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateQuiz(req.params.id, req.body) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });
  router.post('/learning/quizzes/:id/grade', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.gradeQuiz(req.params.id, req.body.answers) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });

  /* ── Learner Dashboard ── */
  router.get('/learning/dashboard/:userId', authenticate, async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getLearnerDashboard(req.params.userId) });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });

  /* ── Health ── */
  router.get('/learning/health', authenticate, async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      safeError(res, e, 'learning-management');
    }
  });


module.exports = router;
