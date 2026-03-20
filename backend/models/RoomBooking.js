/**
 * نموذج حجوزات الغرف
 * Room Booking Model
 */
const mongoose = require('mongoose');

const roomBookingSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 500 },
    bookingDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'cancelled', 'completed'],
      default: 'pending',
    },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookedByName: { type: String },
    department: { type: String },
    attendeesCount: { type: Number, default: 1 },
    recurring: { type: Boolean, default: false },
    recurringPattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'none'],
      default: 'none',
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roomBookingSchema.index({ room: 1, bookingDate: 1 });
roomBookingSchema.index({ bookedBy: 1 });
roomBookingSchema.index({ status: 1 });

module.exports = mongoose.models.RoomBooking || mongoose.model('RoomBooking', roomBookingSchema);
