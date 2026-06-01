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

/**
 * Aggregate a set of (lean) groups into a read-only summary: total groups,
 * total members across them, a per-tag member-count distribution, and the
 * largest group. Pure / read-only — backs the contact-groups stats endpoint.
 * Robust to missing `members` / `tags` arrays.
 *
 * @param {Array<object>} groups
 * @returns {{ totalGroups:number, totalMembers:number, byTag:Record<string,number>, largest:(null|{id:string,name:string,memberCount:number}) }}
 */
function summarizeGroups(groups) {
  const list = Array.isArray(groups) ? groups : [];
  const byTag = {};
  let totalMembers = 0;
  let largest = null;
  for (const g of list) {
    const memberCount = Array.isArray(g && g.members) ? g.members.length : 0;
    totalMembers += memberCount;
    if (!largest || memberCount > largest.memberCount) {
      largest = { id: String(g && g._id), name: (g && g.name) || null, memberCount };
    }
    for (const tag of Array.isArray(g && g.tags) ? g.tags : []) {
      if (typeof tag === 'string' && tag.length) {
        byTag[tag] = (byTag[tag] || 0) + memberCount;
      }
    }
  }
  return { totalGroups: list.length, totalMembers, byTag, largest };
}

/**
 * Escape a single CSV cell: wrap in quotes when it contains a delimiter / quote
 * / newline, and neutralise spreadsheet formula-injection by prefixing a value
 * that begins with `= + - @ \t \r` with a single quote. Pure / read-only.
 *
 * @param {*} value
 * @returns {string}
 */
function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Render a group's members as a CSV document (header + one row per member).
 * Columns: phone, displayName, addedAt. Pure / read-only — backs the members
 * CSV export endpoint. Robust to a missing `members` array.
 *
 * @param {object} group
 * @returns {string}
 */
function membersToCsv(group) {
  const members = Array.isArray(group && group.members) ? group.members : [];
  const header = ['phone', 'displayName', 'addedAt'].join(',');
  const rows = members.map(m =>
    [
      csvCell(normalizePhone(m && m.phone)),
      csvCell(m && m.displayName),
      csvCell(m && m.addedAt ? new Date(m.addedAt).toISOString() : ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Parse a single CSV line into an array of fields, honouring double-quoted
 * cells (with `""` escaping) and the formula-injection guard prefix (a leading
 * `'` added by csvCell is stripped on the way back). Pure / read-only.
 *
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(c => c.replace(/^'(?=[=+\-@\t\r])/, ''));
}

/**
 * Parse a CSV document (as produced by membersToCsv, or any sheet with a
 * `phone` column) into normalized member objects. Header-driven: locates the
 * `phone` and `displayName` columns by name (case-insensitive), skips rows with
 * no usable phone, and de-duplicates by phone. Pure / read-only — backs the
 * members CSV-import endpoint.
 *
 * @param {string} csv
 * @returns {Array<{phone:string, displayName:(string|null)}>}
 */
function parseCsvMembers(csv) {
  const lines = String(csv == null ? '' : csv)
    .split(/\r?\n/)
    .filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const phoneIdx = header.indexOf('phone');
  const nameIdx = header.indexOf('displayname');
  if (phoneIdx === -1) return [];
  const members = [];
  for (let i = 1; i < lines.length; i += 1) {
    const fields = parseCsvLine(lines[i]);
    const phone = normalizePhone(fields[phoneIdx]);
    if (!phone) continue;
    const displayName =
      nameIdx !== -1 && fields[nameIdx] ? String(fields[nameIdx]).trim() : null;
    members.push({ phone, displayName: displayName || null });
  }
  return dedupeMembers(members);
}

/**
 * Diff an incoming member set against the existing members of a group by phone.
 * Returns which incoming members are new vs already present (de-duped). Pure /
 * read-only — backs the CSV-import dry-run preview so staff can see the impact
 * before committing.
 *
 * @param {Array<object>} existing
 * @param {Array<object>} incoming
 * @returns {{ toAdd: Array<object>, duplicates: Array<object>, addCount:number, duplicateCount:number }}
 */
function diffMembers(existing, incoming) {
  const have = new Set(
    (Array.isArray(existing) ? existing : [])
      .map(m => normalizePhone(m && m.phone))
      .filter(Boolean)
  );
  const toAdd = [];
  const duplicates = [];
  for (const m of dedupeMembers(Array.isArray(incoming) ? incoming : [])) {
    if (have.has(m.phone)) duplicates.push(m);
    else toAdd.push(m);
  }
  return {
    toAdd,
    duplicates,
    addCount: toAdd.length,
    duplicateCount: duplicates.length,
  };
}

/**
 * searchMembers — case-insensitive read-only filter of a group's members by a
 * free-text query matched against phone (digits) and displayName. An empty /
 * blank query returns all members unchanged. Used to make large groups
 * navigable without loading every row into the client (W753).
 *
 * @param {Array<object>} members
 * @param {string} [query]
 * @returns {Array<object>}
 */
function searchMembers(members, query) {
  const list = Array.isArray(members) ? members : [];
  const q = String(query == null ? '' : query).trim().toLowerCase();
  if (!q) return list;
  const qDigits = q.replace(/[^\d]/g, '');
  return list.filter(m => {
    if (!m) return false;
    const phone = normalizePhone(m.phone);
    const name = String(m.displayName == null ? '' : m.displayName).toLowerCase();
    const phoneHit = qDigits ? phone.includes(qDigits) : false;
    return phoneHit || name.includes(q);
  });
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
module.exports.summarizeGroups = summarizeGroups;
module.exports.csvCell = csvCell;
module.exports.membersToCsv = membersToCsv;
module.exports.parseCsvLine = parseCsvLine;
module.exports.parseCsvMembers = parseCsvMembers;
module.exports.diffMembers = diffMembers;
module.exports.searchMembers = searchMembers;