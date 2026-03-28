/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Morning Shift A"
    type: { type: String, enum: ['MORNING', 'EVENING', 'NIGHT', 'ON_CALL'], default: 'MORNING' },
    startTime: { type: String, required: true }, // "08:00"
    endTime: { type: String, required: true }, // "16:00"
    department: { type: String },
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);


// ── Indexes ───────────────────────────────────────────────────────────────
shiftSchema.index({ department: 1 });
shiftSchema.index({ type: 1 });
shiftSchema.index({ isActive: 1 });
shiftSchema.index({ department: 1, isActive: 1 });
module.exports = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);
