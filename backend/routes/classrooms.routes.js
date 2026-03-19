/**
 * مسارات الفصول الدراسية
 * Classroom Routes
 */
const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const { authenticate, authorize } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const safeError = require('../utils/safeError');

// ── Auth ─────────────────────────────────────────────────────
router.use(authenticate);

// ── Get all classrooms ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, status, building, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (building) filter.building = building;
    if (search) filter.$text = { $search: search };

    const total = await Classroom.countDocuments(filter);
    const classrooms = await Classroom.find(filter)
      .populate('assignedTeacher', 'fullName')
      .populate('academicYear', 'name')
      .sort({ building: 1, floor: 1, roomNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: classrooms,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الفصول', error: safeError(error) });
  }
});

// ── Get available classrooms ─────────────────────────────────
router.get('/available', async (req, res) => {
  try {
    const { type, minCapacity, wheelchairAccessible } = req.query;
    const filter = { status: 'available' };
    if (type) filter.type = type;
    if (minCapacity) filter.capacity = { $gte: Number(minCapacity) };
    if (wheelchairAccessible === 'true') filter['accessibility.wheelchairAccessible'] = true;

    const classrooms = await Classroom.find(filter).sort({ capacity: 1 }).lean();
    res.json({ success: true, data: classrooms });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الفصول المتاحة', error: safeError(error) });
  }
});

// ── Get single classroom ─────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('assignedTeacher', 'fullName department')
      .populate('students', 'name')
      .populate('academicYear', 'name')
      .lean();
    if (!classroom) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    res.json({ success: true, data: classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الفصل', error: safeError(error) });
  }
});

// ── Create classroom ─────────────────────────────────────────
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const classroom = new Classroom(req.body);
    await classroom.save();
    res.status(201).json({ success: true, data: classroom, message: 'تم إنشاء الفصل بنجاح' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'رمز الفصل مستخدم بالفعل' });
    }
    res
      .status(400)
      .json({ success: false, message: 'خطأ في إنشاء الفصل', error: safeError(error) });
  }
});

// ── Update classroom ─────────────────────────────────────────
router.put('/:id', validateObjectId('id'), authorize(['admin', 'manager']), async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!classroom) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    res.json({ success: true, data: classroom, message: 'تم تحديث الفصل بنجاح' });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: 'خطأ في تحديث الفصل', error: safeError(error) });
  }
});

// ── Delete classroom ─────────────────────────────────────────
router.delete('/:id', validateObjectId('id'), authorize(['admin']), async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!classroom) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
    res.json({ success: true, message: 'تم حذف الفصل بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في حذف الفصل', error: safeError(error) });
  }
});

// ── Assign students ──────────────────────────────────────────
router.post(
  '/:id/students',
  validateObjectId('id'),
  authorize(['admin', 'manager', 'teacher']),
  async (req, res) => {
    try {
      const classroom = await Classroom.findById(req.params.id);
      if (!classroom) return res.status(404).json({ success: false, message: 'الفصل غير موجود' });
      const { studentIds } = req.body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return res.status(400).json({ success: false, message: 'يرجى تقديم قائمة الطلاب' });
      }
      classroom.students = [...new Set([...classroom.students.map(String), ...studentIds])];
      classroom.currentOccupancy = classroom.students.length;
      await classroom.save();
      res.json({ success: true, data: classroom, message: 'تم تعيين الطلاب بنجاح' });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: 'خطأ في تعيين الطلاب', error: safeError(error) });
    }
  }
);

// ── Statistics ───────────────────────────────────────────────
router.get('/meta/stats', async (_req, res) => {
  try {
    const [total, available, byType, byBuilding, totalCapacity] = await Promise.all([
      Classroom.countDocuments(),
      Classroom.countDocuments({ status: 'available' }),
      Classroom.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Classroom.aggregate([{ $group: { _id: '$building', count: { $sum: 1 } } }]),
      Classroom.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$capacity' },
            occupied: { $sum: '$currentOccupancy' },
          },
        },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        total,
        available,
        byType,
        byBuilding,
        totalCapacity: totalCapacity[0]?.total || 0,
        totalOccupancy: totalCapacity[0]?.occupied || 0,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
  }
});

module.exports = router;
