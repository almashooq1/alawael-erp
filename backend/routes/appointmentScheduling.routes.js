/**
 * Appointment Scheduling Routes — مسارات جدولة المواعيد المتقدمة
 *
 * Endpoints:
 *   /api/appointment-scheduling/templates    — Schedule templates CRUD
 *   /api/appointment-scheduling/slots        — Time slot management
 *   /api/appointment-scheduling/reminders    — Reminder management
 *   /api/appointment-scheduling/waitlist     — Waitlist management
 *   /api/appointment-scheduling/availability — Availability check
 *   /api/appointment-scheduling/dashboard    — Scheduling dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  ScheduleTemplate,
  TimeSlot,
  AppointmentReminder,
  WaitlistEntry,
} = require('../models/appointmentScheduling.model');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
/* ── Field whitelists ───────────────────────────────────────────── */
const TEMPLATE_FIELDS = [
  'name',
  'provider',
  'department',
  'room',
  'weeklySlots',
  'exceptions',
  'isActive',
  'slotDuration',
  'defaultMaxPatients',
];
const WAITLIST_FIELDS = [
  'beneficiary',
  'requestedProvider',
  'requestedDepartment',
  'preferredDates',
  'urgency',
  'notes',
  'contactPhone',
];
const REMINDER_FIELDS = [
  'appointment',
  'channel',
  'scheduledAt',
  'message',
  'templateName',
  'recipient',
];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE TEMPLATES — قوالب الجدول
// ═══════════════════════════════════════════════════════════════════════════

router.get('/templates', async (req, res) => {
  try {
    const { provider, department, active, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (provider) filter.provider = provider;
    if (department) filter.department = department;
    if (active !== undefined) filter.isActive = active === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [templates, total] = await Promise.all([
      ScheduleTemplate.find(filter)
        .populate('provider', 'name')
        .populate('department', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      ScheduleTemplate.countDocuments(filter),
    ]);
    res.json({ success: true, data: templates, total });
  } catch (error) {
    safeError(res, error, '[Scheduling] List templates error');
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await ScheduleTemplate.findById(req.params.id)
      .populate('provider', 'name')
      .populate('department', 'name');
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, '[Scheduling] Get template error');
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = new ScheduleTemplate({
      ...pick(req.body, TEMPLATE_FIELDS),
      createdBy: req.user.id,
    });
    await template.save();
    logger.info(`[Scheduling] Template created: ${template.name.ar}`);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, '[Scheduling] Create template error');
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await ScheduleTemplate.findByIdAndUpdate(
      req.params.id,
      pick(req.body, TEMPLATE_FIELDS),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    res.json({ success: true, data: template });
  } catch (error) {
    safeError(res, error, '[Scheduling] Update template error');
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await ScheduleTemplate.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف القالب بنجاح' });
  } catch (error) {
    safeError(res, error, '[Scheduling] Delete template error');
  }
});

// Generate slots from template for a date range
router.post('/templates/:id/generate-slots', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const template = await ScheduleTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'القالب غير موجود' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const slots = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const daySlots = template.weeklySlots.filter(s => s.dayOfWeek === dayOfWeek && s.isActive);
      const isException = template.exceptions.some(
        e => new Date(e.date).toDateString() === d.toDateString()
      );

      if (isException) continue;

      for (const ws of daySlots) {
        const slotStart =
          parseInt(ws.startTime.split(':')[0]) * 60 + parseInt(ws.startTime.split(':')[1]);
        const slotEnd =
          parseInt(ws.endTime.split(':')[0]) * 60 + parseInt(ws.endTime.split(':')[1]);

        for (let t = slotStart; t < slotEnd; t += ws.slotDuration) {
          const h1 = String(Math.floor(t / 60)).padStart(2, '0');
          const m1 = String(t % 60).padStart(2, '0');
          const t2 = t + ws.slotDuration;
          const h2 = String(Math.floor(t2 / 60)).padStart(2, '0');
          const m2 = String(t2 % 60).padStart(2, '0');

          slots.push({
            date: new Date(d),
            startTime: `${h1}:${m1}`,
            endTime: `${h2}:${m2}`,
            provider: template.provider,
            department: template.department,
            room: template.room,
            template: template._id,
            maxPatients: ws.maxPatients,
            status: 'available',
          });
        }
      }
    }

    const created = await TimeSlot.insertMany(slots);
    logger.info(`[Scheduling] Generated ${created.length} slots from template ${template._id}`);
    res.status(201).json({
      success: true,
      data: { generated: created.length },
      message: `تم إنشاء ${created.length} فترة`,
    });
  } catch (error) {
    safeError(res, error, '[Scheduling] Generate slots error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TIME SLOTS — الفترات الزمنية
// ═══════════════════════════════════════════════════════════════════════════

router.get('/slots', async (req, res) => {
  try {
    const {
      provider,
      department,
      date,
      dateFrom,
      dateTo,
      status,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (provider) filter.provider = provider;
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [slots, total] = await Promise.all([
      TimeSlot.find(filter)
        .populate('provider', 'name')
        .populate('beneficiary', 'name')
        .sort({ date: 1, startTime: 1 })
        .limit(parseInt(limit))
        .skip(skip),
      TimeSlot.countDocuments(filter),
    ]);
    res.json({ success: true, data: slots, total });
  } catch (error) {
    safeError(res, error, '[Scheduling] List slots error');
  }
});

router.patch('/slots/:id/book', async (req, res) => {
  try {
    const slot = await TimeSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    if (slot.status === 'booked' && slot.currentPatients >= slot.maxPatients) {
      return res.status(409).json({ success: false, message: 'الفترة محجوزة بالكامل' });
    }

    slot.status = 'booked';
    slot.beneficiary = req.body.beneficiary;
    slot.appointment = req.body.appointment;
    if (req.body.appointmentType) slot.appointmentType = req.body.appointmentType;
    slot.currentPatients += 1;
    if (slot.currentPatients > slot.maxPatients) slot.isOverbooked = true;
    await slot.save();

    res.json({ success: true, data: slot, message: 'تم حجز الفترة بنجاح' });
  } catch (error) {
    safeError(res, error, '[Scheduling] Book slot error');
  }
});

router.patch('/slots/:id/cancel', async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      {
        status: 'available',
        beneficiary: null,
        appointment: null,
        currentPatients: 0,
        isOverbooked: false,
      },
      { new: true }
    );
    if (!slot) return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    res.json({ success: true, data: slot, message: 'تم إلغاء الحجز' });
  } catch (error) {
    safeError(res, error, '[Scheduling] Cancel slot error');
  }
});

