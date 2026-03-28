/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const therapyRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Sensory Room 1", "Speech Lab"
    type: { type: String, enum: ['INDIVIDUAL', 'GROUP', 'SENSORY', 'GYM'], required: true },
    capacity: { type: Number, default: 1 },

    resources: [{ type: String }], // "Projector", "Mat", "Swing"

    isMaintenance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
therapyRoomSchema.index({ type: 1, isMaintenance: 1 });
therapyRoomSchema.index({ name: 1 });

module.exports = mongoose.models.TherapyRoom || mongoose.model('TherapyRoom', therapyRoomSchema);
