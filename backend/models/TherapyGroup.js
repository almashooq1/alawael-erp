'use strict';

/**
 * TherapyGroup — group therapy session with multiple beneficiary
 * participants. Used by `routes/therapistUltra.routes.js` `/groups`.
 * Distinct from `Group.js` (generic User-based group).
 */

const mongoose = require('mongoose');

if (mongoose.models.TherapyGroup) {
  module.exports = mongoose.models.TherapyGroup;
} else {
  const participantSchema = new mongoose.Schema(
    {
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      joinedAt: { type: Date, default: Date.now },
      leftAt: { type: Date, default: null },
      attendance: { type: Number, default: 0 }, // sessions attended
    },
    { _id: false }
  );

  const schema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      facilitator: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      coFacilitators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
      focus: { type: String, default: null }, // 'social_skills', 'speech', etc.
      status: {
        type: String,
        enum: ['planning', 'active', 'completed', 'cancelled'],
        default: 'planning',
      },
      maxParticipants: { type: Number, default: 10 },
      participants: { type: [participantSchema], default: [] },
      sessionFrequency: { type: String, default: null },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapygroups' }
  );

  schema.index({ facilitator: 1, status: 1 });

  module.exports = mongoose.model('TherapyGroup', schema);
}
