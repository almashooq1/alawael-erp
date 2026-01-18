const mongoose = require('mongoose');

const groupSessionLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  topic: String,
  activities: [String],
  attendance: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['PRESENT', 'ABSENT', 'EXCUSED'] },
      notes: String,
    },
  ],
  facilitator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const groupProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Social Skills Group A"
    type: { type: String, enum: ['SOCIAL', 'VOCATIONAL', 'BEHAVIORAL', 'RECREATIONAL'], required: true },

    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    targets: [String], // General goals of the group

    schedule: {
      days: [String], // ["Monday", "Wednesday"]
      time: String,
    },

    // Linked Students
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Session History
    sessions: [groupSessionLogSchema],

    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'PLANNED'], default: 'ACTIVE' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('GroupProgram', groupProgramSchema);
