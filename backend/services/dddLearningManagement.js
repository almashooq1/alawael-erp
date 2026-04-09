/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Learning Management — Phase 17 · Learning Management & Training
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * E-learning courses, curricula, learning paths, modules, content delivery,
 * progress tracking, quizzes, certificates, and learner analytics for
 * rehabilitation professionals and staff.
 *
 * Aggregates
 *   DDDCourse          — individual course with modules and content
 *   DDDLearningPath    — structured curriculum / learning path
 *   DDDEnrollment      — learner enrollment and progress tracking
 *   DDDQuiz            — assessment quizzes with questions and scoring
 *
 * Canonical links
 *   userId       → User / Staff
 *   departmentId → Organization structure
 *   competencyId → DDDCompetency (dddCompetencyTracker)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

/** Lightweight base so every DDD module has .log() */
class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ── helper ────────────────────────────────────────────────────────────────── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const COURSE_CATEGORIES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychology',
  'nursing',
  'medical',
  'administrative',
  'safety_compliance',
  'technology',
  'leadership',
  'patient_communication',
  'cultural_competency',
  'research_methods',
  'ethics',
  'disability_awareness',
  'assistive_technology',
];

const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'all_levels'];

const COURSE_STATUSES = [
  'draft',
  'under_review',
  'published',
  'archived',
  'suspended',
  'updated',
  'retired',
];

const CONTENT_TYPES = [
  'video',
  'document',
  'presentation',
  'interactive',
  'audio',
  'simulation',
  'case_study',
  'live_session',
  'quiz',
  'assignment',
  'discussion',
  'external_link',
  'scorm',
  'vr_module',
];

const ENROLLMENT_STATUSES = [
  'enrolled',
  'in_progress',
  'completed',
  'failed',
  'withdrawn',
  'expired',
  'suspended',
  'waitlisted',
];

const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'fill_blank',
  'ordering',
  'case_scenario',
  'image_based',
  'video_based',
];

const DELIVERY_MODES = [
  'self_paced',
  'instructor_led',
  'blended',
  'live_virtual',
  'on_demand',
  'cohort_based',
  'mentored',
  'simulation',
];

const CERTIFICATE_TYPES = [
  'completion',
  'competency',
  'specialization',
  'accredited',
  'micro_credential',
  'professional',
];

/* ── Built-in courses ───────────────────────────────────────────────────── */
const BUILTIN_COURSES = [
  {
    code: 'CRS-ORIENT',
    title: 'Platform Orientation',
    titleAr: 'التهيئة للمنصة',
    category: 'administrative',
    level: 'beginner',
    deliveryMode: 'self_paced',
    durationHours: 2,
  },
  {
    code: 'CRS-PT-FUND',
    title: 'Physical Therapy Fundamentals',
    titleAr: 'أساسيات العلاج الطبيعي',
    category: 'physical_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-OT-FUND',
    title: 'Occupational Therapy Fundamentals',
    titleAr: 'أساسيات العلاج الوظيفي',
    category: 'occupational_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-SLP-FUND',
    title: 'Speech-Language Pathology Basics',
    titleAr: 'أساسيات أمراض النطق واللغة',
    category: 'speech_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-ASSESS',
    title: 'Clinical Assessment Techniques',
    titleAr: 'تقنيات التقييم السريري',
    category: 'medical',
    level: 'intermediate',
    deliveryMode: 'instructor_led',
    durationHours: 24,
  },
  {
    code: 'CRS-ETHICS',
    title: 'Healthcare Ethics & Compliance',
    titleAr: 'أخلاقيات الرعاية الصحية والامتثال',
    category: 'ethics',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 8,
  },
  {
    code: 'CRS-SAFETY',
    title: 'Patient Safety & Infection Control',
    titleAr: 'سلامة المريض ومكافحة العدوى',
    category: 'safety_compliance',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 6,
  },
  {
    code: 'CRS-TELE',
    title: 'Tele-Rehabilitation Best Practices',
    titleAr: 'أفضل ممارسات التأهيل عن بعد',
    category: 'technology',
    level: 'intermediate',
    deliveryMode: 'self_paced',
    durationHours: 12,
  },
  {
    code: 'CRS-ARVR',
    title: 'AR/VR in Rehabilitation',
    titleAr: 'الواقع المعزز والافتراضي في التأهيل',
    category: 'assistive_technology',
    level: 'advanced',
    deliveryMode: 'blended',
    durationHours: 16,
  },
  {
    code: 'CRS-DISAB',
    title: 'Disability Awareness & Advocacy',
    titleAr: 'التوعية بالإعاقة والمناصرة',
    category: 'disability_awareness',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 10,
  },
  {
    code: 'CRS-LEAD',
    title: 'Clinical Leadership',
    titleAr: 'القيادة السريرية',
    category: 'leadership',
    level: 'advanced',
    deliveryMode: 'cohort_based',
    durationHours: 30,
  },
  {
    code: 'CRS-RESEARCH',
    title: 'Evidence-Based Practice',
    titleAr: 'الممارسة المبنية على الأدلة',
    category: 'research_methods',
    level: 'intermediate',
    deliveryMode: 'blended',
    durationHours: 20,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Course ────────────────────────────────────────────────────────────── */
const moduleContentSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    contentType: { type: String, enum: CONTENT_TYPES, required: true },
    duration: { type: Number, default: 0 },
    url: { type: String },
    content: { type: String },
    isRequired: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: true }
);

const courseModuleSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    contents: [moduleContentSchema],
    quizId: { type: Schema.Types.ObjectId, ref: 'DDDQuiz' },
    passingScore: { type: Number },
    isRequired: { type: Boolean, default: true },
  },
  { _id: true }
);

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    category: { type: String, enum: COURSE_CATEGORIES, required: true },
    level: { type: String, enum: COURSE_LEVELS, default: 'all_levels' },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft' },
    deliveryMode: { type: String, enum: DELIVERY_MODES, default: 'self_paced' },
    durationHours: { type: Number, default: 0 },
    modules: [courseModuleSchema],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'DDDCourse' }],
    tags: [{ type: String }],
    thumbnail: { type: String },
    instructor: { type: Schema.Types.ObjectId, ref: 'User' },
    maxEnrollments: { type: Number },
    enrollmentCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    certificateType: { type: String, enum: CERTIFICATE_TYPES },
    ceuCredits: { type: Number, default: 0 },
    publishedAt: { type: Date },
    retiredAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

courseSchema.index({ category: 1, level: 1, status: 1 });
courseSchema.index({ code: 1 });

const DDDCourse = mongoose.models.DDDCourse || mongoose.model('DDDCourse', courseSchema);

/* ── Learning Path ─────────────────────────────────────────────────────── */
const learningPathSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    category: { type: String, enum: COURSE_CATEGORIES },
    level: { type: String, enum: COURSE_LEVELS, default: 'all_levels' },
    status: { type: String, enum: ['draft', 'active', 'archived', 'retired'], default: 'draft' },
    courses: [
      {
        courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', required: true },
        order: { type: Number, required: true },
        isRequired: { type: Boolean, default: true },
      },
    ],
    totalDurationHours: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    targetRoles: [{ type: String }],
    certificateType: { type: String, enum: CERTIFICATE_TYPES },
    ceuCredits: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDLearningPath =
  mongoose.models.DDDLearningPath || mongoose.model('DDDLearningPath', learningPathSchema);

/* ── Enrollment ────────────────────────────────────────────────────────── */
const moduleProgressSchema = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    quizScore: { type: Number },
    quizPassed: { type: Boolean },
    timeSpent: { type: Number, default: 0 },
  },
  { _id: true }
);

const enrollmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', required: true, index: true },
    learningPathId: { type: Schema.Types.ObjectId, ref: 'DDDLearningPath' },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'enrolled' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    moduleProgress: [moduleProgressSchema],
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    finalScore: { type: Number },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    certificateIssuedAt: { type: Date },
    totalTimeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

enrollmentSchema.index({ status: 1, userId: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });

const DDDEnrollment =
  mongoose.models.DDDEnrollment || mongoose.model('DDDEnrollment', enrollmentSchema);

