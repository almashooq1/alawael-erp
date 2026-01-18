const mongoose = require('mongoose');

const therapyRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Sensory Room 1", "Speech Lab"
    type: { type: String, enum: ['INDIVIDUAL', 'GROUP', 'SENSORY', 'GYM'], required: true },
    capacity: { type: Number, default: 1 },

    resources: [{ type: String }], // "Projector", "Mat", "Swing"

    isMaintenance: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TherapyRoom', therapyRoomSchema);
