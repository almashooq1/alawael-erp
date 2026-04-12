'use strict';
/**
 * DddLeaveManager — Mongoose Models & Constants
 * Auto-extracted from services/dddLeaveManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  LEAVE_TYPES,
  LEAVE_STATUSES,
  ACCRUAL_FREQUENCIES,
  HOLIDAY_TYPES,
  BALANCE_ADJUSTMENT_TYPES,
  POLICY_SCOPES,
  BUILTIN_POLICIES,
  DDDLeaveRequest,
  DDDLeaveBalance,
  DDDLeavePolicy,
  DDDHolidayCalendar,
};
