'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Appointment Engine — Phase 14 (3/4)
 *  Advanced appointment scheduling, waitlist, auto-scheduling
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const APPOINTMENT_TYPES = [
  'initial_assessment',
  'follow_up',
  'therapy_session',
  'group_session',
  'telerehab',
  'family_meeting',
  'case_conference',
  'evaluation',
  'discharge_review',
  'consultation',
  'home_visit',
  'emergency',
];

const APPOINTMENT_STATUSES = [
  'scheduled',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
  'waitlisted',
];

const RECURRENCE_PATTERNS = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'];

const WAITLIST_PRIORITIES = ['urgent', 'high', 'normal', 'low', 'flexible'];

const CANCELLATION_REASONS = [
  'beneficiary_request',
  'therapist_unavailable',
  'no_show',
  'weather',
  'facility_issue',
  'medical_emergency',
  'scheduling_conflict',
  'other',
];

const BUILTIN_APPOINTMENT_TEMPLATES = [
  {
    code: 'APT-INIT-ASSESS',
    name: 'Initial Assessment',
    nameAr: 'التقييم الأولي',
    type: 'initial_assessment',
    durationMinutes: 60,
    color: '#1976D2',
  },
  {
    code: 'APT-THERAPY-30',
    name: 'Therapy Session (30m)',
    nameAr: 'جلسة علاجية (30 دقيقة)',
    type: 'therapy_session',
    durationMinutes: 30,
    color: '#388E3C',
  },
  {
    code: 'APT-THERAPY-45',
    name: 'Therapy Session (45m)',
    nameAr: 'جلسة علاجية (45 دقيقة)',
    type: 'therapy_session',
    durationMinutes: 45,
    color: '#388E3C',
  },
  {
    code: 'APT-THERAPY-60',
    name: 'Therapy Session (60m)',
    nameAr: 'جلسة علاجية (60 دقيقة)',
    type: 'therapy_session',
    durationMinutes: 60,
    color: '#388E3C',
  },
  {
    code: 'APT-GROUP-60',
    name: 'Group Session (60m)',
    nameAr: 'جلسة جماعية (60 دقيقة)',
    type: 'group_session',
    durationMinutes: 60,
    color: '#F57C00',
  },
  {
    code: 'APT-TELEREHAB',
    name: 'Tele-Rehabilitation',
    nameAr: 'التأهيل عن بُعد',
    type: 'telerehab',
    durationMinutes: 45,
    color: '#7B1FA2',
  },
  {
    code: 'APT-FAMILY',
    name: 'Family Meeting',
    nameAr: 'اجتماع أسري',
    type: 'family_meeting',
    durationMinutes: 45,
    color: '#C2185B',
  },
  {
    code: 'APT-FOLLOWUP',
    name: 'Follow-up Visit',
    nameAr: 'زيارة متابعة',
    type: 'follow_up',
    durationMinutes: 30,
    color: '#00796B',
  },
  {
    code: 'APT-EVAL',
    name: 'Evaluation',
    nameAr: 'تقييم',
    type: 'evaluation',
    durationMinutes: 90,
    color: '#5D4037',
  },
  {
    code: 'APT-DISCHARGE',
    name: 'Discharge Review',
    nameAr: 'مراجعة الخروج',
    type: 'discharge_review',
    durationMinutes: 45,
    color: '#455A64',
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Appointment Schema ── */
const appointmentSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, index: true },
    type: { type: String, enum: APPOINTMENT_TYPES, required: true, index: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true },
    title: String,
    titleAr: String,

    /* Timing */
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    timezone: { type: String, default: 'Asia/Riyadh' },

    /* Resources */
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    roomResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDResource' },
    equipmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DDDResource' }],

    /* Recurrence */
    recurrence: {
      pattern: { type: String, enum: RECURRENCE_PATTERNS, default: 'none' },
      interval: { type: Number, default: 1 },
      endDate: Date,
      occurrences: Number,
      parentAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAppointment' },
    },

    /* Reminders & notifications */
    reminders: [
      {
        type: { type: String, enum: ['sms', 'email', 'push', 'whatsapp'] },
        beforeMinutes: Number,
        sentAt: Date,
        status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
      },
    ],

    /* Cancellation */
    cancellation: {
      reason: { type: String, enum: CANCELLATION_REASONS },
      notes: String,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancelledAt: Date,
    },

    /* Check-in/out */
    checkedInAt: Date,
    checkedOutAt: Date,

    notes: String,
    color: String,
    priority: { type: Number, default: 5, min: 1, max: 10 },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ therapistId: 1, startAt: 1 });
appointmentSchema.index({ beneficiaryId: 1, startAt: 1 });

const DDDAppointment =
  model('DDDAppointment') || mongoose.model('DDDAppointment', appointmentSchema);

