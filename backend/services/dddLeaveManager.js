/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Leave Manager — Phase 20 · Human Resources & Staff Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Leave requests, balances, policies, accrual rules, holiday calendars,
 * and absence tracking for all staff.
 *
 * Aggregates
 *   DDDLeaveRequest      — individual leave application
 *   DDDLeaveBalance      — accrued / remaining leave per staff
 *   DDDLeavePolicy       — leave rules and entitlements
 *   DDDHolidayCalendar   — public holidays and centre closures
 *
 * Canonical links
 *   staffId      → DDDStaffProfile (dddStaffManager)
 *   approvedBy   → DDDStaffProfile (dddStaffManager)
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

const LEAVE_TYPES = [
  'annual',
  'sick',
  'maternity',
  'paternity',
  'bereavement',
  'unpaid',
  'compensatory',
  'study',
  'hajj',
  'marriage',
  'emergency',
  'sabbatical',
  'military',
  'jury_duty',
];

const LEAVE_STATUSES = [
  'draft',
  'submitted',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled',
  'in_progress',
  'completed',
  'revoked',
  'expired',
];

const ACCRUAL_FREQUENCIES = [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biweekly',
  'weekly',
  'daily',
  'per_pay_period',
  'front_loaded',
  'milestone_based',
];

const HOLIDAY_TYPES = [
  'national',
  'religious',
  'company',
  'regional',
  'optional',
  'restricted',
  'floating',
  'bridge_day',
  'half_day',
  'observance',
];

const BALANCE_ADJUSTMENT_TYPES = [
  'accrual',
  'manual_credit',
  'manual_debit',
  'carry_forward',
  'encashment',
  'forfeiture',
  'correction',
  'proration',
  'advance',
  'donation_received',
  'donation_given',
];

const POLICY_SCOPES = [
  'all_staff',
  'department',
  'position_level',
  'employment_type',
  'tenure_based',
  'gender_specific',
  'custom_group',
  'individual',
];

