/**
 * مسارات المعلمين
 * Teacher Routes
 */
const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const { authenticate, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);

// ── Get all teachers ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { department, status, role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (role) filter.role = role;
    if (search) filter.$text = { $search: search };

    const total = await Teacher.countDocuments(filter);
    const teachers = await Teacher.find(filter)
      .populate('subjects', 'name code')
      .populate('user', 'name email')
      .sort({ fullName: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: teachers,
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
      .json({ success: false, message: 'خطأ في جلب بيانات المعلمين', error: safeError(error) });
  }
});

// ── Get teacher by ID ────────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('subjects', 'name code department')
      .populate('user', 'name email phone')
      .lean();
    if (!teacher) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب بيانات المعلم', error: safeError(error) });
  }
});

// ── Create teacher ───────────────────────────────────────────
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json({ success: true, data: teacher, message: 'تم إضافة المعلم بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة المعلم', error: safeError(error) });
  }
});

// ── Update teacher ───────────────────────────────────────────
router.put('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('subjects', 'name code');
    if (!teacher) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    res.json({ success: true, data: teacher, message: 'تم تحديث بيانات المعلم بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث البيانات', error: safeError(error) });
  }
});

// ── Delete teacher ───────────────────────────────────────────
router.delete('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    res.json({ success: true, message: 'تم حذف المعلم بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف المعلم', error: safeError(error) });
  }
});

// ── Get teacher workload ─────────────────────────────────────
router.get('/:id/workload', validateObjectId('id'), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .select('fullName workload subjects')
      .populate('subjects', 'name code weeklyPeriods')
      .lean();
    if (!teacher) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    res.json({ success: true, data: teacher });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب عبء العمل', error: safeError(error) });
  }
});

// ── Get available teachers for slot ──────────────────────────
router.get('/available/slot', async (req, res) => {
  try {
    const { day, periodNumber, subjectId, department } = req.query;
    const filter = { status: 'active' };
    if (department) filter.department = department;
    if (subjectId) filter.subjects = subjectId;

    const teachers = await Teacher.find(filter)
      .select('fullName department workload subjects specialEdSkills')
      .populate('subjects', 'name code')
      .lean();

    // Filter by availability
    const available = teachers.filter(t => {
      if (t.workload?.offDays?.includes(day)) return false;
      if (t.workload?.currentPeriodsPerWeek >= t.workload?.maxPeriodsPerWeek) return false;
      return true;
    });

    res.json({ success: true, data: available });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المعلمين المتاحين', error: safeError(error) });
  }
});

// ── Add performance rating ───────────────────────────────────
router.post('/:id/ratings', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ success: false, message: 'المعلم غير موجود' });
    teacher.performanceRatings.push({
      ...req.body,
      evaluatedBy: req.user?._id || req.user?.id,
    });
    await teacher.save();
    res.json({ success: true, data: teacher, message: 'تم إضافة التقييم بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إضافة التقييم', error: safeError(error) });
  }
});

// ── Get teachers by specialty ────────────────────────────────
router.get('/specialty/:disability', async (req, res) => {
  try {
    const teachers = await Teacher.find({
      'specialEdSkills.disabilityExpertise': req.params.disability,
      status: 'active',
    })
      .populate('subjects', 'name code')
      .lean();
    res.json({ success: true, data: teachers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المعلمين المتخصصين', error: safeError(error) });
  }
});

// ── Statistics ───────────────────────────────────────────────
router.get('/meta/stats', async (_req, res) => {
  try {
    const [total, active, byDepartment, byRole] = await Promise.all([
      Teacher.countDocuments(),
      Teacher.countDocuments({ status: 'active' }),
      Teacher.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]),
      Teacher.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);
    res.json({ success: true, data: { total, active, byDepartment, byRole } });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
  }
});

module.exports = router;
