'use strict';
/**
 * SpaceAllocator Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddSpaceAllocator.js
 */

const {
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
} = require('../models/DddSpaceAllocator');

const BaseCrudService = require('./base/BaseCrudService');

class SpaceAllocator extends BaseCrudService {
  constructor() {
    super('SpaceAllocator', {
      description: 'Room booking, space utilization & capacity management',
      version: '1.0.0',
    }, {
      spaceReservations: DDDSpaceReservation,
      spaceSchedules: DDDSpaceSchedule,
      spaceUtilizations: DDDSpaceUtilization,
      spaceRequests: DDDSpaceRequest,
    })
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
  async getReservation(id) { return this._getById(DDDSpaceReservation, id); }

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
    return DDDSpaceReservation.findByIdAndUpdate(id, { status: 'confirmed' }, { new: true }).lean();
  }
  async cancelReservation(id) {
    return DDDSpaceReservation.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
  }
  async checkIn(id) {
    return DDDSpaceReservation.findByIdAndUpdate(
      id,
      { status: 'checked_in', actualStartTime: new Date() },
      { new: true }
    ).lean();
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
    ).lean();
  }

  /* ── Schedules ── */
  async listSchedules(filters = {}) {
    const q = {};
    if (filters.roomId) q.roomId = filters.roomId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDSpaceSchedule.find(q).sort({ code: 1 }).lean();
  }
  async createSchedule(data) { return this._create(DDDSpaceSchedule, data); }
  async updateSchedule(id, data) { return this._update(DDDSpaceSchedule, id, data, { runValidators: true }); }

  /* ── Utilization ── */
  async getUtilization(roomId, opts = {}) {
    const q = { roomId };
    if (opts.startDate) q.date = { ...q.date, $gte: new Date(opts.startDate) };
    if (opts.endDate) q.date = { ...q.date, $lte: new Date(opts.endDate) };
    return DDDSpaceUtilization.find(q).sort({ date: -1 }).lean();
  }

  async recordUtilization(data) { return this._create(DDDSpaceUtilization, data); }

  /* ── Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.requestedBy) q.requestedBy = filters.requestedBy;
    return DDDSpaceRequest.find(q).sort({ createdAt: -1 }).lean();
  }
  async getRequest(id) { return this._getById(DDDSpaceRequest, id); }
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
    ).lean();
  }
  async rejectRequest(id, reason) {
    return DDDSpaceRequest.findByIdAndUpdate(
      id,
      { status: 'rejected', notes: reason },
      { new: true }
    ).lean();
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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new SpaceAllocator();
