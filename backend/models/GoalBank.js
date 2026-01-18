const mongoose = require('mongoose');

const goalBankSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      enum: ['SPEECH', 'OCCUPATIONAL', 'PHYSICAL', 'BEHAVIORAL', 'SPECIAL_EDU'],
    },

    category: { type: String, required: true }, // e.g., "Articulation", "Fine Motor", "Social Skills"

    description: { type: String, required: true }, // The SMART goal text

    targetAgeMin: { type: Number, required: true }, // Years
    targetAgeMax: { type: Number, required: true }, // Years

    difficulty: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER' },

    // Measurement
    measurementCriteria: { type: String }, // e.g. "4 out of 5 trials"

    tags: [String],
  },
  { timestamps: true },
);

// Index for search suggestions
goalBankSchema.index({ description: 'text', category: 'text' });

module.exports = mongoose.model('GoalBank', goalBankSchema);
