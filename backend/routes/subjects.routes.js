/**
 * مسارات المواد الدراسية
 * Subject Routes
 */
const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { authenticate, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);

// ── Get all subjects ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { department, type, isActive, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: search };

    const total = await Subject.countDocuments(filter);
    const subjects = await Subject.find(filter)
      .populate('prerequisites', 'name code')
      .sort({ department: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: subjects,
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
      .json({ success: false, message: 'خطأ في جلب المواد الدراسية', error: safeError(error) });
  }
});

// ── Get subjects by department ───────────────────────────────
router.get('/department/:department', async (req, res) => {
  try {
    const subjects = await Subject.find({ department: req.params.department, isActive: true })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: subjects });
  } catch (error) {
    safeError(res, error, 'subjects');
  }
});

// ── Get single subject ───────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('prerequisites', 'name code department')
      .lean();
    if (!subject) return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    res.json({ success: true, data: subject });
  } catch (error) {
    safeError(res, error, 'subjects');
  }
});

// ── Create subject ───────────────────────────────────────────
router.post('/', authorize(['admin']), async (req, res) => {
  try {
    const subject = new Subject(req.body);
    if (req.user) subject.createdBy = req.user._id || req.user.id;
    await subject.save();
    res.status(201).json({ success: true, data: subject, message: 'تم إنشاء المادة بنجاح' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'رمز المادة مستخدم بالفعل' });
    }
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء المادة', error: safeError(error) });
  }
});

// ── Update subject ───────────────────────────────────────────
router.put('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!subject) return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    res.json({ success: true, data: subject, message: 'تم تحديث المادة بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث المادة', error: safeError(error) });
  }
});

// ── Delete subject ───────────────────────────────────────────
router.delete('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    res.json({ success: true, message: 'تم حذف المادة بنجاح' });
  } catch (error) {
    safeError(res, error, 'subjects');
  }
});

// ── Toggle active status ─────────────────────────────────────
router.patch(
  '/:id/toggle-active',
  validateObjectId('id'),
  authorize(['admin']),
  async (req, res) => {
    try {
      const subject = await Subject.findById(req.params.id);
      if (!subject) return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
      subject.isActive = !subject.isActive;
      await subject.save();
      res.json({
        success: true,
        data: subject,
        message: subject.isActive ? 'تم تفعيل المادة' : 'تم تعطيل المادة',
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تغيير حالة المادة', error: safeError(error) });
    }
  }
);

// ── Departments list ─────────────────────────────────────────
router.get('/meta/departments', async (_req, res) => {
  try {
    const departments = await Subject.distinct('department');
    res.json({ success: true, data: departments });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الأقسام', error: safeError(error) });
  }
});

module.exports = router;
