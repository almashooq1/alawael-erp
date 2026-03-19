/**
 * Waitlist Management Routes — مسارات إدارة قائمة الانتظار
 *
 * Dedicated CRUD for the Waitlist model with position management,
 * priority queuing, and auto-expiry support.
 */

const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// CRUD — عمليات قائمة الانتظار
// ═══════════════════════════════════════════════════════════════════════════

router.get('/', async (req, res) => {
  try {
    const { status, department, priority, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { department: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sortOrder = { priority: -1, createdAt: 1 }; // HIGH first, then FIFO

    const [entries, total] = await Promise.all([
      Waitlist.find(filter)
        .populate('beneficiary', 'name fileNumber')
        .populate('preferredTherapist', 'name')
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Waitlist.countDocuments(filter),
    ]);

    // Add position numbers
    const data = entries.map((entry, idx) => ({
      ...entry,
      position: skip + idx + 1,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Waitlist] List error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [byStatus, byDepartment, byPriority] = await Promise.all([
      Waitlist.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Waitlist.aggregate([
        { $match: { status: 'WAITING' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Waitlist.aggregate([
        { $match: { status: 'WAITING' } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        byDepartment: byDepartment.map(d => ({ department: d._id, count: d.count })),
        byPriority: Object.fromEntries(byPriority.map(p => [p._id, p.count])),
        totalWaiting: byStatus.find(s => s._id === 'WAITING')?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findById(req.params.id)
      .populate('beneficiary', 'name fileNumber phone')
      .populate('preferredTherapist', 'name')
      .lean();
    if (!entry)
      return res.status(404).json({ success: false, error: 'السجل غير موجود في قائمة الانتظار' });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Check for duplicate — same beneficiary + department + WAITING
    const existing = await Waitlist.findOne({
      beneficiary: req.body.beneficiary,
      department: req.body.department,
      status: 'WAITING',
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: 'المستفيد مسجل بالفعل في قائمة الانتظار لهذا القسم' });
    }

    const entry = await Waitlist.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUS TRANSITIONS — تغيير الحالة
// ═══════════════════════════════════════════════════════════════════════════

router.patch('/:id/offer', async (req, res) => {
  try {
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    if (entry.status !== 'WAITING') {
      return res
        .status(400)
        .json({ success: false, error: 'لا يمكن تقديم عرض إلا للسجلات في حالة الانتظار' });
    }

    entry.status = 'OFFERED';
    // Set expiry to 48 hours from now if not already set
    if (!entry.expertiryDate) {
      entry.expertiryDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }
    await entry.save();

    res.json({ success: true, data: entry, message: 'تم تقديم العرض بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/book', async (req, res) => {
  try {
    const entry = await Waitlist.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    if (entry.status !== 'OFFERED') {
      return res.status(400).json({ success: false, error: 'لا يمكن الحجز إلا للعروض المقدمة' });
    }
    entry.status = 'BOOKED';
    await entry.save();
    res.json({ success: true, data: entry, message: 'تم الحجز بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:id/expire', async (req, res) => {
  try {
    const entry = await Waitlist.findByIdAndUpdate(
      req.params.id,
      { status: 'EXPIRED' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, data: entry, message: 'تم إنهاء صلاحية السجل' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY & POSITION — الأولوية والترتيب
// ═══════════════════════════════════════════════════════════════════════════

router.patch('/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    if (!['HIGH', 'NORMAL', 'LOW'].includes(priority)) {
      return res.status(400).json({ success: false, error: 'أولوية غير صحيحة' });
    }
    const entry = await Waitlist.findByIdAndUpdate(req.params.id, { priority }, { new: true });
    if (!entry) return res.status(404).json({ success: false, error: 'السجل غير موجود' });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auto-expire overdue entries
router.post('/auto-expire', async (req, res) => {
  try {
    const result = await Waitlist.updateMany(
      {
        status: 'OFFERED',
        expertiryDate: { $lte: new Date() },
      },
      { status: 'EXPIRED' }
    );
    res.json({
      success: true,
      message: `تم إنهاء صلاحية ${result.modifiedCount} سجل(ات)`,
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
