/**
 * E-Learning Service — Al-Awael ERP
 * Port: 3380
 *
 * LMS: courses, lessons, quizzes, assignments, gamification (badges, points,
 * leaderboard), digital library, student progress tracking, certificates.
 * Supports IEP-linked learning paths for rehabilitation context.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});

const lmsQueue = new Queue('lms-jobs', { connection: redis });

/* ───────── Schemas ───────── */

// Course
const courseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    descriptionAr: String,
    category: {
      type: String,
      enum: ['academic', 'quran', 'language', 'life-skills', 'therapy', 'professional-dev', 'parent-education', 'safety', 'custom'],
      required: true,
    },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all-levels'], default: 'all-levels' },
    gradeLevel: [String], // target grades
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    instructorId: String,
    instructorName: String,
    thumbnail: String,
    tags: [String],
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    duration: Number, // estimated minutes
    // Settings
    isSequential: { type: Boolean, default: true }, // must complete lessons in order
    passingScore: { type: Number, default: 60 },
    certificateEnabled: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 3 },
    // Stats
    enrollmentCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    // IEP link
    iepGoalIds: [String],
  },
  { timestamps: true },
);

courseSchema.index({ '$**': 'text' });

courseSchema.pre('save', async function (next) {
  if (!this.code) {
    const c = await mongoose.model('Course').countDocuments();
    this.code = `CRS-${String(c + 1).padStart(4, '0')}`;
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

// Lesson
const lessonSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    titleAr: String,
    type: {
      type: String,
      enum: ['video', 'document', 'interactive', 'reading', 'audio', 'presentation', 'external-link'],
      default: 'video',
    },
    content: {
      url: String, // video/document URL
      html: String, // rich text
      duration: Number, // minutes
      fileSize: Number,
    },
    attachments: [{ name: String, url: String, type: String }],
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Lesson = mongoose.model('Lesson', lessonSchema);

// Quiz
const quizSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    title: { type: String, required: true },
    titleAr: String,
    type: { type: String, enum: ['quiz', 'exam', 'practice', 'survey'], default: 'quiz' },
    timeLimit: Number, // minutes, null = unlimited
    passingScore: { type: Number, default: 60 },
    maxAttempts: { type: Number, default: 3 },
    shuffleQuestions: { type: Boolean, default: true },
    showResults: { type: Boolean, default: true },
    questions: [
      {
        text: { type: String, required: true },
        textAr: String,
        type: {
          type: String,
          enum: ['multiple-choice', 'true-false', 'fill-blank', 'matching', 'ordering', 'short-answer', 'image-choice'],
        },
        options: [{ text: String, textAr: String, isCorrect: Boolean, image: String }],
        correctAnswer: String,
        explanation: String,
        explanationAr: String,
        points: { type: Number, default: 1 },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        image: String,
      },
    ],
    totalPoints: Number,
  },
  { timestamps: true },
);

quizSchema.pre('save', function (next) {
  this.totalPoints = this.questions.reduce((s, q) => s + (q.points || 1), 0);
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);

// Assignment
const assignmentSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    titleAr: String,
    instructions: String,
    instructionsAr: String,
    type: { type: String, enum: ['upload', 'text', 'project', 'presentation', 'drawing'], default: 'upload' },
    dueDate: Date,
    maxScore: { type: Number, default: 100 },
    rubric: [
      {
        criterion: String,
        criterionAr: String,
        maxPoints: Number,
        levels: [{ label: String, points: Number, description: String }],
      },
    ],
    attachments: [{ name: String, url: String }],
  },
  { timestamps: true },
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

// Enrollment
const enrollmentSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    studentId: { type: String, required: true },
    studentName: String,
    status: { type: String, enum: ['enrolled', 'in-progress', 'completed', 'failed', 'dropped'], default: 'enrolled' },
    progress: { type: Number, default: 0 }, // 0-100%
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    quizAttempts: [
      {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
        score: Number,
        maxScore: Number,
        passed: Boolean,
        answers: mongoose.Schema.Types.Mixed,
        startedAt: Date,
        completedAt: Date,
      },
    ],
    assignmentSubmissions: [
      {
        assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
        submittedAt: Date,
        content: String,
        fileUrl: String,
        score: Number,
        feedback: String,
        feedbackAr: String,
        gradedBy: String,
        gradedAt: Date,
      },
    ],
    startedAt: Date,
    completedAt: Date,
    certificateId: String,
    totalTime: { type: Number, default: 0 }, // minutes spent
  },
  { timestamps: true },
);

enrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

// Gamification
const gamificationSchema = new mongoose.Schema(
  {
    studentId: { type: String, unique: true, required: true },
    points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 }, // consecutive days
    lastActiveDate: Date,
    badges: [
      {
        code: String,
        name: String,
        nameAr: String,
        icon: String,
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    achievements: [
      {
        type: String,
        value: Number,
        date: Date,
      },
    ],
  },
  { timestamps: true },
);

const Gamification = mongoose.model('Gamification', gamificationSchema);

// Digital Library
const libraryItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleAr: String,
    author: String,
    category: {
      type: String,
      enum: ['textbook', 'storybook', 'reference', 'quran', 'hadith', 'worksheet', 'video', 'audio', 'interactive'],
      required: true,
    },
    type: { type: String, enum: ['pdf', 'epub', 'video', 'audio', 'interactive', 'link'], required: true },
    url: String,
    thumbnailUrl: String,
    description: String,
    gradeLevel: [String],
    tags: [String],
    language: { type: String, default: 'ar' },
    downloadCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

libraryItemSchema.index({ '$**': 'text' });

const LibraryItem = mongoose.model('LibraryItem', libraryItemSchema);

/* ───────── Badge definitions ───────── */
const BADGES = [
  { code: 'FIRST_LESSON', name: 'First Step', nameAr: 'الخطوة الأولى', icon: '🌟' },
  { code: 'COURSE_COMPLETE', name: 'Course Master', nameAr: 'متقن المقرر', icon: '🏆' },
  { code: 'QUIZ_PERFECT', name: 'Perfect Score', nameAr: 'درجة كاملة', icon: '💯' },
  { code: 'STREAK_7', name: '7-Day Streak', nameAr: 'سلسلة ٧ أيام', icon: '🔥' },
  { code: 'STREAK_30', name: '30-Day Streak', nameAr: 'سلسلة ٣٠ يوم', icon: '⭐' },
  { code: 'BOOKWORM', name: 'Bookworm', nameAr: 'مثقف', icon: '📚' },
  { code: 'FAST_LEARNER', name: 'Fast Learner', nameAr: 'متعلم سريع', icon: '⚡' },
  { code: 'HELPER', name: 'Peer Helper', nameAr: 'مساعد الزملاء', icon: '🤝' },
];

async function awardBadge(studentId, badgeCode) {
  const badge = BADGES.find(b => b.code === badgeCode);
  if (!badge) return;
  const gam = await Gamification.findOne({ studentId });
  if (!gam || gam.badges.some(b => b.code === badgeCode)) return;
  gam.badges.push({ ...badge, earnedAt: new Date() });
  gam.points += 50;
  gam.xp += 100;
  gam.level = Math.floor(gam.xp / 500) + 1;
  await gam.save();
  return badge;
}

/* ───────── BullMQ worker ───────── */

new Worker(
  'lms-jobs',
  async job => {
    if (job.name === 'generate-certificate') {
      const enrollment = await Enrollment.findById(job.data.enrollmentId).populate('courseId');
      if (!enrollment || enrollment.status !== 'completed') return;
      // Placeholder: in production, generate PDF certificate
      enrollment.certificateId = `CERT-${Date.now()}`;
      await enrollment.save();
      console.log(`[eLearning] Certificate ${enrollment.certificateId} generated`);
    }

    if (job.name === 'update-leaderboard') {
      const students = await Gamification.find().sort({ points: -1 }).limit(100);
      await redis.set('lms:leaderboard', JSON.stringify(students));
      console.log(`[eLearning] Leaderboard updated with ${students.length} students`);
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Courses ──
r.get('/courses', async (req, res) => {
  try {
    const { category, status, level, search, page = 1, limit = 20 } = req.query;
    const q = {};
    if (category) q.category = category;
    if (status) q.status = status;
    else q.status = 'published';
    if (level) q.level = level;
    if (search) q.$text = { $search: search };
    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
      Course.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Course.countDocuments(q),
    ]);
    res.json({ success: true, data: courses, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/courses', async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, error: 'Not found' });
    const [lessons, quizzes, assignments] = await Promise.all([
      Lesson.find({ courseId: course._id }).sort({ order: 1 }),
      Quiz.find({ courseId: course._id }),
      Assignment.find({ courseId: course._id }),
    ]);
    res.json({ success: true, data: { course, lessons, quizzes, assignments } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.put('/courses/:id', async (req, res) => {
  try {
    const c = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: c });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Lessons ──
r.post('/courses/:courseId/lessons', async (req, res) => {
  try {
    const lesson = await Lesson.create({ ...req.body, courseId: req.params.courseId });
    res.status(201).json({ success: true, data: lesson });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/lessons/:id', async (req, res) => {
  try {
    const l = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: l });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Quizzes ──
r.post('/courses/:courseId/quizzes', async (req, res) => {
  try {
    const quiz = await Quiz.create({ ...req.body, courseId: req.params.courseId });
    res.status(201).json({ success: true, data: quiz });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.get('/quizzes/:id', async (req, res) => {
  try {
    const q = await Quiz.findById(req.params.id);
    if (!q) return res.status(404).json({ success: false, error: 'Not found' });
    // Strip correct answers for students
    const sanitized = q.toObject();
    if (req.query.role !== 'instructor') {
      sanitized.questions = sanitized.questions.map(qq => {
        const { correctAnswer, ...rest } = qq;
        rest.options = (rest.options || []).map(({ isCorrect, ...o }) => o);
        return rest;
      });
    }
    res.json({ success: true, data: sanitized });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Assignments ──
r.post('/courses/:courseId/assignments', async (req, res) => {
  try {
    const a = await Assignment.create({ ...req.body, courseId: req.params.courseId });
    res.status(201).json({ success: true, data: a });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Enrollments ──
r.post('/enroll', async (req, res) => {
  try {
    const { courseId, studentId, studentName } = req.body;
    const existing = await Enrollment.findOne({ courseId, studentId });
    if (existing) return res.status(400).json({ success: false, error: 'Already enrolled' });

    const enrollment = await Enrollment.create({ courseId, studentId, studentName, startedAt: new Date() });
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    // Init gamification profile if needed
    await Gamification.findOneAndUpdate({ studentId }, { $setOnInsert: { points: 0, level: 1, xp: 0, streak: 0 } }, { upsert: true });

    res.status(201).json({ success: true, data: enrollment });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Complete a lesson
r.post('/enrollments/:id/complete-lesson', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not found' });

    const { lessonId, timeSpent } = req.body;
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }
    enrollment.totalTime += timeSpent || 0;

    // Calculate progress
    const totalLessons = await Lesson.countDocuments({ courseId: enrollment.courseId });
    enrollment.progress = totalLessons ? Math.round((enrollment.completedLessons.length / totalLessons) * 100) : 0;
    enrollment.status = 'in-progress';

    // Award first-lesson badge
    if (enrollment.completedLessons.length === 1) {
      await awardBadge(enrollment.studentId, 'FIRST_LESSON');
    }

    // Check course completion
    if (enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      await awardBadge(enrollment.studentId, 'COURSE_COMPLETE');
      // Queue certificate
      const course = await Course.findById(enrollment.courseId);
      if (course?.certificateEnabled) {
        await lmsQueue.add('generate-certificate', { enrollmentId: enrollment._id.toString() });
      }
    }

    await enrollment.save();

    // Award XP
    const gam = await Gamification.findOne({ studentId: enrollment.studentId });
    if (gam) {
      gam.points += 10;
      gam.xp += 20;
      gam.level = Math.floor(gam.xp / 500) + 1;
      // Streak tracking
      const today = new Date().toISOString().slice(0, 10);
      const lastDate = gam.lastActiveDate ? gam.lastActiveDate.toISOString().slice(0, 10) : '';
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === yesterday) gam.streak += 1;
      else if (lastDate !== today) gam.streak = 1;
      gam.lastActiveDate = new Date();
      if (gam.streak >= 7) await awardBadge(enrollment.studentId, 'STREAK_7');
      if (gam.streak >= 30) await awardBadge(enrollment.studentId, 'STREAK_30');
      await gam.save();
    }

    res.json({ success: true, data: enrollment });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Submit quiz attempt
r.post('/enrollments/:id/quiz-attempt', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not found' });

    const { quizId, answers } = req.body;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

    // Check attempts
    const prevAttempts = enrollment.quizAttempts.filter(a => a.quizId?.toString() === quizId);
    if (prevAttempts.length >= quiz.maxAttempts) {
      return res.status(400).json({ success: false, error: 'Max attempts reached' });
    }

    // Grade quiz
    let score = 0;
    const graded = quiz.questions.map((q, i) => {
      const studentAnswer = answers[i];
      let correct = false;
      if (q.type === 'multiple-choice' || q.type === 'image-choice') {
        const correctIdx = q.options.findIndex(o => o.isCorrect);
        correct = studentAnswer === correctIdx;
      } else if (q.type === 'true-false') {
        correct = String(studentAnswer) === q.correctAnswer;
      } else if (q.type === 'fill-blank' || q.type === 'short-answer') {
        correct = String(studentAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      }
      if (correct) score += q.points || 1;
      return { questionIndex: i, correct, points: correct ? q.points : 0 };
    });

    const maxScore = quiz.totalPoints;
    const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
    const passed = pct >= quiz.passingScore;

    enrollment.quizAttempts.push({
      quizId,
      score,
      maxScore,
      passed,
      answers: graded,
      startedAt: req.body.startedAt || new Date(),
      completedAt: new Date(),
    });
    await enrollment.save();

    // Gamification
    const gam = await Gamification.findOne({ studentId: enrollment.studentId });
    if (gam) {
      gam.points += passed ? 25 : 5;
      gam.xp += passed ? 50 : 10;
      gam.level = Math.floor(gam.xp / 500) + 1;
      await gam.save();
    }
    if (pct === 100) await awardBadge(enrollment.studentId, 'QUIZ_PERFECT');

    res.json({ success: true, data: { score, maxScore, percentage: pct, passed, graded } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Submit assignment
r.post('/enrollments/:id/submit-assignment', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not found' });
    enrollment.assignmentSubmissions.push({ ...req.body, submittedAt: new Date() });
    await enrollment.save();
    res.json({ success: true, data: enrollment.assignmentSubmissions.slice(-1)[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Grade assignment
r.put('/enrollments/:enrollmentId/grade-assignment/:assignmentId', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId);
    if (!enrollment) return res.status(404).json({ success: false, error: 'Not found' });
    const sub = enrollment.assignmentSubmissions.find(s => s.assignmentId?.toString() === req.params.assignmentId);
    if (!sub) return res.status(404).json({ success: false, error: 'Submission not found' });
    sub.score = req.body.score;
    sub.feedback = req.body.feedback;
    sub.feedbackAr = req.body.feedbackAr;
    sub.gradedBy = req.body.gradedBy;
    sub.gradedAt = new Date();
    await enrollment.save();
    res.json({ success: true, data: sub });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Student progress
r.get('/students/:studentId/progress', async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.params.studentId }).populate('courseId');
    const gam = await Gamification.findOne({ studentId: req.params.studentId });
    res.json({ success: true, data: { enrollments, gamification: gam } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Gamification ──
r.get('/leaderboard', async (req, res) => {
  try {
    const cached = await redis.get('lms:leaderboard');
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });
    const board = await Gamification.find().sort({ points: -1 }).limit(50);
    await redis.setex('lms:leaderboard', 300, JSON.stringify(board));
    res.json({ success: true, data: board });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.get('/gamification/:studentId', async (req, res) => {
  try {
    const g = await Gamification.findOne({ studentId: req.params.studentId });
    if (!g) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: g });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Digital Library ──
r.get('/library', async (req, res) => {
  try {
    const { category, type, search, grade, page = 1, limit = 20 } = req.query;
    const q = { isPublic: true };
    if (category) q.category = category;
    if (type) q.type = type;
    if (grade) q.gradeLevel = grade;
    if (search) q.$text = { $search: search };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      LibraryItem.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      LibraryItem.countDocuments(q),
    ]);
    res.json({ success: true, data: items, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/library', async (req, res) => {
  try {
    const item = await LibraryItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/library/:id/download', async (req, res) => {
  try {
    const item = await LibraryItem.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }, { new: true });
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Stats ──
r.get('/stats', async (req, res) => {
  try {
    const [courses, enrollments, completions, activeStudents] = await Promise.all([
      Course.countDocuments({ status: 'published' }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'completed' }),
      Gamification.countDocuments(),
    ]);
    res.json({
      success: true,
      data: {
        publishedCourses: courses,
        totalEnrollments: enrollments,
        completions,
        activeStudents,
        completionRate: enrollments ? Math.round((completions / enrollments) * 100) : 0,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ── Crons ── */
// Refresh leaderboard every hour
cron.schedule('0 * * * *', async () => {
  await lmsQueue.add('update-leaderboard', {});
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3380;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_elearning';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[eLearning] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[eLearning] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[eLearning] Mongo error', err);
    process.exit(1);
  });
