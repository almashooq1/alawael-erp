/**
 * مسارات الجدول الدراسي
 * Timetable Routes
 */
const express = require('express');
const router = express.Router();
const { Timetable } = require('../models/Timetable');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const validateObjectId = require('../middleware/validateObjectId');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
// ── Get all timetables ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { academicYear, grade, type, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (grade) filter.grade = grade;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const total = await Timetable.countDocuments(filter);
    const timetables = await Timetable.find(filter)
      .populate('academicYear', 'name')
      .populate('classroom', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: timetables,
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
      .json({ success: false, message: 'خطأ في جلب الجداول', error: safeError(error) });
  }
});

// ── Get single timetable ─────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('academicYear', 'name semesters')
      .populate('classroom', 'name code building')
      .populate('slots.subject', 'name code color')
      .populate('slots.teacher', 'fullName')
      .populate('slots.classroom', 'name code')
      .populate('substitutions.substituteTeacher', 'fullName')
      .lean();
    if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    res.json({ success: true, data: timetable });
  } catch (error) {
    safeError(res, error, 'timetable');
  }
});

// ── Create timetable ─────────────────────────────────────────
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const timetable = new Timetable(req.body);
    if (req.user) timetable.createdBy = req.user._id || req.user.id;
    await timetable.save();
    res.status(201).json({ success: true, data: timetable, message: 'تم إنشاء الجدول بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء الجدول', error: safeError(error) });
  }
});

// ── Update timetable ─────────────────────────────────────────
router.put('/:id', validateObjectId('id'), authorize(['admin', 'manager']), async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    res.json({ success: true, data: timetable, message: 'تم تحديث الجدول بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث الجدول', error: safeError(error) });
  }
});

// ── Delete timetable ─────────────────────────────────────────
router.delete('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    res.json({ success: true, message: 'تم حذف الجدول بنجاح' });
  } catch (error) {
    safeError(res, error, 'timetable');
  }
});

// ── Add slot ─────────────────────────────────────────────────
router.post(
  '/:id/slots',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });

      // Check for conflict
      if (timetable.hasConflict(req.body)) {
        return res
          .status(400)
          .json({ success: false, message: 'يوجد تعارض في الجدول - الحصة مشغولة' });
      }

      timetable.slots.push(req.body);
      await timetable.save();
      res.status(201).json({ success: true, data: timetable, message: 'تم إضافة الحصة بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة الحصة', error: safeError(error) });
    }
  }
);

// ── Update slot ──────────────────────────────────────────────
router.put(
  '/:id/slots/:slotId',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
      const slot = timetable.slots.id(req.params.slotId);
      if (!slot) return res.status(404).json({ success: false, message: 'الحصة غير موجودة' });
      Object.assign(slot, stripUpdateMeta(req.body));
      await timetable.save();
      res.json({ success: true, data: timetable, message: 'تم تحديث الحصة بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تحديث الحصة', error: safeError(error) });
    }
  }
);

// ── Delete slot ──────────────────────────────────────────────
router.delete(
  '/:id/slots/:slotId',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
      timetable.slots.pull(req.params.slotId);
      await timetable.save();
      res.json({ success: true, data: timetable, message: 'تم حذف الحصة بنجاح' });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حذف الحصة', error: safeError(error) });
    }
  }
);

// ── Add substitution ─────────────────────────────────────────
router.post(
  '/:id/substitutions',
  validateObjectId('id'),
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const timetable = await Timetable.findById(req.params.id);
      if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
      timetable.substitutions.push(req.body);
      await timetable.save();
      res.status(201).json({ success: true, data: timetable, message: 'تم إضافة الاستبدال بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في إضافة الاستبدال', error: safeError(error) });
    }
  }
);

// ── Get teacher timetable ────────────────────────────────────
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { 'slots.teacher': req.params.teacherId };
    if (academicYear) filter.academicYear = academicYear;

    const timetables = await Timetable.find(filter)
      .populate('slots.subject', 'name code color')
      .populate('slots.classroom', 'name code')
      .populate('academicYear', 'name')
      .lean();

    // Extract only the teacher's slots
    const teacherSlots = [];
    timetables.forEach(tt => {
      tt.slots.forEach(slot => {
        if (slot.teacher?.toString() === req.params.teacherId) {
          teacherSlots.push({
            ...slot,
            timetableName: tt.name,
            grade: tt.grade,
            section: tt.section,
          });
        }
      });
    });

    res.json({ success: true, data: teacherSlots });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب جدول المعلم', error: safeError(error) });
  }
});

// ── Publish timetable ────────────────────────────────────────
router.patch('/:id/publish', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { status: 'published', effectiveFrom: req.body.effectiveFrom || new Date() },
      { new: true }
    );
    if (!timetable) return res.status(404).json({ success: false, message: 'الجدول غير موجود' });
    res.json({ success: true, data: timetable, message: 'تم نشر الجدول بنجاح' });
  } catch (error) {
    safeError(res, error, 'timetable');
  }
});

module.exports = router;
