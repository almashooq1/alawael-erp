/**
 * Therapy Sessions Routes — مسارات الجلسات العلاجية
 *
 * Wires the TherapeuticSessionController to Express.
 * Also provides a unified list/create/delete CRUD for the front-end SessionsManagement page.
 * NOW includes: auth, recurring generation, room conflicts, reminders, goal progress, status history.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/therapy-session.controller');
const TherapySession = require('../models/TherapySession');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');
const { safeError } = require('../utils/safeError');

// ─── Authentication required for all routes ───────────────────────────
router.use(authenticate);

// ─── Unified CRUD (used by the Sessions Management front-end) ─────────────

/**
 * GET /api/therapy-sessions
 * List all sessions with optional filters & pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      therapist,
      beneficiary,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (status) filter.status = status.toUpperCase();
    if (type) filter.sessionType = type;
    if (therapist) filter.therapist = therapist;
    if (beneficiary) filter.beneficiary = beneficiary;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { sessionType: { $regex: escapeRegex(search), $options: 'i' } },
        { 'notes.subjective': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const SESSION_SAFE_SORTS = new Set([
      'date',
      'createdAt',
      'status',
      'sessionType',
      'title',
      'updatedAt',
    ]);
    const safeSortBy = SESSION_SAFE_SORTS.has(sortBy) ? sortBy : 'date';
    const sort = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [sessions, total] = await Promise.all([
      TherapySession.find(filter)
        .populate('beneficiary', 'firstName lastName fullName')
        .populate('therapist', 'firstName lastName fullName specialization')
        .populate('plan', 'goals status title')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TherapySession.countDocuments(filter),
    ]);

    // Compute status stats
    const allStatuses = await TherapySession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusStats = {};
    allStatuses.forEach(s => {
      statusStats[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: sessions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      stats: {
        total,
        scheduled: statusStats.SCHEDULED || 0,
        confirmed: statusStats.CONFIRMED || 0,
        completed: statusStats.COMPLETED || 0,
        cancelled: (statusStats.CANCELLED_BY_PATIENT || 0) + (statusStats.CANCELLED_BY_CENTER || 0),
        noShow: statusStats.NO_SHOW || 0,
      },
    });
  } catch (error) {
    logger.error('GET /therapy-sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في تحميل الجلسات' });
  }
});

/**
 * POST /api/therapy-sessions
 * Create a new therapy session (unified — supports both rich clinical
 * scheduling and simple front-end form creation)
 */
router.post('/', async (req, res) => {
  try {
    const {
      // Front-end simple form fields
      title,
      type,
      sessionType,
      date: dateField,
      startTime: startTimeField,
      endTime: endTimeField,
      participants,
      recurrence,
      notes,
      // Clinical scheduling fields
      plan,
      beneficiary,
      therapist,
    } = req.body;

    // If clinical fields are provided, use the service layer
    if (plan && beneficiary && therapist) {
      return controller.scheduleSession(req, res);
    }

    // Resolve date — could be "2026-03-15" or ISO datetime
    let sessionDate;
    let startTimeStr = null;
    let endTimeStr = null;

    if (dateField) {
      // Date field is provided (new format)
      sessionDate = new Date(dateField);
      startTimeStr = startTimeField || null; // "HH:mm"
      endTimeStr = endTimeField || null;
    } else if (startTimeField && startTimeField.includes('T')) {
      // Legacy ISO datetime format
      sessionDate = new Date(startTimeField);
      startTimeStr = sessionDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      if (endTimeField && endTimeField.includes('T')) {
        const endDate = new Date(endTimeField);
        endTimeStr = endDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }
    } else {
      sessionDate = new Date();
      startTimeStr = startTimeField || null;
      endTimeStr = endTimeField || null;
    }

    const session = await TherapySession.create({
      title: title || 'جلسة جديدة',
      sessionType: sessionType || type || 'علاج طبيعي',
      date: sessionDate,
      startTime: startTimeStr,
      endTime: endTimeStr,
      participants: Array.isArray(participants)
        ? participants.map(p => (typeof p === 'string' ? { name: p } : p))
        : [],
      recurrence: recurrence || 'none',
      status: 'SCHEDULED',
      notes: typeof notes === 'string' ? { subjective: notes } : notes || {},
      plan: plan || undefined,
      beneficiary: beneficiary || undefined,
      therapist: therapist || req.user?._id || undefined,
      createdBy: req.user?._id || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الجلسة بنجاح',
      data: session,
    });
  } catch (error) {
    logger.error('POST /therapy-sessions error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في إنشاء الجلسة' });
  }
});

