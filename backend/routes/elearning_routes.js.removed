/**
 * E-Learning System Routes
 * نظام التعلم عن بعد - المسارات والـ API
 */

const express = require('express');
const router = express.Router();
const ELearningSystem = require('../lib/elearning_system');

const elearning = new ELearningSystem();

/**
 * Helper function to send success response
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date(),
  });
};

/**
 * Helper function to send error response
 */
const sendError = (res, message = 'Error', statusCode = 400, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: error?.message || error,
    timestamp: new Date(),
  });
};

// ==================== HEALTH CHECK ====================

/**
 * GET /api/elearning/health
 * Check E-Learning system status
 */
router.get('/health', (req, res) => {
  try {
    const stats = elearning.getSystemStats();
    sendSuccess(
      res,
      {
        status: 'operational',
        system: 'E-Learning',
        stats,
        timestamp: new Date(),
      },
      'E-Learning system is operational'
    );
  } catch (error) {
    sendError(res, 'Health check failed', 500, error);
  }
});

// ==================== DASHBOARD ====================

/**
 * GET /api/elearning/dashboard/:userId/:userType
 * Get user dashboard data
 */
router.get('/dashboard/:userId/:userType', (req, res) => {
  try {
    const { userId, userType } = req.params;
    const data = elearning.getDashboardData(userId, userType);

    if (!data) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, data, 'Dashboard data retrieved');
  } catch (error) {
    sendError(res, 'Failed to get dashboard data', 500, error);
  }
});

// ==================== COURSES ====================

/**
 * GET /api/elearning/courses
 * Get all courses with optional filters
 */
router.get('/courses', (req, res) => {
  try {
    const { category, level, instructor, status } = req.query;
    const filters = {};

    if (category) filters.category = category;
    if (level) filters.level = level;
    if (instructor) filters.instructor = instructor;
    if (status) filters.status = status;

    const courses = elearning.getAllCourses(filters);
    sendSuccess(
      res,
      {
        count: courses.length,
        courses,
      },
      'Courses retrieved successfully'
    );
  } catch (error) {
    sendError(res, 'Failed to get courses', 500, error);
  }
});

/**
 * GET /api/elearning/courses/:courseId
 * Get course details
 */
router.get('/courses/:courseId', (req, res) => {
  try {
    const { courseId } = req.params;
    const course = elearning.getCourseDetails(courseId);

    if (!course) {
      return sendError(res, 'Course not found', 404);
    }

    sendSuccess(res, course, 'Course details retrieved');
  } catch (error) {
    sendError(res, 'Failed to get course', 500, error);
  }
});

/**
 * POST /api/elearning/courses
 * Create new course (Instructor only)
 */
router.post('/courses', (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      category,
      level,
      duration,
      capacity,
      startDate,
      endDate,
      credits,
    } = req.body;

    if (!title || !instructor || !category) {
      return sendError(res, 'Missing required fields', 400);
    }

    const courseData = {
      id: `COURSE${Date.now()}`,
      title,
      description,
      instructor,
      category,
      level: level || 'intermediate',
      duration: duration || 30,
      capacity: capacity || 50,
      thumbnail: 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(title),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      credits: credits || 3,
    };

    const course = elearning.addCourse(courseData);
    sendSuccess(res, course, 'Course created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create course', 500, error);
  }
});

/**
 * GET /api/elearning/courses/:courseId/leaderboard
 * Get course leaderboard
 */
router.get('/courses/:courseId/leaderboard', (req, res) => {
  try {
    const { courseId } = req.params;
    const leaderboard = elearning.getCourseLeaderboard(courseId);

    sendSuccess(
      res,
      {
        courseId,
        leaderboard,
      },
      'Leaderboard retrieved'
    );
  } catch (error) {
    sendError(res, 'Failed to get leaderboard', 500, error);
  }
});

// ==================== SEARCH ====================

/**
 * GET /api/elearning/search
 * Search courses
 */
router.get('/search', (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return sendError(res, 'Search query required', 400);
    }

    const results = elearning.searchCourses(query);
    sendSuccess(
      res,
      {
        query,
        count: results.length,
        results,
      },
      'Search completed'
    );
  } catch (error) {
    sendError(res, 'Search failed', 500, error);
  }
});

// ==================== STUDENTS ====================

/**
 * POST /api/elearning/enroll
 * Enroll student in course
 */
