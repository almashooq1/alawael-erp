'use strict';

/**
 * CommunityPartner.model.js — Phase 17 Commit 4 (4.0.86).
 *
 * Directory of external organisations we collaborate with:
 * schools, mosques, charities, govt agencies, hospitals, etc.
 *
 * No state machine — just a directory entry with status flag.
 * Auto-numbered `CP-YYYY-NNNNN`.
 */

const mongoose = require('mongoose');
const { PARTNER_CATEGORIES, PARTNER_STATUSES } = require('../../config/care/community.registry');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'in_person'],
      default: 'phone',
    },
  },
  { _id: true }
);

const communityPartnerSchema = new mongoose.Schema(
  {
    partnerNumber: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: null },
    category: { type: String, enum: PARTNER_CATEGORIES, required: true, index: true },
    status: { type: String, enum: PARTNER_STATUSES, default: 'active', index: true },

    // ── location ────────────────────────────────────────────────
    address: { type: String, default: null },
    city: { type: String, default: null },
    region: { type: String, default: null },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    // ── contacts (many-per-partner) ─────────────────────────────
    contacts: { type: [contactSchema], default: [] },

    // ── agreements / MoUs ──────────────────────────────────────
    hasFormalAgreement: { type: Boolean, default: false },
    agreementRef: { type: String, default: null }, // MoU reference id
    agreementValidUntil: { type: Date, default: null },

    // ── services offered ──────────────────────────────────────
    servicesOffered: { type: [String], default: [] }, // free-form list

    // ── scope ─────────────────────────────────────────────────
    branchesServed: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Branch',
      default: [],
    },

    // ── misc ──────────────────────────────────────────────────
    notes: { type: String, default: null },
    tags: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'care_community_partners' }
);

communityPartnerSchema.index({ category: 1, status: 1 });
communityPartnerSchema.index({ region: 1, city: 1 });

communityPartnerSchema.pre('validate', async function () {
  if (this.partnerNumber) return;
  const year = (this.createdAt || new Date()).getUTCFullYear();
  const Model = mongoose.model('CommunityPartner');
  const count = await Model.countDocuments({
    partnerNumber: { $regex: `^CP-${year}-` },
  });
  this.partnerNumber = `CP-${year}-${String(count + 1).padStart(5, '0')}`;
});

communityPartnerSchema.virtual('hasActiveAgreement').get(function () {
  if (!this.hasFormalAgreement) return false;
  if (!this.agreementValidUntil) return true;
  return this.agreementValidUntil >= new Date();
});

communityPartnerSchema.set('toJSON', { virtuals: true });
communityPartnerSchema.set('toObject', { virtuals: true });

const CommunityPartner =
  mongoose.models.CommunityPartner || mongoose.model('CommunityPartner', communityPartnerSchema);

module.exports = CommunityPartner;
