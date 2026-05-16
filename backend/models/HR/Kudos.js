'use strict';

const mongoose = require('mongoose');

const KudosSchema = new mongoose.Schema(
  {
    fromEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    toEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    message: { type: String, required: true, maxlength: 1000 },
    value: {
      type: String,
      enum: [
        'teamwork',
        'innovation',
        'customer_focus',
        'integrity',
        'excellence',
        'leadership',
        'helpfulness',
      ],
      default: 'teamwork',
    },
    publicVisible: { type: Boolean, default: true, index: true },
    reactions: [
      {
        _id: false,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, maxlength: 10 },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'hr_kudos' }
);

KudosSchema.index({ toEmployeeId: 1, createdAt: -1 });

module.exports = mongoose.models.Kudos || mongoose.model('Kudos', KudosSchema);
