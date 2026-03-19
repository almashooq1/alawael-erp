/**
 * Student Events & Activities Routes
 * مسارات الفعاليات والأنشطة للطلاب
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Event Schema ────────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleEn: String,
    description: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'فعالية',
        'نشاط رياضي',
        'رحلة',
        'مسابقة',
        'ورشة عمل',
        'حفل',
        'يوم مفتوح',
        'معرض',
        'ندوة',
        'تطوعي',
        'ترفيهي',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['أكاديمي', 'رياضي', 'ثقافي', 'اجتماعي', 'تأهيلي', 'ترفيهي', 'ديني', 'صحي'],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: String,
    endTime: String,
    location: {
      name: String,
      address: String,
      isVirtual: { type: Boolean, default: false },
      virtualLink: String,
      coordinates: { lat: Number, lng: Number },
    },
    organizer: {
      name: String,
      department: String,
      contactPhone: String,
      contactEmail: String,
    },
    targetAudience: {
      type: String,
      enum: ['جميع الطلاب', 'طلاب محددين', 'أولياء أمور', 'موظفين', 'الجميع'],
      default: 'جميع الطلاب',
    },
    targetGrades: [String],
    targetDepartments: [String],
    maxParticipants: Number,
    currentParticipants: { type: Number, default: 0 },
    registrationRequired: { type: Boolean, default: false },
    registrationDeadline: Date,
    cost: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    image: String,
    attachments: [{ name: String, url: String, type: String }],
    status: {
      type: String,
      enum: ['مسودة', 'منشور', 'قيد التسجيل', 'ممتلئ', 'جاري', 'منتهي', 'ملغي'],
      default: 'منشور',
    },
    tags: [String],
    isHighlighted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

eventSchema.index({ startDate: 1, status: 1 });

let Event;
try {
  Event = mongoose.model('StudentEvent');
} catch {
  Event = mongoose.model('StudentEvent', eventSchema);
}

// ─── Event Registration Schema ───────────────────────────────────────────────
const eventRegistrationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentEvent', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['مسجل', 'مؤكد', 'حضر', 'لم يحضر', 'ملغي'],
      default: 'مسجل',
    },
    registeredAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    attendedAt: Date,
    cancelledAt: Date,
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },
    notes: String,
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

let EventRegistration;
try {
  EventRegistration = mongoose.model('StudentEventRegistration');
} catch {
  EventRegistration = mongoose.model('StudentEventRegistration', eventRegistrationSchema);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /upcoming — الفعاليات القادمة
router.get('/:studentId/upcoming', async (req, res) => {
  try {
    const { type, category, page = 1, limit = 10 } = req.query;
    const filter = {
      status: { $in: ['منشور', 'قيد التسجيل', 'جاري'] },
      endDate: { $gte: new Date() },
    };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [events, total] = await Promise.all([
      Event.find(filter).sort({ startDate: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Event.countDocuments(filter),
    ]);

    // إضافة حالة تسجيل الطالب
    const registrations = await EventRegistration.find({
      studentId: req.params.studentId,
      eventId: { $in: events.map(e => e._id) },
    }).lean();
    const regMap = new Map(registrations.map(r => [r.eventId.toString(), r]));

    const enriched = events.map(ev => ({
      ...ev,
      isRegistered: regMap.has(ev._id.toString()),
      registrationStatus: regMap.get(ev._id.toString())?.status,
      spotsLeft: ev.maxParticipants ? ev.maxParticipants - ev.currentParticipants : null,
      isFull: ev.maxParticipants && ev.currentParticipants >= ev.maxParticipants,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Student events upcoming error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الفعاليات القادمة' });
  }
});

// GET /my-events — فعالياتي المسجل فيها
router.get('/:studentId/my-events', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const regFilter = { studentId: req.params.studentId };
    if (status) regFilter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [registrations, total] = await Promise.all([
      EventRegistration.find(regFilter)
        .populate('eventId')
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EventRegistration.countDocuments(regFilter),
    ]);

    res.json({
      success: true,
      data: registrations.map(r => ({
        ...r.eventId,
        registration: { status: r.status, registeredAt: r.registeredAt, feedback: r.feedback },
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Student my-events error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب فعالياتي' });
  }
});

// GET /:eventId — تفاصيل فعالية
router.get('/:studentId/event/:eventId', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).lean();
    if (!event) return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });

    const registration = await EventRegistration.findOne({
      eventId: req.params.eventId,
      studentId: req.params.studentId,
    }).lean();

    res.json({
      success: true,
      data: {
        ...event,
        isRegistered: !!registration,
        registrationStatus: registration?.status,
        feedback: registration?.feedback,
        spotsLeft: event.maxParticipants ? event.maxParticipants - event.currentParticipants : null,
      },
    });
  } catch (err) {
    logger.error('Student event detail error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تفاصيل الفعالية' });
  }
});

// POST /register — التسجيل في فعالية
router.post('/:studentId/register', async (req, res) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'الفعالية غير موجودة' });
    if (event.status === 'ملغي')
      return res.status(400).json({ success: false, message: 'الفعالية ملغية' });
    if (event.status === 'منتهي')
      return res.status(400).json({ success: false, message: 'الفعالية انتهت' });
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ success: false, message: 'الفعالية ممتلئة' });
    }
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      return res.status(400).json({ success: false, message: 'انتهت فترة التسجيل' });
    }

    // التحقق من عدم التسجيل المسبق
    const existing = await EventRegistration.findOne({ eventId, studentId: req.params.studentId });
    if (existing && existing.status !== 'ملغي') {
      return res.status(400).json({ success: false, message: 'أنت مسجل بالفعل في هذه الفعالية' });
    }

    const registration = existing
      ? await EventRegistration.findByIdAndUpdate(
          existing._id,
          { status: 'مسجل', registeredAt: new Date() },
          { new: true }
        )
      : await new EventRegistration({ eventId, studentId: req.params.studentId }).save();

    event.currentParticipants += 1;
    if (event.maxParticipants && event.currentParticipants >= event.maxParticipants) {
      event.status = 'ممتلئ';
    }
    await event.save();

    res.status(201).json({
      success: true,
      data: registration,
      message: `تم التسجيل في "${event.title}" بنجاح`,
    });
  } catch (err) {
    logger.error('Event registration error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التسجيل بالفعالية' });
  }
});

// POST /cancel — إلغاء التسجيل
router.post('/:studentId/cancel', async (req, res) => {
  try {
    const { eventId } = req.body;
    const registration = await EventRegistration.findOneAndUpdate(
      { eventId, studentId: req.params.studentId, status: { $in: ['مسجل', 'مؤكد'] } },
      { $set: { status: 'ملغي', cancelledAt: new Date() } },
      { new: true }
    );
    if (!registration)
      return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });

    await Event.findByIdAndUpdate(eventId, { $inc: { currentParticipants: -1 } });

    res.json({ success: true, data: registration, message: 'تم إلغاء التسجيل بنجاح' });
  } catch (err) {
    logger.error('Event cancel error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إلغاء التسجيل' });
  }
});

// POST /feedback — تقييم فعالية
router.post('/:studentId/feedback', async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const registration = await EventRegistration.findOneAndUpdate(
      { eventId, studentId: req.params.studentId },
      { $set: { feedback: { rating, comment, submittedAt: new Date() } } },
      { new: true }
    );
    if (!registration)
      return res.status(404).json({ success: false, message: 'لم تسجل في هذه الفعالية' });
    res.json({ success: true, data: registration, message: 'شكراً لتقييمك!' });
  } catch (err) {
    logger.error('Event feedback error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تقديم التقييم' });
  }
});

// GET /calendar — تقويم الفعاليات
router.get('/:studentId/calendar', async (req, res) => {
  try {
    const { month, year } = req.query;
    const startOfMonth = new Date(
      parseInt(year) || new Date().getFullYear(),
      parseInt(month) - 1 || new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const events = await Event.find({
      status: { $nin: ['مسودة', 'ملغي'] },
      $or: [
        { startDate: { $gte: startOfMonth, $lt: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lt: endOfMonth } },
      ],
    })
      .sort({ startDate: 1 })
      .lean();

    const myRegistrations = await EventRegistration.find({
      studentId: req.params.studentId,
      eventId: { $in: events.map(e => e._id) },
    }).lean();
    const regMap = new Map(myRegistrations.map(r => [r.eventId.toString(), r.status]));

    const calendarEvents = events.map(ev => ({
      id: ev._id,
      title: ev.title,
      start: ev.startDate,
      end: ev.endDate,
      type: ev.type,
      category: ev.category,
      isRegistered: regMap.has(ev._id.toString()),
      status: ev.status,
      location: ev.location?.name,
      isVirtual: ev.location?.isVirtual,
    }));

    res.json({ success: true, data: calendarEvents });
  } catch (err) {
    logger.error('Events calendar error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقويم الفعاليات' });
  }
});

// GET /stats — إحصائيات المشاركة
router.get('/:studentId/stats', async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);
    const [byType, byStatus, totalAttended] = await Promise.all([
      EventRegistration.aggregate([
        { $match: { studentId } },
        {
          $lookup: {
            from: 'studentevents',
            localField: 'eventId',
            foreignField: '_id',
            as: 'event',
          },
        },
        { $unwind: '$event' },
        { $group: { _id: '$event.type', count: { $sum: 1 } } },
      ]),
      EventRegistration.aggregate([
        { $match: { studentId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      EventRegistration.countDocuments({ studentId, status: 'حضر' }),
    ]);

    res.json({
      success: true,
      data: {
        byType: byType.reduce((a, t) => {
          a[t._id] = t.count;
          return a;
        }, {}),
        byStatus: byStatus.reduce((a, s) => {
          a[s._id] = s.count;
          return a;
        }, {}),
        totalAttended,
        participationRate:
          byStatus.reduce((sum, s) => sum + s.count, 0) > 0
            ? Math.round((totalAttended / byStatus.reduce((sum, s) => sum + s.count, 0)) * 100)
            : 0,
      },
    });
  } catch (err) {
    logger.error('Events stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات المشاركة' });
  }
});

module.exports = router;
