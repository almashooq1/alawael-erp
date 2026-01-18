const mongoose = require('mongoose');

const therapyProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Early Intervention Program"
    code: { type: String, unique: true }, // e.g., "PRG-001"
    description: String,
    department: { type: String }, // e.g., "Speech Therapy", "Occupational Therapy"

    // Default structure
    defaultDurationWeeks: Number,
    sessionsPerWeek: Number,
    sessionDurationMinutes: Number,

    // Costing
    pricePerSession: { type: Number, default: 0 },
    priceFullProgram: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TherapyProgram', therapyProgramSchema);
