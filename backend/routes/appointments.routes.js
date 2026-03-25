/**
 * مسارات المواعيد - Appointment Routes
 * Full CRUD + booking + check-in + stats + conversion + availability
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const appointmentService = require('../services/appointment.service');
const { asyncHandler } = require('../errors/errorHandler');
const { AppError } = require('../errors/AppError');

// All routes require authentication
router.use(authenticate);

// ─── LIST / SEARCH ────────────────────────────────────────────────────

/**
 * GET /api/appointments
 * List all appointments with filters & pagination
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await appointmentService.listAppointments(req.query);
    return res.json({ success: true, ...result });
  })
);

/**
 * GET /api/appointments/stats
 * Appointment statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await appointmentService.getAppointmentStats(req.query);
    return res.json({ success: true, data: stats });
  })
);

/**
 * GET /api/appointments/my
 * Get current user's appointments (parent/guardian portal)
 */
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const result = await appointmentService.listAppointments({
      ...req.query,
      bookedBy: req.user._id || req.user.id,
    });
    return res.json({ success: true, ...result });
  })
);

/**
 * GET /api/appointments/today/:therapistId
 * Get today's combined schedule (sessions + appointments) for a therapist
 */
router.get(
  '/today/:therapistId',
  asyncHandler(async (req, res) => {
    const schedule = await appointmentService.getTodaySchedule(req.params.therapistId);
    return res.json({ success: true, data: schedule });
  })
);

/**
 * GET /api/appointments/available-slots/:therapistId
 * Get available time slots for a therapist on a date
 */
router.get(
  '/available-slots/:therapistId',
  asyncHandler(async (req, res) => {
    const { date, duration } = req.query;
    if (!date) {
      throw new AppError('التاريخ مطلوب', 400, 'MISSING_DATE');
    }
    const slots = await appointmentService.getAvailableSlots(
      req.params.therapistId,
      date,
      Number(duration) || 30
    );
    return res.json({ success: true, data: slots });
  })
);

/**
 * GET /api/appointments/available-rooms
 * Get available rooms for a given date/time
 */
router.get(
  '/available-rooms',
  asyncHandler(async (req, res) => {
    const { date, startTime, endTime, roomType } = req.query;
    if (!date || !startTime) {
      throw new AppError('التاريخ ووقت البداية مطلوبان', 400, 'MISSING_PARAMS');
    }
    const rooms = await appointmentService.getAvailableRooms(date, startTime, endTime, roomType);
    return res.json({ success: true, data: rooms, count: rooms.length });
  })
);

/**
 * GET /api/appointments/reminders/pending
 * Get pending reminders that need to be sent
 */
router.get(
  '/reminders/pending',
  authorize(['admin', 'manager']),
  asyncHandler(async (req, res) => {
    const pending = await appointmentService.getPendingReminders();
    return res.json({ success: true, data: pending, count: pending.length });
  })
);

// ─── CREATE ───────────────────────────────────────────────────────────

/**
 * POST /api/appointments
 * Book a new appointment
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.createAppointment(
      req.body,
      req.user._id || req.user.id
    );
    return res.status(201).json({
      success: true,
      message: 'تم حجز الموعد بنجاح',
      data: appointment,
    });
  })
);

// ─── SINGLE APPOINTMENT ───────────────────────────────────────────────

/**
 * GET /api/appointments/:id
 * Get single appointment
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.getAppointment(req.params.id);
    return res.json({ success: true, data: apt });
  })
);

/**
 * PUT /api/appointments/:id
 * Update appointment
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.updateAppointment(
      req.params.id,
      req.body,
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم تحديث الموعد', data: apt });
  })
);

/**
 * DELETE /api/appointments/:id
 * Delete appointment (admin only)
 */
router.delete(
  '/:id',
  authorize(['admin', 'manager']),
  asyncHandler(async (req, res) => {
    const Appointment = require('../models/Appointment');
    const apt = await Appointment.findByIdAndDelete(req.params.id);
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');
    return res.json({ success: true, message: 'تم حذف الموعد بنجاح' });
  })
);

// ─── STATUS CHANGES ───────────────────────────────────────────────────

/**
 * POST /api/appointments/:id/confirm
 * Confirm appointment
 */
router.post(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.updateAppointment(
      req.params.id,
      { status: 'CONFIRMED', statusChangeReason: 'تأكيد الموعد' },
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم تأكيد الموعد', data: apt });
  })
);

/**
 * POST /api/appointments/:id/cancel
 * Cancel appointment
 */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.cancelAppointment(
      req.params.id,
      req.body.reason || 'إلغاء بدون سبب',
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم إلغاء الموعد', data: apt });
  })
);

/**
 * POST /api/appointments/:id/check-in
 * Patient check-in
 */
router.post(
  '/:id/check-in',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.checkIn(req.params.id, req.user._id || req.user.id);
    return res.json({ success: true, message: 'تم تسجيل الحضور', data: apt });
  })
);

/**
 * POST /api/appointments/:id/no-show
 * Mark as no-show
 */
router.post(
  '/:id/no-show',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.updateAppointment(
      req.params.id,
      { status: 'NO_SHOW', statusChangeReason: req.body.reason || 'لم يحضر' },
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم تسجيل عدم الحضور', data: apt });
  })
);

/**
 * POST /api/appointments/:id/complete
 * Complete appointment
 */
router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const apt = await appointmentService.updateAppointment(
      req.params.id,
      {
        status: 'COMPLETED',
        statusChangeReason: 'اكتمال الموعد',
        checkOutTime: new Date(),
        internalNotes: req.body.notes,
      },
      req.user._id || req.user.id
    );
    return res.json({ success: true, message: 'تم إتمام الموعد', data: apt });
  })
);

/**
 * POST /api/appointments/:id/convert-to-session
 * Convert appointment into a therapy session
 */
router.post(
  '/:id/convert-to-session',
  asyncHandler(async (req, res) => {
    const result = await appointmentService.convertToSession(
      req.params.id,
      req.body,
      req.user._id || req.user.id
    );
    return res.json({
      success: true,
      message: 'تم تحويل الموعد إلى جلسة علاجية',
      data: result,
    });
  })
);

/**
 * POST /api/appointments/reminders/:itemType/:itemId/:index/sent
 * Mark a reminder as sent
 */
router.post(
  '/reminders/:itemType/:itemId/:index/sent',
  asyncHandler(async (req, res) => {
    const result = await appointmentService.markReminderSent(
      req.params.itemType,
      req.params.itemId,
      Number(req.params.index)
    );
    if (!result) throw new AppError('التذكير غير موجود', 404, 'NOT_FOUND');
    return res.json({ success: true, message: 'تم تحديث حالة التذكير' });
  })
);

module.exports = router;
