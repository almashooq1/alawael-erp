'use strict';
/**
 * DddSpaceAllocator — Mongoose Models & Constants
 * Auto-extracted from services/dddSpaceAllocator.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  RESERVATION_STATUSES,
  RESERVATION_TYPES,
  SCHEDULE_RECURRENCE,
  UTILIZATION_METRICS,
  REQUEST_STATUSES,
  SPACE_PRIORITIES,
  BUILTIN_SCHEDULES,
  DDDSpaceReservation,
  DDDSpaceSchedule,
  DDDSpaceUtilization,
  DDDSpaceRequest,
};
