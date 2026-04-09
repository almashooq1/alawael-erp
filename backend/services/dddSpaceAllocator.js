/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Space Allocator — Phase 19 · Facility & Environment Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Room booking, space reservations, utilization tracking, capacity management,
 * and resource scheduling for clinical and administrative spaces.
 *
 * Aggregates
 *   DDDSpaceReservation  — room / space booking record
 *   DDDSpaceSchedule     — recurring schedule template
 *   DDDSpaceUtilization  — occupancy & utilization metrics
 *   DDDSpaceRequest      — space allocation requests & approvals
 *
 * Canonical links
 *   roomId       → DDDRoom (dddFacilityManager)
 *   buildingId   → DDDBuilding (dddFacilityManager)
 *   requestedBy  → User
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const RESERVATION_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'in_use',
  'completed',
  'cancelled',
  'no_show',
  'waitlisted',
  'rescheduled',
  'expired',
];

const RESERVATION_TYPES = [
  'therapy_session',
  'group_therapy',
  'consultation',
  'assessment',
  'meeting',
  'training',
  'event',
  'maintenance',
  'cleaning',
  'setup',
  'telehealth',
  'walk_in',
];

const SCHEDULE_RECURRENCE = [
  'daily',
  'weekdays',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'custom',
  'one_time',
  'weekends',
  'specific_days',
];

const UTILIZATION_METRICS = [
  'occupancy_rate',
  'booking_rate',
  'no_show_rate',
  'cancellation_rate',
  'average_duration',
  'peak_hours',
  'turnaround_time',
  'revenue_per_hour',
  'patient_throughput',
  'staff_utilization',
];

const REQUEST_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'allocated',
  'pending_modification',
  'withdrawn',
  'waitlisted',
  'expired',
];

const SPACE_PRIORITIES = ['routine', 'standard', 'high', 'urgent', 'emergency', 'vip', 'research'];