/* ── Waitlist Schema ── */
const waitlistSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    serviceType: { type: String, enum: APPOINTMENT_TYPES, required: true, index: true },
    preferredTherapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: WAITLIST_PRIORITIES, default: 'normal', index: true },
    requestedAt: { type: Date, default: Date.now, index: true },
    preferredDays: [{ type: Number, min: 0, max: 6 }], // 0=Sunday
    preferredTimeStart: String, // HH:mm
    preferredTimeEnd: String,
    notes: String,
    status: {
      type: String,
      enum: ['waiting', 'offered', 'accepted', 'expired', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    offeredAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAppointment' },
    offerExpiresAt: Date,
    maxWaitDays: { type: Number, default: 30 },
    notifyVia: [{ type: String, enum: ['sms', 'email', 'push', 'whatsapp'] }],
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDWaitlist = model('DDDWaitlist') || mongoose.model('DDDWaitlist', waitlistSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — AppointmentEngine
   ══════════════════════════════════════════════════════════════ */

class AppointmentEngineService {
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
  async addToWaitlist(data) {
    return DDDWaitlist.create(data);
  }

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

const appointmentEngineService = new AppointmentEngineService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createAppointmentEngineRouter() {
  const r = Router();

  /* ── Appointments CRUD ── */
  r.get(
    '/appointment-engine/appointments',
    safe(async (req, res) => {
      res.json({ success: true, ...(await appointmentEngineService.listAppointments(req.query)) });
    })
  );

  r.get(
    '/appointment-engine/appointments/:id',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.getAppointment(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/appointment-engine/appointments',
    safe(async (req, res) => {
      const result = await appointmentEngineService.createAppointment(req.body);
      if (result.conflict) return res.status(409).json({ success: false, ...result });
      res.status(201).json({ success: true, data: result.appointment });
    })
  );

  r.put(
    '/appointment-engine/appointments/:id',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.updateAppointment(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/appointment-engine/appointments/:id/cancel',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.cancelAppointment(
        req.params.id,
        req.body.reason,
        req.body.cancelledBy
      );
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/appointment-engine/appointments/:id/check-in',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.checkIn(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/appointment-engine/appointments/:id/check-out',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.checkOut(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* ── Recurring ── */
  r.post(
    '/appointment-engine/appointments/recurring',
    safe(async (req, res) => {
      const { template, pattern, count } = req.body;
      if (!template || !pattern)
        return res.status(400).json({ success: false, error: 'template & pattern required' });
      const data = await appointmentEngineService.generateRecurring(template, pattern, count);
      res.status(201).json({ success: true, data, created: data.length });
    })
  );

  /* ── Conflict Check ── */
  r.get(
    '/appointment-engine/conflicts',
    safe(async (req, res) => {
      const { therapistId, startAt, endAt } = req.query;
      if (!therapistId || !startAt || !endAt)
        return res
          .status(400)
          .json({ success: false, error: 'therapistId, startAt, endAt required' });
      const data = await appointmentEngineService.checkConflicts(therapistId, startAt, endAt);
      res.json({ success: true, data, hasConflicts: data.length > 0 });
    })
  );

  /* ── Auto-schedule ── */
  r.post(
    '/appointment-engine/auto-schedule',
    safe(async (req, res) => {
      const { beneficiaryId, serviceType, preferredTherapistId, weekStartDate } = req.body;
      const data = await appointmentEngineService.autoSchedule(
        beneficiaryId,
        serviceType,
        preferredTherapistId,
        weekStartDate
      );
      res.json({ success: true, data });
    })
  );

  /* ── Calendar ── */
  r.get(
    '/appointment-engine/calendar',
    safe(async (req, res) => {
      const data = await appointmentEngineService.getCalendar(req.query);
      res.json({ success: true, data });
    })
  );

  /* ── Waitlist ── */
  r.get(
    '/appointment-engine/waitlist',
    safe(async (req, res) => {
      res.json({ success: true, ...(await appointmentEngineService.listWaitlist(req.query)) });
    })
  );

  r.post(
    '/appointment-engine/waitlist',
    safe(async (req, res) => {
      const doc = await appointmentEngineService.addToWaitlist(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.post(
    '/appointment-engine/waitlist/process',
    safe(async (req, res) => {
      const { serviceType } = req.body;
      if (!serviceType)
        return res.status(400).json({ success: false, error: 'serviceType required' });
      const data = await appointmentEngineService.processWaitlist(serviceType);
      res.json({ success: true, data });
    })
  );

  /* ── Stats ── */
  r.get(
    '/appointment-engine/stats',
    safe(async (req, res) => {
      const data = await appointmentEngineService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* ── Meta ── */
  r.get('/appointment-engine/meta', (_req, res) => {
    res.json({
      success: true,
      appointmentTypes: APPOINTMENT_TYPES,
      appointmentStatuses: APPOINTMENT_STATUSES,
      recurrencePatterns: RECURRENCE_PATTERNS,
      waitlistPriorities: WAITLIST_PRIORITIES,
      cancellationReasons: CANCELLATION_REASONS,
      builtinTemplates: BUILTIN_APPOINTMENT_TEMPLATES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDAppointment,
  DDDWaitlist,
  AppointmentEngineService,
  appointmentEngineService,
  createAppointmentEngineRouter,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  RECURRENCE_PATTERNS,
  WAITLIST_PRIORITIES,
  CANCELLATION_REASONS,
  BUILTIN_APPOINTMENT_TEMPLATES,
};
