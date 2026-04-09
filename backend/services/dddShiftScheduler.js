/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Shift Scheduler — Phase 20 · Human Resources & Staff Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shift scheduling, rosters, time tracking, attendance, overtime, and
 * coverage management for clinical and support staff.
 *
 * Aggregates
 *   DDDShiftTemplate    — reusable shift pattern definition
 *   DDDShiftAssignment  — scheduled shift for a staff member
 *   DDDTimeRecord       — clock in/out and time tracking
 *   DDDAttendanceLog    — daily attendance summary
 *
 * Canonical links
 *   staffId      → DDDStaffProfile (dddStaffManager)
 *   departmentId → DDDDepartment (dddStaffManager)
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

const SHIFT_TYPES = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'split',
  'on_call',
  'standby',
  'rotating',
  'flexible',
  'compressed',
  'extended',
  'half_day',
];

const SHIFT_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'swapped',
  'no_show',
  'partial',
  'overtime',
  'called_in',
];

const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'early_departure',
  'sick_leave',
  'annual_leave',
  'excused',
  'unexcused',
  'remote',
  'training',
  'on_call',
  'holiday',
];

const TIME_RECORD_TYPES = [
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'overtime_start',
  'overtime_end',
  'remote_login',
  'remote_logout',
  'site_transfer',
  'emergency_call',
];

const ROSTER_PATTERNS = [
  '5_2',
  '4_3',
  '6_1',
  '7_7',
  '4_4',
  'custom',
  'rotating_3',
  'alternating',
  'weekend_only',
  'weekday_only',
];

const OVERTIME_TYPES = [
  'regular',
  'weekend',
  'holiday',
  'emergency',
  'voluntary',
  'mandatory',
  'callback',
  'double_time',
  'on_call_activated',
];

/* ── Built-in shift templates ───────────────────────────────────────────── */
const BUILTIN_SHIFT_TEMPLATES = [
  {
    code: 'SHF-MRN',
    name: 'Morning Shift',
    nameAr: 'دوام صباحي',
    type: 'morning',
    startTime: '07:00',
    endTime: '15:00',
    breakMinutes: 60,
  },
  {
    code: 'SHF-AFT',
    name: 'Afternoon Shift',
    nameAr: 'دوام مسائي',
    type: 'afternoon',
    startTime: '15:00',
    endTime: '23:00',
    breakMinutes: 60,
  },
  {
    code: 'SHF-NGT',
    name: 'Night Shift',
    nameAr: 'دوام ليلي',
    type: 'night',
    startTime: '23:00',
    endTime: '07:00',
    breakMinutes: 45,
  },
  {
    code: 'SHF-SPL',
    name: 'Split Shift',
    nameAr: 'دوام مقسم',
    type: 'split',
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 120,
  },
  {
    code: 'SHF-FLX',
    name: 'Flexible Hours',
    nameAr: 'ساعات مرنة',
    type: 'flexible',
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 60,
  },
  {
    code: 'SHF-ONC',
    name: 'On-Call',
    nameAr: 'تحت الطلب',
    type: 'on_call',
    startTime: '00:00',
    endTime: '23:59',
    breakMinutes: 0,
  },
  {
    code: 'SHF-HLF',
    name: 'Half Day Morning',
    nameAr: 'نصف يوم صباحي',
    type: 'half_day',
    startTime: '08:00',
    endTime: '12:00',
    breakMinutes: 0,
  },
  {
    code: 'SHF-EXT',
    name: 'Extended Shift',
    nameAr: 'دوام ممتد',
    type: 'extended',
    startTime: '07:00',
    endTime: '19:00',
    breakMinutes: 90,
  },
  {
    code: 'SHF-CMP',
    name: 'Compressed 4x10',
    nameAr: 'مضغوط',
    type: 'compressed',
    startTime: '07:00',
    endTime: '17:30',
    breakMinutes: 30,
  },
  {
    code: 'SHF-ROT',
    name: 'Rotating 3-Shift',
    nameAr: 'دوام متناوب',
    type: 'rotating',
    startTime: '06:00',
    endTime: '14:00',
    breakMinutes: 45,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Shift Template ────────────────────────────────────────────────────── */
const shiftTemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: SHIFT_TYPES, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakMinutes: { type: Number, default: 60 },
    color: { type: String, default: '#4A90D9' },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDShiftTemplate =
  mongoose.models.DDDShiftTemplate || mongoose.model('DDDShiftTemplate', shiftTemplateSchema);

/* ── Shift Assignment ──────────────────────────────────────────────────── */
const shiftAssignmentSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'DDDDepartment' },
    templateId: { type: Schema.Types.ObjectId, ref: 'DDDShiftTemplate' },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: SHIFT_STATUSES, default: 'scheduled' },
    actualStart: { type: Date },
    actualEnd: { type: Date },
    notes: { type: String },
    swappedWith: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    overtimeMinutes: { type: Number, default: 0 },
    overtime_type: { type: String, enum: OVERTIME_TYPES },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