/* ── Built-in leave policies ────────────────────────────────────────────── */
const BUILTIN_POLICIES = [
  {
    code: 'POL-ANN',
    name: 'Annual Leave',
    nameAr: 'إجازة سنوية',
    leaveType: 'annual',
    daysPerYear: 21,
    maxCarryForward: 10,
    accrualFrequency: 'monthly',
  },
  {
    code: 'POL-SICK',
    name: 'Sick Leave',
    nameAr: 'إجازة مرضية',
    leaveType: 'sick',
    daysPerYear: 15,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-MAT',
    name: 'Maternity Leave',
    nameAr: 'إجازة أمومة',
    leaveType: 'maternity',
    daysPerYear: 70,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-PAT',
    name: 'Paternity Leave',
    nameAr: 'إجازة أبوة',
    leaveType: 'paternity',
    daysPerYear: 3,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-BER',
    name: 'Bereavement Leave',
    nameAr: 'إجازة وفاة',
    leaveType: 'bereavement',
    daysPerYear: 5,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-HAJJ',
    name: 'Hajj Leave',
    nameAr: 'إجازة حج',
    leaveType: 'hajj',
    daysPerYear: 15,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-MAR',
    name: 'Marriage Leave',
    nameAr: 'إجازة زواج',
    leaveType: 'marriage',
    daysPerYear: 5,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
  {
    code: 'POL-STD',
    name: 'Study Leave',
    nameAr: 'إجازة دراسية',
    leaveType: 'study',
    daysPerYear: 10,
    maxCarryForward: 5,
    accrualFrequency: 'annual',
  },
  {
    code: 'POL-COMP',
    name: 'Compensatory Off',
    nameAr: 'إجازة تعويضية',
    leaveType: 'compensatory',
    daysPerYear: 0,
    maxCarryForward: 0,
    accrualFrequency: 'milestone_based',
  },
  {
    code: 'POL-EMG',
    name: 'Emergency Leave',
    nameAr: 'إجازة طارئة',
    leaveType: 'emergency',
    daysPerYear: 5,
    maxCarryForward: 0,
    accrualFrequency: 'front_loaded',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Leave Request ─────────────────────────────────────────────────────── */
const leaveRequestSchema = new Schema(
  {
    requestCode: { type: String, required: true, unique: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    status: { type: String, enum: LEAVE_STATUSES, default: 'draft' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },
    isHalfDay: { type: Boolean, default: false },
    reason: { type: String },
    attachmentUrl: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    delegateTo: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
    emergencyContact: { name: String, phone: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ staffId: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, leaveType: 1 });

const DDDLeaveRequest =
  mongoose.models.DDDLeaveRequest || mongoose.model('DDDLeaveRequest', leaveRequestSchema);

/* ── Leave Balance ─────────────────────────────────────────────────────── */
const leaveBalanceSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    year: { type: Number, required: true },
    entitled: { type: Number, default: 0 },
    accrued: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    lastAccrualDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ staffId: 1, leaveType: 1, year: 1 }, { unique: true });

const DDDLeaveBalance =
  mongoose.models.DDDLeaveBalance || mongoose.model('DDDLeaveBalance', leaveBalanceSchema);

/* ── Leave Policy ──────────────────────────────────────────────────────── */
const leavePolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    daysPerYear: { type: Number, required: true },
    maxCarryForward: { type: Number, default: 0 },
    maxConsecutiveDays: { type: Number },
    minNoticeDays: { type: Number, default: 0 },
    accrualFrequency: { type: String, enum: ACCRUAL_FREQUENCIES, default: 'monthly' },
    scope: { type: String, enum: POLICY_SCOPES, default: 'all_staff' },
    requiresApproval: { type: Boolean, default: true },
    requiresDocument: { type: Boolean, default: false },
    documentAfterDays: { type: Number },
    isPaid: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

leavePolicySchema.index({ leaveType: 1, isActive: 1 });

const DDDLeavePolicy =
  mongoose.models.DDDLeavePolicy || mongoose.model('DDDLeavePolicy', leavePolicySchema);

/* ── Holiday Calendar ──────────────────────────────────────────────────── */
const holidayCalendarSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    date: { type: Date, required: true },
    type: { type: String, enum: HOLIDAY_TYPES, required: true },
    year: { type: Number, required: true },
    isRecurring: { type: Boolean, default: true },
    isHalfDay: { type: Boolean, default: false },
    affectsAll: { type: Boolean, default: true },
    departments: [{ type: Schema.Types.ObjectId, ref: 'DDDDepartment' }],
    description: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

holidayCalendarSchema.index({ date: 1, year: 1 });
holidayCalendarSchema.index({ type: 1, year: 1 });

const DDDHolidayCalendar =
  mongoose.models.DDDHolidayCalendar || mongoose.model('DDDHolidayCalendar', holidayCalendarSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class LeaveManager extends BaseDomainModule {
  constructor() {
    super('LeaveManager', {
      description: 'Leave requests, balances, policies & holiday management',
      version: '1.0.0',
    });
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
  async getRequest(id) {
    return DDDLeaveRequest.findById(id).lean();
  }
  async createRequest(data) {
    if (!data.requestCode) data.requestCode = `LV-${Date.now()}`;
    return DDDLeaveRequest.create(data);
  }
  async submitRequest(id) {
    return DDDLeaveRequest.findByIdAndUpdate(id, { status: 'submitted' }, { new: true });
  }
  async approveRequest(id, approverId) {
    return DDDLeaveRequest.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: approverId, approvedAt: new Date() },
      { new: true }
    );
  }
  async rejectRequest(id, reason) {
    return DDDLeaveRequest.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
  }
  async cancelRequest(id) {
    return DDDLeaveRequest.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
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
    );
  }
  async accrueLeave(staffId, leaveType, year, days) {
    return DDDLeaveBalance.findOneAndUpdate(
      { staffId, leaveType, year },
      { $inc: { accrued: days, remaining: days }, lastAccrualDate: new Date() },
      { new: true, upsert: true }
    );
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.leaveType) q.leaveType = filters.leaveType;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDLeavePolicy.find(q).sort({ code: 1 }).lean();
  }
  async createPolicy(data) {
    return DDDLeavePolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDLeavePolicy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Holidays ── */
  async listHolidays(year) {
    const q = {};
    if (year) q.year = parseInt(year, 10);
    return DDDHolidayCalendar.find(q).sort({ date: 1 }).lean();
  }
  async createHoliday(data) {
    return DDDHolidayCalendar.create(data);
  }
  async updateHoliday(id, data) {
    return DDDHolidayCalendar.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async deleteHoliday(id) {
    return DDDHolidayCalendar.findByIdAndDelete(id);
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

  async healthCheck() {
    const [requests, balances, policies, holidays] = await Promise.all([
      DDDLeaveRequest.countDocuments(),
      DDDLeaveBalance.countDocuments(),
      DDDLeavePolicy.countDocuments(),
      DDDHolidayCalendar.countDocuments(),
    ]);
    return { status: 'healthy', requests, balances, policies, holidays };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createLeaveManagerRouter() {
  const router = Router();
  const svc = new LeaveManager();

  /* Requests */
  router.get('/leave/requests', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRequests(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/leave/requests/:id', async (req, res) => {
    try {
      const d = await svc.getRequest(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/requests', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRequest(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/requests/:id/submit', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.submitRequest(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/requests/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveRequest(req.params.id, req.body.approverId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/requests/:id/reject', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.rejectRequest(req.params.id, req.body.reason) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/requests/:id/cancel', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.cancelRequest(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Balances */
  router.get('/leave/balances/:staffId', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getBalance(req.params.staffId, req.query.year || new Date().getFullYear()),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/balances/accrue', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.accrueLeave(
          req.body.staffId,
          req.body.leaveType,
          req.body.year,
          req.body.days
        ),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Policies */
  router.get('/leave/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/leave/policies/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePolicy(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Holidays */
  router.get('/leave/holidays', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listHolidays(req.query.year) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/leave/holidays', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createHoliday(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/leave/holidays/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateHoliday(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.delete('/leave/holidays/:id', async (req, res) => {
    try {
      await svc.deleteHoliday(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/leave/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getLeaveAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/leave/health', async (_req, res) => {
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
  LeaveManager,
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
  createLeaveManagerRouter,
};
