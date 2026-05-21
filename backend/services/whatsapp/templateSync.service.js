'use strict';

/**
 * WhatsApp Template Sync — مزامنة قوالب Meta
 * ═══════════════════════════════════════════════════════════════════════════
 * Pulls approved message templates from Meta Business Manager and persists
 * them locally so:
 *
 *   - The admin UI can list "what's currently approved" without a Graph API
 *     call per render (Meta rate-limits aggressively).
 *   - `whatsappService.sendTemplate(name)` can validate the name before
 *     paying the round-trip to Meta and getting a 400.
 *   - The auto-reply engine knows which templates exist (so it doesn't
 *     reference one that was rejected or pending).
 *
 * Sync strategy:
 *   - Pull is manual + scheduled. Manual: admin endpoint
 *     `POST /whatsapp/templates/sync`. Scheduled: every 6 hours via the
 *     existing schedulers bootstrap (Phase B already added a slot).
 *   - We upsert into WhatsAppTemplate (model created in this file) keyed
 *     by (templateName, language). Status pulled directly from Meta:
 *     APPROVED, IN_REVIEW, REJECTED, PAUSED, DISABLED.
 *   - We never DELETE local rows on a missing-in-Meta diff — Meta sometimes
 *     omits paused templates from list endpoints; deletion would lose audit
 *     trail. Instead set status='MISSING_IN_META' so admins can investigate.
 *
 * @module services/whatsapp/templateSync.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─── Model ─────────────────────────────────────────────────────────────────
const WhatsAppTemplateSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true },
    language: { type: String, required: true, default: 'ar' },
    status: {
      type: String,
      enum: [
        'APPROVED',
        'IN_REVIEW',
        'REJECTED',
        'PAUSED',
        'DISABLED',
        'PENDING_DELETION',
        'MISSING_IN_META',
      ],
      required: true,
    },
    category: { type: String, default: 'UTILITY' }, // MARKETING | UTILITY | AUTHENTICATION
    components: { type: mongoose.Schema.Types.Mixed, default: [] },
    bodyText: { type: String, default: '' }, // extracted body text for preview
    metaTemplateId: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    lastSyncedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'whatsapp_templates' }
);

WhatsAppTemplateSchema.index({ templateName: 1, language: 1 }, { unique: true });
WhatsAppTemplateSchema.index({ status: 1 });

WhatsAppTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const WhatsAppTemplate =
  mongoose.models.WhatsAppTemplate || mongoose.model('WhatsAppTemplate', WhatsAppTemplateSchema);

// ─── Sync logic ────────────────────────────────────────────────────────────

/**
 * Extract the body text from a Meta template's components array so admins
 * see a preview without parsing the schema. Meta returns:
 *   components: [{ type: 'BODY', text: '...' }, { type: 'BUTTONS', ... }]
 */
function extractBodyText(components) {
  if (!Array.isArray(components)) return '';
  const body = components.find(c => c.type === 'BODY' || c.type === 'body');
  return body?.text || '';
}

/**
 * Fetch the current template list from Meta. Throws on Meta API errors so
 * the caller can surface them to the admin endpoint.
 */
async function fetchFromMeta() {
  const svc = require('./whatsappService');
  const response = await svc.getTemplates();
  // Meta returns { data: [...], paging: { cursors, next? } }
  return Array.isArray(response?.data) ? response.data : [];
}

/**
 * Upsert one template row. Returns { created, updated, statusChanged }.
 */
async function upsertOne(metaTemplate) {
  const existing = await WhatsAppTemplate.findOne({
    templateName: metaTemplate.name,
    language: metaTemplate.language,
  });

  const next = {
    templateName: metaTemplate.name,
    language: metaTemplate.language,
    status: metaTemplate.status,
    category: metaTemplate.category || 'UTILITY',
    components: metaTemplate.components || [],
    bodyText: extractBodyText(metaTemplate.components),
    metaTemplateId: metaTemplate.id || null,
    rejectionReason: metaTemplate.rejected_reason || null,
    lastSyncedAt: new Date(),
  };

  if (!existing) {
    await WhatsAppTemplate.create(next);
    return { created: true, statusChanged: false };
  }

  const statusChanged = existing.status !== next.status;
  Object.assign(existing, next);
  await existing.save();
  return { created: false, statusChanged, previousStatus: existing.status };
}

/**
 * Full sync: fetch from Meta, upsert each, mark locally-known rows that
 * weren't in Meta's response as MISSING_IN_META (don't delete).
 *
 * Returns counts + per-template change list so admins know what shifted.
 */
async function sync() {
  const startedAt = new Date();
  let metaTemplates;
  try {
    metaTemplates = await fetchFromMeta();
  } catch (err) {
    logger.warn(`[WhatsApp Template Sync] Meta fetch failed: ${err.message}`);
    return {
      ok: false,
      error: err.message,
      startedAt,
      finishedAt: new Date(),
    };
  }

  const seen = new Set();
  const changes = [];
  let created = 0;
  let updated = 0;
  let statusChanges = 0;

  for (const t of metaTemplates) {
    if (!t.name || !t.language || !t.status) continue;
    const key = `${t.name}::${t.language}`;
    seen.add(key);
    try {
      const r = await upsertOne(t);
      if (r.created) created += 1;
      else updated += 1;
      if (r.statusChanged) {
        statusChanges += 1;
        changes.push({
          template: t.name,
          language: t.language,
          from: r.previousStatus,
          to: t.status,
        });
      }
    } catch (err) {
      logger.warn(`[WhatsApp Template Sync] upsert ${t.name} failed: ${err.message}`);
    }
  }

  // Mark missing: locally known templates that weren't in Meta's response.
  const localRows = await WhatsAppTemplate.find().lean();
  const missingNow = [];
  for (const row of localRows) {
    const key = `${row.templateName}::${row.language}`;
    if (seen.has(key)) continue;
    if (row.status === 'MISSING_IN_META') continue; // already flagged
    await WhatsAppTemplate.updateOne(
      { _id: row._id },
      { $set: { status: 'MISSING_IN_META', lastSyncedAt: new Date() } }
    );
    missingNow.push({ template: row.templateName, language: row.language });
  }

  const finishedAt = new Date();
  logger.info(
    `[WhatsApp Template Sync] OK — ${created} new, ${updated} updated, ` +
      `${statusChanges} status changes, ${missingNow.length} now missing ` +
      `(${finishedAt - startedAt}ms)`
  );

  return {
    ok: true,
    startedAt,
    finishedAt,
    totals: { created, updated, statusChanges, missing: missingNow.length },
    changes,
    missingNow,
  };
}

/**
 * Convenience read — used by the auto-reply engine to validate template
 * names before dispatching. Cached in-process for 60s to absorb bursts
 * (e.g. webhook fan-in).
 */
let cache = { data: null, expiresAt: 0 };
async function listApproved({ language = null, force = false } = {}) {
  if (!force && cache.data && cache.expiresAt > Date.now()) {
    return language ? cache.data.filter(t => t.language === language) : cache.data;
  }
  const rows = await WhatsAppTemplate.find({ status: 'APPROVED' }).lean();
  cache = { data: rows, expiresAt: Date.now() + 60_000 };
  return language ? rows.filter(t => t.language === language) : rows;
}

function clearCache() {
  cache = { data: null, expiresAt: 0 };
}

module.exports = {
  WhatsAppTemplate,
  sync,
  upsertOne,
  fetchFromMeta,
  listApproved,
  clearCache,
  _extractBodyText: extractBodyText,
};