/* ── Built-in schedule templates ────────────────────────────────────────── */
const BUILTIN_SCHEDULES = [
  {
    code: 'SCH-THER-MWF',
    name: 'Therapy Room MWF Morning',
    recurrence: 'specific_days',
    startTime: '08:00',
    endTime: '12:00',
    days: ['mon', 'wed', 'fri'],
  },
  {
    code: 'SCH-THER-TTH',
    name: 'Therapy Room TTh Afternoon',
    recurrence: 'specific_days',
    startTime: '13:00',
    endTime: '17:00',
    days: ['tue', 'thu'],
  },
  {
    code: 'SCH-GRP-DAILY',
    name: 'Group Therapy Daily',
    recurrence: 'weekdays',
    startTime: '10:00',
    endTime: '11:30',
  },
  {
    code: 'SCH-ASSESS-WK',
    name: 'Assessment Weekly',
    recurrence: 'weekly',
    startTime: '09:00',
    endTime: '16:00',
  },
  {
    code: 'SCH-MEET-BIWEEK',
    name: 'Team Meeting Biweekly',
    recurrence: 'biweekly',
    startTime: '14:00',
    endTime: '15:00',
  },
  {
    code: 'SCH-CLEAN-DAILY',
    name: 'Daily Cleaning Schedule',
    recurrence: 'daily',
    startTime: '18:00',
    endTime: '19:00',
  },
  {
    code: 'SCH-MAINT-MON',
    name: 'Monthly Maintenance',
    recurrence: 'monthly',
    startTime: '07:00',
    endTime: '08:00',
  },
  {
    code: 'SCH-CONSULT-DAY',
    name: 'Consultation Weekdays',
    recurrence: 'weekdays',
    startTime: '08:30',
    endTime: '16:30',
  },
  {
    code: 'SCH-TRAIN-FRI',
    name: 'Training Friday',
    recurrence: 'weekly',
    startTime: '09:00',
    endTime: '12:00',
  },
  {
    code: 'SCH-EVENT-QTRLY',
    name: 'Quarterly Event',
    recurrence: 'quarterly',
    startTime: '09:00',
    endTime: '17:00',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Space Reservation ─────────────────────────────────────────────────── */
const spaceReservationSchema = new Schema(
  {
    reservationCode: { type: String, required: true, unique: true },
    roomId: { type: Schema.Types.ObjectId, required: true },
    buildingId: { type: Schema.Types.ObjectId },
    type: { type: String, enum: RESERVATION_TYPES, required: true },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'pending' },
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    actualStartTime: { type: Date },
    actualEndTime: { type: Date },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ userId: Schema.Types.ObjectId, name: String, role: String }],
    expectedAttendees: { type: Number, default: 1 },
    actualAttendees: { type: Number },
    equipment: [{ name: String, quantity: Number }],
    setupNotes: { type: String },
    recurrenceId: { type: Schema.Types.ObjectId, ref: 'DDDSpaceSchedule' },
    isRecurring: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

spaceReservationSchema.index({ roomId: 1, startTime: 1, endTime: 1 });
spaceReservationSchema.index({ status: 1, startTime: 1 });

const DDDSpaceReservation =
  mongoose.models.DDDSpaceReservation ||
  mongoose.model('DDDSpaceReservation', spaceReservationSchema);

/* ── Space Schedule ────────────────────────────────────────────────────── */
const spaceScheduleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    roomId: { type: Schema.Types.ObjectId },
    recurrence: { type: String, enum: SCHEDULE_RECURRENCE, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    days: [{ type: String }],
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    reservationType: { type: String, enum: RESERVATION_TYPES },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

spaceScheduleSchema.index({ roomId: 1, isActive: 1 });

const DDDSpaceSchedule =
  mongoose.models.DDDSpaceSchedule || mongoose.model('DDDSpaceSchedule', spaceScheduleSchema);

/* ── Space Utilization ─────────────────────────────────────────────────── */
const spaceUtilizationSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    buildingId: { type: Schema.Types.ObjectId },
    date: { type: Date, required: true },
    totalHoursAvailable: { type: Number, default: 8 },
    totalHoursBooked: { type: Number, default: 0 },
    totalHoursUsed: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },
    bookingRate: { type: Number, default: 0 },
    noShowCount: { type: Number, default: 0 },
    cancellationCount: { type: Number, default: 0 },
    totalReservations: { type: Number, default: 0 },
    peakHour: { type: Number },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

spaceUtilizationSchema.index({ roomId: 1, date: -1 });

const DDDSpaceUtilization =
  mongoose.models.DDDSpaceUtilization ||
  mongoose.model('DDDSpaceUtilization', spaceUtilizationSchema);

/* ── Space Request ─────────────────────────────────────────────────────── */
const spaceRequestSchema = new Schema(
  {
    requestCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: REQUEST_STATUSES, default: 'submitted' },
    priority: { type: String, enum: SPACE_PRIORITIES, default: 'standard' },
    requiredType: {
      type: String,
      enum: [
        'therapy_room',
        'consultation_room',
        'assessment_room',
        'group_therapy',
        'meeting_room',
        'gym',
        'any',
      ],
    },
    requiredCapacity: { type: Number, default: 1 },
    requiredFeatures: [{ type: String }],
    preferredBuilding: { type: Schema.Types.ObjectId },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    frequencyPerWeek: { type: Number },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    allocatedRoomId: { type: Schema.Types.ObjectId },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

spaceRequestSchema.index({ status: 1, priority: 1 });

const DDDSpaceRequest =
  mongoose.models.DDDSpaceRequest || mongoose.model('DDDSpaceRequest', spaceRequestSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class SpaceAllocator extends BaseDomainModule {
  constructor() {
    super('SpaceAllocator', {
      description: 'Room booking, space utilization & capacity management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedSchedules();
    this.log('Space Allocator initialised ✓');
    return true;
  }

  async _seedSchedules() {
    for (const s of BUILTIN_SCHEDULES) {
      const exists = await DDDSpaceSchedule.findOne({ code: s.code }).lean();
      if (!exists) await DDDSpaceSchedule.create({ ...s, isActive: true });
    }
  }

  /* ── Reservations ── */
  async listReservations(filters = {}) {
    const q = {};
    if (filters.roomId) q.roomId = filters.roomId;
    if (filters.status) q.status = filters.status;
    if (filters.type) q.type = filters.type;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    if (filters.startDate) q.startTime = { $gte: new Date(filters.startDate) };
    if (filters.endDate) q.endTime = { $lte: new Date(filters.endDate) };
    return DDDSpaceReservation.find(q).sort({ startTime: 1 }).lean();
  }
  async getReservation(id) {
    return DDDSpaceReservation.findById(id).lean();
  }

  async createReservation(data) {
    if (!data.reservationCode) data.reservationCode = `RES-${Date.now()}`;
    // Check for conflicts
    const conflict = await DDDSpaceReservation.findOne({
      roomId: data.roomId,
      status: { $in: ['confirmed', 'checked_in', 'in_use'] },
      $or: [{ startTime: { $lt: data.endTime }, endTime: { $gt: data.startTime } }],
    });
    if (conflict) throw new Error('Room is already booked for this time slot');
    return DDDSpaceReservation.create(data);
  }

  async confirmReservation(id) {
    return DDDSpaceReservation.findByIdAndUpdate(id, { status: 'confirmed' }, { new: true });
  }
  async cancelReservation(id) {
    return DDDSpaceReservation.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
  }
  async checkIn(id) {
    return DDDSpaceReservation.findByIdAndUpdate(
      id,
      { status: 'checked_in', actualStartTime: new Date() },
      { new: true }
    );
  }
  async checkOut(id, actualAttendees) {
    return DDDSpaceReservation.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        actualEndTime: new Date(),
        actualAttendees,
      },
      { new: true }
    );
  }

  /* ── Schedules ── */
  async listSchedules(filters = {}) {
    const q = {};
    if (filters.roomId) q.roomId = filters.roomId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDSpaceSchedule.find(q).sort({ code: 1 }).lean();
  }
  async createSchedule(data) {
    return DDDSpaceSchedule.create(data);
  }
  async updateSchedule(id, data) {
    return DDDSpaceSchedule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Utilization ── */
  async getUtilization(roomId, opts = {}) {
    const q = { roomId };
    if (opts.startDate) q.date = { ...q.date, $gte: new Date(opts.startDate) };
    if (opts.endDate) q.date = { ...q.date, $lte: new Date(opts.endDate) };
    return DDDSpaceUtilization.find(q).sort({ date: -1 }).lean();
  }

  async recordUtilization(data) {
    return DDDSpaceUtilization.create(data);
  }

  /* ── Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    return DDDSpaceRequest.find(q).sort({ createdAt: -1 }).lean();
  }
  async getRequest(id) {
    return DDDSpaceRequest.findById(id).lean();
  }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `SREQ-${Date.now()}`;
    return DDDSpaceRequest.create(data);
  }
  async approveRequest(id, userId, roomId) {
    return DDDSpaceRequest.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy: userId,
        allocatedRoomId: roomId,
      },
      { new: true }
    );
  }
  async rejectRequest(id, reason) {
    return DDDSpaceRequest.findByIdAndUpdate(
      id,
      { status: 'rejected', notes: reason },
      { new: true }
    );
  }

  /* ── Analytics ── */
  async getSpaceAnalytics() {
    const [reservations, schedules, utilizations, requests] = await Promise.all([
      DDDSpaceReservation.countDocuments(),
      DDDSpaceSchedule.countDocuments(),
      DDDSpaceUtilization.countDocuments(),
      DDDSpaceRequest.countDocuments(),
    ]);
    const activeReservations = await DDDSpaceReservation.countDocuments({
      status: { $in: ['confirmed', 'checked_in', 'in_use'] },
    });
    const pendingRequests = await DDDSpaceRequest.countDocuments({
      status: { $in: ['submitted', 'under_review'] },
    });
    return { reservations, activeReservations, schedules, utilizations, requests, pendingRequests };
  }

  async healthCheck() {
    const [reservations, schedules, utilizations, requests] = await Promise.all([
      DDDSpaceReservation.countDocuments(),
      DDDSpaceSchedule.countDocuments(),
      DDDSpaceUtilization.countDocuments(),
      DDDSpaceRequest.countDocuments(),
    ]);
    return { status: 'healthy', reservations, schedules, utilizations, requests };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createSpaceAllocatorRouter() {
  const router = Router();
  const svc = new SpaceAllocator();

  /* Reservations */
  router.get('/spaces/reservations', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReservations(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/spaces/reservations/:id', async (req, res) => {
    try {
      const d = await svc.getReservation(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/reservations', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReservation(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/reservations/:id/confirm', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.confirmReservation(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/reservations/:id/cancel', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelReservation(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/reservations/:id/check-in', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.checkIn(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/reservations/:id/check-out', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.checkOut(req.params.id, req.body.actualAttendees),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Schedules */
  router.get('/spaces/schedules', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSchedules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/schedules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSchedule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/spaces/schedules/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSchedule(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Utilization */
  router.get('/spaces/utilization/:roomId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getUtilization(req.params.roomId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/utilization', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordUtilization(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Requests */
  router.get('/spaces/requests', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/spaces/requests/:id', async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/requests', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/requests/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequest(req.params.id, req.body.userId, req.body.roomId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/spaces/requests/:id/reject', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.rejectRequest(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/spaces/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSpaceAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/spaces/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  SpaceAllocator,
  DDDSpaceReservation,
  DDDSpaceSchedule,
  DDDSpaceUtilization,
  DDDSpaceRequest,
  RESERVATION_STATUSES,
  RESERVATION_TYPES,
  SCHEDULE_RECURRENCE,
  UTILIZATION_METRICS,
  REQUEST_STATUSES,
  SPACE_PRIORITIES,
  BUILTIN_SCHEDULES,
  createSpaceAllocatorRouter,
};
