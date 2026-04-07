/**
 * مسارات الاختبارات والتقويم
 * Exam Routes
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Exam, ExamSubmission } = require('../models/Exam');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Auth guard ──────────────────────────────────────────────
router.use(authenticate);

// ══════════════════════════════════════════════════════════════
//  EXAM CRUD
// ══════════════════════════════════════════════════════════════

// ── Get all exams ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      subject,
      teacher,
      academicYear,
      type,
      status,
      grade,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (teacher) filter.teacher = teacher;
    if (academicYear) filter.academicYear = academicYear;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (grade) filter.grade = grade;
    if (search) filter.$text = { $search: search };

    const total = await Exam.countDocuments(filter);
    const exams = await Exam.find(filter)
      .populate('subject', 'name code')
      .populate('teacher', 'fullName')
      .populate('academicYear', 'name')
      .select('-questions.options.isCorrect -questions.correctAnswer')
      .sort({ scheduledDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: exams,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الاختبارات', error: safeError(error) });
  }
});

// ── Get single exam (with answers for teacher) ───────────────
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name code department')
      .populate('teacher', 'fullName')
      .populate('academicYear', 'name')
      .populate('classroom', 'name code')
      .lean();
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });
    res.json({ success: true, data: exam });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الاختبار', error: safeError(error) });
  }
});

// ── Create exam ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const exam = new Exam(req.body);
    if (req.user) exam.createdBy = req.user._id || req.user.id;
    await exam.save();
    res.status(201).json({ success: true, data: exam, message: 'تم إنشاء الاختبار بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء الاختبار', error: safeError(error) });
  }
});

// ── Update exam ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });
    res.json({ success: true, data: exam, message: 'تم تحديث الاختبار بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث الاختبار', error: safeError(error) });
  }
});

// ── Delete exam ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });
    await ExamSubmission.deleteMany({ exam: req.params.id });
    res.json({ success: true, message: 'تم حذف الاختبار بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في حذف الاختبار', error: safeError(error) });
  }
});

// ── Add question ─────────────────────────────────────────────
router.post('/:id/questions', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });
    exam.questions.push(req.body);
    await exam.save();
    res.status(201).json({ success: true, data: exam, message: 'تم إضافة السؤال بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة السؤال', error: safeError(error) });
  }
});

// ── Update question ──────────────────────────────────────────
router.put('/:id/questions/:qId', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });
    const question = exam.questions.id(req.params.qId);
    if (!question) return res.status(404).json({ success: false, message: 'السؤال غير موجود' });
    Object.assign(question, stripUpdateMeta(req.body));
    await exam.save();
    res.json({ success: true, data: exam, message: 'تم تحديث السؤال بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث السؤال', error: safeError(error) });
  }
});

// ══════════════════════════════════════════════════════════════
//  SUBMISSIONS
// ══════════════════════════════════════════════════════════════

// ── Start exam (create submission) ───────────────────────────
router.post('/:id/start', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'الاختبار غير موجود' });

    const studentId = req.body.studentId || req.user?._id || req.user?.id;
    let submission = await ExamSubmission.findOne({ exam: req.params.id, student: studentId });
    if (submission && submission.status !== 'not_started') {
      return res
        .status(400)
        .json({ success: false, message: 'تم بدء الاختبار مسبقاً', data: submission });
    }

    if (!submission) {
      submission = new ExamSubmission({
        exam: req.params.id,
        student: studentId,
        startedAt: new Date(),
        status: 'in_progress',
      });
    } else {
      submission.startedAt = new Date();
      submission.status = 'in_progress';
    }
    await submission.save();
    res.json({ success: true, data: submission, message: 'تم بدء الاختبار' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في بدء الاختبار', error: safeError(error) });
  }
});

// ── Submit exam ──────────────────────────────────────────────
router.post('/:id/submit', async (req, res) => {
  try {
    const studentId = req.body.studentId || req.user?._id || req.user?.id;
    const submission = await ExamSubmission.findOne({ exam: req.params.id, student: studentId });
    if (!submission)
      return res.status(404).json({ success: false, message: 'لم يتم بدء الاختبار' });

    submission.answers = req.body.answers || [];
    submission.submittedAt = new Date();
    submission.timeSpent = Math.round((submission.submittedAt - submission.startedAt) / 1000);
    submission.status = 'submitted';

    // Auto-grade objective questions
    const exam = await Exam.findById(req.params.id);
    if (exam && exam.settings?.autoGrade) {
      let totalScore = 0;
      submission.answers.forEach(ans => {
        const question = exam.questions.id(ans.question);
        if (!question) return;
        if (['multiple_choice', 'true_false', 'fill_blank'].includes(question.type)) {
          const isCorrect =
            question.type === 'multiple_choice'
              ? question.options.some(o => o.isCorrect && o.text === ans.answer)
              : String(question.correctAnswer).trim().toLowerCase() ===
                String(ans.answer).trim().toLowerCase();
          ans.isCorrect = isCorrect;
          ans.pointsAwarded = isCorrect ? question.points : 0;
          totalScore += ans.pointsAwarded;
        }
      });
      submission.totalScore = totalScore;
      submission.percentage =
        exam.totalPoints > 0 ? Math.round((totalScore / exam.totalPoints) * 100) : 0;
      submission.isPassed = submission.percentage >= (exam.passingScore || 50);
      if (!submission.answers.some(a => a.pointsAwarded === undefined)) {
        submission.status = 'graded';
      }
    }

    await submission.save();
    res.json({ success: true, data: submission, message: 'تم تسليم الاختبار بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تسليم الاختبار', error: safeError(error) });
  }
});

// ── Get exam submissions ─────────────────────────────────────
router.get('/:id/submissions', async (req, res) => {
  try {
    const submissions = await ExamSubmission.find({ exam: req.params.id })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ success: true, data: submissions });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإجابات', error: safeError(error) });
  }
});

// ── Grade submission ─────────────────────────────────────────
router.put('/submissions/:submissionId/grade', async (req, res) => {
  try {
    const submission = await ExamSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ success: false, message: 'الإجابة غير موجودة' });

    const { answers, teacherComments } = req.body;
    if (answers) {
      answers.forEach(graded => {
        const ans = submission.answers.find(a => a.question.toString() === graded.question);
        if (ans) {
          ans.pointsAwarded = graded.pointsAwarded;
          ans.feedback = graded.feedback;
          ans.isCorrect = graded.isCorrect;
          ans.gradedBy = req.user?._id || req.user?.id;
          ans.gradedAt = new Date();
        }
      });
    }

    submission.totalScore = submission.answers.reduce((s, a) => s + (a.pointsAwarded || 0), 0);
    const exam = await Exam.findById(submission.exam);
    submission.percentage =
      exam?.totalPoints > 0 ? Math.round((submission.totalScore / exam.totalPoints) * 100) : 0;
    submission.isPassed = submission.percentage >= (exam?.passingScore || 50);
    submission.teacherComments = teacherComments || submission.teacherComments;
    submission.status = 'graded';
    await submission.save();

    res.json({ success: true, data: submission, message: 'تم تصحيح الاختبار بنجاح' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'خطأ في التصحيح', error: safeError(error) });
  }
});

// ── Exam statistics ──────────────────────────────────────────
router.get('/:id/stats', async (req, res) => {
  try {
    const submissions = await ExamSubmission.find({ exam: req.params.id, status: 'graded' }).lean();
    if (submissions.length === 0) {
      return res.json({
        success: true,
        data: { totalSubmissions: 0, message: 'لا توجد إجابات مصححة بعد' },
      });
    }

    const scores = submissions.map(s => s.percentage);
    const stats = {
      totalSubmissions: submissions.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passRate: Math.round((submissions.filter(s => s.isPassed).length / submissions.length) * 100),
      gradeDistribution: {
        excellent: submissions.filter(s => s.percentage >= 90).length,
        veryGood: submissions.filter(s => s.percentage >= 80 && s.percentage < 90).length,
        good: submissions.filter(s => s.percentage >= 70 && s.percentage < 80).length,
        acceptable: submissions.filter(s => s.percentage >= 60 && s.percentage < 70).length,
        weak: submissions.filter(s => s.percentage >= 50 && s.percentage < 60).length,
        fail: submissions.filter(s => s.percentage < 50).length,
      },
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
  }
});

module.exports = router;
