'use strict';
/**
 * LearningManagement Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddLearningManagement.js
 */

const {
  DDDCourse,
  DDDLearningPath,
  DDDEnrollment,
  DDDQuiz,
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  CONTENT_TYPES,
  ENROLLMENT_STATUSES,
  QUESTION_TYPES,
  DELIVERY_MODES,
  CERTIFICATE_TYPES,
  BUILTIN_COURSES,
} = require('../models/DddLearningManagement');

const BaseCrudService = require('./base/BaseCrudService');

class LearningManagement extends BaseCrudService {
  constructor() {
    super('LearningManagement', {
      description: 'E-learning courses, curricula, learning paths, progress tracking & quizzes',
      version: '1.0.0',
    }, {
      courses: DDDCourse,
      learningPaths: DDDLearningPath,
      enrollments: DDDEnrollment,
      quizs: DDDQuiz,
    })
  }

  async initialize() {
    await this._seedCourses();
    this.log('Learning Management initialised ✓');
    return true;
  }

  async _seedCourses() {
    for (const c of BUILTIN_COURSES) {
      const exists = await DDDCourse.findOne({ code: c.code }).lean();
      if (!exists) await DDDCourse.create(c);
    }
  }

  /* ── Course CRUD ── */
  async listCourses(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.level) q.level = filters.level;
    if (filters.status) q.status = filters.status;
    if (filters.deliveryMode) q.deliveryMode = filters.deliveryMode;
    return DDDCourse.find(q).sort({ category: 1, code: 1 }).lean();
  }
  async getCourse(id) { return this._getById(DDDCourse, id); }
  async createCourse(data) { return this._create(DDDCourse, data); }
  async updateCourse(id, data) { return this._update(DDDCourse, id, data, { runValidators: true }); }
  async publishCourse(id) {
    return DDDCourse.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Learning Path CRUD ── */
  async listLearningPaths(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    return DDDLearningPath.find(q)
      .populate('courses.courseId', 'title titleAr code')
      .sort({ title: 1 })
      .lean();
  }
  async getLearningPath(id) {
    return DDDLearningPath.findById(id).populate('courses.courseId').lean();
  }
  async createLearningPath(data) {
    data.totalCourses = (data.courses || []).length;
    return DDDLearningPath.create(data);
  }
  async updateLearningPath(id, data) { return this._update(DDDLearningPath, id, data, { runValidators: true }); }

  /* ── Enrollment CRUD ── */
  async listEnrollments(filters = {}) {
    const q = {};
    if (filters.userId) q.userId = filters.userId;
    if (filters.courseId) q.courseId = filters.courseId;
    if (filters.status) q.status = filters.status;
    return DDDEnrollment.find(q)
      .populate('courseId', 'title titleAr code category')
      .sort({ createdAt: -1 })
      .lean();
  }
  async getEnrollment(id) {
    return DDDEnrollment.findById(id).populate('courseId').lean();
  }

  async enrollUser(data) {
    data.status = 'enrolled';
    const enrollment = await DDDEnrollment.create(data);
    await DDDCourse.findByIdAndUpdate(data.courseId, { $inc: { enrollmentCount: 1 } });
    return enrollment;
  }

  async updateProgress(enrollmentId, moduleId, progressData) {
    const enrollment = await DDDEnrollment.findById(enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    let modProgress = enrollment.moduleProgress.find(m => String(m.moduleId) === String(moduleId));
    if (!modProgress) {
      enrollment.moduleProgress.push({ moduleId, ...progressData });
    } else {
      Object.assign(modProgress, progressData);
    }

    // Recalculate overall progress
    const total = enrollment.moduleProgress.length || 1;
    const completed = enrollment.moduleProgress.filter(m => m.status === 'completed').length;
    enrollment.progress = Math.round((completed / total) * 100);
    enrollment.lastAccessedAt = new Date();

    if (enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    } else if (enrollment.progress > 0) {
      enrollment.status = 'in_progress';
      if (!enrollment.startedAt) enrollment.startedAt = new Date();
    }

    await enrollment.save();
    return enrollment;
  }

  async withdrawEnrollment(id) {
    return DDDEnrollment.findByIdAndUpdate(id, { status: 'withdrawn' }, { new: true }).lean();
  }

  /* ── Quiz CRUD ── */
  async listQuizzes(filters = {}) {
    const q = {};
    if (filters.courseId) q.courseId = filters.courseId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDQuiz.find(q).sort({ title: 1 }).lean();
  }
  async getQuiz(id) { return this._getById(DDDQuiz, id); }
  async createQuiz(data) {
    data.totalPoints = (data.questions || []).reduce((s, q) => s + (q.points || 1), 0);
    return DDDQuiz.create(data);
  }
  async updateQuiz(id, data) { return this._update(DDDQuiz, id, data, { runValidators: true }); }

  async gradeQuiz(quizId, answers) {
    const quiz = await DDDQuiz.findById(quizId).lean();
    if (!quiz) throw new Error('Quiz not found');
    let earned = 0;
    const results = [];
    for (const q of quiz.questions) {
      const ans = answers.find(a => String(a.questionId) === String(q._id));
      let correct = false;
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        const correctOption = q.options.find(o => o.isCorrect);
        correct = ans && correctOption && ans.answer === correctOption.label;
      } else {
        correct = ans && ans.answer === q.correctAnswer;
      }
      if (correct) earned += q.points || 1;
      results.push({
        questionId: q._id,
        correct,
        points: correct ? q.points || 1 : 0,
        explanation: q.explanation,
      });
    }
    const score = quiz.totalPoints > 0 ? Math.round((earned / quiz.totalPoints) * 100) : 0;
    return { score, passed: score >= quiz.passingScore, earned, total: quiz.totalPoints, results };
  }

  /* ── Analytics ── */
  async getCourseAnalytics(courseId) {
    const enrollments = await DDDEnrollment.find({ courseId }).lean();
    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in_progress').length;
    const avgProgress =
      total > 0 ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / total) : 0;
    const avgScore =
      completed > 0
        ? Math.round(
            enrollments.filter(e => e.finalScore).reduce((s, e) => s + e.finalScore, 0) / completed
          )
        : 0;
    return {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgProgress,
      avgScore,
    };
  }

  async getLearnerDashboard(userId) {
    const enrollments = await DDDEnrollment.find({ userId })
      .populate('courseId', 'title titleAr code category')
      .lean();
    const completed = enrollments.filter(e => e.status === 'completed');
    const inProgress = enrollments.filter(e => e.status === 'in_progress');
    const totalTime = enrollments.reduce((s, e) => s + (e.totalTimeSpent || 0), 0);
    return {
      totalEnrollments: enrollments.length,
      completed: completed.length,
      inProgress: inProgress.length,
      totalTimeHours: Math.round(totalTime / 60),
      enrollments,
    };
  }

}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new LearningManagement();
