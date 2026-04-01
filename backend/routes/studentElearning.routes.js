/**
 * Student E-Learning Routes
 * مسارات التعلم الإلكتروني للطلاب
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

router.use(authenticate);

// ─── Course Schema ───────────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleEn: String,
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'أكاديمي',
        'تأهيلي',
        'مهاري',
        'لغات',
        'تقنية',
        'فنون',
        'رياضة',
        'تنمية ذاتية',
        'ديني',
        'علمي',
      ],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['مبتدئ', 'متوسط', 'متقدم'],
      default: 'مبتدئ',
    },
    instructor: {
      name: String,
      title: String,
      avatar: String,
      bio: String,
    },
    thumbnail: String,
    duration: Number, // مدة الدورة بالدقائق
    totalLessons: { type: Number, default: 0 },
    lessons: [
      {
        title: String,
        description: String,
        type: { type: String, enum: ['فيديو', 'مقال', 'اختبار', 'تمرين', 'ملف', 'تفاعلي'] },
        duration: Number, // بالدقائق
        order: Number,
        content: {
          videoUrl: String,
          articleHtml: String,
          fileUrl: String,
          quizQuestions: [
            {
              question: String,
              options: [String],
              correctAnswer: Number,
              explanation: String,
              points: { type: Number, default: 1 },
            },
          ],
        },
        isPreview: { type: Boolean, default: false },
        isRequired: { type: Boolean, default: true },
      },
    ],
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StudentCourse' }],
    tags: [String],
    targetAges: { min: Number, max: Number },
    targetDisabilities: [String],
    rewardPoints: { type: Number, default: 0 },
    certificate: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    enrollmentCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    publishedAt: Date,
  },
  { timestamps: true }
);

courseSchema.index({ category: 1, isPublished: 1 });

let Course;
try {
  Course = mongoose.model('StudentCourse');
} catch {
  Course = mongoose.models.StudentCourse || mongoose.model('StudentCourse', courseSchema);
}

// ─── Enrollment Schema ───────────────────────────────────────────────────────
const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentCourse', required: true },
    status: {
      type: String,
      enum: ['مسجل', 'قيد الدراسة', 'مكتمل', 'متوقف', 'ملغي'],
      default: 'مسجل',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [Number], // أرقام الدروس المكتملة
    currentLesson: { type: Number, default: 0 },
    quizScores: [
      {
        lessonIndex: Number,
        score: Number,
        maxScore: Number,
        attempts: Number,
        completedAt: Date,
      },
    ],
    totalTimeSpent: { type: Number, default: 0 }, // بالدقائق
    lastAccessedAt: Date,
    startedAt: Date,
    completedAt: Date,
    certificateIssued: { type: Boolean, default: false },
    certificateIssuedAt: Date,
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    notes: [
      {
        lessonIndex: Number,
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    bookmarks: [Number], // أرقام الدروس المحفوظة
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

let Enrollment;
try {
  Enrollment = mongoose.model('StudentCourseEnrollment');
} catch {
  Enrollment =
    mongoose.models.StudentCourseEnrollment ||
    mongoose.model('StudentCourseEnrollment', enrollmentSchema);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /courses — قائمة الدورات المتاحة
router.get('/:studentId/courses', async (req, res) => {
  try {
    const { category, difficulty, search, featured, page = 1, limit = 12 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (featured === 'true') filter.isFeatured = true;
    if (search)
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(search), 'i')] } },
      ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select('-lessons.content')
        .sort({ isFeatured: -1, enrollmentCount: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(filter),
    ]);

    // إضافة حالة التسجيل للطالب
    const enrollments = await Enrollment.find({
      studentId: req.params.studentId,
      courseId: { $in: courses.map(c => c._id) },
    }).lean();
    const enrollMap = new Map(enrollments.map(e => [e.courseId.toString(), e]));

    const enriched = courses.map(course => ({
      ...course,
      isEnrolled: enrollMap.has(course._id.toString()),
      enrollmentProgress: enrollMap.get(course._id.toString())?.progress || 0,
      enrollmentStatus: enrollMap.get(course._id.toString())?.status,
    }));

    const categories = await Course.distinct('category', { isPublished: true });

    res.json({
      success: true,
      data: enriched,
      categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Elearning courses list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الدورات' });
  }
});

// GET /my-courses — دوراتي
router.get('/:studentId/my-courses', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { studentId: req.params.studentId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate(
          'courseId',
          'title thumbnail category difficulty duration totalLessons instructor rating'
        )
        .sort({ lastAccessedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Enrollment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Elearning my-courses error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب دوراتي' });
  }
});

// GET /course/:courseId — تفاصيل دورة
router.get('/:studentId/course/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).lean();
    if (!course) return res.status(404).json({ success: false, message: 'الدورة غير موجودة' });

    const enrollment = await Enrollment.findOne({
      studentId: req.params.studentId,
      courseId: req.params.courseId,
    }).lean();

    // إخفاء محتوى الدروس لغير المسجلين (ما عدا المعاينة)
    if (!enrollment) {
      course.lessons = course.lessons.map(lesson => ({
        ...lesson,
        content: lesson.isPreview ? lesson.content : undefined,
      }));
    }

    res.json({
      success: true,
      data: {
        ...course,
        enrollment: enrollment || null,
        isEnrolled: !!enrollment,
      },
    });
  } catch (err) {
    logger.error('Elearning course detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الدورة' });
  }
});

// POST /enroll — التسجيل في دورة
router.post('/:studentId/enroll', async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course || !course.isPublished)
      return res.status(404).json({ success: false, message: 'الدورة غير متوفرة' });

    const existing = await Enrollment.findOne({ studentId: req.params.studentId, courseId });
    if (existing && existing.status !== 'ملغي') {
      return res.status(400).json({ success: false, message: 'أنت مسجل بالفعل في هذه الدورة' });
    }

    const enrollment = existing
      ? await Enrollment.findByIdAndUpdate(
          existing._id,
          {
            status: 'مسجل',
            progress: 0,
            currentLesson: 0,
            startedAt: new Date(),
          },
          { new: true }
        )
      : await new Enrollment({
          studentId: req.params.studentId,
          courseId,
          startedAt: new Date(),
        }).save();

    course.enrollmentCount += 1;
    await course.save();

    res.status(201).json({
      success: true,
      data: enrollment,
      message: `تم التسجيل في "${course.title}" بنجاح. ابدأ التعلم الآن!`,
    });
  } catch (err) {
    logger.error('Elearning enroll error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التسجيل بالدورة' });
  }
});

// PUT /progress — تحديث التقدم
router.put('/:studentId/progress', async (req, res) => {
  try {
    const { courseId, lessonIndex, timeSpent, quizScore } = req.body;
    const enrollment = await Enrollment.findOne({ studentId: req.params.studentId, courseId });
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'لست مسجلاً في هذه الدورة' });

    // تحديث الدرس المكتمل
    if (lessonIndex !== undefined && !enrollment.completedLessons.includes(lessonIndex)) {
      enrollment.completedLessons.push(lessonIndex);
    }

    // تحديث نتيجة الاختبار
    if (quizScore !== undefined) {
      const existingQuiz = enrollment.quizScores.find(q => q.lessonIndex === lessonIndex);
      if (existingQuiz) {
        existingQuiz.attempts += 1;
        if (quizScore.score > existingQuiz.score) {
          existingQuiz.score = quizScore.score;
          existingQuiz.maxScore = quizScore.maxScore;
        }
      } else {
        enrollment.quizScores.push({
          lessonIndex,
          ...quizScore,
          attempts: 1,
          completedAt: new Date(),
        });
      }
    }

    // تحديث الوقت والتقدم
    if (timeSpent) enrollment.totalTimeSpent += timeSpent;
    enrollment.lastAccessedAt = new Date();
    if (lessonIndex !== undefined) enrollment.currentLesson = lessonIndex;

    // حساب نسبة التقدم
    const course = await Course.findById(courseId);
    if (course) {
      enrollment.progress = Math.round(
        (enrollment.completedLessons.length / course.totalLessons) * 100
      );
      if (enrollment.progress >= 100) {
        enrollment.status = 'مكتمل';
        enrollment.completedAt = new Date();
        enrollment.progress = 100;
      } else if (enrollment.status === 'مسجل') {
        enrollment.status = 'قيد الدراسة';
      }
    }

    await enrollment.save();
    res.json({ success: true, data: enrollment, message: 'تم تحديث التقدم' });
  } catch (err) {
    logger.error('Elearning progress update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث التقدم' });
  }
});

// POST /note — إضافة ملاحظة على درس
router.post('/:studentId/note', async (req, res) => {
  try {
    const { courseId, lessonIndex, content } = req.body;
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: req.params.studentId, courseId },
      { $push: { notes: { lessonIndex, content } } },
      { new: true }
    );
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'لست مسجلاً في هذه الدورة' });
    res.json({ success: true, data: enrollment.notes, message: 'تمت إضافة الملاحظة' });
  } catch (err) {
    logger.error('Elearning note error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة الملاحظة' });
  }
});

// POST /bookmark — حفظ/إلغاء حفظ درس
router.post('/:studentId/bookmark', async (req, res) => {
  try {
    const { courseId, lessonIndex } = req.body;
    const enrollment = await Enrollment.findOne({ studentId: req.params.studentId, courseId });
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'لست مسجلاً في هذه الدورة' });

    const idx = enrollment.bookmarks.indexOf(lessonIndex);
    if (idx !== -1) {
      enrollment.bookmarks.splice(idx, 1);
    } else {
      enrollment.bookmarks.push(lessonIndex);
    }
    await enrollment.save();
    res.json({
      success: true,
      data: enrollment.bookmarks,
      message: idx !== -1 ? 'تم إلغاء الحفظ' : 'تم الحفظ',
    });
  } catch (err) {
    logger.error('Elearning bookmark error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حفظ الدرس' });
  }
});

// POST /rate — تقييم دورة
router.post('/:studentId/rate', async (req, res) => {
  try {
    const { courseId, rating, review } = req.body;
    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: req.params.studentId, courseId },
      { $set: { rating, review } },
      { new: true }
    );
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'لست مسجلاً في هذه الدورة' });

    // تحديث متوسط التقييم في الدورة
    const allRatings = await Enrollment.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId), rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (allRatings[0]) {
      await Course.findByIdAndUpdate(courseId, {
        rating: Math.round(allRatings[0].avg * 10) / 10,
        ratingCount: allRatings[0].count,
      });
    }

    res.json({ success: true, message: 'شكراً لتقييمك!' });
  } catch (err) {
    logger.error('Elearning rate error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقييم الدورة' });
  }
});

// GET /stats — إحصائيات التعلم
router.get('/:studentId/stats', async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);
    const [enrollments, byCategory, quizPerformance] = await Promise.all([
      Enrollment.aggregate([
        { $match: { studentId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProgress: { $avg: '$progress' },
            totalTime: { $sum: '$totalTimeSpent' },
          },
        },
      ]),
      Enrollment.aggregate([
        { $match: { studentId } },
        {
          $lookup: {
            from: 'studentcourses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: '$course' },
        {
          $group: {
            _id: '$course.category',
            count: { $sum: 1 },
            avgProgress: { $avg: '$progress' },
          },
        },
      ]),
      Enrollment.aggregate([
        { $match: { studentId } },
        { $unwind: '$quizScores' },
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            avgScore: {
              $avg: { $divide: ['$quizScores.score', { $max: ['$quizScores.maxScore', 1] }] },
            },
            totalAttempts: { $sum: '$quizScores.attempts' },
          },
        },
      ]),
    ]);

    const statusMap = enrollments.reduce((a, e) => {
      a[e._id] = { count: e.count, avgProgress: Math.round(e.avgProgress), totalTime: e.totalTime };
      return a;
    }, {});

    res.json({
      success: true,
      data: {
        totalCourses: enrollments.reduce((s, e) => s + e.count, 0),
        completedCourses: statusMap['مكتمل']?.count || 0,
        inProgressCourses: statusMap['قيد الدراسة']?.count || 0,
        totalTimeSpent: enrollments.reduce((s, e) => s + e.totalTime, 0),
        avgProgress: Math.round(
          enrollments.reduce((s, e) => s + e.avgProgress * e.count, 0) /
            Math.max(
              enrollments.reduce((s, e) => s + e.count, 0),
              1
            )
        ),
        byCategory: byCategory.reduce((a, c) => {
          a[c._id] = { count: c.count, avgProgress: Math.round(c.avgProgress) };
          return a;
        }, {}),
        quizPerformance: quizPerformance[0]
          ? {
              totalQuizzes: quizPerformance[0].totalQuizzes,
              avgScore: Math.round(quizPerformance[0].avgScore * 100),
            }
          : { totalQuizzes: 0, avgScore: 0 },
      },
    });
  } catch (err) {
    logger.error('Elearning stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات التعلم' });
  }
});

module.exports = router;
