/**
 * WhatsApp Campaign service — حملات واتساب (إنشاء/تشغيل/إلغاء/تتبّع)
 * ═══════════════════════════════════════════════════════════════════════════
 * Persisted, trackable wrapper over the on-demand contact-group broadcast.
 * The SEND still flows through the existing hardened primitives — consent
 * filter (WhatsAppConsent.canMessage) + per-phone rate-limit + the approved
 * template sender — so this service does not duplicate the broadcast logic, it
 * only orchestrates the same building blocks and records the outcome on the
 * campaign document.
 *
 * All operations are branch-isolated through the model's scopedFilter/listFilter.
 *
 * @module services/whatsapp/whatsappCampaign.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { maskPhone } = require('./phone'); // W1424p — PDPL: never log raw E.164
const whatsappTemplates = require('./whatsappTemplates.service');
const rateLimit = require('./rateLimit.service');

// Cap one run so a huge group can't monopolise the send budget; the remainder
// is picked up on the next run (manual or, later, the scheduler).
const MAX_PER_RUN = 500;

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return require(`../../models/${name}`);
  }
}

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// ─── Pure helper (exported for the drift guard) ──────────────────────────────
// Fold per-recipient send outcomes ('sent' | 'queued' | anything-else=failed)
// into counts. Pure + unit-testable.
function summarizeOutcomes(outcomes) {
  const counts = { sent: 0, queued: 0, failed: 0 };
  for (const o of outcomes || []) {
    if (o === 'sent') counts.sent += 1;
    else if (o === 'queued') counts.queued += 1;
    else counts.failed += 1;
  }
  return counts;
}

async function createCampaign(input = {}, ctx = {}) {
  const Campaign = getModel('WhatsAppCampaign');

  const name = String(input.name || '').trim();
  if (!name) throw httpError('name is required', 400);
  if (!input.contactGroupId || !mongoose.isValidObjectId(input.contactGroupId)) {
    throw httpError('a valid contactGroupId is required', 400);
  }
  const templateKey = String(input.templateKey || '').trim();
  if (!templateKey) throw httpError('templateKey is required', 400);

  let scheduledAt;
  if (input.scheduledAt) {
    scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw httpError('invalid scheduledAt', 400);
  }

  const doc = await Campaign.create({
    name,
    description: input.description ? String(input.description).slice(0, 1000) : undefined,
    branchId: ctx.branchId || undefined,
    contactGroupId: input.contactGroupId,
    templateKey,
    templateArgs: Array.isArray(input.templateArgs) ? input.templateArgs.map(String) : [],
    scheduledAt: scheduledAt || undefined,
    status: scheduledAt ? 'scheduled' : 'draft',
    createdBy: ctx.actorId || undefined,
  });
  return doc.toObject();
}

async function listCampaigns(branchScope, opts = {}) {
  const Campaign = getModel('WhatsAppCampaign');
  return Campaign.find(Campaign.listFilter(branchScope, opts))
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(opts.limit) || 100, 500))
    .populate('contactGroupId', 'name')
    .lean();
}

async function getCampaign(id, branchScope) {
  const Campaign = getModel('WhatsAppCampaign');
  return Campaign.findOne(Campaign.scopedFilter(id, branchScope))
    .populate('contactGroupId', 'name')
    .lean();
}

async function cancelCampaign(id, branchScope) {
  const Campaign = getModel('WhatsAppCampaign');
  const campaign = await Campaign.findOne(Campaign.scopedFilter(id, branchScope));
  if (!campaign) throw httpError('Campaign not found', 404);
  if (!Campaign.isCancellable(campaign.status)) {
    throw httpError(`Cannot cancel a campaign in status '${campaign.status}'`, 409);
  }
  campaign.status = 'cancelled';
  await campaign.save();
  return campaign.toObject();
}

/**
 * Launch a campaign: consent-filter the group, send the template to each
 * eligible member (rate-limited), and persist the outcome metrics.
 * Idempotent against double-launch via the runnable-status guard.
 */
