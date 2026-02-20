/**
 * API الجلسات المتقدمة - Advanced Sessions API
 * يدير جميع عمليات الجلسات المتقدمة وتتبعها
 */

const express = require('express');
const router = express.Router();
const {
  AdvancedSession,
  SESSION_STATUSES,
  ATTENDANCE_STATUS,
} = require('../models/advancedSession');

/**
 * POST /api/sessions
 * إنشاء جلسة جديدة
 */
router.post('/', async (req, res) => {
  try {
    const {
      beneficiaryId,
      programId,
      specialistId,
      title,
      description,
      scheduledDateTime,
      scheduledDuration,
      location,
      sessionGoals,
      plannedActivities,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!beneficiaryId || !programId || !specialistId || !scheduledDateTime) {
      return res.error('البيانات المطلوبة غير مكتملة', 'Missing required fields', 400);
    }

    const newSession = new AdvancedSession.model({
      beneficiaryId,
      programId,
      specialistId,
      title,
      description,
      scheduledDateTime,
      scheduledDuration: scheduledDuration || 60,
      location,
      sessionGoals: sessionGoals || [],
      plannedActivities: plannedActivities || [],
      status: SESSION_STATUSES.SCHEDULED,
      createdBy: req.user?.id,
    });

    await newSession.save();

    // إعادة ملء البيانات المرتبطة
    await newSession.populate([
      { path: 'beneficiaryId', select: 'name email' },
      { path: 'programId', select: 'name' },
      { path: 'specialistId', select: 'name email' },
    ]);

    res.success(newSession, 'تم إنشاء الجلسة بنجاح', 201);
  } catch (error) {
    res.error(error, 'فشل في إنشاء الجلسة');
  }
});

/**
 * GET /api/sessions
 * الحصول على قائمة الجلسات مع التصفية
 */
