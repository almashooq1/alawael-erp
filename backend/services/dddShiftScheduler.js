'use strict';
/**
 * ShiftScheduler Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddShiftScheduler.js
 */

const {
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
} = require('../models/DddShiftScheduler');

const BaseCrudService = require('./base/BaseCrudService');

class ShiftScheduler extends BaseCrudService {
  constructor() {
    super('ShiftScheduler', {
      description: 'Shift scheduling, time tracking & attendance management',
      version: '1.0.0',
    }, {
      shiftTemplates: DDDShiftTemplate,
      shiftAssignments: DDDShiftAssignment,
      timeRecords: DDDTimeRecord,
      attendanceLogs: DDDAttendanceLog,
    })
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
  async createTemplate(data) { return this._create(DDDShiftTemplate, data); }
  async updateTemplate(id, data) { return this._update(DDDShiftTemplate, id, data, { runValidators: true }); }

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
  async getAssignment(id) { return this._getById(DDDShiftAssignment, id); }
  async createAssignment(data) { return this._create(DDDShiftAssignment, data); }
  async updateAssignment(id, data) { return this._update(DDDShiftAssignment, id, data, { runValidators: true }); }
  async cancelAssignment(id) {
    return DDDShiftAssignment.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
  }
  async swapShift(id, withStaffId) {
    return DDDShiftAssignment.findByIdAndUpdate(
      id,
      { status: 'swapped', swappedWith: withStaffId },
      { new: true }
    ).lean();
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
  async recordAttendance(data) { return this._create(DDDAttendanceLog, data); }
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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new ShiftScheduler();
