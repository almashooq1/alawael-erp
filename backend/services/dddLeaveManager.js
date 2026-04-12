'use strict';
/**
 * LeaveManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddLeaveManager.js
 */

const {
  DDDLeaveRequest,
  DDDLeaveBalance,
  DDDLeavePolicy,
  DDDHolidayCalendar,
  LEAVE_TYPES,
  LEAVE_STATUSES,
  ACCRUAL_FREQUENCIES,
  HOLIDAY_TYPES,
  BALANCE_ADJUSTMENT_TYPES,
  POLICY_SCOPES,
  BUILTIN_POLICIES,
} = require('../models/DddLeaveManager');

const BaseCrudService = require('./base/BaseCrudService');

class LeaveManager extends BaseCrudService {
  constructor() {
    super('LeaveManager', {
      description: 'Leave requests, balances, policies & holiday management',
      version: '1.0.0',
    }, {
      leaveRequests: DDDLeaveRequest,
      leaveBalances: DDDLeaveBalance,
      leavePolicys: DDDLeavePolicy,
      holidayCalendars: DDDHolidayCalendar,
    })
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Leave Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_POLICIES) {
      const exists = await DDDLeavePolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDLeavePolicy.create({ ...p, isActive: true });
    }
  }

  /* ── Leave Requests ── */
  async listRequests(filters = {}) {
    const q = {};
    if (filters.staffId) q.staffId = filters.staffId;
    if (filters.status) q.status = filters.status;
    if (filters.leaveType) q.leaveType = filters.leaveType;
    if (filters.startDate) q.startDate = { $gte: new Date(filters.startDate) };
    return DDDLeaveRequest.find(q).sort({ startDate: -1 }).lean();
  }
  async getRequest(id) { return this._getById(DDDLeaveRequest, id); }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `LV-${Date.now()}`;
    return DDDLeaveRequest.create(data);
  }
  async submitRequest(id) {
    return DDDLeaveRequest.findByIdAndUpdate(id, { status: 'submitted' }, { new: true }).lean();
  }
  async approveRequest(id, approverId) {
    return DDDLeaveRequest.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: approverId, approvedAt: new Date() },
      { new: true }
    ).lean();
  }
  async rejectRequest(id, reason) {
    return DDDLeaveRequest.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    ).lean();
  }
  async cancelRequest(id) {
    return DDDLeaveRequest.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).lean();
  }

  /* ── Balances ── */
  async getBalance(staffId, year) {
    return DDDLeaveBalance.find({ staffId, year }).sort({ leaveType: 1 }).lean();
  }
  async updateBalance(staffId, leaveType, year, updates) {
    return DDDLeaveBalance.findOneAndUpdate(
      { staffId, leaveType, year },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();
  }
  async accrueLeave(staffId, leaveType, year, days) {
    return DDDLeaveBalance.findOneAndUpdate(
      { staffId, leaveType, year },
      { $inc: { accrued: days, remaining: days }, lastAccrualDate: new Date() },
      { new: true, upsert: true }
    ).lean();
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.leaveType) q.leaveType = filters.leaveType;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDLeavePolicy.find(q).sort({ code: 1 }).lean();
  }
  async createPolicy(data) { return this._create(DDDLeavePolicy, data); }
  async updatePolicy(id, data) { return this._update(DDDLeavePolicy, id, data, { runValidators: true }); }

  /* ── Holidays ── */
  async listHolidays(year) {
    const q = {};
    if (year) q.year = parseInt(year, 10);
    return DDDHolidayCalendar.find(q).sort({ date: 1 }).lean();
  }
  async createHoliday(data) { return this._create(DDDHolidayCalendar, data); }
  async updateHoliday(id, data) { return this._update(DDDHolidayCalendar, id, data, { runValidators: true }); }
  async deleteHoliday(id) {
    return DDDHolidayCalendar.findByIdAndDelete(id).lean();
  }

  /* ── Analytics ── */
  async getLeaveAnalytics() {
    const [requests, balances, policies, holidays] = await Promise.all([
      DDDLeaveRequest.countDocuments(),
      DDDLeaveBalance.countDocuments(),
      DDDLeavePolicy.countDocuments(),
      DDDHolidayCalendar.countDocuments(),
    ]);
    const pendingRequests = await DDDLeaveRequest.countDocuments({
      status: { $in: ['submitted', 'pending_approval'] },
    });
    const approvedActive = await DDDLeaveRequest.countDocuments({
      status: 'approved',
      endDate: { $gte: new Date() },
    });
    return { requests, pendingRequests, approvedActive, balances, policies, holidays };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new LeaveManager();
