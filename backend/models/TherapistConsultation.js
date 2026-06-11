/**
 * TherapistConsultation — provider-to-provider clinical consultation
 * requests. Used by `routes/therapistExtended.routes.js` `/consultations`.
 *
 * One therapist asks another for clinical input ("What would you do
 * with this case?"). The respondent can answer with a structured reply
 * the requester then accepts/rejects. Distinct from messages (which
 * are general communication) and from referrals (which transfer care).
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.TherapistConsultation) {
  module.exports = mongoose.models.TherapistConsultation;
} else {
  const responseSchema = new mongoose.Schema(
    {
      respondedAt: { type: Date, default: Date.now },
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      content: { type: String, required: true },
      attachments: { type: [String], default: [] },
    },
    { _id: false }
  );

  const therapistConsultationSchema = new mongoose.Schema(
    {
      requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      consultant: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
      topic: { type: String, required: true, trim: true },
      question: { type: String, required: true },
      urgency: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
      },
      status: {
        type: String,
        enum: ['open', 'awaiting_response', 'answered', 'closed', 'cancelled'],
        default: 'open',
      },
      responses: { type: [responseSchema], default: [] },
      closedAt: { type: Date, default: null },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'therapistconsultations' }
  );

  therapistConsultationSchema.index({ requester: 1, status: 1 });
  therapistConsultationSchema.index({ consultant: 1, status: 1 });

  // ── Unified-core linkage (W1075 — therapist-consultation island → CareTimeline) ──
  const TC_DONE = ['answered', 'closed'];
  therapistConsultationSchema.post('init', function () {
    this.$__prevStatus = this.status;
  });
  therapistConsultationSchema.post('save', function (doc) {
    try {
      if (!TC_DONE.includes(doc.status) || TC_DONE.includes(this.$__prevStatus)) return;
      const { integrationBus } = require('../integration/systemIntegrationBus');
      if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiary)
        return;
      Promise.resolve(
        integrationBus.publish('care-coordination', 'consultation.answered', {
          therapistConsultationId: String(doc._id),
          beneficiaryId: String(doc.beneficiary),
          topic: doc.topic,
          status: doc.status,
        })
      ).catch(() => {});
    } catch (_) {
      /* never block persistence */
    }
  });

  module.exports =
    mongoose.models.TherapistConsultation ||
    mongoose.model('TherapistConsultation', therapistConsultationSchema);
}
