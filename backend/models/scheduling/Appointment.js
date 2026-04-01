const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    appointment_number: { type: String, unique: true }, // APPT-YYYY-XXXXX
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    therapist_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    service_type: {
      type: String,
      enum: [
        'aba',
        'speech',
        'occupational',
        'physical',
        'psychology',
        'assessment',
        'group',
        'consultation',
      ],
      required: true,
    },
    appointment_date: { type: Date, required: true },
    start_time: { type: String, required: true }, // HH:MM
    end_time: { type: String, required: true },
    duration_minutes: { type: Number, required: true },
    appointment_type: {
      type: String,
      enum: ['regular', 'initial', 'assessment', 'makeup', 'emergency', 'consultation'],
      default: 'regular',
    },
    recurrence_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentRecurrence' },
    plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabilitationPlan' },
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RehabSession' },
    status: {
      type: String,
      enum: [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ],
      default: 'scheduled',
    },
    cancellation_reason: { type: String },
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelled_at: { type: Date },
    // تأكيد ولي الأمر
    parent_confirmed: { type: Boolean, default: false },
    parent_confirmed_at: { type: Date },
    reminder_sent: { type: Boolean, default: false },
    reminder_sent_at: { type: Date },
    // الحضور الفعلي
    check_in_time: { type: Date },
    check_out_time: { type: Date },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.pre('save', async function (next) {
  if (!this.appointment_number) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      appointment_number: new RegExp(`^APPT-${year}-`),
    });
    this.appointment_number = `APPT-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// REMOVED DUPLICATE: appointmentSchema.index({ appointment_number: 1 }); — field already has index:true
appointmentSchema.index({ beneficiary_id: 1, appointment_date: -1 });
appointmentSchema.index({ therapist_id: 1, appointment_date: 1 });
appointmentSchema.index({ branch_id: 1, appointment_date: 1 });
appointmentSchema.index({ room_id: 1, appointment_date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ recurrence_id: 1 });
appointmentSchema.index({ deleted_at: 1 });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
