const express = require('express');
const router = express.Router();
const {
  Course,
  Lesson,
  Quiz,
  Enrollment,
  Certificate,
  MediaLibrary,
} = require('../models/ELearning');

// ============================================
// 1. COURSES API - إدارة الدورات
// ============================================

/**
 * @route   GET /api/elearning/courses
 * @desc    الحصول على قائمة الدورات مع فلترة وبحث
 * @access  Public
 */
router.get('/courses', async (req, res) => {
  try {
    const {
      category,
      level,
      search,
      isPublished = 'true',
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 12,
    } = req.query;

    // Build query
    let query = {};

    if (isPublished !== 'all') {
      query.isPublished = isPublished === 'true';
    }

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .populate('lessons')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الدورات',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/courses/:id
 * @desc    الحصول على تفاصيل دورة محددة
 * @access  Public
 */
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email avatar')
      .populate({
        path: 'lessons',
        options: { sort: { order: 1 } },
      })
      .populate('prerequisites', 'title thumbnail');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'الدورة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الدورة',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/courses
 * @desc    إنشاء دورة جديدة
 * @access  Private (Instructor/Admin)
 */
router.post('/courses', async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user?.id || req.body.instructor,
    };

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الدورة بنجاح',
      data: course,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في إنشاء الدورة',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/elearning/courses/:id
 * @desc    تحديث دورة
 * @access  Private (Instructor/Admin)
 */
router.put('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'الدورة غير موجودة',
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الدورة بنجاح',
      data: course,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في تحديث الدورة',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/elearning/courses/:id
 * @desc    حذف دورة
 * @access  Private (Admin)
 */
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'الدورة غير موجودة',
      });
    }

    // حذف الدروس المرتبطة
    await Lesson.deleteMany({ course: req.params.id });

    res.json({
      success: true,
      message: 'تم حذف الدورة بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الدورة',
      error: error.message,
    });
  }
});

// ============================================
// 2. LESSONS API - إدارة الدروس
// ============================================

/**
 * @route   GET /api/elearning/courses/:courseId/lessons
 * @desc    الحصول على دروس دورة معينة
 * @access  Public
 */
router.get('/courses/:courseId/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId })
      .sort({ order: 1 })
      .populate('quiz');

    res.json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الدروس',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/courses/:courseId/lessons
 * @desc    إضافة درس جديد لدورة
 * @access  Private (Instructor/Admin)
 */
router.post('/courses/:courseId/lessons', async (req, res) => {
  try {
    const lessonData = {
      ...req.body,
      course: req.params.courseId,
    };

    const lesson = new Lesson(lessonData);
    await lesson.save();

    // تحديث الدورة
    await Course.findByIdAndUpdate(req.params.courseId, {
      $push: { lessons: lesson._id },
    });

    res.status(201).json({
      success: true,
      message: 'تم إضافة الدرس بنجاح',
      data: lesson,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في إضافة الدرس',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/elearning/lessons/:id
 * @desc    تحديث درس
 * @access  Private (Instructor/Admin)
 */
router.put('/lessons/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'الدرس غير موجود',
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الدرس بنجاح',
      data: lesson,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في تحديث الدرس',
      error: error.message,
    });
  }
});

// ============================================
// 3. ENROLLMENT API - إدارة التسجيل
// ============================================

/**
 * @route   POST /api/elearning/enroll/:courseId
 * @desc    تسجيل طالب في دورة
 * @access  Private
 */
router.post('/enroll/:courseId', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const courseId = req.params.courseId;

    // التحقق من التسجيل السابق
    const existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'أنت مسجل بالفعل في هذه الدورة',
      });
    }

    // إنشاء تسجيل جديد
    const enrollment = new Enrollment({
      user: userId,
      course: courseId,
    });

    await enrollment.save();

    // تحديث عدد المسجلين
    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح',
      data: enrollment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في التسجيل',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/my-courses
 * @desc    الحصول على دورات المستخدم
 * @access  Private
 */
