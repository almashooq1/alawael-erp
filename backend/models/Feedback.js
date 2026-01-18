const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession', unique: true }, // One feedback per session
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'BeneficiaryFile', required: true },
    therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Who provided service

    // Net Promoter Score (Likelihood to recommend)
    npsScore: { type: Number, min: 0, max: 10, required: true },

    // Detailed Ratings (1-5 Stars)
    ratings: {
      therapistSkill: { type: Number, min: 1, max: 5 },
      facilityCleanliness: { type: Number, min: 1, max: 5 },
      staffFriendliness: { type: Number, min: 1, max: 5 },
    },

    comment: String,

    // AI Analysis
    sentiment: { type: String, enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] },

    // Resolution Loop
    requiresFollowUp: { type: Boolean, default: false },
    followUpStatus: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
    followUpNotes: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Feedback', feedbackSchema);
