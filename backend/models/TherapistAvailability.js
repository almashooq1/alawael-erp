const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    required: true,
  },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true }, // "17:00"
  breakStart: String, // "12:00"
  breakEnd: String, // "13:00"
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapyRoom' }, // Optional preferred room
  isActive: { type: Boolean, default: true },
});

const therapistAvailabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // Recurring availability (weekly schedule)
    recurringSchedule: [availabilitySlotSchema],

    // Exceptions (holidays, special days off, etc.)
    exceptions: [
      {
        date: Date,
        reason: String, // "Holiday", "Conference", "Personal Leave"
        isAvailable: { type: Boolean, default: false },
        slots: [availabilitySlotSchema], // Override slots for this date if available
      },
    ],

    // Preferences
    preferences: {
      maxSessionsPerDay: { type: Number, default: 8 },
      minBreakBetweenSessions: { type: Number, default: 15 }, // minutes
      preferredSessionDuration: { type: Number, default: 60 }, // minutes
      specializations: [String], // "Speech Therapy", "Occupational Therapy", etc.
      languages: [String], // Languages spoken
      maxClientsSimultaneously: { type: Number, default: 1 }, // For group sessions
    },

    // Performance metrics
    metrics: {
      totalSessionsCompleted: { type: Number, default: 0 },
      averageSessionRating: { type: Number, default: 0 },
      cancellationRate: { type: Number, default: 0 }, // percentage
      noShowRate: { type: Number, default: 0 }, // percentage
      utilization: { type: Number, default: 0 }, // percentage
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

therapistAvailabilitySchema.index({ therapist: 1, 'recurringSchedule.isActive': 1 });
therapistAvailabilitySchema.index({ updatedAt: -1 });

module.exports = mongoose.model('TherapistAvailability', therapistAvailabilitySchema);