router.get('/my-courses', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { status } = req.query;

    let query = { user: userId };
    if (status) {
      query.status = status;
    }

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'name email',
        },
      })
      .sort({ enrolledAt: -1 });

    res.json({
      success: true,
      data: enrollments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الدورات',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/enrollment/:courseId
 * @desc    الحصول على تفاصيل التسجيل
 * @access  Private
 */
router.get('/enrollment/:courseId', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: req.params.courseId,
    })
      .populate('course')
      .populate('progress.completedLessons.lesson');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'لم تسجل في هذه الدورة',
      });
    }

    res.json({
      success: true,
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التسجيل',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/enrollment/:courseId/complete-lesson/:lessonId
 * @desc    تسجيل إكمال درس
 * @access  Private
 */
router.post('/enrollment/:courseId/complete-lesson/:lessonId', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;

    const enrollment = await Enrollment.findOne({
      user: userId,
      course: req.params.courseId,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'لم تسجل في هذه الدورة',
      });
    }

    await enrollment.markLessonComplete(req.params.lessonId);

    res.json({
      success: true,
      message: 'تم تسجيل إكمال الدرس',
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الإكمال',
      error: error.message,
    });
  }
});

// ============================================
// 4. QUIZ API - إدارة الاختبارات
// ============================================

/**
 * @route   GET /api/elearning/quiz/:quizId
 * @desc    الحصول على تفاصيل اختبار
 * @access  Private
 */
router.get('/quiz/:quizId', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).select('-questions.correctAnswer'); // إخفاء الإجابات الصحيحة

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'الاختبار غير موجود',
      });
    }

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الاختبار',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/quiz/:quizId/submit
 * @desc    تقديم اختبار
 * @access  Private
 */
router.post('/quiz/:quizId/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user?.id || req.body.userId;
    const quizId = req.params.quizId;

    // الحصول على الاختبار
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'الاختبار غير موجود',
      });
    }

    // الحصول على التسجيل
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: quiz.course,
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'لم تسجل في هذه الدورة',
      });
    }

    // حساب النتيجة
    let totalPoints = 0;
    let earnedPoints = 0;
    const detailedAnswers = [];

    quiz.questions.forEach((question, index) => {
      totalPoints += question.points;
      const userAnswer = answers[index];

      let isCorrect = false;

      if (question.type === 'multiple-choice') {
        const correctOption = question.options.find(opt => opt.isCorrect);
        isCorrect = userAnswer === correctOption?.text;
      } else if (question.type === 'true-false') {
        isCorrect = userAnswer === question.correctAnswer;
      }

      if (isCorrect) {
        earnedPoints += question.points;
      }

      detailedAnswers.push({
        question: question.question,
        answer: userAnswer,
        isCorrect,
      });
    });

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentage >= quiz.passingScore;

    // حفظ النتيجة
    const attempt = {
      score: earnedPoints,
      totalPoints,
      percentage,
      answers: detailedAnswers,
      completedAt: new Date(),
    };

    let quizResult = enrollment.quizResults.find(qr => qr.quiz.toString() === quizId);

    if (quizResult) {
      quizResult.attempts.push(attempt);
      quizResult.bestScore = Math.max(quizResult.bestScore, percentage);
      quizResult.passed = quizResult.bestScore >= quiz.passingScore;
    } else {
      enrollment.quizResults.push({
        quiz: quizId,
        attempts: [attempt],
        bestScore: percentage,
        passed,
      });
    }

    await enrollment.save();

    res.json({
      success: true,
      message: passed ? 'مبروك! لقد نجحت في الاختبار' : 'لم تحقق الدرجة المطلوبة',
      data: {
        score: earnedPoints,
        totalPoints,
        percentage,
        passed,
        passingScore: quiz.passingScore,
        answers: quiz.settings.showCorrectAnswers ? detailedAnswers : undefined,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تقديم الاختبار',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/courses/:courseId/quiz
 * @desc    إنشاء اختبار لدورة
 * @access  Private (Instructor/Admin)
 */
router.post('/courses/:courseId/quiz', async (req, res) => {
  try {
    const quizData = {
      ...req.body,
      course: req.params.courseId,
    };

    const quiz = new Quiz(quizData);
    await quiz.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاختبار بنجاح',
      data: quiz,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في إنشاء الاختبار',
      error: error.message,
    });
  }
});

// ============================================
// 5. CERTIFICATES API - إدارة الشهادات
// ============================================

/**
 * @route   POST /api/elearning/certificate/issue/:enrollmentId
 * @desc    إصدار شهادة
 * @access  Private
 */
router.post('/certificate/issue/:enrollmentId', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate('user', 'name email')
      .populate('course', 'title instructor');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'التسجيل غير موجود',
      });
    }

    if (enrollment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'يجب إكمال الدورة أولاً',
      });
    }

    if (enrollment.certificate.issued) {
      return res.status(400).json({
        success: false,
        message: 'الشهادة صادرة بالفعل',
      });
    }

    // إنشاء الشهادة
    const certificate = new Certificate({
      certificateId: Certificate.generateCertificateId(),
      user: enrollment.user._id,
      course: enrollment.course._id,
      enrollment: enrollment._id,
      verificationCode: Certificate.generateVerificationCode(),
      grade: req.body.grade || 'Pass',
      score: req.body.score,
      metadata: {
        instructorName: req.body.instructorName,
        courseDuration: req.body.courseDuration,
        completionDate: enrollment.completedAt,
      },
    });

    await certificate.save();

    // تحديث التسجيل
    enrollment.certificate.issued = true;
    enrollment.certificate.issuedAt = new Date();
    enrollment.certificate.certificateId = certificate.certificateId;
    await enrollment.save();

    res.status(201).json({
      success: true,
      message: 'تم إصدار الشهادة بنجاح',
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إصدار الشهادة',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/certificate/:certificateId
 * @desc    الحصول على شهادة
 * @access  Public
 */
router.get('/certificate/:certificateId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.certificateId,
    })
      .populate('user', 'name email')
      .populate('course', 'title description');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'الشهادة غير موجودة',
      });
    }

    res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشهادة',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/certificate/verify/:verificationCode
 * @desc    التحقق من صحة شهادة
 * @access  Public
 */
