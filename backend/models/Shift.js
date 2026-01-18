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
  { timestamps: true },
);

module.exports = mongoose.model('Shift', shiftSchema);
