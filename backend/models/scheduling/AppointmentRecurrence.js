const mongoose = require('mongoose');

const appointmentRecurrenceSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    service_type: { type: String, required: true },
    recurrence_type: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },
    days_of_week: [
      {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      },
    ],
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    recurrence_start: { type: Date, required: true },
    recurrence_end: { type: Date },
    sessions_count: { type: Number }, // عدد الجلسات المحددة
    sessions_generated: { type: Number, default: 0 },
    plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabilitationPlan' },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
    },
    last_generated_date: { type: Date },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentRecurrenceSchema.index({ beneficiary_id: 1, status: 1 });
appointmentRecurrenceSchema.index({ therapist_id: 1, status: 1 });
appointmentRecurrenceSchema.index({ branch_id: 1 });
appointmentRecurrenceSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.AppointmentRecurrence ||
  mongoose.models.AppointmentRecurrence ||
  mongoose.model('AppointmentRecurrence', appointmentRecurrenceSchema);