router.get('/certificate/verify/:verificationCode', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      verificationCode: req.params.verificationCode,
    })
      .populate('user', 'name')
      .populate('course', 'title');

    if (!certificate) {
      return res.json({
        success: false,
        verified: false,
        message: 'الشهادة غير موجودة',
      });
    }

    res.json({
      success: true,
      verified: true,
      message: 'الشهادة صحيحة',
      data: {
        certificateId: certificate.certificateId,
        userName: certificate.user.name,
        courseName: certificate.course.title,
        issuedAt: certificate.issuedAt,
        grade: certificate.grade,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من الشهادة',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/my-certificates
 * @desc    الحصول على شهادات المستخدم
 * @access  Private
 */
router.get('/my-certificates', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;

    const certificates = await Certificate.find({ user: userId })
      .populate('course', 'title thumbnail')
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الشهادات',
      error: error.message,
    });
  }
});

// ============================================
// 6. MEDIA LIBRARY API - مكتبة الوسائط
// ============================================

/**
 * @route   GET /api/elearning/media
 * @desc    الحصول على قائمة الوسائط
 * @access  Public
 */
router.get('/media', async (req, res) => {
  try {
    const { type, category, search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (type) query.type = type;
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const media = await MediaLibrary.find(query)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MediaLibrary.countDocuments(query);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الوسائط',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/media
 * @desc    رفع وسيط جديد
 * @access  Private (Instructor/Admin)
 */
router.post('/media', async (req, res) => {
  try {
    const mediaData = {
      ...req.body,
      uploadedBy: req.user?.id || req.body.uploadedBy,
    };

    const media = new MediaLibrary(mediaData);
    await media.save();

    res.status(201).json({
      success: true,
      message: 'تم رفع الوسيط بنجاح',
      data: media,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'خطأ في رفع الوسيط',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/media/:id
 * @desc    الحصول على تفاصيل وسيط
 * @access  Public
 */
router.get('/media/:id', async (req, res) => {
  try {
    const media = await MediaLibrary.findById(req.params.id)
      .populate('uploadedBy', 'name')
      .populate('relatedCourses', 'title thumbnail');

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'الوسيط غير موجود',
      });
    }

    // زيادة عدد المشاهدات
    media.views += 1;
    await media.save();

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الوسيط',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/elearning/media/:id/download
 * @desc    تسجيل تحميل وسيط
 * @access  Public
 */
router.post('/media/:id/download', async (req, res) => {
  try {
    const media = await MediaLibrary.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'الوسيط غير موجود',
      });
    }

    media.downloads += 1;
    await media.save();

    res.json({
      success: true,
      message: 'تم تسجيل التحميل',
      data: { fileUrl: media.fileUrl },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل التحميل',
      error: error.message,
    });
  }
});

// ============================================
// 7. STATISTICS & ANALYTICS - الإحصائيات
// ============================================

/**
 * @route   GET /api/elearning/stats/overview
 * @desc    إحصائيات عامة للنظام
 * @access  Private (Admin)
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalCourses,
      publishedCourses,
      totalEnrollments,
      activeEnrollments,
      totalCertificates,
      totalMedia,
    ] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: { $in: ['enrolled', 'in-progress'] } }),
      Certificate.countDocuments(),
      MediaLibrary.countDocuments(),
    ]);

    // Top rated courses
    const topCourses = await Course.find({ isPublished: true })
      .sort({ 'rating.average': -1 })
      .limit(5)
      .select('title rating enrollmentCount');

    res.json({
      success: true,
      data: {
        overview: {
          totalCourses,
          publishedCourses,
          totalEnrollments,
          activeEnrollments,
          totalCertificates,
          totalMedia,
        },
        topCourses,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/stats/user/:userId
 * @desc    إحصائيات المستخدم
 * @access  Private
 */
router.get('/stats/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const enrollments = await Enrollment.find({ user: userId });

    const stats = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'completed').length,
      inProgressCourses: enrollments.filter(e => e.status === 'in-progress').length,
      averageProgress: Math.round(
        enrollments.reduce((sum, e) => sum + e.progress.percentage, 0) / enrollments.length || 0
      ),
      certificatesEarned: enrollments.filter(e => e.certificate.issued).length,
      totalQuizzesTaken: enrollments.reduce((sum, e) => sum + e.quizResults.length, 0),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المستخدم',
      error: error.message,
    });
  }
});

// ============================================
// 8. RATING & REVIEWS - التقييمات
// ============================================

/**
 * @route   POST /api/elearning/courses/:courseId/rate
 * @desc    تقييم دورة
 * @access  Private
 */
router.post('/courses/:courseId/rate', async (req, res) => {
  try {
    const { stars, review } = req.body;
    const userId = req.user?.id || req.body.userId;
    const courseId = req.params.courseId;

    // التحقق من التسجيل
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'يجب أن تكون مسجلاً في الدورة لتقييمها',
      });
    }

    // حفظ التقييم
    enrollment.rating = {
      stars,
      review,
      ratedAt: new Date(),
    };
    await enrollment.save();

    // تحديث متوسط تقييم الدورة
    const course = await Course.findById(courseId);
    await course.updateRating(stars);

    res.json({
      success: true,
      message: 'تم إضافة تقييمك بنجاح',
      data: enrollment.rating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التقييم',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/elearning/courses/:courseId/reviews
 * @desc    الحصول على تقييمات دورة
 * @access  Public
 */
router.get('/courses/:courseId/reviews', async (req, res) => {
  try {
    const reviews = await Enrollment.find({
      course: req.params.courseId,
      'rating.stars': { $exists: true },
    })
      .populate('user', 'name avatar')
      .select('rating user')
      .sort({ 'rating.ratedAt': -1 })
      .limit(50);

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التقييمات',
      error: error.message,
    });
  }
});

module.exports = router;
