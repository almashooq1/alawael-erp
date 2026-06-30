'use strict';

/**
 * WhatsAppTemplateRequest — Meta WhatsApp message-template approval requests.
 *
 * routes/whatsapp-enhanced.routes.js `/template-requests` (submit → approve/reject)
 * previously wrote this WhatsApp-template-shaped payload (name/language/body/
 * components/approvalStatus/branchId/createdBy) into the `NotificationTemplate`
 * model — a DIFFERENT entity whose required bilingual fields (code/nameAr/nameEn/
 * bodyAr/bodyEn) the create never supplied, so every submission threw a
 * ValidationError at runtime (the feature was 500-ing). This dedicated model holds
 * exactly the fields that surface writes/reads, so the approval workflow works and
 * the check:phantom-writes gate is satisfied. (W1540 dedicated-model doctrine.)
 */

const mongoose = require('mongoose');

const whatsAppTemplateRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    language: { type: String, default: 'ar' },
    body: { type: String, default: '' },
    category: { type: String, default: 'UTILITY' },
    // Meta template components (header/body/buttons …) — free-form per Meta's schema.
    components: { type: mongoose.Schema.Types.Mixed, default: undefined },
    description: { type: String, default: '' },
    headerText: { type: String, default: '' },
    footerText: { type: String, default: '' },
    type: { type: String, default: 'whatsapp_template' },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // approve/reject review trail
    reviewNotes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

whatsAppTemplateRequestSchema.index({ branchId: 1, approvalStatus: 1, createdAt: -1 });

module.exports =
  mongoose.models.WhatsAppTemplateRequest ||
  mongoose.model('WhatsAppTemplateRequest', whatsAppTemplateRequestSchema);