/**
 * GET /api/therapy-sessions/stats
 * Dashboard-level aggregate statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayStats, weekStats, byType, byStatus, therapistLoad] = await Promise.all([
      // Today's sessions
      TherapySession.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      // This week's sessions
      TherapySession.aggregate([
        { $match: { date: { $gte: weekAgo, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
      // By session type
      TherapySession.aggregate([
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Overall by status
      TherapySession.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      // Therapist load (top 10)
      TherapySession.aggregate([
        { $match: { date: { $gte: weekAgo } } },
        {
          $group: {
            _id: '$therapist',
            totalSessions: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
            },
          },
        },
        { $sort: { totalSessions: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Process today's stats
    const todayMap = {};
    todayStats.forEach(s => {
      todayMap[s._id] = s.count;
    });

    const totalToday = Object.values(todayMap).reduce((a, b) => a + b, 0);
    const completedToday = todayMap.COMPLETED || 0;

    return res.json({
      success: true,
      data: {
        totalToday,
        completedToday,
        cancelledToday: (todayMap.CANCELLED_BY_PATIENT || 0) + (todayMap.CANCELLED_BY_CENTER || 0),
        noShowToday: todayMap.NO_SHOW || 0,
        scheduledToday: (todayMap.SCHEDULED || 0) + (todayMap.CONFIRMED || 0),
        totalWeek: weekStats[0]?.total || 0,
        completionRate: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
        avgDuration: 45, // Default average
        byType: byType.map(t => ({ name: t._id || 'غير محدد', value: t.count })),
        byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
        therapistLoad: therapistLoad.map(t => ({
          therapist: t._id,
          sessions: t.totalSessions,
          completion: t.totalSessions > 0 ? Math.round((t.completed / t.totalSessions) * 100) : 0,
        })),
      },
    });
  } catch (error) {
    logger.error('GET /therapy-sessions/stats error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في تحميل الإحصائيات' });
  }
});

/**
 * GET /api/therapy-sessions/upcoming/:beneficiaryId
 */
router.get('/upcoming/:beneficiaryId', (req, res) => controller.getUpcomingSessions(req, res));

/**
 * GET /api/therapy-sessions/availability/:therapistId
 * POST /api/therapy-sessions/availability/:therapistId
 */
router.get('/availability/:therapistId', (req, res) => controller.checkAvailability(req, res));
router.post(
  '/availability/:therapistId',
  authorize(['admin', 'manager', 'therapist']),
  (req, res) => controller.setTherapistAvailability(req, res)
);

/**
 * GET /api/therapy-sessions/stats/therapist/:therapistId
 */
router.get('/stats/therapist/:therapistId', (req, res) =>
  controller.getSessionStatistics(req, res)
);

/**
 * GET /api/therapy-sessions/therapist/:therapistId
 */
router.get('/therapist/:therapistId', (req, res) => controller.getTherapistSessions(req, res));

/**
 * GET /api/therapy-sessions/beneficiary/:beneficiaryId
 */
router.get('/beneficiary/:beneficiaryId', (req, res) =>
  controller.getBeneficiarySessions(req, res)
);

/**
 * POST /api/therapy-sessions/bulk-reschedule
 */
router.post('/bulk-reschedule', authorize(['admin', 'manager']), (req, res) =>
  controller.bulkReschedule(req, res)
);

// ─── Single-Session Operations ─────────────────────────────────────────────

/**
 * GET /api/therapy-sessions/:sessionId
 */
router.get('/:sessionId', (req, res) => controller.getSession(req, res));

/**
 * PUT /api/therapy-sessions/:sessionId
 * Update session (full update for front-end edit)
 */
