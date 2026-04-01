const mongoose = require('mongoose');

const roomBookingSchema = new mongoose.Schema(
  {
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    booked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking_date: { type: Date, required: true },
    start_time: { type: String, required: true }, // HH:MM
    end_time: { type: String, required: true },
    duration_minutes: { type: Number },
    purpose: { type: String },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'completed'],
      default: 'active',
    },
    notes: { type: String },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

roomBookingSchema.index({ room_id: 1, booking_date: 1 });
roomBookingSchema.index({ branch_id: 1, booking_date: 1 });
roomBookingSchema.index({ appointment_id: 1 });
roomBookingSchema.index({ deleted_at: 1 });

module.exports = mongoose.model('RoomBooking', roomBookingSchema);
