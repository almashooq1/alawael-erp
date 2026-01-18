const mongoose = require('mongoose');

const therapySessionSchema = new mongoose.Schema(
  {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticPlan', required: true },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true }, // Redundant but good for quick queries

    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },

    // Scheduling
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true }, // "11:00"

    // Status
    status: {
      type: String,
      enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW'],
      default: 'SCHEDULED',
    },

    // Clinical Data (Post-session)
    attendance: {
      isPresent: Boolean,
      arrivalTime: String,
    },

    notes: {
      subjective: String, // What patient said
      objective: String, // What therapist observed
      assessment: String, // Analysis
      plan: String, // Next steps
    },

    rating: { type: Number, min: 1, max: 5 }, // Patient performance

    // Financial Hook
    isBilled: { type: Boolean, default: false },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true },
);

// Index for conflict detection
therapySessionSchema.index({ therapist: 1, date: 1, startTime: 1 });
therapySessionSchema.index({ beneficiary: 1, date: 1, startTime: 1 });

module.exports = mongoose.model('TherapySession', therapySessionSchema);
