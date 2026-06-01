'use strict';

/**
 * WhatsAppContactGroup — مجموعات جهات الاتصال في واتساب
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Operational goal
 *   Let staff organize WhatsApp recipients (parents, beneficiaries, employees)
 *   into named, reusable groups — e.g. "أولياء أمور قسم النطق" or "موظفو الفرع
 *   الرئيسي" — so a targeted broadcast / segment can be addressed once instead
 *   of re-selecting phone numbers every time.
 *
 * Multi-tenant (W269 doctrine)
 *   Every group belongs to one `organizationId`. All by-id and list lookups go
 *   through the pure `groupScopedFilter` / `listScopedFilter` helpers so a
 *   foreign-org staff member can never read or mutate another tenant's group
 *   (a cross-org id simply yields a clean 404 — no existence leak).
 *
 * Members are de-duplicated by normalized E.164 phone (digits only, no `+`),
 * matching the key WhatsAppConsent / WhatsAppConversation use, so consent and
 * conversation lookups line up across the module.
 *
 * @module models/WhatsAppContactGroup
 */

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    /** E.164 without `+` (e.g. `966512345678`). Canonical key across the module. */
    phone: { type: String, required: true, trim: true },
    /** Display label shown in the UI (optional — falls back to phone). */
    displayName: { type: String, default: null, trim: true },
    /** Optional link to the canonical beneficiary this number belongs to. */
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },
    /** Optional link to a family-member contact record. */
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const whatsappContactGroupSchema = new mongoose.Schema(
  {
    /** Owning tenant — required for cross-branch isolation. */
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, default: null },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },

    /** Free-form labels for filtering groups (e.g. "نطق", "إشغال", "VIP"). */
    tags: { type: [String], default: [] },

    /** Optional UI accent colour (hex). */
    color: { type: String, default: null, trim: true },

    members: { type: [memberSchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    /** Soft delete — keeps history + avoids breaking past broadcast records. */
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One active group name per tenant (case-insensitive, ignores soft-deleted).
whatsappContactGroupSchema.index(
  { organizationId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    collation: { locale: 'en', strength: 2 },
  }
);
whatsappContactGroupSchema.index({ organizationId: 1, isDeleted: 1, updatedAt: -1 });

whatsappContactGroupSchema.virtual('memberCount').get(function () {
  return Array.isArray(this.members) ? this.members.length : 0;
});
whatsappContactGroupSchema.set('toJSON', { virtuals: true });
whatsappContactGroupSchema.set('toObject', { virtuals: true });

// ─── Pure helpers (module-scope, exported + unit-testable) ───────────────────

/** Digits-only E.164 (no `+`, no separators) — the canonical phone key. */
function normalizePhone(raw) {
  return String(raw == null ? '' : raw).replace(/[^\d]/g, '');
}

/**
 * Normalize a raw member payload into the stored shape. Returns null when the
 * phone has no digits (so callers can drop invalid rows cleanly).
 * @param {object} raw
 * @returns {object|null}
 */
function normalizeMember(raw) {
  if (!raw) return null;
  const phone = normalizePhone(raw.phone);
  if (!phone) return null;
  return {
    phone,
    displayName: raw.displayName ? String(raw.displayName).trim() : null,
    beneficiaryId: raw.beneficiaryId || null,
    familyMemberId: raw.familyMemberId || null,
  };
}

/**
 * De-duplicate members by normalized phone, last-wins (so a re-add updates the
 * display name / links). Drops rows with no valid phone. Pure / non-mutating.
 * @param {Array<object>} members
 * @returns {Array<object>}
 */
function dedupeMembers(members) {
  const byPhone = new Map();
  for (const raw of Array.isArray(members) ? members : []) {
    const m = normalizeMember(raw);
    if (m) byPhone.set(m.phone, m);
  }
  return Array.from(byPhone.values());
}

/**
 * Query filter for a by-id group lookup that also enforces org isolation
 * (W269). A cross-org id yields a clean 404 instead of leaking existence.
 * @param {string} id
 * @param {string} [orgId]
 * @returns {object}
 */
function groupScopedFilter(id, orgId) {
  const filter = { _id: id, isDeleted: false };
  if (orgId) filter.organizationId = orgId;
  return filter;
}

/**
 * Query filter for the org-scoped group list, with optional name search + tag.
 * @param {string} [orgId]
 * @param {{ search?: string, tag?: string }} [opts]
 * @returns {object}
 */
function listScopedFilter(orgId, opts = {}) {
  const filter = { isDeleted: false };
  if (orgId) filter.organizationId = orgId;
  if (opts.search) filter.name = { $regex: String(opts.search).trim(), $options: 'i' };
  if (opts.tag) filter.tags = opts.tag;
  return filter;
}

/**
 * Split a group's members into messageable vs blocked using a consent-result
 * map (W269/PDPL: only message contacts who can be messaged). Pure / read-only
 * — used by the broadcast-preview route so staff see eligibility BEFORE any
 * send is attempted. A member with no entry in the map is treated as blocked
 * with reason `unknown` (fail-closed).
 *
 * @param {Array<object>} members
 * @param {Record<string, {allowed:boolean, reason?:string}>} eligibilityByPhone
 * @returns {{ eligible: Array<object>, blocked: Array<object>, total:number }}
 */
function partitionByEligibility(members, eligibilityByPhone = {}) {
  const eligible = [];
  const blocked = [];
  for (const m of Array.isArray(members) ? members : []) {
    const phone = normalizePhone(m && m.phone);
    if (!phone) {
      blocked.push({ ...m, phone, reason: 'no_phone' });
      continue;
    }
    const verdict = eligibilityByPhone[phone];
    if (verdict && verdict.allowed) {
      eligible.push({ ...m, phone, reason: verdict.reason || 'allowed' });
    } else {
      blocked.push({ ...m, phone, reason: (verdict && verdict.reason) || 'unknown' });
    }
  }
  return { eligible, blocked, total: eligible.length + blocked.length };
}

// ─── Statics ─────────────────────────────────────────────────────────────────

whatsappContactGroupSchema.statics.listForOrg = function (orgId, opts = {}) {
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(opts.limit, 10) || 50));
  return this.find(listScopedFilter(orgId, opts))
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

module.exports =
  mongoose.models.WhatsAppContactGroup ||
  mongoose.model('WhatsAppContactGroup', whatsappContactGroupSchema);

// Pure helpers attached for route reuse + unit testing (the global mongoose
// mock returns a generic model without custom statics, so helpers are tested
// via these attached exports).
module.exports.normalizePhone = normalizePhone;
module.exports.normalizeMember = normalizeMember;
module.exports.dedupeMembers = dedupeMembers;
module.exports.groupScopedFilter = groupScopedFilter;
module.exports.listScopedFilter = listScopedFilter;
module.exports.partitionByEligibility = partitionByEligibility;
