'use strict';
/**
 * DddAppointmentEngine Model
 * Auto-extracted from services/dddAppointmentEngine.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

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
  mongoose.models.DDDAppointment || mongoose.model('DDDAppointment', appointmentSchema);

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

const DDDWaitlist = mongoose.models.DDDWaitlist || mongoose.model('DDDWaitlist', waitlistSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — AppointmentEngine
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  RECURRENCE_PATTERNS,
  WAITLIST_PRIORITIES,
  CANCELLATION_REASONS,
  BUILTIN_APPOINTMENT_TEMPLATES,
};
