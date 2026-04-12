/**
 * مسارات سجل الدرجات
 * Gradebook Routes
 */
const express = require('express');
const router = express.Router();
const { Gradebook, SemesterReport } = require('../models/Gradebook');
const { authenticate, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);

// ══════════════════════════════════════════════════════════════
//  GRADEBOOK CRUD
// ══════════════════════════════════════════════════════════════

// ── Get gradebook entries ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      student,
      subject,
      teacher,
      academicYear,
      semester,
      grade,
      section,
      status,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = {};
    if (student) filter.student = student;
    if (subject) filter.subject = subject;
    if (teacher) filter.teacher = teacher;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (grade) filter.grade = grade;
    if (section) filter.section = section;
    if (status) filter.status = status;

    const total = await Gradebook.countDocuments(filter);
    const entries = await Gradebook.find(filter)
      .populate('student', 'name email')
      .populate('subject', 'name code')
      .populate('teacher', 'fullName')
      .populate('academicYear', 'name')
      .sort({ 'student.name': 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: entries,
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
      .json({ success: false, message: 'خطأ في جلب سجل الدرجات', error: safeError(error) });
  }
});

// ── Get student gradebook ────────────────────────────────────
router.get('/student/:studentId', async (req, res) => {
  try {
    const { academicYear, semester } = req.query;
    const filter = { student: req.params.studentId };
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;

    const grades = await Gradebook.find(filter)
      .populate('subject', 'name code department creditHours')
      .populate('teacher', 'fullName')
      .populate('academicYear', 'name')
      .lean();

    res.json({ success: true, data: grades });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب درجات الطالب', error: safeError(error) });
  }
});

// ── Get single gradebook ─────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const entry = await Gradebook.findById(req.params.id)
      .populate('student', 'name email phone')
      .populate('subject', 'name code department assessmentCriteria')
      .populate('teacher', 'fullName')
      .populate('academicYear', 'name semesters')
      .populate('entries.exam', 'title type totalPoints')
      .lean();
    if (!entry) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: entry });
  } catch (error) {
    safeError(res, error, 'gradebook');
  }
});

// ── Create or Get gradebook ──────────────────────────────────
router.post('/', authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { student, subject, academicYear, semester } = req.body;
    let entry = await Gradebook.findOne({ student, subject, academicYear, semester });
    if (entry) {
      return res.json({ success: true, data: entry, message: 'السجل موجود بالفعل' });
    }
    entry = new Gradebook(req.body);
    await entry.save();
    res.status(201).json({ success: true, data: entry, message: 'تم إنشاء سجل الدرجات بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء السجل', error: safeError(error) });
  }
});

// ── Add grade entry ──────────────────────────────────────────
router.post(
  '/:id/entries',
  validateObjectId('id'),
  authorize(['admin', 'teacher']),
  async (req, res) => {
    try {
      const gradebook = await Gradebook.findById(req.params.id);
      if (!gradebook) return res.status(404).json({ success: false, message: 'السجل غير موجود' });

      gradebook.entries.push({
        ...req.body,
        gradedBy: req.user?._id || req.user?.id,
      });
      gradebook.calculateTotals();
      await gradebook.save();
      res.json({ success: true, data: gradebook, message: 'تم إضافة الدرجة بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة الدرجة', error: safeError(error) });
    }
  }
);

// ── Update grade entry ───────────────────────────────────────
router.put(
  '/:id/entries/:entryId',
  validateObjectId('id'),
  authorize(['admin', 'teacher']),
  async (req, res) => {
    try {
      const gradebook = await Gradebook.findById(req.params.id);
      if (!gradebook) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      const entry = gradebook.entries.id(req.params.entryId);
      if (!entry) return res.status(404).json({ success: false, message: 'الدرجة غير موجودة' });
      Object.assign(entry, stripUpdateMeta(req.body));
      gradebook.calculateTotals();
      await gradebook.save();
      res.json({ success: true, data: gradebook, message: 'تم تحديث الدرجة بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث الدرجة', error: safeError(error) });
    }
  }
);

// ── Bulk add grades ──────────────────────────────────────────
router.post('/bulk', authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { grades } = req.body; // Array of { student, subject, academicYear, semester, entry }
    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({ success: false, message: 'يرجى تقديم قائمة الدرجات' });
    }

    const results = [];
    for (const item of grades) {
      let gradebook = await Gradebook.findOne({
        student: item.student,
        subject: item.subject,
        academicYear: item.academicYear,
        semester: item.semester,
      });

      if (!gradebook) {
        gradebook = new Gradebook({
          student: item.student,
          subject: item.subject,
          academicYear: item.academicYear,
          semester: item.semester,
          grade: item.grade,
          section: item.section,
          teacher: item.teacher,
        });
      }

      gradebook.entries.push({
        ...item.entry,
        gradedBy: req.user?._id || req.user?.id,
      });
      gradebook.calculateTotals();
      await gradebook.save();
      results.push(gradebook);
    }

    res.json({ success: true, data: results, message: `تم إضافة ${results.length} درجة بنجاح` });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة الدرجات', error: safeError(error) });
  }
});

