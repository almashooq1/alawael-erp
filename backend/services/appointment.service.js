/* eslint-disable no-unused-vars */
/**
 * خدمة إدارة المواعيد والجلسات المتقدمة
 * Appointment & Session Enhanced Service
 *
 * Handles: appointment booking, recurring generation, room conflicts,
 * notification triggers, and conversion of appointments to therapy sessions.
 */

const mongoose = require('mongoose');
const TherapySession = require('../models/TherapySession');
const Appointment = require('../models/Appointment');
const TherapistAvailability = require('../models/TherapistAvailability');
const TherapyRoom = require('../models/TherapyRoom');
const logger = require('../utils/logger');
const { AppError } = require('../errors/AppError');
const { escapeRegex } = require('../utils/sanitize');

class AppointmentService {
  // ─── APPOINTMENT CRUD ───────────────────────────────────────────────

  /**
   * Create a new appointment with validation
   */
  async createAppointment(data, userId) {
    // Validate: no double-booking for therapist
    if (data.therapist && data.date && data.startTime) {
      const conflict = await this.checkTherapistConflict(
        data.therapist,
        data.date,
        data.startTime,
        data.endTime || this._addMinutes(data.startTime, data.duration || 30)
      );
      if (conflict) {
        throw new AppError(`تعارض في الموعد: ${conflict.reason}`, 409, 'APPOINTMENT_CONFLICT');
      }
    }

    // Validate: room availability
    if (data.room && data.date && data.startTime) {
      const roomConflict = await this.checkRoomConflict(
        data.room,
        data.date,
        data.startTime,
        data.endTime || this._addMinutes(data.startTime, data.duration || 30)
      );
      if (roomConflict) {
        throw new AppError(`الغرفة محجوزة: ${roomConflict.reason}`, 409, 'ROOM_CONFLICT');
      }
    }

    const appointment = new Appointment({
      ...data,
      createdBy: userId,
      reminders: data.reminders || [
        { type: 'sms', minutesBefore: 60 },
        { type: 'push', minutesBefore: 30 },
      ],
    });

    await appointment.save();

    // Generate recurring appointments if needed
    if (data.recurrence && data.recurrence !== 'none' && data.recurrenceEnd) {
      await this.generateRecurringAppointments(appointment);
    }

    return appointment;
  }

  /**
   * List appointments with pagination, filters
   */
  async listAppointments(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      therapist,
      beneficiary,
      bookedBy,
      startDate,
      endDate,
      priority,
      search,
      sortBy = 'date',
      sortOrder = 'asc',
    } = query;

    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.type = type;
    if (therapist) filter.therapist = therapist;
    if (beneficiary) filter.beneficiary = beneficiary;
    if (bookedBy) filter.bookedBy = bookedBy;
    if (priority) filter.priority = priority;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { beneficiaryName: { $regex: escapeRegex(search), $options: 'i' } },
        { therapistName: { $regex: escapeRegex(search), $options: 'i' } },
        { appointmentNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { reason: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('beneficiary', 'firstName lastName fullName')
        .populate('therapist', 'firstName lastName fullName specialization')
        .populate('room', 'name type capacity')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Appointment.countDocuments(filter),
    ]);

