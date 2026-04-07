/**
 * Appointments & Scheduling Module Routes — وحدة المواعيد والجدولة
 * prompt_07 — Conflict Detection + Smart Waitlist + Recurring Appointments
 *
 * Endpoints:
 *  Appointments         → /api/scheduling-module/appointments
 *  Availability         → /api/scheduling-module/availability
 *  Recurrence           → /api/scheduling-module/recurrences
 *  Room Bookings        → /api/scheduling-module/rooms
 *  Waitlist             → /api/scheduling-module/waitlist
 *  Reports              → /api/scheduling-module/reports
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { stripUpdateMeta } = require('../utils/sanitize');
const router = express.Router();
const mongoose = require('mongoose');

// 🔒 All scheduling routes require authentication
router.use(authenticate);

// ─── Models ──────────────────────────────────────────────────────────────────
const Appointment = require('../models/scheduling/Appointment');
const TherapistAvailability = require('../models/scheduling/TherapistAvailability');
const AppointmentRecurrence = require('../models/scheduling/AppointmentRecurrence');
const RoomBooking = require('../models/scheduling/RoomBooking');
const WaitlistEntry = require('../models/scheduling/WaitlistEntry');

// ─── Services ────────────────────────────────────────────────────────────────
const {
  ConflictDetectionService,
  WaitlistService,
} = require('../services/scheduling/SchedulingService');
const escapeRegex = require('../utils/escapeRegex');

const conflictService = new ConflictDetectionService();
const waitlistService = new WaitlistService();

// ─── Helpers ─────────────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const validateObjectId =
  (param = 'id') =>
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    next();
  };

// ══════════════════════════════════════════════════════════════════════════════
// 1. APPOINTMENTS — المواعيد
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/appointments
router.get(
  '/appointments',
  asyncHandler(async (req, res) => {
    const {
      status,
      beneficiary_id,
      therapist_id,
      service_type,
      room_id,
      date,
      from_date,
      to_date,
      branch_id,
      search,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = { deleted_at: null };

    if (status) filter.status = status;
    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (therapist_id) filter.therapist_id = therapist_id;
    if (service_type) filter.service_type = service_type;
    if (room_id) filter.room_id = room_id;
    if (branch_id) filter.branch_id = branch_id;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.appointment_date = { $gte: d, $lte: dEnd };
    } else if (from_date || to_date) {
      filter.appointment_date = {};
      if (from_date) filter.appointment_date.$gte = new Date(from_date);
      if (to_date) filter.appointment_date.$lte = new Date(to_date);
    }
    if (search) {
      filter.$or = [
        { appointment_number: { $regex: escapeRegex(search), $options: 'i' } },
        { notes: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .populate('beneficiary_id', 'full_name_ar file_number phone')
      .populate('therapist_id', 'name specialization')
      .populate('room_id', 'room_name room_number')
      .sort({ appointment_date: 1, start_time: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: appointments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

// GET /scheduling-module/appointments/:id
router.get(
  '/appointments/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOne({ _id: req.params.id, deleted_at: null })
      .populate('beneficiary_id', 'full_name_ar file_number date_of_birth disability_type')
      .populate('therapist_id', 'name specialization phone')
      .populate('room_id', 'room_name room_number floor building')
      .populate('recurrence_id', 'frequency days_of_week end_date');
    if (!appointment) return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
    res.json({ success: true, data: appointment });
  })
);

// POST /scheduling-module/appointments — حجز موعد مع كشف تعارضات
router.post(
  '/appointments',
  asyncHandler(async (req, res) => {
    const {
      beneficiary_id,
      therapist_id,
      room_id,
      appointment_date,
      start_time,
      end_time,
      service_type,
      duration_minutes,
      ...rest
    } = req.body;

    // كشف التعارضات قبل الحفظ
    const conflicts = await conflictService.detectConflicts({
      beneficiary_id,
      therapist_id,
      room_id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes,
    });

    if (conflicts.length > 0 && req.body.force !== true) {
      return res.status(409).json({
        success: false,
        message: 'يوجد تعارض في الموعد',
        conflicts,
        hint: 'أرسل force=true لتجاوز التحذيرات (غير التعارضات الحرجة)',
      });
    }

    // فصل التعارضات الحرجة عن التحذيرات
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    if (criticalConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'تعارض حرج — لا يمكن تجاوزه',
        conflicts: criticalConflicts,
      });
    }

    const appointment = new Appointment({
      beneficiary_id,
      therapist_id,
      room_id,
      appointment_date: new Date(appointment_date),
      start_time,
      end_time,
      service_type,
      duration_minutes,
      ...rest,
      created_by: req.user?._id,
    });

    await appointment.save();

    // إذا كان موعداً متكرراً، إنشاء المواعيد التالية
    if (req.body.recurrence) {
      await waitlistService.generateRecurringAppointments(appointment, req.body.recurrence);
    }

    res.status(201).json({
      success: true,
      data: appointment,
      warnings: conflicts.filter(c => c.severity !== 'critical'),
      message: 'تم حجز الموعد بنجاح',
    });
  })
);

// PUT /scheduling-module/appointments/:id — تعديل موعد
router.put(
  '/appointments/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const existing = await Appointment.findOne({ _id: req.params.id, deleted_at: null });
    if (!existing) return res.status(404).json({ success: false, message: 'الموعد غير موجود' });

    if (['completed', 'cancelled'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'لا يمكن تعديل موعد مكتمل أو ملغي' });
    }

    // كشف تعارضات عند تغيير الوقت
    if (req.body.appointment_date || req.body.start_time || req.body.end_time) {
      const conflicts = await conflictService.detectConflicts({
        beneficiary_id: req.body.beneficiary_id || existing.beneficiary_id,
        therapist_id: req.body.therapist_id || existing.therapist_id,
        room_id: req.body.room_id || existing.room_id,
        appointment_date: req.body.appointment_date || existing.appointment_date,
        start_time: req.body.start_time || existing.start_time,
        end_time: req.body.end_time || existing.end_time,
        exclude_id: existing._id,
      });

      const criticals = conflicts.filter(c => c.severity === 'critical');
      if (criticals.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'تعارض في الوقت الجديد',
          conflicts: criticals,
        });
      }
    }

    const { appointment_number, created_by, ...updateData } = req.body;
    Object.assign(existing, updateData);
    existing.updated_at = new Date();
    await existing.save();

    res.json({ success: true, data: existing, message: 'تم تحديث الموعد' });
  })
);

// POST /scheduling-module/appointments/:id/confirm — تأكيد الموعد
router.post(
  '/appointments/:id/confirm',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'pending' },
      { status: 'confirmed', confirmed_at: new Date(), confirmed_by: req.user?._id },
      { new: true }
    );
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: 'الموعد غير موجود أو لا يمكن تأكيده' });
    res.json({ success: true, data: appointment, message: 'تم تأكيد الموعد' });
  })
);

// POST /scheduling-module/appointments/:id/complete — إنهاء الموعد
router.post(
  '/appointments/:id/complete',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { session_notes, duration_actual, attendance_status } = req.body;
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        deleted_at: null,
        status: { $in: ['confirmed', 'in_progress'] },
      },
      {
        status: 'completed',
        completed_at: new Date(),
        session_notes,
        duration_actual: duration_actual || undefined,
        attendance_status: attendance_status || 'attended',
      },
      { new: true }
    );
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: 'الموعد غير موجود أو لا يمكن إنهاؤه' });
    res.json({ success: true, data: appointment, message: 'تم إنهاء الموعد' });
  })
);

// POST /scheduling-module/appointments/:id/cancel — إلغاء الموعد
router.post(
  '/appointments/:id/cancel',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.id,
        deleted_at: null,
        status: { $in: ['pending', 'confirmed'] },
      },
      {
        status: 'cancelled',
        cancellation_reason: req.body.reason,
        cancelled_by: req.body.cancelled_by || 'center',
        cancelled_at: new Date(),
      },
      { new: true }
    );
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: 'الموعد غير موجود أو لا يمكن إلغاؤه' });
    res.json({ success: true, data: appointment, message: 'تم إلغاء الموعد' });
  })
);

// POST /scheduling-module/appointments/:id/reschedule — إعادة جدولة
router.post(
  '/appointments/:id/reschedule',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { new_date, new_start_time, new_end_time, reason } = req.body;
    const existing = await Appointment.findOne({ _id: req.params.id, deleted_at: null });
    if (!existing) return res.status(404).json({ success: false, message: 'الموعد غير موجود' });

    // كشف تعارضات للوقت الجديد
    const conflicts = await conflictService.detectConflicts({
      beneficiary_id: existing.beneficiary_id,
      therapist_id: existing.therapist_id,
      room_id: existing.room_id,
      appointment_date: new_date,
      start_time: new_start_time,
      end_time: new_end_time,
      exclude_id: existing._id,
    });

    const criticals = conflicts.filter(c => c.severity === 'critical');
    if (criticals.length > 0) {
      return res
        .status(409)
        .json({ success: false, message: 'تعارض في الوقت الجديد', conflicts: criticals });
    }

    existing.appointment_date = new Date(new_date);
    existing.start_time = new_start_time;
    existing.end_time = new_end_time;
    existing.reschedule_reason = reason;
    existing.rescheduled_from = existing._id;
    existing.status = 'confirmed';
    existing.updated_at = new Date();
    await existing.save();

    res.json({
      success: true,
      data: existing,
      warnings: conflicts.filter(c => c.severity !== 'critical'),
      message: 'تمت إعادة جدولة الموعد',
    });
  })
);

// DELETE /scheduling-module/appointments/:id
router.delete(
  '/appointments/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'pending' },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!appointment)
      return res.status(404).json({ success: false, message: 'الموعد غير موجود أو لا يمكن حذفه' });
    res.json({ success: true, message: 'تم حذف الموعد' });
  })
);

// POST /scheduling-module/appointments/check-conflicts — فحص تعارضات فقط (بدون حفظ)
router.post(
  '/appointments/check-conflicts',
  asyncHandler(async (req, res) => {
    const conflicts = await conflictService.detectConflicts(req.body);
    res.json({
      success: true,
      has_conflicts: conflicts.length > 0,
      conflicts,
      is_bookable: conflicts.filter(c => c.severity === 'critical').length === 0,
    });
  })
);

// GET /scheduling-module/appointments/calendar — عرض تقويمي
router.get(
  '/appointments/calendar',
  asyncHandler(async (req, res) => {
    const { year, month, therapist_id, branch_id } = req.query;
    const y = parseInt(year || new Date().getFullYear());
    const m = parseInt(month || new Date().getMonth() + 1);

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const filter = {
      deleted_at: null,
      appointment_date: { $gte: startDate, $lte: endDate },
      status: { $nin: ['cancelled'] },
    };
    if (therapist_id) filter.therapist_id = therapist_id;
    if (branch_id) filter.branch_id = branch_id;

    const appointments = await Appointment.find(filter)
      .populate('beneficiary_id', 'full_name_ar')
      .populate('therapist_id', 'name')
      .populate('room_id', 'room_name')
      .select(
        'appointment_date start_time end_time status service_type beneficiary_id therapist_id room_id'
      )
      .sort({ appointment_date: 1, start_time: 1 });

    // تجميع حسب اليوم
    const byDay = {};
    appointments.forEach(appt => {
      const dayKey = appt.appointment_date.toISOString().split('T')[0];
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(appt);
    });

    res.json({ success: true, data: byDay, total: appointments.length });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. THERAPIST AVAILABILITY — توفر المعالجين
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/availability/:therapistId
router.get(
  '/availability/:therapistId',
  asyncHandler(async (req, res) => {
    const availability = await TherapistAvailability.findOne({
      therapist_id: req.params.therapistId,
      deleted_at: null,
    });
    if (!availability)
      return res.status(404).json({ success: false, message: 'لم يُعرَّف جدول توفر لهذا المعالج' });
    res.json({ success: true, data: availability });
  })
);

// POST /scheduling-module/availability — إنشاء/تحديث توفر معالج
router.post(
  '/availability',
  asyncHandler(async (req, res) => {
    const existing = await TherapistAvailability.findOne({
      therapist_id: req.body.therapist_id,
      deleted_at: null,
    });

    if (existing) {
      Object.assign(existing, stripUpdateMeta(req.body));
      existing.updated_at = new Date();
      await existing.save();
      return res.json({ success: true, data: existing, message: 'تم تحديث جدول التوفر' });
    }

    const availability = new TherapistAvailability({ ...stripUpdateMeta(req.body), created_by: req.user?._id });
    await availability.save();
    res.status(201).json({ success: true, data: availability, message: 'تم إنشاء جدول التوفر' });
  })
);

// POST /scheduling-module/availability/:therapistId/exception — إضافة استثناء (إجازة/غياب)
router.post(
  '/availability/:therapistId/exception',
  asyncHandler(async (req, res) => {
    const availability = await TherapistAvailability.findOne({
      therapist_id: req.params.therapistId,
      deleted_at: null,
    });
    if (!availability)
      return res.status(404).json({ success: false, message: 'جدول التوفر غير موجود' });

    const exception = {
      date: new Date(req.body.date),
      is_available: req.body.is_available ?? false,
      reason: req.body.reason,
      alternative_hours: req.body.alternative_hours,
    };

    availability.exceptions = availability.exceptions || [];
    availability.exceptions.push(exception);
    await availability.save();

    res.json({ success: true, data: availability, message: 'تم إضافة الاستثناء' });
  })
);

// GET /scheduling-module/availability/:therapistId/slots — الأوقات المتاحة
router.get(
  '/availability/:therapistId/slots',
  asyncHandler(async (req, res) => {
    const { date, service_duration = 60 } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'يرجى تحديد التاريخ' });

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const availability = await TherapistAvailability.findOne({
      therapist_id: req.params.therapistId,
      deleted_at: null,
    });

    if (!availability) {
      return res.json({ success: true, data: [], message: 'لا يوجد جدول توفر' });
    }

    // التحقق من الاستثناءات
    const exception = availability.exceptions?.find(
      e => e.date.toISOString().split('T')[0] === date
    );
    if (exception && !exception.is_available) {
      return res.json({ success: true, data: [], message: 'المعالج غير متاح في هذا اليوم' });
    }

    const daySchedule = exception?.alternative_hours || availability.weekly_schedule?.[dayOfWeek];
    if (!daySchedule?.is_working) {
      return res.json({ success: true, data: [], message: 'يوم عطلة' });
    }

    // الحصول على المواعيد المحجوزة في هذا اليوم
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      therapist_id: req.params.therapistId,
      appointment_date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] },
      deleted_at: null,
    }).select('start_time end_time duration_minutes');

    // حساب الأوقات المتاحة
    const slots = [];
    const [startH, startM] = (daySchedule.start_time || '08:00').split(':').map(Number);
    const [endH, endM] = (daySchedule.end_time || '17:00').split(':').map(Number);
    const durationMin = parseInt(service_duration);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isBooked = (slotStart, slotEnd) => {
      return bookedAppointments.some(appt => {
        const [aH, aM] = appt.start_time.split(':').map(Number);
        const [eH, eM] = appt.end_time.split(':').map(Number);
        const apptStart = aH * 60 + aM;
        const apptEnd = eH * 60 + eM;
        return slotStart < apptEnd && slotEnd > apptStart;
      });
    };

    while (currentMinutes + durationMin <= endMinutes) {
      const slotEnd = currentMinutes + durationMin;
      const startStr = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`;
      const endStr = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

      if (!isBooked(currentMinutes, slotEnd)) {
        slots.push({ start_time: startStr, end_time: endStr, available: true });
      }

      currentMinutes += 30; // خطوات 30 دقيقة
    }

    res.json({ success: true, data: slots, date, therapist_id: req.params.therapistId });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. RECURRING APPOINTMENTS — المواعيد المتكررة
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/recurrences
router.get(
  '/recurrences',
  asyncHandler(async (req, res) => {
    const { beneficiary_id, therapist_id, status } = req.query;
    const filter = { deleted_at: null };

    if (beneficiary_id) filter.beneficiary_id = beneficiary_id;
    if (therapist_id) filter.therapist_id = therapist_id;
    if (status) filter.status = status;

    const recurrences = await AppointmentRecurrence.find(filter)
      .populate('beneficiary_id', 'full_name_ar file_number')
      .populate('therapist_id', 'name specialization')
      .sort({ created_at: -1 });

    res.json({ success: true, data: recurrences, count: recurrences.length });
  })
);

// POST /scheduling-module/recurrences — إنشاء جدول تكرار ومواعيده
router.post(
  '/recurrences',
  asyncHandler(async (req, res) => {
    const recurrence = new AppointmentRecurrence({ ...req.body, created_by: req.user?._id });
    await recurrence.save();

    // توليد المواعيد التلقائية
    const appointments = await waitlistService.generateRecurringAppointments(req.body, recurrence);

    res.status(201).json({
      success: true,
      data: recurrence,
      appointments_generated: appointments.length,
      message: `تم إنشاء جدول التكرار وتوليد ${appointments.length} موعد`,
    });
  })
);

// POST /scheduling-module/recurrences/:id/pause — إيقاف مؤقت
router.post(
  '/recurrences/:id/pause',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const recurrence = await AppointmentRecurrence.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'active' },
      { status: 'paused', pause_reason: req.body.reason, paused_at: new Date() },
      { new: true }
    );
    if (!recurrence)
      return res.status(404).json({ success: false, message: 'جدول التكرار غير موجود' });

    // إلغاء المواعيد المستقبلية
    await Appointment.updateMany(
      {
        recurrence_id: recurrence._id,
        appointment_date: { $gte: new Date() },
        status: 'pending',
      },
      { status: 'cancelled', cancellation_reason: 'تم إيقاف جدول التكرار مؤقتاً' }
    );

    res.json({ success: true, data: recurrence, message: 'تم إيقاف التكرار مؤقتاً' });
  })
);

// POST /scheduling-module/recurrences/:id/resume — استئناف
router.post(
  '/recurrences/:id/resume',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const recurrence = await AppointmentRecurrence.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'paused' },
      { status: 'active', resumed_at: new Date() },
      { new: true }
    );
    if (!recurrence)
      return res.status(404).json({ success: false, message: 'جدول التكرار غير موجود' });

    // توليد المواعيد الجديدة من الآن
    const appointments = await waitlistService.generateRecurringAppointments(
      {
        beneficiary_id: recurrence.beneficiary_id,
        therapist_id: recurrence.therapist_id,
        service_type: recurrence.service_type,
        start_time: recurrence.start_time,
        end_time: recurrence.end_time,
        duration_minutes: recurrence.duration_minutes,
        room_id: recurrence.room_id,
        branch_id: recurrence.branch_id,
      },
      recurrence
    );

    res.json({
      success: true,
      data: recurrence,
      appointments_generated: appointments.length,
      message: 'تم استئناف التكرار',
    });
  })
);

// DELETE /scheduling-module/recurrences/:id
router.delete(
  '/recurrences/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const recurrence = await AppointmentRecurrence.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), status: 'cancelled' },
      { new: true }
    );
    if (!recurrence)
      return res.status(404).json({ success: false, message: 'جدول التكرار غير موجود' });

    // إلغاء المواعيد المستقبلية
    await Appointment.updateMany(
      {
        recurrence_id: recurrence._id,
        appointment_date: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] },
      },
      { status: 'cancelled', cancellation_reason: 'تم إلغاء جدول التكرار' }
    );

    res.json({ success: true, message: 'تم إلغاء جدول التكرار وجميع مواعيده المستقبلية' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. ROOM BOOKINGS — حجز الغرف
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/rooms/bookings
router.get(
  '/rooms/bookings',
  asyncHandler(async (req, res) => {
    const { room_id, date, from_date, to_date, status } = req.query;
    const filter = { deleted_at: null };

    if (room_id) filter.room_id = room_id;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      filter.booking_date = { $gte: d, $lte: dEnd };
    } else if (from_date || to_date) {
      filter.booking_date = {};
      if (from_date) filter.booking_date.$gte = new Date(from_date);
      if (to_date) filter.booking_date.$lte = new Date(to_date);
    }

    const bookings = await RoomBooking.find(filter)
      .populate('room_id', 'room_name room_number floor capacity')
      .populate('appointment_id', 'appointment_number service_type')
      .populate('booked_by', 'name')
      .sort({ booking_date: 1, start_time: 1 });

    res.json({ success: true, data: bookings, count: bookings.length });
  })
);

// POST /scheduling-module/rooms/bookings
router.post(
  '/rooms/bookings',
  asyncHandler(async (req, res) => {
    // التحقق من عدم وجود حجز متعارض
    const conflict = await RoomBooking.findOne({
      room_id: req.body.room_id,
      booking_date: new Date(req.body.booking_date),
      status: { $nin: ['cancelled'] },
      deleted_at: null,
      $or: [
        {
          start_time: { $lt: req.body.end_time },
          end_time: { $gt: req.body.start_time },
        },
      ],
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'الغرفة محجوزة في هذا الوقت',
        conflict: {
          booking_id: conflict._id,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        },
      });
    }

    const booking = new RoomBooking({ ...req.body, booked_by: req.user?._id });
    await booking.save();

    res.status(201).json({ success: true, data: booking, message: 'تم حجز الغرفة بنجاح' });
  })
);

// DELETE /scheduling-module/rooms/bookings/:id
router.delete(
  '/rooms/bookings/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const booking = await RoomBooking.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    res.json({ success: true, message: 'تم إلغاء حجز الغرفة' });
  })
);

// GET /scheduling-module/rooms/:roomId/availability — توفر غرفة في يوم
router.get(
  '/rooms/:roomId/availability',
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'يرجى تحديد التاريخ' });

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(date);
    dEnd.setHours(23, 59, 59, 999);

    const bookings = await RoomBooking.find({
      room_id: req.params.roomId,
      booking_date: { $gte: d, $lte: dEnd },
      status: { $nin: ['cancelled'] },
      deleted_at: null,
    }).select('start_time end_time appointment_id');

    res.json({ success: true, data: bookings, date, room_id: req.params.roomId });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. WAITLIST — قائمة الانتظار
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/waitlist
router.get(
  '/waitlist',
  asyncHandler(async (req, res) => {
    const { service_type, branch_id, status = 'waiting', page = 1, limit = 25 } = req.query;

    const waitlist = await waitlistService.getWaitlist({ service_type, branch_id, status });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedData = waitlist.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: waitlist.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(waitlist.length / parseInt(limit)),
      },
    });
  })
);

// GET /scheduling-module/waitlist/:id
router.get(
  '/waitlist/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const entry = await WaitlistEntry.findOne({ _id: req.params.id, deleted_at: null })
      .populate(
        'beneficiary_id',
        'full_name_ar file_number date_of_birth disability_type disability_severity'
      )
      .populate('therapist_id', 'name specialization')
      .populate('branch_id', 'name_ar')
      .populate('referred_by', 'name');
    if (!entry) return res.status(404).json({ success: false, message: 'الإدخال غير موجود' });
    res.json({ success: true, data: entry });
  })
);

// POST /scheduling-module/waitlist — إضافة لقائمة الانتظار
router.post(
  '/waitlist',
  asyncHandler(async (req, res) => {
    const entry = await waitlistService.addToWaitlist({
      ...req.body,
      created_by: req.user?._id,
    });

    res.status(201).json({
      success: true,
      data: entry,
      priority_score: entry.priority_score,
      estimated_wait: entry.estimated_wait_weeks,
      message: `تمت الإضافة لقائمة الانتظار (الأولوية: ${entry.priority_score})`,
    });
  })
);

// POST /scheduling-module/waitlist/:id/schedule — جدولة موعد من قائمة الانتظار
router.post(
  '/waitlist/:id/schedule',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const result = await waitlistService.scheduleFromWaitlist(
      req.params.id,
      req.body,
      req.user?._id
    );

    if (!result.success) {
      return res
        .status(409)
        .json({ success: false, message: result.message, conflicts: result.conflicts });
    }

    res.json({
      success: true,
      appointment: result.appointment,
      waitlist_entry: result.waitlistEntry,
      message: 'تم تحويل الإدخال إلى موعد بنجاح',
    });
  })
);

// PUT /scheduling-module/waitlist/:id — تحديث بيانات الانتظار
router.put(
  '/waitlist/:id',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const { created_by, priority_score, ...updateData } = req.body;
    const entry = await WaitlistEntry.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'الإدخال غير موجود' });
    res.json({ success: true, data: entry, message: 'تم تحديث بيانات الانتظار' });
  })
);

// POST /scheduling-module/waitlist/:id/remove — إزالة من القائمة
router.post(
  '/waitlist/:id/remove',
  validateObjectId(),
  asyncHandler(async (req, res) => {
    const entry = await WaitlistEntry.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      {
        status: 'removed',
        removed_reason: req.body.reason,
        removed_at: new Date(),
        deleted_at: new Date(),
      },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'الإدخال غير موجود' });
    res.json({ success: true, message: 'تم الإزالة من قائمة الانتظار' });
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. REPORTS — التقارير
// ══════════════════════════════════════════════════════════════════════════════

// GET /scheduling-module/reports/summary — ملخص الجدولة
router.get(
  '/reports/summary',
  asyncHandler(async (req, res) => {
    const { from_date, to_date, branch_id, therapist_id } = req.query;
    const filter = { deleted_at: null };

    if (from_date || to_date) {
      filter.appointment_date = {};
      if (from_date) filter.appointment_date.$gte = new Date(from_date);
      if (to_date) filter.appointment_date.$lte = new Date(to_date);
    }
    if (branch_id) filter.branch_id = branch_id;
    if (therapist_id) filter.therapist_id = therapist_id;

    const [statusSummary, serviceTypeSummary, waitlistCount] = await Promise.all([
      Appointment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total_duration: { $sum: '$duration_minutes' },
          },
        },
      ]),
      Appointment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$service_type',
            count: { $sum: 1 },
            attended: {
              $sum: { $cond: [{ $eq: ['$attendance_status', 'attended'] }, 1, 0] },
            },
          },
        },
      ]),
      WaitlistEntry.countDocuments({ status: 'waiting', deleted_at: null }),
    ]);

    // حساب نسبة الحضور
    const totalCompleted = statusSummary.find(s => s._id === 'completed')?.count || 0;
    const totalScheduled = statusSummary.reduce((sum, s) => sum + s.count, 0);
    const attendanceRate =
      totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

    res.json({
      success: true,
      data: {
        statusSummary,
        serviceTypeSummary,
        waitlistCount,
        attendanceRate,
        totalAppointments: totalScheduled,
      },
    });
  })
);

// GET /scheduling-module/reports/therapist-workload — عبء عمل المعالجين
router.get(
  '/reports/therapist-workload',
  asyncHandler(async (req, res) => {
    const { from_date, to_date } = req.query;
    const filter = {
      deleted_at: null,
      status: { $nin: ['cancelled'] },
    };

    if (from_date || to_date) {
      filter.appointment_date = {};
      if (from_date) filter.appointment_date.$gte = new Date(from_date);
      if (to_date) filter.appointment_date.$lte = new Date(to_date);
    }

    const workload = await Appointment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$therapist_id',
          total_sessions: { $sum: 1 },
          total_minutes: { $sum: '$duration_minutes' },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          unique_beneficiaries: { $addToSet: '$beneficiary_id' },
        },
      },
      {
        $addFields: {
          unique_beneficiaries_count: { $size: '$unique_beneficiaries' },
          completion_rate: {
            $round: [{ $multiply: [{ $divide: ['$completed', '$total_sessions'] }, 100] }, 1],
          },
        },
      },
      { $project: { unique_beneficiaries: 0 } },
    ]);

    // جلب أسماء المعالجين
    const User = mongoose.model('User');
    const therapistIds = workload.map(w => w._id);
    const therapists = await User.find({ _id: { $in: therapistIds } }).select(
      'name specialization'
    );
    const therapistMap = {};
    therapists.forEach(t => {
      therapistMap[t._id.toString()] = t;
    });

    const enrichedWorkload = workload.map(w => ({
      ...w,
      therapist: therapistMap[w._id?.toString()],
    }));

    res.json({ success: true, data: enrichedWorkload });
  })
);

// GET /scheduling-module/reports/no-shows — تقرير الغياب بدون إشعار
router.get(
  '/reports/no-shows',
  asyncHandler(async (req, res) => {
    const { from_date, to_date, therapist_id, page = 1, limit = 20 } = req.query;
    const filter = {
      deleted_at: null,
      attendance_status: 'no_show',
    };

    if (from_date || to_date) {
      filter.appointment_date = {};
      if (from_date) filter.appointment_date.$gte = new Date(from_date);
      if (to_date) filter.appointment_date.$lte = new Date(to_date);
    }
    if (therapist_id) filter.therapist_id = therapist_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Appointment.countDocuments(filter);
    const noShows = await Appointment.find(filter)
      .populate('beneficiary_id', 'full_name_ar file_number phone guardian_phone')
      .populate('therapist_id', 'name')
      .sort({ appointment_date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: noShows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  })
);

module.exports = router;
