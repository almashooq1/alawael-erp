'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleSchema = new Schema(
  {
    schedule_id: {
      type: String,
      unique: true,
      default: () => `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },

    // نوع الجدولة
    schedule_type: {
      type: String,
      enum: [
        'individual_session',
        'group_session',
        'assessment',
        'meeting',
        'home_visit',
        'follow_up',
        'transportation',
      ],
    },

    // المستفيد
    beneficiary: {
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      name: String,
    },

    // مقدم الخدمة
    provider: {
      provider_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      specialization: String,
    },

    // تفاصيل الموعد
    appointment: {
      title: String,
      description: String,
      date: Date,
      start_time: String,
      end_time: String,
      duration_minutes: Number,
      location: {
        type: String,
        enum: ['center', 'home', 'school', 'community', 'online'],
      },
      room: String,
    },

    // التكرار
    recurrence: {
      is_recurring: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'bi_weekly', 'monthly'] },
      days_of_week: [String],
      end_date: Date,
      recurrence_pattern: String,
    },

    // حالة الموعد
    status: {
      type: String,
      enum: [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled',
        'no_show',
      ],
      default: 'scheduled',
    },

    // التنبيهات
    reminders: [
      {
        reminder_type: { type: String, enum: ['email', 'sms', 'app_notification', 'phone_call'] },
        timing: Number, // دقائق قبل الموعد
        sent: { type: Boolean, default: false },
        sent_at: Date,
      },
    ],

    // التعارضات
    conflicts: [
      {
        conflict_type: String,
        conflict_description: String,
        resolution: String,
        resolved: { type: Boolean, default: false },
      },
    ],

    // إعادة الجدولة
    reschedule_history: [
      {
        previous_date: Date,
        previous_time: String,
        new_date: Date,
        new_time: String,
        reason: String,
        rescheduled_by: { type: Schema.Types.ObjectId, ref: 'User' },
        rescheduled_at: { type: Date, default: Date.now },
      },
    ],

    // الحضور
    attendance: {
      checked_in: { type: Boolean, default: false },
      check_in_time: String,
      checked_out: { type: Boolean, default: false },
      check_out_time: String,
      actual_duration: Number,
      attendance_notes: String,
    },

    notes: String,
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

scheduleSchema.index({ 'provider.provider_id': 1, 'appointment.date': 1 });
scheduleSchema.index({ 'beneficiary.beneficiary_id': 1, 'appointment.date': 1 });
scheduleSchema.index({ status: 1, 'appointment.date': 1 });

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