    return {
      data: appointments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get single appointment by ID
   */
  async getAppointment(id) {
    const apt = await Appointment.findById(id)
      .populate('beneficiary', 'firstName lastName fullName')
      .populate('therapist', 'firstName lastName fullName specialization')
      .populate('room', 'name type capacity')
      .populate('linkedSession')
      .lean();
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');
    return apt;
  }

  /**
   * Update appointment
   */
  async updateAppointment(id, data, userId) {
    const apt = await Appointment.findById(id);
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');

    // Prevent editing completed/cancelled appointments
    if (['COMPLETED', 'CANCELLED'].includes(apt.status)) {
      throw new AppError('لا يمكن تعديل موعد مكتمل أو ملغي', 409, 'IMMUTABLE_STATE');
    }

    // If rescheduling: validate new time
    if (data.date || data.startTime) {
      const newDate = data.date || apt.date;
      const newStart = data.startTime || apt.startTime;
      const newEnd =
        data.endTime ||
        apt.endTime ||
        this._addMinutes(newStart, data.duration || apt.duration || 30);

      if (apt.therapist) {
        const conflict = await this.checkTherapistConflict(
          apt.therapist,
          newDate,
          newStart,
          newEnd,
          id
        );
        if (conflict)
          throw new AppError(`تعارض في الموعد: ${conflict.reason}`, 409, 'APPOINTMENT_CONFLICT');
      }
      if (data.room || apt.room) {
        const roomConflict = await this.checkRoomConflict(
          data.room || apt.room,
          newDate,
          newStart,
          newEnd,
          id
        );
        if (roomConflict)
          throw new AppError(`الغرفة محجوزة: ${roomConflict.reason}`, 409, 'ROOM_CONFLICT');
      }
    }

    // Track status change
    if (data.status && data.status !== apt.status) {
      apt.statusHistory.push({
        from: apt.status,
        to: data.status,
        changedBy: userId,
        reason: data.statusChangeReason || '',
      });
    }

    Object.assign(apt, data);
    await apt.save();
    return apt;
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(id, reason, userId) {
    const apt = await Appointment.findById(id);
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');

    apt.statusHistory.push({ from: apt.status, to: 'CANCELLED', changedBy: userId, reason });
    apt.status = 'CANCELLED';
    apt.cancellationReason = reason;
    apt.cancelledBy = userId;
    apt.cancelledAt = new Date();
    await apt.save();
    return apt;
  }

  /**
   * Check-in patient
   */
  async checkIn(id, userId) {
    const apt = await Appointment.findById(id);
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');

    apt.statusHistory.push({ from: apt.status, to: 'CHECKED_IN', changedBy: userId });
    apt.status = 'CHECKED_IN';
    apt.checkInTime = new Date();

    // Calculate wait time
    const scheduledTime = new Date(apt.date);
    if (apt.startTime) {
      const [h, m] = apt.startTime.split(':').map(Number);
      scheduledTime.setHours(h, m, 0, 0);
    }
    const waitMs = apt.checkInTime - scheduledTime;
    apt.waitTimeMinutes = Math.max(0, Math.round(waitMs / 60000));

    await apt.save();
    return apt;
  }

  /**
   * Convert appointment to therapy session
   */
  async convertToSession(appointmentId, sessionData, userId) {
    const apt = await Appointment.findById(appointmentId);
    if (!apt) throw new AppError('الموعد غير موجود', 404, 'NOT_FOUND');

    const session = new TherapySession({
      title: sessionData.title || `جلسة - ${apt.type}`,
      sessionType: this._mapAppointmentTypeToSession(apt.type),
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      duration: apt.duration,
      beneficiary: apt.beneficiary,
      therapist: apt.therapist,
      room: apt.room,
      status: 'SCHEDULED',
      notes: sessionData.notes || { subjective: apt.reason || '' },
      plan: sessionData.plan,
      createdBy: userId,
      ...sessionData,
    });

    await session.save();

    // Link appointment to session
    apt.linkedSession = session._id;
    apt.statusHistory.push({
      from: apt.status,
      to: 'IN_PROGRESS',
      changedBy: userId,
      reason: 'تحويل إلى جلسة',
    });
    apt.status = 'IN_PROGRESS';
    await apt.save();

    return { appointment: apt, session };
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(query = {}) {
    const { startDate, endDate, therapist } = query;
    const match = {};
    if (therapist) match.therapist = new mongoose.Types.ObjectId(therapist);
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const [byStatus, byType, dailyCount, avgWait] = await Promise.all([
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: match },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Appointment.aggregate([
        { $match: { ...match, date: { $gte: new Date(Date.now() - 7 * 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Appointment.aggregate([
        { $match: { ...match, waitTimeMinutes: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, avgWait: { $avg: '$waitTimeMinutes' } } },
      ]),
    ]);

    const statusMap = {};
    byStatus.forEach(s => {
      statusMap[s._id] = s.count;
    });

    return {
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      byStatus: statusMap,
      byType: byType.map(t => ({ type: t._id, count: t.count })),
      dailyCount,
      averageWaitTime: Math.round(avgWait[0]?.avgWait || 0),
      completionRate: statusMap.COMPLETED
        ? Math.round(
            (statusMap.COMPLETED / Object.values(statusMap).reduce((a, b) => a + b, 0)) * 100
          )
        : 0,
      noShowRate: statusMap.NO_SHOW
        ? Math.round(
            (statusMap.NO_SHOW / Object.values(statusMap).reduce((a, b) => a + b, 0)) * 100
          )
        : 0,
    };
  }

  // ─── RECURRING GENERATION ───────────────────────────────────────────

  /**
   * Generate recurring appointments from a parent appointment
   */
  async generateRecurringAppointments(parent) {
    if (!parent.recurrence || parent.recurrence === 'none' || !parent.recurrenceEnd) return [];

    const generated = [];
    const intervalDays = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
    };

    const interval = intervalDays[parent.recurrence] || 7;
    const currentDate = new Date(parent.date);
    currentDate.setDate(currentDate.getDate() + interval);
    const endDate = new Date(parent.recurrenceEnd);

    while (currentDate <= endDate) {
      // Skip weekends (Friday = 5, Saturday = 6)
      const dow = currentDate.getDay();
      if (dow === 5 || dow === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const child = new Appointment({
        beneficiary: parent.beneficiary,
        beneficiaryName: parent.beneficiaryName,
        beneficiaryPhone: parent.beneficiaryPhone,
        bookedBy: parent.bookedBy,
        therapist: parent.therapist,
        therapistName: parent.therapistName,
        department: parent.department,
        type: parent.type,
        date: new Date(currentDate),
        startTime: parent.startTime,
        endTime: parent.endTime,
        duration: parent.duration,
        room: parent.room,
        location: parent.location,
        status: 'PENDING',
        priority: parent.priority,
        reason: parent.reason,
        recurrenceParent: parent._id,
        source: parent.source,
        createdBy: parent.createdBy,
        reminders: parent.reminders.map(r => ({
          type: r.type,
          minutesBefore: r.minutesBefore,
          sent: false,
        })),
      });

      try {
        await child.save();
        generated.push(child);
      } catch (err) {
        logger.warn(
          `Skipping recurring appointment on ${currentDate.toISOString().split('T')[0]}: ${err.message}`
        );
      }

      currentDate.setDate(currentDate.getDate() + interval);
    }

    logger.info(`Generated ${generated.length} recurring appointments from parent ${parent._id}`);
    return generated;
  }

  /**
   * Generate recurring therapy sessions from a parent session
   */
  async generateRecurringSessions(parentId) {
    const parent = await TherapySession.findById(parentId);
    if (!parent) throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');
    if (!parent.recurrence || parent.recurrence === 'none') {
      throw new AppError('الجلسة ليست متكررة', 400, 'NOT_RECURRING');
    }

    const endDate = parent.recurrenceEnd || new Date(Date.now() + 90 * 86400000); // Default 90 days
    const intervalDays = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
    const interval = intervalDays[parent.recurrence] || 7;

    const generated = [];
    const currentDate = new Date(parent.date);
    currentDate.setDate(currentDate.getDate() + interval);

    while (currentDate <= endDate) {
      const dow = currentDate.getDay();
      if (dow === 5 || dow === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check therapist conflict for this slot
      const conflict = await this.checkTherapistConflict(
        parent.therapist,
        currentDate,
        parent.startTime,
        parent.endTime
      );
      if (conflict) {
        logger.warn(
          `Skipping recurring session on ${currentDate.toISOString().split('T')[0]}: ${conflict.reason}`
        );
        currentDate.setDate(currentDate.getDate() + interval);
        continue;
      }

      const child = new TherapySession({
        title: parent.title,
        sessionType: parent.sessionType,
        date: new Date(currentDate),
        startTime: parent.startTime,
        endTime: parent.endTime,
        duration: parent.duration,
        participants: parent.participants,
        recurrence: 'none', // Children are not themselves recurring
        recurrenceParent: parent._id,
        plan: parent.plan,
        beneficiary: parent.beneficiary,
        therapist: parent.therapist,
        room: parent.room,
        location: parent.location,
        priority: parent.priority,
        status: 'SCHEDULED',
        createdBy: parent.createdBy,
        reminders:
          parent.reminders?.map(r => ({
            type: r.type,
            minutesBefore: r.minutesBefore,
            sent: false,
          })) || [],
      });

      try {
        await child.save();
        generated.push(child);
      } catch (err) {
        logger.warn(`Error creating recurring session: ${err.message}`);
      }

      currentDate.setDate(currentDate.getDate() + interval);
    }

    logger.info(`Generated ${generated.length} recurring sessions from parent ${parent._id}`);
    return generated;
  }

  // ─── CONFLICT DETECTION ─────────────────────────────────────────────

  /**
   * Check therapist scheduling conflict (across both appointments and sessions)
   */
  async checkTherapistConflict(therapistId, date, startTime, endTime, excludeId = null) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const effectiveEnd = endTime || this._addMinutes(startTime, 30);

    // Check sessions
    const sessionQuery = {
      therapist: therapistId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      $or: [
        { startTime: { $lt: effectiveEnd }, endTime: { $gt: startTime } },
        { startTime: { $gte: startTime, $lt: effectiveEnd } },
      ],
    };
    if (excludeId) sessionQuery._id = { $ne: excludeId };

    const conflictSession = await TherapySession.findOne(sessionQuery).lean();
    if (conflictSession) {
      return {
        reason: `تعارض مع جلسة ${conflictSession.title || ''} (${conflictSession.startTime}-${conflictSession.endTime})`,
      };
    }

    // Check appointments
    const aptQuery = {
      therapist: therapistId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      $or: [
        { startTime: { $lt: effectiveEnd }, endTime: { $gt: startTime } },
        { startTime: { $gte: startTime, $lt: effectiveEnd } },
      ],
    };
    if (excludeId) aptQuery._id = { $ne: excludeId };

    const conflictApt = await Appointment.findOne(aptQuery).lean();
    if (conflictApt) {
      return {
        reason: `تعارض مع موعد ${conflictApt.beneficiaryName || ''} (${conflictApt.startTime}-${conflictApt.endTime})`,
      };
    }

    // Check daily limit
    const availability = await TherapistAvailability.findOne({ therapist: therapistId });
    if (availability) {
      const maxPerDay = availability.preferences?.maxSessionsPerDay || 8;
      const countToday = await TherapySession.countDocuments({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      });
      const aptCountToday = await Appointment.countDocuments({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'] },
      });
      if (countToday + aptCountToday >= maxPerDay) {
        return { reason: `تم الوصول للحد الأقصى اليومي (${maxPerDay} موعد/جلسة)` };
      }
    }

    return null; // No conflict
  }

  /**
   * Check room scheduling conflict
   */
  async checkRoomConflict(roomId, date, startTime, endTime, excludeId = null) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const effectiveEnd = endTime || this._addMinutes(startTime, 30);

    // Check room in sessions
    const sessionQuery = {
      room: roomId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      $or: [
        { startTime: { $lt: effectiveEnd }, endTime: { $gt: startTime } },
        { startTime: { $gte: startTime, $lt: effectiveEnd } },
      ],
    };
    if (excludeId) sessionQuery._id = { $ne: excludeId };

    const cs = await TherapySession.findOne(sessionQuery).lean();
    if (cs) {
      return { reason: `الغرفة محجوزة لجلسة ${cs.title || ''} (${cs.startTime}-${cs.endTime})` };
    }

    // Check room in appointments
    const aptQuery = {
      room: roomId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      $or: [
        { startTime: { $lt: effectiveEnd }, endTime: { $gt: startTime } },
        { startTime: { $gte: startTime, $lt: effectiveEnd } },
      ],
    };
    if (excludeId) aptQuery._id = { $ne: excludeId };

    const ca = await Appointment.findOne(aptQuery).lean();
    if (ca) {
      return { reason: `الغرفة محجوزة لموعد (${ca.startTime}-${ca.endTime})` };
    }

    // Check room maintenance
    const room = await TherapyRoom.findById(roomId);
    if (room && room.isMaintenance) {
      return { reason: 'الغرفة في وضع الصيانة' };
    }

    return null;
  }

  /**
   * Get available time slots for a therapist on a given date
   */
  async getAvailableSlots(therapistId, date, durationMinutes = 30) {
    const availability = await TherapistAvailability.findOne({ therapist: therapistId });

    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[new Date(date).getDay()];

    // Get recurring schedule for this day
    const daySlots =
      availability?.recurringSchedule?.filter(s => s.dayOfWeek === dayOfWeek && s.isActive) || [];

    if (daySlots.length === 0) {
      // Default: 8:00-16:00 if no availability set
      daySlots.push({ startTime: '08:00', endTime: '16:00' });
    }

    // Check exceptions for this date
    if (availability?.exceptions) {
      const exception = availability.exceptions.find(e => {
        const exDate = new Date(e.date);
        const targetDate = new Date(date);
        return exDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
      });
      if (exception && !exception.isAvailable) {
        return { available: false, reason: exception.reason || 'يوم إجازة', slots: [] };
      }
      if (exception && exception.isAvailable && exception.slots?.length) {
        daySlots.length = 0;
        daySlots.push(...exception.slots);
      }
    }

    // Get existing bookings for the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [sessions, appointments] = await Promise.all([
      TherapySession.find({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      }).lean(),
      Appointment.find({
        therapist: therapistId,
        date: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      }).lean(),
    ]);

    // Build busy intervals
    const busy = [];
    [...sessions, ...appointments].forEach(item => {
      if (item.startTime) {
        const end = item.endTime || this._addMinutes(item.startTime, item.duration || 30);
        busy.push({ start: this._timeToMinutes(item.startTime), end: this._timeToMinutes(end) });
      }
    });
    busy.sort((a, b) => a.start - b.start);

    // Generate free slots
    const freeSlots = [];
    const minBreak = availability?.preferences?.minBreakBetweenSessions || 15;

    for (const daySlot of daySlots) {
      let cursor = this._timeToMinutes(daySlot.startTime);
      const daySlotEnd = this._timeToMinutes(daySlot.endTime);

      // Skip break time
      const breakStart = daySlot.breakStart ? this._timeToMinutes(daySlot.breakStart) : null;
      const breakEnd = daySlot.breakEnd ? this._timeToMinutes(daySlot.breakEnd) : null;

      while (cursor + durationMinutes <= daySlotEnd) {
        const slotEnd = cursor + durationMinutes;

        // Skip if in break time
        if (breakStart !== null && breakEnd !== null) {
          if (cursor < breakEnd && slotEnd > breakStart) {
            cursor = breakEnd;
            continue;
          }
        }

        // Check if slot overlaps with busy intervals
        const isBusy = busy.some(b => cursor < b.end + minBreak && slotEnd > b.start - minBreak);

        if (!isBusy) {
          freeSlots.push({
            startTime: this._minutesToTime(cursor),
            endTime: this._minutesToTime(slotEnd),
            duration: durationMinutes,
          });
        }

        cursor += durationMinutes; // Move to next potential slot
      }
    }

    return {
      available: freeSlots.length > 0,
      date: new Date(date).toISOString().split('T')[0],
      therapistId,
      totalSlots: freeSlots.length,
      slots: freeSlots,
    };
  }

  /**
   * Get available rooms for a date/time
   */
  async getAvailableRooms(date, startTime, endTime, roomType) {
    const roomFilter = { isMaintenance: false };
    if (roomType) roomFilter.type = roomType;

    const allRooms = await TherapyRoom.find(roomFilter).lean();

    const available = [];
    for (const room of allRooms) {
      const conflict = await this.checkRoomConflict(room._id, date, startTime, endTime);
      if (!conflict) {
        available.push(room);
      }
    }

    return available;
  }

  // ─── SESSION ENHANCEMENTS ──────────────────────────────────────────

  /**
   * Add reminders to a session
   */
  async addReminders(sessionId, reminders = []) {
    const session = await TherapySession.findById(sessionId);
    if (!session) throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');

    session.reminders = reminders.map(r => ({
      type: r.type || 'push',
      minutesBefore: r.minutesBefore || 60,
      sent: false,
    }));
    await session.save();
    return session;
  }

  /**
   * Track goal progress in a session
   */
  async updateGoalProgress(sessionId, goalsProgress) {
    const session = await TherapySession.findById(sessionId);
    if (!session) throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');

    session.goalsProgress = goalsProgress;
    await session.save();
    return session;
  }

  /**
   * Get session history with status changes
   */
  async getSessionHistory(sessionId) {
    const session = await TherapySession.findById(sessionId)
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean();
    if (!session) throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');
    return session.statusHistory || [];
  }

  /**
   * Update session status with history tracking
   */
  async updateSessionStatusTracked(sessionId, newStatus, reason, userId) {
    const session = await TherapySession.findById(sessionId);
    if (!session) throw new AppError('الجلسة غير موجودة', 404, 'NOT_FOUND');

    const oldStatus = session.status;
    session.statusHistory = session.statusHistory || [];
    session.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      changedBy: userId,
      reason,
    });
    session.status = newStatus;

    if (newStatus === 'CANCELLED_BY_PATIENT' || newStatus === 'CANCELLED_BY_CENTER') {
      session.cancellationReason = reason;
    }
    if (newStatus === 'NO_SHOW') {
      session.noShowReason = reason;
    }

    await session.save();
    return session;
  }

  /**
   * Get today's schedule for a therapist (combined sessions + appointments)
   */
  async getTodaySchedule(therapistId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [sessions, appointments] = await Promise.all([
      TherapySession.find({
        therapist: therapistId,
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      })
        .populate('beneficiary', 'firstName lastName fullName')
        .populate('room', 'name type')
        .sort({ startTime: 1 })
        .lean(),
      Appointment.find({
        therapist: therapistId,
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      })
        .populate('beneficiary', 'firstName lastName fullName')
        .populate('room', 'name type')
        .sort({ startTime: 1 })
        .lean(),
    ]);

    // Merge and sort
    const combined = [
      ...sessions.map(s => ({ ...s, itemType: 'session' })),
      ...appointments.map(a => ({ ...a, itemType: 'appointment' })),
    ].sort((a, b) => {
      const aTime = a.startTime || '00:00';
      const bTime = b.startTime || '00:00';
      return aTime.localeCompare(bTime);
    });

    return {
      date: today.toISOString().split('T')[0],
      therapistId,
      totalSessions: sessions.length,
      totalAppointments: appointments.length,
      totalItems: combined.length,
      items: combined,
    };
  }

  /**
   * Get pending reminders (for notification trigger)
   */
  async getPendingReminders() {
    const now = new Date();

    // Sessions with unsent reminders
    const sessions = await TherapySession.find({
      status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      date: { $gte: now },
      'reminders.sent': false,
    }).lean();

    const appointments = await Appointment.find({
      status: { $in: ['PENDING', 'CONFIRMED'] },
      date: { $gte: now },
      'reminders.sent': false,
    }).lean();

    const pending = [];

    const processReminders = (items, itemType) => {
      for (const item of items) {
        if (!item.reminders) continue;
        for (const reminder of item.reminders) {
          if (reminder.sent) continue;
          const itemDate = new Date(item.date);
          if (item.startTime) {
            const [h, m] = item.startTime.split(':').map(Number);
            itemDate.setHours(h, m, 0, 0);
          }
          const triggerTime = new Date(itemDate.getTime() - reminder.minutesBefore * 60000);
          if (triggerTime <= now) {
            pending.push({
              itemType,
              itemId: item._id,
              reminder,
              scheduledFor: itemDate,
              beneficiary: item.beneficiary,
              therapist: item.therapist,
            });
          }
        }
      }
    };

    processReminders(sessions, 'session');
    processReminders(appointments, 'appointment');

    return pending;
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(itemType, itemId, reminderIndex) {
    const Model = itemType === 'session' ? TherapySession : Appointment;
    const item = await Model.findById(itemId);
    if (!item || !item.reminders[reminderIndex]) return null;

    item.reminders[reminderIndex].sent = true;
    item.reminders[reminderIndex].sentAt = new Date();
    await item.save();
    return item;
  }

  // ─── HELPER METHODS ─────────────────────────────────────────────────

  _timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  _minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  _addMinutes(timeStr, minutes) {
    const total = this._timeToMinutes(timeStr) + minutes;
    return this._minutesToTime(total);
  }

  _mapAppointmentTypeToSession(aptType) {
    const map = {
      'علاج طبيعي': 'علاج طبيعي',
      'علاج وظيفي': 'علاج وظيفي',
      'نطق وتخاطب': 'نطق وتخاطب',
      'علاج سلوكي': 'علاج سلوكي',
      'علاج نفسي': 'علاج نفسي',
    };
    return map[aptType] || 'أخرى';
  }
}

module.exports = new AppointmentService();
