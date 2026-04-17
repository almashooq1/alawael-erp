/**
 * مسارات العام الدراسي
 * Academic Year Routes
 */
const express = require('express');
const router = express.Router();
const { AcademicYear } = require('../models/AcademicYear');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const validateObjectId = require('../middleware/validateObjectId');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ── Get all academic years ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await AcademicYear.countDocuments(filter);
    const years = await AcademicYear.find(filter)
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: years,
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
      .json({ success: false, message: 'خطأ في جلب الأعوام الدراسية', error: safeError(error) });
  }
});

// ── Get current academic year ────────────────────────────────
router.get('/current', async (req, res) => {
  try {
    const current = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!current) {
      return res.json({ success: true, data: null, message: 'لا يوجد عام دراسي حالي' });
    }
    res.json({ success: true, data: current });
  } catch (error) {
    safeError(res, error, 'academicYear');
  }
});

// ── Get single academic year ─────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id).lean();
    if (!year) return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
    res.json({ success: true, data: year });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب العام الدراسي', error: safeError(error) });
  }
});

// ── Create academic year ─────────────────────────────────────
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const year = new AcademicYear(stripUpdateMeta(req.body));
    if (req.user) year.createdBy = req.user._id || req.user.id;
    await year.save();
    res.status(201).json({ success: true, data: year, message: 'تم إنشاء العام الدراسي بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء العام الدراسي', error: safeError(error) });
  }
});

// ── Update academic year ─────────────────────────────────────
router.put('/:id', validateObjectId('id'), authorize(['admin', 'manager']), async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!year) return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
    res.json({ success: true, data: year, message: 'تم تحديث العام الدراسي بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث العام الدراسي', error: safeError(error) });
  }
});

// ── Delete academic year ─────────────────────────────────────
router.delete('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
    res.json({ success: true, message: 'تم حذف العام الدراسي بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في حذف العام الدراسي', error: safeError(error) });
  }
});

// ── Set current year ─────────────────────────────────────────
router.patch(
  '/:id/set-current',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      await AcademicYear.updateMany({ isCurrent: true }, { isCurrent: false });
      const year = await AcademicYear.findByIdAndUpdate(
        req.params.id,
        { isCurrent: true, status: 'active' },
        { new: true }
      );
      if (!year)
        return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
      res.json({ success: true, data: year, message: 'تم تعيين العام الدراسي الحالي بنجاح' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تعيين العام الحالي', error: safeError(error) });
    }
  }
);

// ── Add semester ─────────────────────────────────────────────
router.post(
  '/:id/semesters',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const year = await AcademicYear.findById(req.params.id);
      if (!year)
        return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
      year.semesters.push(req.body);
      await year.save();
      res.status(201).json({ success: true, data: year, message: 'تم إضافة الفصل الدراسي بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة الفصل الدراسي', error: safeError(error) });
    }
  }
);

// ── Update semester ──────────────────────────────────────────
router.put(
  '/:id/semesters/:semesterId',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const year = await AcademicYear.findById(req.params.id);
      if (!year)
        return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });
      const semester = year.semesters.id(req.params.semesterId);
      if (!semester)
        return res.status(404).json({ success: false, message: 'الفصل الدراسي غير موجود' });
      Object.assign(semester, stripUpdateMeta(req.body));
      await year.save();
      res.json({ success: true, data: year, message: 'تم تحديث الفصل الدراسي بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث الفصل الدراسي', error: safeError(error) });
    }
  }
);

// ── Statistics ───────────────────────────────────────────────
router.get('/:id/stats', validateObjectId('id'), async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id).lean();
    if (!year) return res.status(404).json({ success: false, message: 'العام الدراسي غير موجود' });

    const stats = {
      totalSemesters: year.semesters?.length || 0,
      activeSemesters: year.semesters?.filter(s => s.status === 'active').length || 0,
      totalHolidays: year.semesters?.reduce((t, s) => t + (s.holidays?.length || 0), 0) || 0,
      daysRemaining: Math.max(
        0,
        Math.ceil((new Date(year.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      ),
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
  }
});

module.exports = router;
