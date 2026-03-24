/**
 * Appointment Scheduling Model — نموذج جدولة المواعيد المتقدمة
 *
 * Schemas:
 *   ScheduleTemplate     — قوالب الجدول الأسبوعي (لكل مقدم خدمة أو غرفة)
 *   TimeSlot             — الفترات الزمنية المتاحة
 *   AppointmentReminder  — التذكيرات (SMS / WhatsApp / Push)
 *   WaitlistEntry        — قائمة الانتظار للمواعيد
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════
// ScheduleTemplate — قالب الجدول الأسبوعي
// ═══════════════════════════════════════════════════════════════════════════

const weeklySlotSchema = new Schema({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  slotDuration: { type: Number, default: 30 },
  maxPatients: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
});

const scheduleTemplateSchema = new Schema(
  {
    name: {
      ar: { type: String, required: true },
      en: String,
    },
    provider: { type: Schema.Types.ObjectId, ref: 'User' },
    providerName: String,
    providerType: {
      type: String,
      enum: [
        'doctor',
        'therapist',
        'specialist',
        'nurse',
        'psychologist',
        'social_worker',
        'other',
      ],
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    room: String,
    specialty: String,
    weeklySlots: [weeklySlotSchema],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: Date,
    exceptions: [
      {
        date: Date,
        reason: String,
        type: { type: String, enum: ['holiday', 'leave', 'training', 'maintenance', 'other'] },
      },
    ],
    appointmentTypes: [
      {
        type: String,
        enum: [
          'initial_assessment',
          'follow_up',
          'therapy_session',
          'consultation',
          'evaluation',
          'home_visit',
          'telehealth',
          'group_session',
          'family_meeting',
          'iep_review',
          'other',
        ],
      },
    ],
    autoConfirm: { type: Boolean, default: false },
    bufferTime: { type: Number, default: 5 },
    overbookLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

scheduleTemplateSchema.index({ provider: 1, isActive: 1 });
scheduleTemplateSchema.index({ department: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// TimeSlot — الفترة الزمنية
// ═══════════════════════════════════════════════════════════════════════════

const timeSlotSchema = new Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    room: String,
    template: { type: Schema.Types.ObjectId, ref: 'ScheduleTemplate' },
    status: {
      type: String,
      enum: ['available', 'booked', 'blocked', 'completed', 'no_show', 'cancelled'],
      default: 'available',
    },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'BeneficiaryFile' },
    appointmentType: String,
    maxPatients: { type: Number, default: 1 },
    currentPatients: { type: Number, default: 0 },
    notes: String,
    isOverbooked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

timeSlotSchema.index({ date: 1, provider: 1, startTime: 1 });
timeSlotSchema.index({ date: 1, status: 1 });
timeSlotSchema.index({ provider: 1, date: 1 });
timeSlotSchema.index({ appointment: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// AppointmentReminder — التذكيرات
// ═══════════════════════════════════════════════════════════════════════════

const appointmentReminderSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'BeneficiaryFile' },
    recipientPhone: String,
    recipientEmail: String,
    channel: {
      type: String,
      required: true,
      enum: ['sms', 'whatsapp', 'email', 'push', 'in_app'],
    },
    type: {
      type: String,
      enum: [
        'reminder_24h',
        'reminder_2h',
        'confirmation',
        'cancellation',
        'reschedule',
        'follow_up',
      ],
      default: 'reminder_24h',
    },
    scheduledAt: { type: Date, required: true },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
      default: 'pending',
    },
    message: String,
    failureReason: String,
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
  },
  { timestamps: true }
);

appointmentReminderSchema.index({ scheduledAt: 1, status: 1 });
appointmentReminderSchema.index({ appointment: 1 });

// ═══════════════════════════════════════════════════════════════════════════
// WaitlistEntry — قائمة الانتظار
// ═══════════════════════════════════════════════════════════════════════════

const waitlistEntrySchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    beneficiaryName: String,
    beneficiaryPhone: String,
    requestedProvider: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedDepartment: { type: Schema.Types.ObjectId, ref: 'Department' },
    appointmentType: {
      type: String,
      enum: [
        'initial_assessment',
        'follow_up',
        'therapy_session',
        'consultation',
        'evaluation',
        'other',
      ],
    },
    preferredDays: [{ type: Number, min: 0, max: 6 }],
    preferredTimeRange: { from: String, to: String },
    urgency: {
      type: String,
      enum: ['routine', 'soon', 'urgent'],
      default: 'routine',
    },
    status: {
      type: String,
      enum: ['waiting', 'offered', 'booked', 'expired', 'cancelled'],
      default: 'waiting',
    },
    position: { type: Number },
    offeredSlot: { type: Schema.Types.ObjectId, ref: 'TimeSlot' },
    offeredAt: Date,
    offerExpiresAt: Date,
    bookedAppointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

waitlistEntrySchema.index({ status: 1, urgency: 1, createdAt: 1 });
waitlistEntrySchema.index({ beneficiary: 1 });
waitlistEntrySchema.index({ requestedProvider: 1 });

// ═══════════════════════════════════════════════════════════════════════════

const ScheduleTemplate = mongoose.model('ScheduleTemplate', scheduleTemplateSchema);
const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
const AppointmentReminder = mongoose.model('AppointmentReminder', appointmentReminderSchema);
const WaitlistEntry = mongoose.model('WaitlistEntry', waitlistEntrySchema);

module.exports = {
  ScheduleTemplate,
  TimeSlot,
  AppointmentReminder,
  WaitlistEntry,
};