async function runCampaign(id, branchScope) {
  const Campaign = getModel('WhatsAppCampaign');
  const Group = getModel('WhatsAppContactGroup');
  const Consent = getModel('WhatsAppConsent');

  const campaign = await Campaign.findOne(Campaign.scopedFilter(id, branchScope));
  if (!campaign) throw httpError('Campaign not found', 404);
  if (!Campaign.isRunnable(campaign.status)) {
    throw httpError(`Campaign cannot run from status '${campaign.status}'`, 409);
  }

  // Claim it so a concurrent run sees 'running' and bails.
  campaign.status = 'running';
  campaign.startedAt = new Date();
  campaign.lastError = undefined;
  await campaign.save();

  try {
    const group = await Group.findOne(
      Group.groupScopedFilter(campaign.contactGroupId, branchScope)
    ).lean();
    if (!group) throw httpError('Contact group not found', 404);

    const members = group.members || [];
    const verdicts = await Promise.all(
      members.map(async m => {
        const phone = Group.normalizePhone(m.phone);
        try {
          const v = await Consent.canMessage(phone);
          return [phone, v || { allowed: false, reason: 'unknown' }];
        } catch {
          return [phone, { allowed: false, reason: 'consent_check_failed' }];
        }
      })
    );
    const eligibilityByPhone = Object.fromEntries(verdicts);
    const { eligible, blocked } = Group.partitionByEligibility(members, eligibilityByPhone);

    const targets = eligible.slice(0, MAX_PER_RUN);
    const outcomes = [];
    for (const t of targets) {
      const phone = Group.normalizePhone(t.phone);
      const rl = await rateLimit.checkAndRecord(phone);
      if (!rl.allowed) {
        outcomes.push('queued');
        continue;
      }
      try {
        const r = await whatsappTemplates.sendTemplate(
          campaign.templateKey,
          phone,
          campaign.templateArgs || []
        );
        outcomes.push(r && r.success ? 'sent' : 'failed');
      } catch (err) {
        logger?.warn?.(`[wa-campaign] send failed for ${maskPhone(phone)}: ${err.message}`);
        outcomes.push('failed');
      }
    }

    const counts = summarizeOutcomes(outcomes);
    campaign.metrics = {
      targeted: members.length,
      eligible: eligible.length,
      blocked: blocked.length,
      sent: counts.sent,
      queued: counts.queued,
      failed: counts.failed,
    };
    campaign.status = 'completed';
    campaign.completedAt = new Date();
    await campaign.save();
    return campaign.toObject();
  } catch (err) {
    campaign.status = 'failed';
    campaign.lastError = String((err && err.message) || err).slice(0, 2000);
    campaign.completedAt = new Date();
    try {
      await campaign.save();
    } catch {
      /* best-effort: surface the original error below */
    }
    throw err;
  }
}

// How many due campaigns one sweep launches (a backstop against a flood).
const MAX_DUE_PER_SWEEP = 50;

/**
 * Launch every scheduled campaign whose scheduledAt has passed (W1501).
 * Used by both the env-gated cron sweeper (branchScope=null → all branches) and
 * the manual POST /campaigns/run-due endpoint (branchScope=req → one branch).
 * runCampaign claims status=running, so a campaign already launched by a prior
 * tick is skipped (no double-send). Per-campaign failures are isolated.
 *
 * @param {object} [opts] - { branchScope, now, limit, logger }
 * @returns {Promise<{due:number, processed:number, failed:number}>}
 */
async function runDueCampaigns(opts = {}) {
  const { branchScope = null, now = Date.now(), logger } = opts;
  const limit = Math.min(Number(opts.limit) || MAX_DUE_PER_SWEEP, MAX_DUE_PER_SWEEP);
  const Campaign = getModel('WhatsAppCampaign');

  const filter = {
    status: 'scheduled',
    scheduledAt: { $lte: new Date(now) },
    isDeleted: false,
  };
  if (branchScope) filter.branchId = branchScope;

  const due = await Campaign.find(filter)
    .select('_id branchId')
    .sort({ scheduledAt: 1 })
    .limit(limit)
    .lean();

  let processed = 0;
  let failed = 0;
  for (const c of due) {
    try {
      // Pass the campaign's own branch so the branch-scoped runCampaign filter
      // still resolves it when the sweeper runs cross-branch (branchScope=null).
      await runCampaign(String(c._id), branchScope || (c.branchId ? String(c.branchId) : null));
      processed += 1;
    } catch (err) {
      failed += 1;
      logger?.warn?.(`[wa-campaign] due-run failed ${c._id}: ${err.message}`);
    }
  }
  return { due: due.length, processed, failed };
}

module.exports = {
  createCampaign,
  listCampaigns,
  getCampaign,
  cancelCampaign,
  runCampaign,
  runDueCampaigns,
  summarizeOutcomes,
  MAX_PER_RUN,
  MAX_DUE_PER_SWEEP,
};