router.patch('/slots/:id/block', async (req, res) => {
  try {
    const slot = await TimeSlot.findByIdAndUpdate(
      req.params.id,
      { status: 'blocked', notes: req.body.reason },
      { new: true }
    );
    if (!slot) return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    res.json({ success: true, data: slot });
  } catch (error) {
    safeError(res, error, '[Scheduling] Block slot error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AVAILABILITY — التوفر
// ═══════════════════════════════════════════════════════════════════════════

router.get('/availability', async (req, res) => {
  try {
    const { provider, department, dateFrom, dateTo } = req.query;
    const filter = { status: 'available', isDeleted: { $ne: true } };
    if (provider) filter.provider = provider;
    if (department) filter.department = department;
    if (dateFrom) filter.date = { ...filter.date, $gte: new Date(dateFrom) };
    if (dateTo) filter.date = { ...filter.date, $lte: new Date(dateTo) };

    const slots = await TimeSlot.find(filter)
      .populate('provider', 'name')
      .sort({ date: 1, startTime: 1 })
      .limit(100);

    // Group by date
    const grouped = {};
    for (const slot of slots) {
      const key = slot.date.toISOString().split('T')[0];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(slot);
    }

    res.json({ success: true, data: { slots, grouped, totalAvailable: slots.length } });
  } catch (error) {
    safeError(res, error, '[Scheduling] Availability check error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REMINDERS — التذكيرات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/reminders', async (req, res) => {
  try {
    const { appointment, status, channel, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (appointment) filter.appointment = appointment;
    if (status) filter.status = status;
    if (channel) filter.channel = channel;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reminders, total] = await Promise.all([
      AppointmentReminder.find(filter)
        .populate('appointment')
        .sort({ scheduledAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      AppointmentReminder.countDocuments(filter),
    ]);
    res.json({ success: true, data: reminders, total });
  } catch (error) {
    safeError(res, error, '[Scheduling] List reminders error');
  }
});

router.post('/reminders', async (req, res) => {
  try {
    const reminder = new AppointmentReminder(pick(req.body, REMINDER_FIELDS));
    await reminder.save();
    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    safeError(res, error, '[Scheduling] Create reminder error');
  }
});

router.get('/reminders/pending', async (req, res) => {
  try {
    const now = new Date();
    const reminders = await AppointmentReminder.find({
      status: 'pending',
      scheduledAt: { $lte: now },
      attempts: { $lt: 3 },
    })
      .populate('appointment')
      .sort({ scheduledAt: 1 })
      .limit(50);
    res.json({ success: true, data: reminders, count: reminders.length });
  } catch (error) {
    safeError(res, error, '[Scheduling] Pending reminders error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WAITLIST — قائمة الانتظار
// ═══════════════════════════════════════════════════════════════════════════

router.get('/waitlist', async (req, res) => {
  try {
    const { provider, department, status, urgency, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (provider) filter.requestedProvider = provider;
    if (department) filter.requestedDepartment = department;
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [entries, total] = await Promise.all([
      WaitlistEntry.find(filter)
        .populate('beneficiary', 'name')
        .populate('requestedProvider', 'name')
        .sort({ urgency: -1, createdAt: 1 })
        .limit(parseInt(limit))
        .skip(skip),
      WaitlistEntry.countDocuments(filter),
    ]);
    res.json({ success: true, data: entries, total });
  } catch (error) {
    safeError(res, error, '[Scheduling] List waitlist error');
  }
});

router.post('/waitlist', async (req, res) => {
  try {
    const count = await WaitlistEntry.countDocuments({
      status: 'waiting',
      isDeleted: { $ne: true },
    });
    const entry = new WaitlistEntry({
      ...pick(req.body, WAITLIST_FIELDS),
      position: count + 1,
      createdBy: req.user.id,
    });
    await entry.save();
    logger.info(`[Scheduling] Waitlist entry added, position: ${entry.position}`);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    safeError(res, error, '[Scheduling] Add waitlist error');
  }
});

router.patch('/waitlist/:id/offer', async (req, res) => {
  try {
    const entry = await WaitlistEntry.findByIdAndUpdate(
      req.params.id,
      {
        status: 'offered',
        offeredSlot: req.body.slotId,
        offeredAt: new Date(),
        offerExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'سجل الانتظار غير موجود' });
    res.json({ success: true, data: entry });
  } catch (error) {
    safeError(res, error, '[Scheduling] Offer waitlist error');
  }
});

router.patch('/waitlist/:id/cancel', async (req, res) => {
  try {
    const entry = await WaitlistEntry.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'سجل الانتظار غير موجود' });
    res.json({ success: true, data: entry });
  } catch (error) {
    safeError(res, error, '[Scheduling] Cancel waitlist error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم الجدولة
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      todayTotal,
      todayBooked,
      todayAvailable,
      weekBooked,
      weekAvailable,
      waitlistCount,
      urgentWaitlist,
      pendingReminders,
    ] = await Promise.all([
      TimeSlot.countDocuments({ date: { $gte: today, $lt: tomorrow }, isDeleted: { $ne: true } }),
      TimeSlot.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: 'booked',
        isDeleted: { $ne: true },
      }),
      TimeSlot.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: 'available',
        isDeleted: { $ne: true },
      }),
      TimeSlot.countDocuments({
        date: { $gte: today, $lt: weekEnd },
        status: 'booked',
        isDeleted: { $ne: true },
      }),
      TimeSlot.countDocuments({
        date: { $gte: today, $lt: weekEnd },
        status: 'available',
        isDeleted: { $ne: true },
      }),
      WaitlistEntry.countDocuments({ status: 'waiting', isDeleted: { $ne: true } }),
      WaitlistEntry.countDocuments({
        status: 'waiting',
        urgency: 'urgent',
        isDeleted: { $ne: true },
      }),
      AppointmentReminder.countDocuments({ status: 'pending', scheduledAt: { $lte: new Date() } }),
    ]);

    res.json({
      success: true,
      data: {
        today: {
          total: todayTotal,
          booked: todayBooked,
          available: todayAvailable,
          utilization: todayTotal > 0 ? Math.round((todayBooked / todayTotal) * 100) : 0,
        },
        week: { booked: weekBooked, available: weekAvailable },
        waitlist: { total: waitlistCount, urgent: urgentWaitlist },
        pendingReminders,
      },
    });
  } catch (error) {
    safeError(res, error, '[Scheduling] Dashboard error');
  }
});

module.exports = router;
