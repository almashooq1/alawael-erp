'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Appointment Engine — Phase 14 (3/4)
 *  Advanced appointment scheduling, waitlist, auto-scheduling
 * ═══════════════════════════════════════════════════════════════
 */

const { APPOINTMENT_TYPES, APPOINTMENT_STATUSES, RECURRENCE_PATTERNS, WAITLIST_PRIORITIES, CANCELLATION_REASONS, BUILTIN_APPOINTMENT_TEMPLATES } = require('../models/DddAppointmentEngine');

const BaseCrudService = require('./base/BaseCrudService');

class AppointmentEngineService extends BaseCrudService {
  /* ── Appointments CRUD ── */
  async listAppointments(filter = {}) {
    const q = { isActive: true };
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.therapistId) q.therapistId = oid(filter.therapistId);
    if (filter.type) q.type = filter.type;
    if (filter.status) q.status = filter.status;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.from || filter.to) {
      q.startAt = {};
      if (filter.from) q.startAt.$gte = new Date(filter.from);
      if (filter.to) q.startAt.$lte = new Date(filter.to);
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDAppointment.find(q)
        .sort({ startAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('therapistId', 'name email')
        .lean(),
      DDDAppointment.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getAppointment(id) {
    return DDDAppointment.findById(oid(id))
      .populate('therapistId', 'name email')
      .populate('roomResourceId', 'name code type')
      .lean();
  }

  async createAppointment(data) {
    // Auto-generate code
    if (!data.code) {
      const count = await DDDAppointment.countDocuments();
      data.code = `APT-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
    }
    // Calculate endAt if not provided
    if (!data.endAt && data.startAt && data.durationMinutes) {
      data.endAt = new Date(new Date(data.startAt).getTime() + data.durationMinutes * 60000);
    }

    // Conflict check
    const conflicts = await this.checkConflicts(data.therapistId, data.startAt, data.endAt);
    if (conflicts.length > 0) {
      return { conflict: true, conflicts, message: 'Therapist has conflicting appointments' };
    }

    const appt = await DDDAppointment.create(data);

    // Auto-allocate resource if room specified
    if (data.roomResourceId) {
      const ResourceAlloc = model('DDDResourceAllocation');
      if (ResourceAlloc) {
        await ResourceAlloc.create({
          resourceId: oid(data.roomResourceId),
          allocationType: 'session',
          beneficiaryId: data.beneficiaryId ? oid(data.beneficiaryId) : undefined,
          startAt: data.startAt,
          endAt: data.endAt || appt.endAt,
          status: 'confirmed',
        });
      }
    }

    return { conflict: false, appointment: appt };
  }

  async updateAppointment(id, data) {
    return DDDAppointment.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async cancelAppointment(id, reason, cancelledBy) {
    return DDDAppointment.findByIdAndUpdate(
      oid(id),
      {
        $set: {
          status: 'cancelled',
          'cancellation.reason': reason,
          'cancellation.cancelledBy': cancelledBy ? oid(cancelledBy) : undefined,
          'cancellation.cancelledAt': new Date(),
        },
      },
      { new: true }
    ).lean();
  }

  async checkIn(id) {
    return DDDAppointment.findByIdAndUpdate(
      oid(id),
      {
        $set: { status: 'checked_in', checkedInAt: new Date() },
      },
      { new: true }
    ).lean();
  }

  async checkOut(id) {
    return DDDAppointment.findByIdAndUpdate(
      oid(id),
      {
        $set: { status: 'completed', checkedOutAt: new Date() },
      },
      { new: true }
    ).lean();
  }

  /* ── Conflict Detection ── */
  async checkConflicts(therapistId, startAt, endAt) {
    if (!therapistId) return [];
    return DDDAppointment.find({
      therapistId: oid(therapistId),
      isActive: true,
      status: { $nin: ['cancelled', 'no_show'] },
      startAt: { $lt: new Date(endAt) },
      endAt: { $gt: new Date(startAt) },
    }).lean();
  }

  /* ── Recurrence Generator ── */
  async generateRecurring(templateData, pattern, count = 10) {
    const appointments = [];
    let currentDate = new Date(templateData.startAt);

    for (let i = 0; i < count; i++) {
      const start = new Date(currentDate);
      const end = new Date(start.getTime() + (templateData.durationMinutes || 45) * 60000);

      const apptData = {
        ...templateData,
        startAt: start,
        endAt: end,
        'recurrence.pattern': pattern,
        'recurrence.parentAppointmentId': appointments[0]?._id,
      };

      const result = await this.createAppointment(apptData);
      if (!result.conflict) {
        appointments.push(result.appointment);
      }

      // Advance date
      switch (pattern) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    return appointments;
  }

  /* ── Waitlist ── */
  async addToWaitlist(data) { return this._create(DDDWaitlist, data); }

  async listWaitlist(filter = {}) {
    const q = { status: 'waiting' };
    if (filter.serviceType) q.serviceType = filter.serviceType;
    if (filter.priority) q.priority = filter.priority;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4, flexible: 5 };
    const [docs, total] = await Promise.all([
      DDDWaitlist.find(q)
        .sort({ priority: 1, requestedAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDWaitlist.countDocuments(q),
    ]);
    // Sort by priority enum order
    docs.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async processWaitlist(serviceType) {
    const waiting = await DDDWaitlist.find({ status: 'waiting', serviceType })
      .sort({ priority: 1, requestedAt: 1 })
      .limit(10)
      .lean();

    const processed = [];
    for (const entry of waiting) {
      // Try to find available slot
      const Resource = model('DDDResource');
      if (!Resource) break;

      // Simple: check if any therapist is available in the next 7 days
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Mark as offered (real implementation would find specific slot)
      await DDDWaitlist.findByIdAndUpdate(entry._id, {
        $set: { status: 'offered', offerExpiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      });
      processed.push(entry);
    }

    return { processed: processed.length, entries: processed };
  }

  /* ── Auto-Schedule ── */
  async autoSchedule(beneficiaryId, serviceType, preferredTherapistId, weekStartDate) {
    const Resource = model('DDDResource');
    const AvailSlot = model('DDDAvailabilitySlot');
    if (!Resource || !AvailSlot)
      return { scheduled: false, reason: 'Resource models not available' };

    const startDate = new Date(weekStartDate || Date.now());
    const suggestions = [];

    // Find therapist availability
    const therapistQuery = preferredTherapistId
      ? { _id: oid(preferredTherapistId) }
      : { type: 'therapist', isActive: true, status: 'available' };

    const therapists = await Resource.find(therapistQuery).limit(5).lean();

    for (const therapist of therapists) {
      const slots = await AvailSlot.find({
        resourceId: therapist._id,
        isActive: true,
      }).lean();

      for (const slot of slots) {
        // Check each day in the coming week
        for (let d = 0; d < 7; d++) {
          const day = new Date(startDate);
          day.setDate(day.getDate() + d);
          if (day.getDay() !== slot.dayOfWeek) continue;

          const [sh, sm] = slot.startTime.split(':').map(Number);
          const slotStart = new Date(day);
          slotStart.setHours(sh, sm, 0, 0);
          const [eh, em] = slot.endTime.split(':').map(Number);
          const slotEnd = new Date(day);
          slotEnd.setHours(eh, em, 0, 0);

          const conflicts = await this.checkConflicts(
            therapist.linkedUserId || therapist._id,
            slotStart,
            slotEnd
          );
          if (conflicts.length === 0) {
            suggestions.push({
              therapistId: therapist.linkedUserId || therapist._id,
              therapistName: therapist.name,
              date: day.toISOString().split('T')[0],
              startTime: slot.startTime,
              endTime: slot.endTime,
              dayOfWeek: slot.dayOfWeek,
            });
          }
        }
      }
    }

    return { suggestions, count: suggestions.length };
  }

  /* ── Calendar view ── */
  async getCalendar(filter = {}) {
    const q = { isActive: true, status: { $nin: ['cancelled'] } };
    if (filter.therapistId) q.therapistId = oid(filter.therapistId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);

    const from = filter.from ? new Date(filter.from) : new Date();
    const to = filter.to ? new Date(filter.to) : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    q.startAt = { $gte: from, $lte: to };

    const appointments = await DDDAppointment.find(q)
      .sort({ startAt: 1 })
      .populate('therapistId', 'name')
      .lean();

    // Group by date
    const calendar = {};
    for (const appt of appointments) {
      const dateKey = new Date(appt.startAt).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(appt);
    }

    return { from, to, calendar, totalAppointments: appointments.length };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const q = { isActive: true, tenant };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, todayCount, waitlistCount, cancelledThisMonth, noShowThisMonth] =
      await Promise.all([
        DDDAppointment.countDocuments(q),
        DDDAppointment.countDocuments({ ...q, startAt: { $gte: today, $lt: tomorrow } }),
        DDDWaitlist.countDocuments({ status: 'waiting', tenant }),
        DDDAppointment.countDocuments({
          ...q,
          status: 'cancelled',
          'cancellation.cancelledAt': { $gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        }),
        DDDAppointment.countDocuments({
          ...q,
          status: 'no_show',
          startAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) },
        }),
      ]);

    return {
      total,
      todayCount,
      waitlistCount,
      cancelledThisMonth,
      noShowThisMonth,
      templateCount: BUILTIN_APPOINTMENT_TEMPLATES.length,
    };
  }
}

module.exports = new AppointmentEngineService();