// ── Add comment ──────────────────────────────────────────────
router.post(
  '/:id/comments',
  validateObjectId('id'),
  authorize(['admin', 'teacher']),
  async (req, res) => {
    try {
      const gradebook = await Gradebook.findById(req.params.id);
      if (!gradebook) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      gradebook.teacherComments.push({
        ...req.body,
        teacher: req.user?._id || req.user?.id,
      });
      await gradebook.save();
      res.json({ success: true, data: gradebook, message: 'تم إضافة الملاحظة بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة الملاحظة', error: safeError(error) });
    }
  }
);

// ── Finalize gradebook ───────────────────────────────────────
router.patch('/:id/finalize', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const gradebook = await Gradebook.findById(req.params.id);
    if (!gradebook) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    gradebook.calculateTotals();
    gradebook.status = 'finalized';
    gradebook.finalizedBy = req.user?._id || req.user?.id;
    gradebook.finalizedDate = new Date();
    await gradebook.save();
    res.json({ success: true, data: gradebook, message: 'تم اعتماد سجل الدرجات بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في اعتماد السجل', error: safeError(error) });
  }
});

// ══════════════════════════════════════════════════════════════
//  SEMESTER REPORTS
// ══════════════════════════════════════════════════════════════

// ── Generate semester report ─────────────────────────────────
router.post('/reports/generate', authorize(['admin', 'teacher']), async (req, res) => {
  try {
    const { studentId, academicYear, semester } = req.body;
    const gradebooks = await Gradebook.find({
      student: studentId,
      academicYear,
      semester,
      status: 'finalized',
    })
      .populate('subject', 'name code creditHours')
      .lean();

    if (gradebooks.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد سجلات درجات معتمدة' });
    }

    const subjects = gradebooks.map(gb => ({
      subject: gb.subject?._id,
      gradebook: gb._id,
      percentage: gb.percentage,
      letterGrade: gb.letterGrade,
      gpa: gb.gpa,
      isPassed: gb.isPassed,
    }));

    const totalGPA = subjects.reduce((s, sub) => s + sub.gpa, 0);
    const overallGPA =
      subjects.length > 0 ? Math.round((totalGPA / subjects.length) * 100) / 100 : 0;
    const overallPct = subjects.reduce((s, sub) => s + sub.percentage, 0) / (subjects.length || 1);

    let report = await SemesterReport.findOne({ student: studentId, academicYear, semester });
    if (!report) {
      report = new SemesterReport({
        student: studentId,
        academicYear,
        semester,
        grade: gradebooks[0]?.grade,
        section: gradebooks[0]?.section,
      });
    }

    report.subjects = subjects;
    report.overallGPA = overallGPA;
    report.overallPercentage = Math.round(overallPct * 100) / 100;
    report.generatedBy = req.user?._id || req.user?.id;
    report.generatedAt = new Date();
    report.status = 'draft';
    await report.save();

    res.json({ success: true, data: report, message: 'تم إنشاء التقرير الفصلي بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء التقرير', error: safeError(error) });
  }
});

// ── Get semester reports ─────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const { student, academicYear, semester, status } = req.query;
    const filter = {};
    if (student) filter.student = student;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (status) filter.status = status;

    const reports = await SemesterReport.find(filter)
      .populate('student', 'name')
      .populate('academicYear', 'name')
      .populate('subjects.subject', 'name code')
      .sort({ generatedAt: -1 })
      .lean();

    res.json({ success: true, data: reports });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب التقارير', error: safeError(error) });
  }
});

// ── Class statistics ─────────────────────────────────────────
router.get('/stats/class', async (req, res) => {
  try {
    const { subject, academicYear, semester, grade, section } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (grade) filter.grade = grade;
    if (section) filter.section = section;

    const gradebooks = await Gradebook.find(filter).lean();
    if (gradebooks.length === 0) {
      return res.json({ success: true, data: { totalStudents: 0 } });
    }

    const percentages = gradebooks.map(g => g.percentage);
    const stats = {
      totalStudents: gradebooks.length,
      average: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
      passRate: Math.round((gradebooks.filter(g => g.isPassed).length / gradebooks.length) * 100),
      gradeDistribution: {
        'A+': gradebooks.filter(g => g.letterGrade === 'A+').length,
        A: gradebooks.filter(g => g.letterGrade === 'A').length,
        'B+': gradebooks.filter(g => g.letterGrade === 'B+').length,
        B: gradebooks.filter(g => g.letterGrade === 'B').length,
        'C+': gradebooks.filter(g => g.letterGrade === 'C+').length,
        C: gradebooks.filter(g => g.letterGrade === 'C').length,
        D: gradebooks.filter(g => ['D+', 'D'].includes(g.letterGrade)).length,
        F: gradebooks.filter(g => g.letterGrade === 'F').length,
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