router.put('/:sessionId', async (req, res) => {
  try {
    const { title, type, startTime, endTime, participants, recurrence, notes, status } = req.body;

    const update = {};
    if (title) update.title = title;
    if (type) update.sessionType = type;
    if (status) update.status = status.toUpperCase();
    if (recurrence) update.recurrence = recurrence;

    if (startTime) {
      const d = new Date(startTime);
      update.date = d;
      update.startTime = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    if (endTime) {
      const d = new Date(endTime);
      update.endTime = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    if (participants) {
      update.participants = Array.isArray(participants)
        ? participants.map(p => (typeof p === 'string' ? { name: p } : p))
        : [];
    }
    if (notes !== undefined) {
      update.notes = typeof notes === 'string' ? { subjective: notes } : notes;
    }

    const session = await TherapySession.findByIdAndUpdate(req.params.sessionId, update, {
      new: true,
    })
      .populate('beneficiary', 'firstName lastName fullName')
      .populate('therapist', 'firstName lastName fullName specialization');

    if (!session) {
      return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    }

    return res.json({ success: true, message: 'تم تحديث الجلسة', data: session });
  } catch (error) {
    logger.error('PUT /therapy-sessions/:id error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في تحديث الجلسة' });
  }
});

/**
 * DELETE /api/therapy-sessions/:sessionId
 */
router.delete('/:sessionId', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const session = await TherapySession.findByIdAndDelete(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    }
    return res.json({ success: true, message: 'تم حذف الجلسة بنجاح' });
  } catch (error) {
    logger.error('DELETE /therapy-sessions/:id error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في حذف الجلسة' });
  }
});

/**
 * PATCH /api/therapy-sessions/:sessionId/status
 */
router.patch('/:sessionId/status', (req, res) => controller.updateSessionStatus(req, res));

/**
 * PATCH /api/therapy-sessions/:sessionId/reschedule
 */
router.patch('/:sessionId/reschedule', (req, res) => controller.rescheduleSession(req, res));

/**
 * POST /api/therapy-sessions/:sessionId/documentation
 * GET  /api/therapy-sessions/:sessionId/documentation
 */
router.post('/:sessionId/documentation', (req, res) => controller.documentSession(req, res));
router.get('/:sessionId/documentation', (req, res) => controller.getSessionDocumentation(req, res));

/**
 * POST /api/therapy-sessions/:sessionId/cancel
 */
router.post('/:sessionId/cancel', (req, res) => controller.cancelSession(req, res));

/**
 * POST /api/therapy-sessions/:sessionId/attend
 */
router.post('/:sessionId/attend', (req, res) => controller.markAttendance(req, res));

/**
 * POST /api/therapy-sessions/:sessionId/no-show
 */
router.post('/:sessionId/no-show', (req, res) => controller.markNoShow(req, res));

// ─── NEW: Recurring Session Generation ────────────────────────────────

/**
 * POST /api/therapy-sessions/:sessionId/generate-recurring
 * Generate recurring sessions from a parent session
 */
router.post('/:sessionId/generate-recurring', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const generated = await appointmentService.generateRecurringSessions(req.params.sessionId);
    return res.status(201).json({
      success: true,
      message: `تم إنشاء ${generated.length} جلسة متكررة`,
      data: generated,
      count: generated.length,
    });
  } catch (error) {
    logger.error('POST /therapy-sessions/:id/generate-recurring error:', error.message);
    const isNotFound = error.message && error.message.includes('غير موجود');
    const status = isNotFound ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: isNotFound ? error.message : 'خطأ في إنشاء الجلسات المتكررة',
      error: safeError(error),
    });
  }
});

/**
 * GET /api/therapy-sessions/:sessionId/recurring
 * Get all sessions in a recurring series
 */
router.get('/:sessionId/recurring', async (req, res) => {
  try {
    const parentId = req.params.sessionId;
    const children = await TherapySession.find({ recurrenceParent: parentId })
      .populate('beneficiary', 'firstName lastName fullName')
      .populate('therapist', 'firstName lastName fullName')
      .sort({ date: 1 })
      .lean();
    return res.json({
      success: true,
      data: children,
      count: children.length,
      parentId,
    });
  } catch (error) {
    logger.error('GET /therapy-sessions/:id/recurring error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في تحميل الجلسات المتكررة' });
  }
});

