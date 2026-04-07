/**
 * Laundry Management Routes — مسارات إدارة المغسلة
 *
 * Endpoints:
 *   /api/laundry/orders        — Laundry order CRUD + status transitions
 *   /api/laundry/machines      — Machine management
 *   /api/laundry/schedules     — Weekly schedules
 *   /api/laundry/dashboard     — Laundry dashboard stats
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { LaundryOrder, LaundryMachine, LaundrySchedule } = require('../models/laundry.model');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

// ─── Authentication Middleware ────────────────────────────────────────
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════════════
// ORDERS — طلبات الغسيل
// ═══════════════════════════════════════════════════════════════════════════

router.get('/orders', async (req, res) => {
  try {
    const {
      status,
      beneficiary,
      center,
      priority,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (center) filter.center = center;
    if (priority) filter.priority = priority;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [orders, total] = await Promise.all([
      LaundryOrder.find(filter)
        .populate('beneficiary', 'name nationalId')
        .populate('machine', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      LaundryOrder.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Laundry] Orders list error:', error.message);
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await LaundryOrder.findById(req.params.id)
      .populate('beneficiary', 'name nationalId')
      .populate('machine', 'name type status')
      .lean();
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const order = await LaundryOrder.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const order = await LaundryOrder.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

// Status transition
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });

    const update = {
      status,
      $push: { statusHistory: { $each: [{ status, updatedBy: req.user?._id, notes }], $slice: -200 } },
    };

    // Timestamp tracking
    if (status === 'collected') update.collectedAt = new Date();
    if (status === 'ready') update.completedAt = new Date();
    if (status === 'delivered') update.deliveredAt = new Date();

    const order = await LaundryOrder.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    // Free the machine if order is delivered or cancelled
    if (['delivered', 'cancelled'].includes(status) && order.machine) {
      await LaundryMachine.findByIdAndUpdate(order.machine, {
        status: 'available',
        currentOrder: null,
        $inc: { cyclesCompleted: status === 'delivered' ? 1 : 0 },
      });
    }

    res.json({ success: true, data: order, message: `تم تحديث حالة الطلب إلى ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

// Assign machine to order
router.patch('/orders/:id/assign-machine', async (req, res) => {
  try {
    const { machineId } = req.body;
    const machine = await LaundryMachine.findById(machineId);
    if (!machine) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    if (machine.status !== 'available') {
      return res.status(400).json({ success: false, error: 'الجهاز غير متاح حالياً' });
    }

    const order = await LaundryOrder.findByIdAndUpdate(
      req.params.id,
      { machine: machineId, status: 'washing' },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    await LaundryMachine.findByIdAndUpdate(machineId, {
      status: 'in-use',
      currentOrder: order._id,
    });

    res.json({ success: true, data: order, message: 'تم تعيين الجهاز بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MACHINES — إدارة الأجهزة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/machines', async (req, res) => {
  try {
    const { type, status, center } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (center) filter.center = center;

    const machines = await LaundryMachine.find(filter)
      .populate('currentOrder', 'orderNumber status')
      .sort({ type: 1, name: 1 })
      .lean();

    res.json({ success: true, data: machines });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

router.post('/machines', async (req, res) => {
  try {
    const machine = await LaundryMachine.create(req.body);
    res.status(201).json({ success: true, data: machine });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.put('/machines/:id', async (req, res) => {
  try {
    const machine = await LaundryMachine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!machine) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    res.json({ success: true, data: machine });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.patch('/machines/:id/maintenance', async (req, res) => {
  try {
    const machine = await LaundryMachine.findByIdAndUpdate(
      req.params.id,
      { status: 'maintenance', lastMaintenance: new Date(), currentOrder: null, ...req.body },
      { new: true }
    );
    if (!machine) return res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    res.json({ success: true, data: machine, message: 'تم إرسال الجهاز للصيانة' });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULES — الجداول الأسبوعية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/schedules', async (req, res) => {
  try {
    const { dayOfWeek, center, type, isActive } = req.query;
    const filter = {};
    if (dayOfWeek !== undefined) filter.dayOfWeek = parseInt(dayOfWeek, 10);
    if (center) filter.center = center;
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const schedules = await LaundrySchedule.find(filter)
      .populate('assignedMachines', 'name type status')
      .sort({ dayOfWeek: 1, 'timeSlot.start': 1 })
      .lean();

    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

router.post('/schedules', async (req, res) => {
  try {
    const schedule = await LaundrySchedule.create(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await LaundrySchedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!schedule) return res.status(404).json({ success: false, error: 'الجدول غير موجود' });
    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, error: safeError(error) });
  }
});

router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await LaundrySchedule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!schedule) return res.status(404).json({ success: false, error: 'الجدول غير موجود' });
    res.json({ success: true, message: 'تم إلغاء تفعيل الجدول' });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم المغسلة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalOrders, pendingOrders, inProgressOrders, readyOrders, todayOrders, machines] =
      await Promise.all([
        LaundryOrder.countDocuments(),
        LaundryOrder.countDocuments({ status: 'pending' }),
        LaundryOrder.countDocuments({
          status: { $in: ['collected', 'sorting', 'washing', 'drying', 'ironing', 'folding'] },
        }),
        LaundryOrder.countDocuments({ status: 'ready' }),
        LaundryOrder.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
        LaundryMachine.find().limit(500).lean(),
      ]);

    const machineStats = {
      total: machines.length,
      available: machines.filter(m => m.status === 'available').length,
      inUse: machines.filter(m => m.status === 'in-use').length,
      maintenance: machines.filter(m => m.status === 'maintenance').length,
      outOfOrder: machines.filter(m => m.status === 'out-of-order').length,
    };

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          inProgress: inProgressOrders,
          ready: readyOrders,
          today: todayOrders,
        },
        machines: machineStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: safeError(error) });
  }
});

module.exports = router;
