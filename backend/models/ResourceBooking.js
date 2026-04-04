/**
 * ResourceBooking Model — حجز الموارد المشتركة (غرف العلاج، المعدات)
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const resourceBookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    bookingDate: { type: Date, required: true },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'confirmed',
    },
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', null],
      default: null,
    },
    recurrenceEndDate: { type: Date },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'resource_bookings' }
);

resourceBookingSchema.index({ bookingDate: 1 });
resourceBookingSchema.index({ status: 1 });
resourceBookingSchema.index({ assetId: 1 });
resourceBookingSchema.index({ assetId: 1, bookingDate: 1, startTime: 1, endTime: 1 });
resourceBookingSchema.index({ branchId: 1 });

module.exports =
  mongoose.models.ResourceBooking || mongoose.model('ResourceBooking', resourceBookingSchema);