// ─── NEW: Room Conflict Check ─────────────────────────────────────────

/**
 * POST /api/therapy-sessions/check-conflicts
 * Check for scheduling conflicts before creating/updating
 */
router.post('/check-conflicts', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const { therapist, room, date, startTime, endTime, excludeId } = req.body;

    const conflicts = {};

    if (therapist) {
      const tc = await appointmentService.checkTherapistConflict(
        therapist,
        date,
        startTime,
        endTime,
        excludeId
      );
      if (tc) conflicts.therapist = tc;
    }

    if (room) {
      const rc = await appointmentService.checkRoomConflict(
        room,
        date,
        startTime,
        endTime,
        excludeId
      );
      if (rc) conflicts.room = rc;
    }

    return res.json({
      success: true,
      hasConflicts: Object.keys(conflicts).length > 0,
      conflicts,
    });
  } catch (error) {
    logger.error('POST /therapy-sessions/check-conflicts error:', error.message);
    return res.status(500).json({ success: false, message: 'خطأ في فحص التعارضات' });
  }
});

// ─── NEW: Reminders Management ────────────────────────────────────────

/**
 * PUT /api/therapy-sessions/:sessionId/reminders
 * Set reminders for a session
 */
router.put('/:sessionId/reminders', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const session = await appointmentService.addReminders(req.params.sessionId, req.body.reminders);
    return res.json({ success: true, message: 'تم تحديث التذكيرات', data: session.reminders });
  } catch (error) {
    logger.error('PUT /therapy-sessions/:id/reminders error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث التذكيرات', error: safeError(error) });
  }
});

// ─── NEW: Goal Progress Tracking ──────────────────────────────────────

/**
 * PUT /api/therapy-sessions/:sessionId/goals-progress
 * Update goal progress for a session
 */
router.put('/:sessionId/goals-progress', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const session = await appointmentService.updateGoalProgress(
      req.params.sessionId,
      req.body.goalsProgress
    );
    return res.json({
      success: true,
      message: 'تم تحديث تقدم الأهداف',
      data: session.goalsProgress,
    });
  } catch (error) {
    logger.error('PUT /therapy-sessions/:id/goals-progress error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث التقدم', error: safeError(error) });
  }
});

// ─── NEW: Status History ──────────────────────────────────────────────

/**
 * GET /api/therapy-sessions/:sessionId/history
 * Get session status change history
 */
router.get('/:sessionId/history', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const history = await appointmentService.getSessionHistory(req.params.sessionId);
    return res.json({ success: true, data: history });
  } catch (error) {
    logger.error('GET /therapy-sessions/:id/history error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب السجل', error: safeError(error) });
  }
});

/**
 * PATCH /api/therapy-sessions/:sessionId/status-tracked
 * Update status with full history tracking
 */
router.patch('/:sessionId/status-tracked', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const { status, reason } = req.body;
    const session = await appointmentService.updateSessionStatusTracked(
      req.params.sessionId,
      status,
      reason,
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم تحديث الحالة', data: session });
  } catch (error) {
    logger.error('PATCH /therapy-sessions/:id/status-tracked error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث الحالة', error: safeError(error) });
  }
});

// ─── NEW: Room Assignment ─────────────────────────────────────────────

/**
 * PUT /api/therapy-sessions/:sessionId/room
 * Assign/change room for a session with conflict check
 */
router.put('/:sessionId/room', async (req, res) => {
  try {
    const appointmentService = require('../services/appointment.service');
    const session = await TherapySession.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const { room } = req.body;
    if (room) {
      const conflict = await appointmentService.checkRoomConflict(
        room,
        session.date,
        session.startTime,
        session.endTime,
        session._id
      );
      if (conflict) {
        return res.status(409).json({ success: false, message: conflict.reason });
      }
    }

    session.room = room || null;
    session.location = req.body.location || session.location;
    await session.save();

    return res.json({
      success: true,
      message: 'تم تحديث الغرفة',
      data: { room: session.room, location: session.location },
    });
  } catch (error) {
    logger.error('PUT /therapy-sessions/:id/room error:', error.message);
    return res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث الغرفة', error: safeError(error) });
  }
});

module.exports = router;
