'use strict';

/**
 * LegalConsultation — legal-affairs consultation requests.
 *
 * routes/legal-affairs.routes.js mounts a full consultations CRUD
 * (GET/POST/PUT /consultations) + a dashboard count, but the model was never
 * built (the sibling `LegalCase` IS registered — this one was forgotten when the
 * domain was scaffolded). So `safeModel('LegalConsultation')` resolved to null and
 * POST/PUT (which don't null-guard, unlike GET) threw `Cannot read properties of
 * null` → 500 on every create/update. This dedicated model completes the domain.
 *
 * Field set mirrors the route's CONSULTATION_FIELDS whitelist + the server-set
 * consultationNumber / requestedBy / status, so nothing is strict-mode-dropped.
 */

const mongoose = require('mongoose');

const legalConsultationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    description: { type: String },
    type: { type: String },
    priority: { type: String, default: 'medium' },
    category: { type: String },
    dueDate: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    documents: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    consultationNumber: { type: String, unique: true, sparse: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.LegalConsultation ||
  mongoose.model('LegalConsultation', legalConsultationSchema);