/* ── Quiz ──────────────────────────────────────────────────────────────── */
const questionSchema = new Schema(
  {
    order: { type: Number, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    text: { type: String, required: true },
    textAr: { type: String },
    options: [
      {
        label: { type: String },
        labelAr: { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: { type: String },
    explanation: { type: String },
    explanationAr: { type: String },
    points: { type: Number, default: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    imageUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', index: true },
    moduleIndex: { type: Number },
    questions: [questionSchema],
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 70 },
    timeLimit: { type: Number },
    maxAttempts: { type: Number, default: 3 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDQuiz = mongoose.models.DDDQuiz || mongoose.model('DDDQuiz', quizSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class LearningManagement extends BaseDomainModule {
  constructor() {
    super('LearningManagement', {
      description: 'E-learning courses, curricula, learning paths, progress tracking & quizzes',
      version: '1.0.0',
    });
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
  async getCourse(id) {
    return DDDCourse.findById(id).lean();
  }
  async createCourse(data) {
    return DDDCourse.create(data);
  }
  async updateCourse(id, data) {
    return DDDCourse.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async publishCourse(id) {
    return DDDCourse.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
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
  async updateLearningPath(id, data) {
    return DDDLearningPath.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

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
    return DDDEnrollment.findByIdAndUpdate(id, { status: 'withdrawn' }, { new: true });
  }

  /* ── Quiz CRUD ── */
  async listQuizzes(filters = {}) {
    const q = {};
    if (filters.courseId) q.courseId = filters.courseId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDQuiz.find(q).sort({ title: 1 }).lean();
  }
  async getQuiz(id) {
    return DDDQuiz.findById(id).lean();
  }
  async createQuiz(data) {
    data.totalPoints = (data.questions || []).reduce((s, q) => s + (q.points || 1), 0);
    return DDDQuiz.create(data);
  }
  async updateQuiz(id, data) {
    return DDDQuiz.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

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

  /** Health check */
  async healthCheck() {
    const [courses, paths, enrollments, quizzes] = await Promise.all([
      DDDCourse.countDocuments(),
      DDDLearningPath.countDocuments(),
      DDDEnrollment.countDocuments(),
      DDDQuiz.countDocuments(),
    ]);
    return { status: 'healthy', courses, learningPaths: paths, enrollments, quizzes };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createLearningManagementRouter() {
  const router = Router();
  const lms = new LearningManagement();

  /* ── Courses ── */
  router.get('/learning/courses', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.listCourses(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/learning/courses/:id', async (req, res) => {
    try {
      const d = await lms.getCourse(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/courses', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await lms.createCourse(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/learning/courses/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.updateCourse(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/courses/:id/publish', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.publishCourse(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/learning/courses/:id/analytics', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.getCourseAnalytics(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Learning Paths ── */
  router.get('/learning/paths', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.listLearningPaths(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/learning/paths/:id', async (req, res) => {
    try {
      const d = await lms.getLearningPath(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/paths', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await lms.createLearningPath(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/learning/paths/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.updateLearningPath(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Enrollments ── */
  router.get('/learning/enrollments', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.listEnrollments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/learning/enrollments/:id', async (req, res) => {
    try {
      const d = await lms.getEnrollment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/enrollments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await lms.enrollUser(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/learning/enrollments/:id/progress', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await lms.updateProgress(req.params.id, req.body.moduleId, req.body),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/enrollments/:id/withdraw', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.withdrawEnrollment(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Quizzes ── */
  router.get('/learning/quizzes', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.listQuizzes(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/learning/quizzes/:id', async (req, res) => {
    try {
      const d = await lms.getQuiz(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/quizzes', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await lms.createQuiz(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/learning/quizzes/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.updateQuiz(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/learning/quizzes/:id/grade', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.gradeQuiz(req.params.id, req.body.answers) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Learner Dashboard ── */
  router.get('/learning/dashboard/:userId', async (req, res) => {
    try {
      res.json({ success: true, data: await lms.getLearnerDashboard(req.params.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ── Health ── */
  router.get('/learning/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await lms.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  LearningManagement,
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
  createLearningManagementRouter,
};
