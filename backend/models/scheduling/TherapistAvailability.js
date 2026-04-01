const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start_time: { type: String, required: true }, // HH:MM
  end_time: { type: String, required: true },
  is_available: { type: Boolean, default: true },
});

const therapistAvailabilitySchema = new mongoose.Schema(
  {
    therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    // الجدول الأسبوعي الافتراضي
    weekly_schedule: {
      sunday: [timeSlotSchema],
      monday: [timeSlotSchema],
      tuesday: [timeSlotSchema],
      wednesday: [timeSlotSchema],
      thursday: [timeSlotSchema],
      friday: [timeSlotSchema],
      saturday: [timeSlotSchema],
    },
    // استثناءات (إجازات، أيام خاصة)
    exceptions: [
      {
        date: { type: Date },
        is_available: { type: Boolean, default: false },
        reason: { type: String },
        custom_slots: [timeSlotSchema],
      },
    ],
    max_appointments_per_day: { type: Number, default: 8 },
    max_caseload: { type: Number, default: 15 }, // أقصى عدد مستفيدين
    current_caseload: { type: Number, default: 0 },
    session_duration_minutes: { type: Number, default: 45 },
    break_between_sessions_minutes: { type: Number, default: 15 },
    effective_from: { type: Date, default: Date.now },
    effective_to: { type: Date },
    is_active: { type: Boolean, default: true },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

therapistAvailabilitySchema.index({ therapist_id: 1, branch_id: 1 }, { unique: true });
therapistAvailabilitySchema.index({ is_active: 1 });
therapistAvailabilitySchema.index({ deleted_at: 1 });

module.exports = mongoose.model('TherapistAvailability', therapistAvailabilitySchema);
