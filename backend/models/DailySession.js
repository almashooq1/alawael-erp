/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const goalProgressSchema = new mongoose.Schema({
  goalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Links to Subdoc ID in CarePlan
  score: Number, // e.g. 0-100 or 1-5
  isAchieved: Boolean,
  comments: String,
});

const dailySessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    specialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'CarePlan' }, // Link to master plan

    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['INDIVIDUAL', 'GROUP'], default: 'INDIVIDUAL' },
    domain: { type: String, required: true }, // e.g. "SPEECH", "ACADEMIC"

    // Goals worked on
    goalsProgress: [goalProgressSchema],

    generalNotes: String,

    // Attachments (Photos/Videos of session)
    media: [String],
  },
  { timestamps: true }
);


// ── Indexes ───────────────────────────────────────────────────────────────
goalProgressSchema.index({ student: 1 });
goalProgressSchema.index({ specialist: 1 });
goalProgressSchema.index({ date: -1 });
goalProgressSchema.index({ student: 1, date: -1 });
goalProgressSchema.index({ plan: 1 });
module.exports = mongoose.models.DailySession || mongoose.model('DailySession', dailySessionSchema);