shiftAssignmentSchema.index({ staffId: 1, date: 1 });
shiftAssignmentSchema.index({ departmentId: 1, date: 1 });
shiftAssignmentSchema.index({ status: 1, date: 1 });

const DDDShiftAssignment =
  mongoose.models.DDDShiftAssignment || mongoose.model('DDDShiftAssignment', shiftAssignmentSchema);

/* ── Time Record ───────────────────────────────────────────────────────── */
const timeRecordSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'DDDShiftAssignment' },
    type: { type: String, enum: TIME_RECORD_TYPES, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    location: { type: String },
    deviceId: { type: String },
    ipAddress: { type: String },
    isManual: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

timeRecordSchema.index({ staffId: 1, timestamp: -1 });

const DDDTimeRecord =
  mongoose.models.DDDTimeRecord || mongoose.model('DDDTimeRecord', timeRecordSchema);

/* ── Attendance Log ────────────────────────────────────────────────────── */
const attendanceLogSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
    scheduledHours: { type: Number },
    workedHours: { type: Number },
    overtimeHours: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

attendanceLogSchema.index({ staffId: 1, date: -1 });
attendanceLogSchema.index({ date: 1, status: 1 });

const DDDAttendanceLog =
  mongoose.models.DDDAttendanceLog || mongoose.model('DDDAttendanceLog', attendanceLogSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class ShiftScheduler extends BaseDomainModule {
  constructor() {
    super('ShiftScheduler', {
      description: 'Shift scheduling, time tracking & attendance management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedTemplates();
    this.log('Shift Scheduler initialised ✓');
    return true;
  }

  async _seedTemplates() {
    for (const t of BUILTIN_SHIFT_TEMPLATES) {
      const exists = await DDDShiftTemplate.findOne({ code: t.code }).lean();
      if (!exists) await DDDShiftTemplate.create({ ...t, isActive: true });
    }
  }

  /* ── Templates ── */
  async listTemplates(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDShiftTemplate.find(q).sort({ code: 1 }).lean();
  }
  async createTemplate(data) {
    return DDDShiftTemplate.create(data);
  }
  async updateTemplate(id, data) {
    return DDDShiftTemplate.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Assignments ── */
  async listAssignments(filters = {}) {
    const q = {};
    if (filters.staffId) q.staffId = filters.staffId;
    if (filters.departmentId) q.departmentId = filters.departmentId;
    if (filters.status) q.status = filters.status;
    if (filters.date) q.date = new Date(filters.date);
    if (filters.startDate && filters.endDate) {
      q.date = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
    }
    return DDDShiftAssignment.find(q).sort({ date: 1, startTime: 1 }).lean();
  }
  async getAssignment(id) {
    return DDDShiftAssignment.findById(id).lean();
  }
  async createAssignment(data) {
    return DDDShiftAssignment.create(data);
  }
  async updateAssignment(id, data) {
    return DDDShiftAssignment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async cancelAssignment(id) {
    return DDDShiftAssignment.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
  }
  async swapShift(id, withStaffId) {
    return DDDShiftAssignment.findByIdAndUpdate(
      id,
      { status: 'swapped', swappedWith: withStaffId },
      { new: true }
    );
  }

  /* ── Time Records ── */
  async clockIn(staffId, data = {}) {
    return DDDTimeRecord.create({ staffId, type: 'clock_in', timestamp: new Date(), ...data });
  }
  async clockOut(staffId, data = {}) {
    return DDDTimeRecord.create({ staffId, type: 'clock_out', timestamp: new Date(), ...data });
  }
  async listTimeRecords(staffId, opts = {}) {
    const q = { staffId };
    if (opts.startDate) q.timestamp = { ...q.timestamp, $gte: new Date(opts.startDate) };
    if (opts.endDate) q.timestamp = { ...q.timestamp, $lte: new Date(opts.endDate) };
    return DDDTimeRecord.find(q).sort({ timestamp: -1 }).lean();
  }

  /* ── Attendance ── */
  async recordAttendance(data) {
    return DDDAttendanceLog.create(data);
  }
  async getAttendance(staffId, opts = {}) {
    const q = { staffId };
    if (opts.startDate) q.date = { ...q.date, $gte: new Date(opts.startDate) };
    if (opts.endDate) q.date = { ...q.date, $lte: new Date(opts.endDate) };
    return DDDAttendanceLog.find(q).sort({ date: -1 }).lean();
  }
  async getDailyAttendance(date) {
    return DDDAttendanceLog.find({ date: new Date(date) })
      .sort({ staffId: 1 })
      .lean();
  }

  /* ── Analytics ── */
  async getSchedulingAnalytics() {
    const [templates, assignments, timeRecords, attendance] = await Promise.all([
      DDDShiftTemplate.countDocuments(),
      DDDShiftAssignment.countDocuments(),
      DDDTimeRecord.countDocuments(),
      DDDAttendanceLog.countDocuments(),
    ]);
    const activeShifts = await DDDShiftAssignment.countDocuments({
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
    });
    return { templates, assignments, activeShifts, timeRecords, attendance };
  }

  async healthCheck() {
    const [templates, assignments, timeRecords, attendance] = await Promise.all([
      DDDShiftTemplate.countDocuments(),
      DDDShiftAssignment.countDocuments(),
      DDDTimeRecord.countDocuments(),
      DDDAttendanceLog.countDocuments(),
    ]);
    return { status: 'healthy', templates, assignments, timeRecords, attendance };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createShiftSchedulerRouter() {
  const router = Router();
  const svc = new ShiftScheduler();

  /* Templates */
  router.get('/shifts/templates', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTemplates(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/shifts/templates', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createTemplate(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/shifts/templates/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateTemplate(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Assignments */
  router.get('/shifts/assignments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAssignments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/shifts/assignments/:id', async (req, res) => {
    try {
      const d = await svc.getAssignment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/shifts/assignments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAssignment(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/shifts/assignments/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAssignment(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/shifts/assignments/:id/cancel', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelAssignment(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/shifts/assignments/:id/swap', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.swapShift(req.params.id, req.body.withStaffId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Time Records */
  router.post('/time/clock-in', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.clockIn(req.body.staffId, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/time/clock-out', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.clockOut(req.body.staffId, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/time/records/:staffId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTimeRecords(req.params.staffId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Attendance */
  router.post('/attendance', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordAttendance(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/attendance/:staffId', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getAttendance(req.params.staffId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/attendance/daily/:date', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getDailyAttendance(req.params.date) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/shifts/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSchedulingAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/shifts/health', async (_req, res) => {
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
  ShiftScheduler,
  DDDShiftTemplate,
  DDDShiftAssignment,
  DDDTimeRecord,
  DDDAttendanceLog,
  SHIFT_TYPES,
  SHIFT_STATUSES,
  ATTENDANCE_STATUSES,
  TIME_RECORD_TYPES,
  ROSTER_PATTERNS,
  OVERTIME_TYPES,
  BUILTIN_SHIFT_TEMPLATES,
  createShiftSchedulerRouter,
};
