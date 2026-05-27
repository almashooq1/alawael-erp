'use strict';

/**
 * ParentMessage — therapist ↔ parent/guardian messages scoped to a
 * specific beneficiary. Used by `routes/therapistPro.routes.js`
 * `/parent-messages`. Distinct from the internal `messaging.service`
 * (staff-to-staff) and from notifications (system → user).
 */

const mongoose = require('mongoose');

if (mongoose.models.ParentMessage) {
  module.exports = mongoose.models.ParentMessage;
} else {
  const schema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      guardian: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian', default: null },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      direction: { type: String, enum: ['to_parent', 'from_parent'], default: 'to_parent' },
      subject: { type: String, default: null },
      content: { type: String, required: true },
      attachments: { type: [String], default: [] },
      sentAt: { type: Date, default: Date.now },
      readAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'parentmessages' }
  );

  schema.index({ therapist: 1, beneficiary: 1, sentAt: -1 });
  schema.index({ guardian: 1, readAt: 1 });

  module.exports =
    mongoose.models.ParentMessage || mongoose.model('ParentMessage', schema);
}
