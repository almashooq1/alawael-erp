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
 *   - We upsert into WhatsAppSyncTemplate (model created in this file) keyed
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

WhatsAppTemplateSchema.pre('save', async function () {
  this.updatedAt = new Date();
});

// Pattern D (W842): Meta provider template sync (distinct from comm/whatsapp-models Template)
const WhatsAppSyncTemplate =
  mongoose.models.WhatsAppSyncTemplate ||
  mongoose.model('WhatsAppSyncTemplate', WhatsAppTemplateSchema);

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
 * Count the {{N}} placeholders in a template body string.
 *
 * Meta numbers parameters from 1 upward, but duplicates are common:
 *   "مرحباً {{1}}، رصيدك {{2}} ريال. شكراً {{1}}!" → 2 unique params.
 * Returns the highest-numbered placeholder, which is the MINIMUM count of
 * parameters the caller must provide. (Providing more is OK; providing
 * fewer is a Meta 400.)
 */
function countPlaceholders(bodyText) {
  if (typeof bodyText !== 'string' || !bodyText) return 0;
  const matches = bodyText.match(/\{\{\s*(\d+)\s*\}\}/g);
  if (!matches) return 0;
  let max = 0;
  for (const m of matches) {
    const n = parseInt(m.replace(/[^0-9]/g, ''), 10);
    if (n > max) max = n;
  }
  return max;
}

/**
 * Validate a sendTemplate call against the locally-synced template.
 *
 * Catches three classes of caller mistakes BEFORE we burn a round-trip to
 * Meta and get a 400:
 *   - Template doesn't exist locally (was it synced? Is the name spelled
 *     correctly?). Returns ok=true with a `warning` because the local cache
 *     may simply be stale and the caller might know better.
 *   - Template exists but is NOT APPROVED (REJECTED, PAUSED, DISABLED,
 *     MISSING_IN_META, etc.). Returns ok=false.
 *   - Template approved but caller didn't supply enough body parameters.
 *     Returns ok=false with the count gap.
 *
 * Returns:
 *   { ok: true,  warning?: string }     — proceed
 *   { ok: false, reason: string, ... }  — abort send
 *
 * Designed to be cheap: hits the 60s in-process cache populated by
 * listApproved(). Failing open (skipping validation) if the cache misses
 * AND no Mongo connection is available — we don't want a sync glitch to
 * block sends.
 *
 * @param {string} templateName
 * @param {string} language
 * @param {Array} components - the components array passed to sendTemplate
 * @returns {Promise<{ok:true,warning?:string} | {ok:false,reason:string,details?:object}>}
 */
async function validateSendParams(templateName, language, components = []) {
  if (!templateName) {
    return { ok: false, reason: 'TEMPLATE_NAME_REQUIRED' };
  }

  let row;
  try {
    row = await WhatsAppSyncTemplate.findOne({ templateName, language }).lean();
  } catch {
    // Mongo unavailable — fail open. The downstream Meta call will surface
    // any real error.
    return { ok: true, warning: 'validation_skipped_no_db' };
  }

  if (!row) {
    return {
      ok: true,
      warning: `template '${templateName}' (${language}) not in local cache — proceeding without validation`,
    };
  }

  if (row.status !== 'APPROVED') {
    return {
      ok: false,
      reason: 'TEMPLATE_NOT_APPROVED',
      details: {
        template: templateName,
        language,
        status: row.status,
        ...(row.rejectionReason ? { rejectionReason: row.rejectionReason } : {}),
      },
    };
  }

  // Count body parameters supplied by the caller.
  const bodyComponent = (components || []).find(c => c?.type === 'body' || c?.type === 'BODY');
  const providedParams = Array.isArray(bodyComponent?.parameters)
    ? bodyComponent.parameters.length
    : 0;

  const required = countPlaceholders(row.bodyText);
  if (providedParams < required) {
    return {
      ok: false,
      reason: 'TEMPLATE_PARAM_COUNT_MISMATCH',
      details: {
        template: templateName,
        language,
        required,
        provided: providedParams,
      },
    };
  }

  // Per-param char limit: Meta caps template body parameters at 1024 chars.
  // We trim/reject early so the API doesn't return a confusing 400.
  if (bodyComponent?.parameters) {
    for (let i = 0; i < bodyComponent.parameters.length; i++) {
      const p = bodyComponent.parameters[i];
      const text = typeof p?.text === 'string' ? p.text : '';
      if (text.length > 1024) {
        return {
          ok: false,
          reason: 'TEMPLATE_PARAM_TOO_LONG',
          details: {
            template: templateName,
            paramIndex: i,
            length: text.length,
            max: 1024,
          },
        };
      }
    }
  }

  return { ok: true };
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
  const existing = await WhatsAppSyncTemplate.findOne({
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
    await WhatsAppSyncTemplate.create(next);
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
  const localRows = await WhatsAppSyncTemplate.find().lean();
  const missingNow = [];
  for (const row of localRows) {
    const key = `${row.templateName}::${row.language}`;
    if (seen.has(key)) continue;
    if (row.status === 'MISSING_IN_META') continue; // already flagged
    await WhatsAppSyncTemplate.updateOne(
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
  const rows = await WhatsAppSyncTemplate.find({ status: 'APPROVED' }).lean();
  cache = { data: rows, expiresAt: Date.now() + 60_000 };
  return language ? rows.filter(t => t.language === language) : rows;
}

function clearCache() {
  cache = { data: null, expiresAt: 0 };
}

/**
 * Lightweight approval-status lookup for a Meta template, by name only.
 *
 * Unlike `validateSendParams` (which also checks param counts/lengths), this
 * answers the single question "is this template deliverable right now?". When
 * the same template exists in multiple languages, an APPROVED row in ANY
 * language wins — mirroring the admin UI's deliverability indicator.
 *
 * Fails OPEN (returns `null`) when the row is absent or Mongo is unavailable,
 * so a sync glitch never blocks an otherwise-valid send.
 *
 * @param {string} templateName  Meta-registered template name
 * @returns {Promise<string|null>}  status string (e.g. 'APPROVED'), or null
 */
async function getTemplateStatus(templateName) {
  if (!templateName) return null;
  let rows;
  try {
    rows = await WhatsAppSyncTemplate.find({ templateName }).select('status').lean();
  } catch {
    return null; // fail open — DB unavailable
  }
  if (!rows || rows.length === 0) return null;
  if (rows.some(r => r.status === 'APPROVED')) return 'APPROVED';
  return rows[0].status;
}

module.exports = {
  WhatsAppTemplate: WhatsAppSyncTemplate,
  sync,
  upsertOne,
  fetchFromMeta,
  listApproved,
  clearCache,
  validateSendParams,
  getTemplateStatus,
  _extractBodyText: extractBodyText,
  _countPlaceholders: countPlaceholders,
};