router.post('/enroll', (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return sendError(res, 'Student ID and Course ID required', 400);
    }

    const result = elearning.enrollStudent(studentId, courseId);

    if (!result.success) {
      return sendError(res, result.message, 400);
    }

    sendSuccess(res, result.enrollment, 'Student enrolled successfully', 201);
  } catch (error) {
    sendError(res, 'Enrollment failed', 500, error);
  }
});

/**
 * GET /api/elearning/students/:studentId/courses
 * Get student enrolled courses
 */
router.get('/students/:studentId/courses', (req, res) => {
  try {
    const { studentId } = req.params;
    const courses = elearning.getStudentCourses(studentId);

    sendSuccess(
      res,
      {
        studentId,
        count: courses.length,
        courses,
      },
      'Student courses retrieved'
    );
  } catch (error) {
    sendError(res, 'Failed to get student courses', 500, error);
  }
});

/**
 * GET /api/elearning/students/:studentId/progress/:courseId
 * Get student progress in course
 */
router.get('/students/:studentId/progress/:courseId', (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const progress = elearning.getStudentProgress(studentId, courseId);

    if (!progress.success) {
      return sendError(res, progress.message, 404);
    }

    sendSuccess(res, progress, 'Progress retrieved');
  } catch (error) {
    sendError(res, 'Failed to get progress', 500, error);
  }
});

// ==================== LESSONS ====================

/**
 * POST /api/elearning/lessons
 * Add lesson to course
 */
router.post('/lessons', (req, res) => {
  try {
    const { courseId, title, description, type, content, duration, order } = req.body;

    if (!courseId || !title || !type) {
      return sendError(res, 'Missing required fields', 400);
    }

    const lessonData = {
      id: `LESSON${Date.now()}`,
      courseId,
      title,
      description,
      type,
      content,
      duration: duration || 30,
      order: order || 1,
      createdAt: new Date(),
    };

    const lesson = elearning.addLesson(lessonData);
    sendSuccess(res, lesson, 'Lesson created', 201);
  } catch (error) {
    sendError(res, 'Failed to create lesson', 500, error);
  }
});

// ==================== ASSIGNMENTS ====================

/**
 * POST /api/elearning/assignments
 * Create assignment
 */
router.post('/assignments', (req, res) => {
  try {
    const { courseId, title, description, dueDate, maxScore, type } = req.body;

    if (!courseId || !title) {
      return sendError(res, 'Missing required fields', 400);
    }

    const assignmentData = {
      id: `ASSIGN${Date.now()}`,
      courseId,
      title,
      description,
      dueDate: new Date(dueDate),
      maxScore: maxScore || 100,
      type: type || 'assignment',
    };

    const assignment = elearning.addAssignment(assignmentData);
    sendSuccess(res, assignment, 'Assignment created', 201);
  } catch (error) {
    sendError(res, 'Failed to create assignment', 500, error);
  }
});

/**
 * POST /api/elearning/submit-assignment
 * Submit assignment
 */
router.post('/submit-assignment', (req, res) => {
  try {
    const { studentId, assignmentId, content, files } = req.body;

    if (!studentId || !assignmentId || !content) {
      return sendError(res, 'Missing required fields', 400);
    }

    const submission = elearning.submitAssignment(studentId, assignmentId, content, files || []);
    sendSuccess(res, submission, 'Assignment submitted', 201);
  } catch (error) {
    sendError(res, 'Failed to submit assignment', 500, error);
  }
});

/**
 * POST /api/elearning/grade-assignment
 * Grade assignment submission
 */
router.post('/grade-assignment', (req, res) => {
  try {
    const { submissionId, score, feedback, maxScore } = req.body;

    if (!submissionId || score === undefined) {
      return sendError(res, 'Missing required fields', 400);
    }

    const result = elearning.gradeSubmission(submissionId, score, feedback, maxScore || 100);

    if (!result.success) {
      return sendError(res, result.message, 400);
    }

    sendSuccess(res, result.submission, 'Assignment graded');
  } catch (error) {
    sendError(res, 'Failed to grade assignment', 500, error);
  }
});

// ==================== ASSESSMENTS/QUIZZES ====================

/**
 * POST /api/elearning/assessments
 * Create assessment/quiz
 */
