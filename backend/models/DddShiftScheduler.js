'use strict';
/**
 * DddShiftScheduler — Mongoose Models & Constants
 * Auto-extracted from services/dddShiftScheduler.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SHIFT_TYPES,
  SHIFT_STATUSES,
  ATTENDANCE_STATUSES,
  TIME_RECORD_TYPES,
  ROSTER_PATTERNS,
  OVERTIME_TYPES,
  BUILTIN_SHIFT_TEMPLATES,
  DDDShiftTemplate,
  DDDShiftAssignment,
  DDDTimeRecord,
  DDDAttendanceLog,
};
