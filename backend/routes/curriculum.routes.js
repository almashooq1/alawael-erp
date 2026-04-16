/**
 * مسارات المناهج الدراسية
 * Curriculum Routes
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { Curriculum } = require('../models/Curriculum');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Auth guard ──────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ── Get all curricula ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      subject,
      academicYear,
      grade,
      teacher,
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (academicYear) filter.academicYear = academicYear;
    if (grade) filter.grade = grade;
    if (teacher) filter.teacher = teacher;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const total = await Curriculum.countDocuments(filter);
    const curricula = await Curriculum.find(filter)
      .populate('subject', 'name code department')
      .populate('academicYear', 'name isCurrent')
      .populate('teacher', 'fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: curricula,
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
      .json({ success: false, message: 'خطأ في جلب المناهج', error: safeError(error) });
  }
});

// ── Get single curriculum ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id)
      .populate('subject', 'name code department objectives')
      .populate('academicYear', 'name semesters')
      .populate('teacher', 'fullName department')
      .populate('approvedBy', 'name')
      .lean();
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    res.json({ success: true, data: curriculum });
  } catch (error) {
    safeError(res, error, 'curriculum');
  }
});

// ── Create curriculum ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const curriculum = new Curriculum(req.body);
    if (req.user) curriculum.createdBy = req.user._id || req.user.id;
    await curriculum.save();
    const populated = await Curriculum.findById(curriculum._id)
      .populate('subject', 'name code')
      .populate('academicYear', 'name')
      .populate('teacher', 'fullName');
    res.status(201).json({ success: true, data: populated, message: 'تم إنشاء المنهج بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء المنهج', error: safeError(error) });
  }
});

// ── Update curriculum ────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndUpdate(
      req.params.id,
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('subject', 'name code')
      .populate('teacher', 'fullName');
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    res.json({ success: true, data: curriculum, message: 'تم تحديث المنهج بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث المنهج', error: safeError(error) });
  }
});

// ── Delete curriculum ────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndDelete(req.params.id);
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    res.json({ success: true, message: 'تم حذف المنهج بنجاح' });
  } catch (error) {
    safeError(res, error, 'curriculum');
  }
});

// ── Add unit ─────────────────────────────────────────────────
router.post('/:id/units', async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    curriculum.units.push(req.body);
    await curriculum.save();
    res.status(201).json({ success: true, data: curriculum, message: 'تم إضافة الوحدة بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة الوحدة', error: safeError(error) });
  }
});

// ── Update unit ──────────────────────────────────────────────
router.put('/:id/units/:unitId', async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    const unit = curriculum.units.id(req.params.unitId);
    if (!unit) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
    Object.assign(unit, stripUpdateMeta(req.body));
    await curriculum.save();
    res.json({ success: true, data: curriculum, message: 'تم تحديث الوحدة بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث الوحدة', error: safeError(error) });
  }
});

// ── Add lesson to unit ───────────────────────────────────────
router.post('/:id/units/:unitId/lessons', async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id);
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    const unit = curriculum.units.id(req.params.unitId);
    if (!unit) return res.status(404).json({ success: false, message: 'الوحدة غير موجودة' });
    unit.lessons.push(req.body);
    await curriculum.save();
    res.status(201).json({ success: true, data: curriculum, message: 'تم إضافة الدرس بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة الدرس', error: safeError(error) });
  }
});

// ── Approve curriculum ───────────────────────────────────────
router.patch('/:id/approve', async (req, res) => {
  try {
    const curriculum = await Curriculum.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user?._id || req.user?.id,
        approvedDate: new Date(),
      },
      { new: true }
    );
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });
    res.json({ success: true, data: curriculum, message: 'تم اعتماد المنهج بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في اعتماد المنهج', error: safeError(error) });
  }
});

// ── Progress tracking ────────────────────────────────────────
router.get('/:id/progress', async (req, res) => {
  try {
    const curriculum = await Curriculum.findById(req.params.id).lean();
    if (!curriculum) return res.status(404).json({ success: false, message: 'المنهج غير موجود' });

    const units = curriculum.units || [];
    const totalLessons = units.reduce((t, u) => t + (u.lessons?.length || 0), 0);
    const completedLessons = units.reduce(
      (t, u) => t + (u.lessons?.filter(l => l.status === 'completed').length || 0),
      0
    );

    res.json({
      success: true,
      data: {
        totalUnits: units.length,
        completedUnits: units.filter(u => u.status === 'completed').length,
        totalLessons,
        completedLessons,
        overallProgress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    });
  } catch (error) {
    safeError(res, error, 'curriculum');
  }
});

module.exports = router;