router.post('/assessments', (req, res) => {
  try {
    const { courseId, title, description, totalQuestions, timeLimit, passingScore, type } =
      req.body;

    if (!courseId || !title || !totalQuestions) {
      return sendError(res, 'Missing required fields', 400);
    }

    const assessmentData = {
      id: `QUIZ${Date.now()}`,
      courseId,
      title,
      description,
      totalQuestions,
      timeLimit: timeLimit || 60,
      passingScore: passingScore || 70,
      type: type || 'quiz',
    };

    const assessment = elearning.addAssessment(assessmentData);
    sendSuccess(res, assessment, 'Assessment created', 201);
  } catch (error) {
    sendError(res, 'Failed to create assessment', 500, error);
  }
});

/**
 * POST /api/elearning/submit-assessment
 * Submit assessment/quiz answers
 */
router.post('/submit-assessment', (req, res) => {
  try {
    const { studentId, assessmentId, answers } = req.body;

    if (!studentId || !assessmentId || !answers) {
      return sendError(res, 'Missing required fields', 400);
    }

    const result = elearning.submitAssessment(studentId, assessmentId, answers);

    if (!result.success) {
      return sendError(res, result.message, 400);
    }

    sendSuccess(res, result.submission, 'Assessment submitted', 201);
  } catch (error) {
    sendError(res, 'Failed to submit assessment', 500, error);
  }
});

// ==================== MESSAGES & NOTIFICATIONS ====================

/**
 * POST /api/elearning/messages
 * Send message
 */
router.post('/messages', (req, res) => {
  try {
    const { from, to, subject, message, type } = req.body;

    if (!from || !to || !subject || !message) {
      return sendError(res, 'Missing required fields', 400);
    }

    const msg = elearning.sendMessage(from, to, subject, message, type);
    sendSuccess(res, msg, 'Message sent', 201);
  } catch (error) {
    sendError(res, 'Failed to send message', 500, error);
  }
});

/**
 * POST /api/elearning/announcements
 * Add course announcement
 */
router.post('/announcements', (req, res) => {
  try {
    const { courseId, title, content, type } = req.body;

    if (!courseId || !title || !content) {
      return sendError(res, 'Missing required fields', 400);
    }

    const announcement = elearning.addAnnouncement(courseId, title, content, type);
    sendSuccess(res, announcement, 'Announcement created', 201);
  } catch (error) {
    sendError(res, 'Failed to create announcement', 500, error);
  }
});

// ==================== INSTRUCTORS ====================

/**
 * GET /api/elearning/instructors/:instructorId/courses
 * Get instructor courses
 */
router.get('/instructors/:instructorId/courses', (req, res) => {
  try {
    const { instructorId } = req.params;
    const courses = elearning.getInstructorCourses(instructorId);

    sendSuccess(
      res,
      {
        instructorId,
        count: courses.length,
        courses,
      },
      'Instructor courses retrieved'
    );
  } catch (error) {
    sendError(res, 'Failed to get instructor courses', 500, error);
  }
});

/**
 * GET /api/elearning/instructors/:instructorId/stats
 * Get instructor statistics
 */
router.get('/instructors/:instructorId/stats', (req, res) => {
  try {
    const { instructorId } = req.params;
    const stats = elearning.getInstructorStats(instructorId);

    sendSuccess(res, stats, 'Instructor statistics retrieved');
  } catch (error) {
    sendError(res, 'Failed to get instructor stats', 500, error);
  }
});

// ==================== CERTIFICATES ====================

/**
 * POST /api/elearning/certificates
 * Generate certificate
 */
router.post('/certificates', (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return sendError(res, 'Student ID and Course ID required', 400);
    }

    const certificate = elearning.generateCertificate(studentId, courseId);

    if (!certificate.success && certificate.message) {
      return sendError(res, certificate.message, 400);
    }

    sendSuccess(res, certificate, 'Certificate generated', 201);
  } catch (error) {
    sendError(res, 'Failed to generate certificate', 500, error);
  }
});

// ==================== SYSTEM STATISTICS ====================

/**
 * GET /api/elearning/stats
 * Get system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = elearning.getSystemStats();
    sendSuccess(res, stats, 'System statistics retrieved');
  } catch (error) {
    sendError(res, 'Failed to get statistics', 500, error);
  }
});

/**
 * GET /api/elearning/status
 * Get detailed system status
 */
router.get('/status', (req, res) => {
  try {
    const stats = elearning.getSystemStats();
    sendSuccess(
      res,
      {
        status: 'operational',
        system: 'E-Learning Management System',
        version: '1.0.0',
        uptime: process.uptime(),
        ...stats,
      },
      'System status retrieved'
    );
  } catch (error) {
    sendError(res, 'Failed to get status', 500, error);
  }
});

module.exports = { router, elearning };