router.get('/', async (req, res) => {
  try {
    const {
      beneficiaryId,
      specialistId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'scheduledDateTime',
      sortOrder = -1,
    } = req.query;

    const filter = {};
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (specialistId) filter.specialistId = specialistId;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.scheduledDateTime = {};
      if (dateFrom) filter.scheduledDateTime.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDateTime.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const sessions = await AdvancedSession.model
      .find(filter)
      .populate([
        { path: 'beneficiaryId', select: 'name email' },
        { path: 'programId', select: 'name' },
        { path: 'specialistId', select: 'name email' },
      ])
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdvancedSession.model.countDocuments(filter);

    res.success(
      {
        sessions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
      'تم جلب الجلسات بنجاح'
    );
  } catch (error) {
    res.error(error, 'فشل في جلب الجلسات');
  }
});

/**
 * GET /api/sessions/:id
 * الحصول على تفاصيل جلسة واحدة
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await AdvancedSession.model
      .findById(req.params.id)
      .populate([{ path: 'beneficiaryId' }, { path: 'programId' }, { path: 'specialistId' }]);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    res.success(session, 'تم جلب تفاصيل الجلسة');
  } catch (error) {
    res.error(error, 'فشل في جلب الجلسة');
  }
});

/**
 * PUT /api/sessions/:id
 * تحديث جلسة
 */
router.put('/:id', async (req, res) => {
  try {
    const session = await AdvancedSession.model.findById(req.params.id);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    // تحديث الحقول المسموحة
    const allowedFields = [
      'title',
      'description',
      'scheduledDateTime',
      'scheduledDuration',
      'location',
      'sessionGoals',
      'plannedActivities',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    session.updatedBy = req.user?.id;
    await session.save();

    res.success(session, 'تم تحديث الجلسة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في تحديث الجلسة');
  }
});

/**
 * POST /api/sessions/:id/start
 * بدء جلسة
 */
router.post('/:id/start', async (req, res) => {
  try {
    const session = await AdvancedSession.model.findById(req.params.id);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    if (session.status !== SESSION_STATUSES.SCHEDULED) {
      return res.error('حالة الجلسة غير صحيحة للبدء', 'Invalid session status', 400);
    }

    session.actualStartTime = new Date();
    session.status = SESSION_STATUSES.IN_PROGRESS;
    session.updatedBy = req.user?.id;

    await session.save();

    res.success(session, 'تم بدء الجلسة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في بدء الجلسة');
  }
});

/**
 * POST /api/sessions/:id/complete
 * إكمال جلسة مع تسجيل الملاحظات
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const session = await AdvancedSession.model.findById(req.params.id);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    const {
      beneficiaryAttendance,
      implementedActivities,
      performanceAssessment,
      specialistNotes,
      usedEquipment,
      attachments,
    } = req.body;

    // تحديث تفاصيل الجلسة
    session.actualEndTime = new Date();

    if (session.actualStartTime) {
      session.actualDuration = Math.round(
        (session.actualEndTime - session.actualStartTime) / 60000
      );
    }

    if (beneficiaryAttendance) {
      session.beneficiaryAttendance = beneficiaryAttendance;
    }

    if (implementedActivities) {
      session.implementedActivities = implementedActivities;
    }

    if (performanceAssessment) {
      session.performanceAssessment = performanceAssessment;
    }

    if (specialistNotes) {
      session.specialistNotes = specialistNotes;
    }

    if (usedEquipment) {
      session.usedEquipment = usedEquipment;
    }

    if (attachments) {
      session.attachments = attachments;
    }

    session.status = SESSION_STATUSES.COMPLETED;
    session.updatedBy = req.user?.id;

    await session.save();

    res.success(session, 'تم إكمال الجلسة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في إكمال الجلسة');
  }
});

/**
 * POST /api/sessions/:id/cancel
 * إلغاء جلسة
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const session = await AdvancedSession.model.findById(req.params.id);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    const { reason } = req.body;

    session.status = SESSION_STATUSES.CANCELLED;
    session.specialistNotes = session.specialistNotes || {};
    session.specialistNotes.cancellationReason = reason;
    session.updatedBy = req.user?.id;

    await session.save();

    res.success(session, 'تم إلغاء الجلسة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في إلغاء الجلسة');
  }
});

/**
 * POST /api/sessions/:id/reschedule
 * إعادة جدولة جلسة
 */
router.post('/:id/reschedule', async (req, res) => {
  try {
    const session = await AdvancedSession.model.findById(req.params.id);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    const { newDateTime, reason } = req.body;

    if (!newDateTime) {
      return res.error('التاريخ الجديد مطلوب', 'New date/time required', 400);
    }

    session.scheduledDateTime = new Date(newDateTime);
    session.status = SESSION_STATUSES.RESCHEDULED;
    session.specialistNotes = session.specialistNotes || {};
    session.specialistNotes.rescheduleReason = reason;
    session.updatedBy = req.user?.id;

    await session.save();

    res.success(session, 'تم إعادة جدولة الجلسة بنجاح');
  } catch (error) {
    res.error(error, 'فشل في إعادة جدولة الجلسة');
  }
});

/**
 * GET /api/sessions/:id/report
 * الحصول على تقرير الجلسة
 */
router.get('/:id/report', async (req, res) => {
  try {
    const session = await AdvancedSession.model
      .findById(req.params.id)
      .populate([{ path: 'beneficiaryId' }, { path: 'programId' }, { path: 'specialistId' }]);

    if (!session) {
      return res.error('الجلسة غير موجودة', 'Session not found', 404);
    }

    const report = {
      sessionInfo: {
        id: session._id,
        title: session.title,
        date: session.scheduledDateTime,
        beneficiary: session.beneficiaryId?.name,
        program: session.programId?.name,
        specialist: session.specialistId?.name,
      },
      attendanceInfo: session.beneficiaryAttendance,
      performanceInfo: session.performanceAssessment,
      activitiesImplemented: session.implementedActivities,
      notes: session.specialistNotes,
      followUp: session.followUp,
      duration: {
        scheduled: session.scheduledDuration,
        actual: session.actualDuration,
      },
    };

    res.success(report, 'تم جلب تقرير الجلسة');
  } catch (error) {
    res.error(error, 'فشل في جلب التقرير');
  }
});

module.exports = router;
