/**
 * E-Learning Enhanced Routes — مسارات نظام التعلم الإلكتروني والتدريب المحسّن
 * البرومبت 33: E-Learning & Training System
 *
 * Endpoints:
 *  GET    /api/elearning-enhanced/stats                          — إحصائيات التعلم الإلكتروني
 *  GET    /api/elearning-enhanced/courses                        — قائمة المقررات
 *  POST   /api/elearning-enhanced/courses                        — إنشاء مقرر
 *  GET    /api/elearning-enhanced/courses/:id                    — تفاصيل مقرر
 *  PUT    /api/elearning-enhanced/courses/:id                    — تحديث مقرر
 *  DELETE /api/elearning-enhanced/courses/:id                    — حذف مقرر
 *  POST   /api/elearning-enhanced/courses/:id/enroll            — تسجيل في مقرر
 *  GET    /api/elearning-enhanced/courses/:id/modules            — وحدات المقرر
 *  POST   /api/elearning-enhanced/courses/:id/modules            — إضافة وحدة
 *  GET    /api/elearning-enhanced/enrollments                    — قائمة التسجيلات
 *  GET    /api/elearning-enhanced/enrollments/:id                — تفاصيل تسجيل
 *  POST   /api/elearning-enhanced/progress/update               — تحديث تقدم الوحدة
 *  GET    /api/elearning-enhanced/enrollments/:id/certificate    — تنزيل الشهادة
 *  GET    /api/elearning-enhanced/quizzes/:id                    — تفاصيل اختبار
 *  POST   /api/elearning-enhanced/quizzes                        — إنشاء اختبار
 *  GET    /api/elearning-enhanced/quizzes/:id/questions          — أسئلة الاختبار
 *  POST   /api/elearning-enhanced/quizzes/:id/questions          — إضافة سؤال
 *  POST   /api/elearning-enhanced/quizzes/:id/submit            — تقديم محاولة اختبار
 *  GET    /api/elearning-enhanced/cpd/records                    — سجلات CPD
 *  POST   /api/elearning-enhanced/cpd/records                    — إضافة سجل CPD
 *  PATCH  /api/elearning-enhanced/cpd/records/:id/verify         — اعتماد سجل CPD
 *  GET    /api/elearning-enhanced/cpd/report                     — تقرير CPD السنوي
 *  GET    /api/elearning-enhanced/compliance                     — تقرير الامتثال التدريبي
 *  POST   /api/elearning-enhanced/compliance/assign-mandatory    — تعيين تدريب إلزامي
 *  GET    /api/elearning-enhanced/learning-paths                 — مسارات التعلم
 *  POST   /api/elearning-enhanced/learning-paths                 — إنشاء مسار تعلم
 *  GET    /api/elearning-enhanced/forums/:courseId               — منتديات مقرر
 *  POST   /api/elearning-enhanced/forums/:courseId               — إنشاء موضوع
 *  POST   /api/elearning-enhanced/forums/:forumId/replies        — إضافة رد
 *  POST   /api/elearning-enhanced/trainer-evaluations            — تقييم مدرب
 *  GET    /api/elearning-enhanced/trainer-evaluations/:trainerId — تقييمات مدرب
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 🔒 All e-learning routes require authentication
router.use(authenticate);

const ElearningCourse = require('../models/ElearningCourse');
const CourseModule = require('../models/CourseModule');
const CourseEnrollment = require('../models/CourseEnrollment');
const ModuleProgress = require('../models/ModuleProgress');
const ElearningQuiz = require('../models/ElearningQuiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');
const LearningPath = require('../models/LearningPath');
const CpdRecord = require('../models/CpdRecord');
const TrainingCompliance = require('../models/TrainingCompliance');
const DiscussionForum = require('../models/DiscussionForum');
const ForumReply = require('../models/ForumReply');
const TrainerEvaluation = require('../models/TrainerEvaluation');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const getBranchId = req => req.user?.branchId || req.headers['x-branch-id'];
const pad = (n, len = 6) => String(n).padStart(len, '0');

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const total = await CourseEnrollment.countDocuments({ branchId, deletedAt: null });
    const completed = await CourseEnrollment.countDocuments({
      branchId,
      status: 'completed',
      deletedAt: null,
    });

    const [activeCourses, totalEnrollments, overdueTrainings, pendingCpd] = await Promise.all([
      ElearningCourse.countDocuments({ branchId, status: 'published', deletedAt: null }),
      CourseEnrollment.countDocuments({ branchId, deletedAt: null }),
      TrainingCompliance.countDocuments({ branchId, status: 'overdue', deletedAt: null }),
      CpdRecord.countDocuments({ branchId, status: 'pending', deletedAt: null }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      stats: {
        activeCourses: { title: 'مقررات نشطة', value: activeCourses, icon: 'book' },
        totalEnrollments: { title: 'إجمالي التسجيلات', value: totalEnrollments, icon: 'users' },
        completionRate: { title: 'نسبة الإتمام', value: `${completionRate}%`, icon: 'chart' },
        overdueTrainings: { title: 'تدريبات متأخرة', value: overdueTrainings, icon: 'clock' },
        pendingCpd: { title: 'CPD معلقة', value: pendingCpd, icon: 'certificate' },
      },
    });
  })
);

// ─── Courses CRUD ─────────────────────────────────────────────────────────────
router.get(
  '/courses',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { search, category, status, isMandatory, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (isMandatory !== undefined) filter.isMandatory = isMandatory === 'true';
    if (search)
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { titleAr: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
      ];

    const [courses, total] = await Promise.all([
      ElearningCourse.find(filter)
        .populate('instructorId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      ElearningCourse.countDocuments(filter),
    ]);
    res.json({ data: courses, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/courses',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const course = await ElearningCourse.create({
      ...req.body,
      branchId,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إنشاء المقرر بنجاح', data: course });
  })
);

router.get(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    const course = await ElearningCourse.findOne({ _id: req.params.id, deletedAt: null }).populate(
      'instructorId',
      'name email'
    );
    if (!course) return res.status(404).json({ message: 'المقرر غير موجود' });
    const modules = await CourseModule.find({ courseId: course._id, deletedAt: null }).sort({
      orderIndex: 1,
    });
    const quizzes = await ElearningQuiz.find({ courseId: course._id, deletedAt: null });
    res.json({ data: { ...course.toObject(), modules, quizzes } });
  })
);

router.put(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    const course = await ElearningCourse.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ message: 'المقرر غير موجود' });
    res.json({ message: 'تم التحديث بنجاح', data: course });
  })
);

router.delete(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    const course = await ElearningCourse.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user?._id },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'المقرر غير موجود' });
    res.json({ message: 'تم الحذف بنجاح' });
  })
);

// ─── Enroll in Course ─────────────────────────────────────────────────────────
router.post(
  '/courses/:id/enroll',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const course = await ElearningCourse.findOne({ _id: req.params.id, deletedAt: null });
    if (!course) return res.status(404).json({ message: 'المقرر غير موجود' });
    if (course.status !== 'published')
      return res.status(400).json({ message: 'المقرر غير منشور بعد' });

    const userId = req.body.userId || req.user?._id;
    const enrollmentType = req.body.enrollmentType || 'voluntary';
    const dueDate =
      enrollmentType === 'mandatory'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : req.body.dueDate;

    const existing = await CourseEnrollment.findOne({
      courseId: course._id,
      userId,
      deletedAt: null,
    });
    if (existing)
      return res
        .status(409)
        .json({ message: 'المستخدم مسجّل في هذا المقرر بالفعل', data: existing });

    const enrollment = await CourseEnrollment.create({
      branchId,
      courseId: course._id,
      userId,
      enrollmentType,
      enrolledBy: req.user?._id,
      enrolledAt: new Date(),
      dueDate,
      createdBy: req.user?._id,
    });

    res.status(201).json({ message: 'تم التسجيل في المقرر بنجاح', data: enrollment });
  })
);

// ─── Course Modules ───────────────────────────────────────────────────────────
router.get(
  '/courses/:id/modules',
  asyncHandler(async (req, res) => {
    const modules = await CourseModule.find({ courseId: req.params.id, deletedAt: null }).sort({
      orderIndex: 1,
    });
    res.json({ data: modules });
  })
);

router.post(
  '/courses/:id/modules',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const module = await CourseModule.create({
      ...req.body,
      courseId: req.params.id,
      branchId,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إضافة الوحدة بنجاح', data: module });
  })
);

// ─── Enrollments ──────────────────────────────────────────────────────────────
router.get(
  '/enrollments',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { userId, courseId, status, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (userId) filter.userId = userId;
    if (courseId) filter.courseId = courseId;
    if (status) filter.status = status;

    const [enrollments, total] = await Promise.all([
      CourseEnrollment.find(filter)
        .populate('courseId', 'titleAr title code')
        .populate('userId', 'name')
        .sort({ enrolledAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      CourseEnrollment.countDocuments(filter),
    ]);
    res.json({ data: enrollments, total, page: Number(page), limit: Number(limit) });
  })
);

router.get(
  '/enrollments/:id',
  asyncHandler(async (req, res) => {
    const enrollment = await CourseEnrollment.findOne({ _id: req.params.id, deletedAt: null })
      .populate('courseId')
      .populate('userId', 'name email');
    if (!enrollment) return res.status(404).json({ message: 'التسجيل غير موجود' });

    const moduleProgress = await ModuleProgress.find({
      enrollmentId: enrollment._id,
      deletedAt: null,
    }).populate('moduleId', 'titleAr title orderIndex contentType');
    res.json({ data: { ...enrollment.toObject(), moduleProgress } });
  })
);

// ─── Module Progress ──────────────────────────────────────────────────────────
router.post(
  '/progress/update',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { enrollmentId, moduleId, watchPercentage, timeSpentSeconds, status, scormData } =
      req.body;
    if (!enrollmentId || !moduleId)
      return res.status(400).json({ message: 'enrollmentId و moduleId مطلوبان' });

    const enrollment = await CourseEnrollment.findOne({ _id: enrollmentId, deletedAt: null });
    if (!enrollment) return res.status(404).json({ message: 'التسجيل غير موجود' });

    const progress = await ModuleProgress.findOneAndUpdate(
      { enrollmentId, moduleId },
      {
        $set: {
          watchPercentage: watchPercentage ?? 0,
          timeSpentSeconds: timeSpentSeconds ?? 0,
          status: status || 'in_progress',
          lastAccessedAt: new Date(),
          scormData,
          userId: enrollment.userId,
          branchId,
          updatedBy: req.user?._id,
        },
        $setOnInsert: { startedAt: new Date(), createdBy: req.user?._id },
      },
      { upsert: true, new: true }
    );

    // حساب نسبة التقدم الكلية
    const course = await ElearningCourse.findById(enrollment.courseId);
    const totalModules = await CourseModule.countDocuments({
      courseId: enrollment.courseId,
      isRequired: true,
      deletedAt: null,
    });
    const completedModules = await ModuleProgress.countDocuments({
      enrollmentId,
      status: 'completed',
    });
    const percentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    let newStatus = enrollment.status;
    if (percentage >= 100) newStatus = 'completed';
    else if (percentage > 0) newStatus = 'in_progress';

    const updateData = {
      progressPercentage: percentage,
      status: newStatus,
      startedAt: enrollment.startedAt || new Date(),
    };
    if (newStatus === 'completed' && !enrollment.completedAt) {
      updateData.completedAt = new Date();
      // إصدار الشهادة تلقائياً
      if (!enrollment.certificateNumber) {
        const certNumber = `CERT-${new Date().getFullYear()}-${pad(enrollment._id.toString().slice(-4), 6)}`;
        updateData.certificateNumber = certNumber;
        updateData.certificateIssuedAt = new Date();
        if (course?.certificateValidityMonths) {
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + course.certificateValidityMonths);
          updateData.certificateExpiresAt = expiry;
        }
        // سجل CPD تلقائي
        if (course?.isCpdEligible && course?.cpdHours > 0) {
          await CpdRecord.create({
            branchId,
            userId: enrollment.userId,
            activityType: 'course',
            title: course.titleAr || course.title,
            provider: 'مركز التأهيل',
            activityDate: new Date(),
            cpdHours: course.cpdHours,
            certificateNumber: certNumber,
            status: 'verified',
            enrollmentId: enrollment._id,
            year: new Date().getFullYear(),
            createdBy: req.user?._id,
          });
        }
      }
    }

    await CourseEnrollment.findByIdAndUpdate(enrollmentId, updateData);

    res.json({ message: 'تم تحديث التقدم', data: progress, overallProgress: percentage });
  })
);

// ─── Certificate Download ──────────────────────────────────────────────────────
router.get(
  '/enrollments/:id/certificate',
  asyncHandler(async (req, res) => {
    const enrollment = await CourseEnrollment.findOne({ _id: req.params.id, deletedAt: null })
      .populate('courseId', 'titleAr title')
      .populate('userId', 'name');
    if (!enrollment) return res.status(404).json({ message: 'التسجيل غير موجود' });
    if (!enrollment.certificateNumber)
      return res.status(404).json({ message: 'لا توجد شهادة لهذا التسجيل' });

    res.json({
      certificateNumber: enrollment.certificateNumber,
      issuedAt: enrollment.certificateIssuedAt,
      expiresAt: enrollment.certificateExpiresAt,
      courseName: enrollment.courseId?.titleAr || enrollment.courseId?.title,
      userName: enrollment.userId?.name,
    });
  })
);

// ─── Quizzes ──────────────────────────────────────────────────────────────────
router.post(
  '/quizzes',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const quiz = await ElearningQuiz.create({ ...req.body, branchId, createdBy: req.user?._id });
    res.status(201).json({ message: 'تم إنشاء الاختبار بنجاح', data: quiz });
  })
);

router.get(
  '/quizzes/:id',
  asyncHandler(async (req, res) => {
    const quiz = await ElearningQuiz.findOne({ _id: req.params.id, deletedAt: null });
    if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });
    const questions = await QuizQuestion.find({ quizId: quiz._id, deletedAt: null }).sort({
      orderIndex: 1,
    });
    res.json({ data: { ...quiz.toObject(), questions } });
  })
);

router.get(
  '/quizzes/:id/questions',
  asyncHandler(async (req, res) => {
    const questions = await QuizQuestion.find({ quizId: req.params.id, deletedAt: null }).sort({
      orderIndex: 1,
    });
    res.json({ data: questions });
  })
);

router.post(
  '/quizzes/:id/questions',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const question = await QuizQuestion.create({
      ...req.body,
      quizId: req.params.id,
      branchId,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إضافة السؤال بنجاح', data: question });
  })
);

// تقديم محاولة اختبار
router.post(
  '/quizzes/:id/submit',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { enrollmentId, answers } = req.body;
    const quiz = await ElearningQuiz.findOne({ _id: req.params.id, deletedAt: null });
    if (!quiz) return res.status(404).json({ message: 'الاختبار غير موجود' });

    const enrollment = await CourseEnrollment.findOne({ _id: enrollmentId, deletedAt: null });
    if (!enrollment) return res.status(404).json({ message: 'التسجيل غير موجود' });

    const attemptCount = await QuizAttempt.countDocuments({ quizId: quiz._id, enrollmentId });
    if (attemptCount >= quiz.maxAttempts)
      return res.status(400).json({ message: 'تم تجاوز الحد الأقصى لمحاولات الاختبار' });

    const questions = await QuizQuestion.find({ quizId: quiz._id, deletedAt: null });
    let earnedPoints = 0;
    let totalPoints = 0;
    const processedAnswers = [];

    for (const question of questions) {
      const given = answers?.[question._id.toString()];
      let isCorrect = false;
      if (question.questionType === 'true_false' || question.questionType === 'short_answer') {
        isCorrect = String(given).toLowerCase() === String(question.correctAnswer).toLowerCase();
      } else if (question.questionType === 'single_choice') {
        const opts = Array.isArray(question.options) ? question.options : [];
        isCorrect = opts.some(o => o.is_correct && (o.text === given || o.text_ar === given));
      }
      if (isCorrect) earnedPoints += question.points;
      totalPoints += question.points;
      processedAnswers.push({
        questionId: question._id,
        answer: given,
        isCorrect,
        points: isCorrect ? question.points : 0,
      });
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100 * 100) / 100 : 0;
    const passed = score >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      branchId,
      quizId: quiz._id,
      enrollmentId,
      userId: enrollment.userId,
      attemptNumber: attemptCount + 1,
      startedAt: new Date(Date.now() - 60000),
      submittedAt: new Date(),
      score,
      correctAnswers: earnedPoints,
      totalQuestions: questions.length,
      passed,
      answers: processedAnswers,
      status: 'graded',
      createdBy: req.user?._id,
    });

    // تحديث أفضل نتيجة للتسجيل
    const bestScore = enrollment.bestScore || 0;
    if (score > bestScore) {
      await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
        bestScore: score,
        lastScore: score,
      });
    } else {
      await CourseEnrollment.findByIdAndUpdate(enrollmentId, { lastScore: score });
    }

    res.status(201).json({
      message: passed ? 'اجتزت الاختبار بنجاح' : 'لم تجتز الاختبار',
      data: attempt,
      passed,
      score,
      remainingAttempts: quiz.maxAttempts - (attemptCount + 1),
    });
  })
);

// ─── CPD Records ──────────────────────────────────────────────────────────────
router.get(
  '/cpd/records',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { userId, year, status, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (userId) filter.userId = userId;
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    const [records, total] = await Promise.all([
      CpdRecord.find(filter)
        .populate('userId', 'name')
        .populate('verifiedBy', 'name')
        .sort({ activityDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      CpdRecord.countDocuments(filter),
    ]);

    // مجموع الساعات المعتمدة
    const totalHours = await CpdRecord.aggregate([
      {
        $match: {
          branchId: filter.branchId,
          status: 'verified',
          deletedAt: null,
          ...(userId ? { userId: require('mongoose').Types.ObjectId(userId) } : {}),
          ...(year ? { year: Number(year) } : {}),
        },
      },
      { $group: { _id: null, total: { $sum: '$cpdHours' } } },
    ]);

    res.json({
      data: records,
      total,
      totalCpdHours: totalHours[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  })
);

router.post(
  '/cpd/records',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const record = await CpdRecord.create({
      ...req.body,
      branchId,
      year: req.body.year || new Date().getFullYear(),
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إضافة سجل CPD بنجاح', data: record });
  })
);

router.patch(
  '/cpd/records/:id/verify',
  asyncHandler(async (req, res) => {
    const record = await CpdRecord.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        status: 'verified',
        verifiedBy: req.user?._id,
        verifiedAt: new Date(),
        updatedBy: req.user?._id,
      },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: 'سجل CPD غير موجود' });
    res.json({ message: 'تم اعتماد سجل CPD', data: record });
  })
);

router.get(
  '/cpd/report',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const year = Number(req.query.year) || new Date().getFullYear();

    const report = await CpdRecord.aggregate([
      { $match: { branchId, year, status: 'verified', deletedAt: null } },
      { $group: { _id: '$userId', totalHours: { $sum: '$cpdHours' }, count: { $sum: 1 } } },
      { $sort: { totalHours: -1 } },
    ]);

    res.json({ data: report, year });
  })
);

// ─── Training Compliance ──────────────────────────────────────────────────────
router.get(
  '/compliance',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { userId, status, year, page = 1, limit = 20 } = req.query;
    const filter = { branchId, deletedAt: null };
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (year) filter.year = Number(year);

    const [records, total] = await Promise.all([
      TrainingCompliance.find(filter)
        .populate('userId', 'name')
        .populate('courseId', 'titleAr title code')
        .sort({ dueDate: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      TrainingCompliance.countDocuments(filter),
    ]);
    res.json({ data: records, total, page: Number(page), limit: Number(limit) });
  })
);

// تعيين التدريب الإلزامي
router.post(
  '/compliance/assign-mandatory',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { userId, role } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId مطلوب' });

    const mandatoryCourses = await ElearningCourse.find({
      branchId,
      status: 'published',
      isMandatory: true,
      ...(role ? { targetRoles: role } : {}),
      deletedAt: null,
    });

    const results = [];
    for (const course of mandatoryCourses) {
      // تسجيل في المقرر
      const enrollment = await CourseEnrollment.findOneAndUpdate(
        { courseId: course._id, userId },
        {
          $setOnInsert: {
            branchId,
            courseId: course._id,
            userId,
            enrollmentType: 'mandatory',
            enrolledBy: req.user?._id,
            enrolledAt: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdBy: req.user?._id,
          },
        },
        { upsert: true, new: true }
      );

      // سجل الامتثال
      await TrainingCompliance.findOneAndUpdate(
        { userId, courseId: course._id, year: new Date().getFullYear() },
        {
          $setOnInsert: {
            branchId,
            userId,
            courseId: course._id,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            year: new Date().getFullYear(),
            createdBy: req.user?._id,
          },
        },
        { upsert: true, new: true }
      );

      results.push(enrollment);
    }

    res.json({ message: `تم تعيين ${results.length} تدريب إلزامي`, data: results });
  })
);

// ─── Learning Paths ───────────────────────────────────────────────────────────
router.get(
  '/learning-paths',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const { targetRole, isActive } = req.query;
    const filter = { branchId, deletedAt: null };
    if (targetRole) filter.targetRole = targetRole;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const paths = await LearningPath.find(filter).sort({ createdAt: -1 });
    res.json({ data: paths });
  })
);

router.post(
  '/learning-paths',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const path = await LearningPath.create({ ...req.body, branchId, createdBy: req.user?._id });
    res.status(201).json({ message: 'تم إنشاء مسار التعلم بنجاح', data: path });
  })
);

// ─── Discussion Forums ────────────────────────────────────────────────────────
router.get(
  '/forums/:courseId',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const filter = { courseId: req.params.courseId, deletedAt: null };

    const [forums, total] = await Promise.all([
      DiscussionForum.find(filter)
        .populate('createdBy', 'name')
        .sort({ isPinned: -1, lastReplyAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      DiscussionForum.countDocuments(filter),
    ]);
    res.json({ data: forums, total, page: Number(page), limit: Number(limit) });
  })
);

router.post(
  '/forums/:courseId',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const forum = await DiscussionForum.create({
      ...req.body,
      courseId: req.params.courseId,
      branchId,
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إنشاء الموضوع بنجاح', data: forum });
  })
);

router.post(
  '/forums/:forumId/replies',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const reply = await ForumReply.create({
      ...req.body,
      forumId: req.params.forumId,
      userId: req.user?._id,
      branchId,
      createdBy: req.user?._id,
    });

    // تحديث عداد الردود
    await DiscussionForum.findByIdAndUpdate(req.params.forumId, {
      $inc: { repliesCount: 1 },
      lastReplyAt: new Date(),
    });

    res.status(201).json({ message: 'تم إضافة الرد بنجاح', data: reply });
  })
);

// ─── Trainer Evaluations ──────────────────────────────────────────────────────
router.post(
  '/trainer-evaluations',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const evaluation = await TrainerEvaluation.create({
      ...req.body,
      traineeId: req.user?._id,
      branchId,
      submittedAt: new Date(),
      createdBy: req.user?._id,
    });
    res.status(201).json({ message: 'تم إرسال تقييم المدرب بنجاح', data: evaluation });
  })
);

router.get(
  '/trainer-evaluations/:trainerId',
  asyncHandler(async (req, res) => {
    const branchId = getBranchId(req);
    const evaluations = await TrainerEvaluation.find({
      branchId,
      trainerId: req.params.trainerId,
      deletedAt: null,
    })
      .populate('traineeId', 'name')
      .populate('courseId', 'titleAr title')
      .sort({ submittedAt: -1 });

    // متوسط التقييمات
    const avg =
      evaluations.reduce((acc, e) => acc + (e.overallRating || 0), 0) / (evaluations.length || 1);

    res.json({
      data: evaluations,
      averageRating: Math.round(avg * 10) / 10,
      count: evaluations.length,
    });
  })
);

module.exports = router;
