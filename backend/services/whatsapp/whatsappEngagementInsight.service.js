/**
 * WhatsApp Engagement Insight — صحّة تفاعل الأسر عبر واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Read-only intelligence over WhatsAppConversation: which families are actively
 * engaging on WhatsApp and which have gone quiet. A conversation that goes
 * silent is an early, channel-level signal that a family may be drifting away —
 * for a day-rehab centre that often precedes a beneficiary dropping out, so
 * surfacing a ranked "re-contact" list lets staff intervene before it's a churn.
 *
 * Distinct from:
 *   - whatsappRehabOutcomes.engagement → aggregate COUNTS for the M8 dashboard.
 *   - retentionService → CLINICAL churn (session recency), not the comms channel.
 * This is per-family + actionable, keyed on the conversation's lastMessageAt.
 *
 * Never throws (defensive); branch-scoped by the caller.
 *
 * @module services/whatsapp/whatsappEngagementInsight.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// Tier thresholds in DAYS since the last message. Tunable per call.
const DEFAULT_THRESHOLDS = { active: 7, cooling: 21, silent: 60 };
// Cap the scan so a huge active set can't monopolise a request; the list is for
// triage, not export. If the cap is hit we log it (no silent truncation).
const SCAN_LIMIT = 5000;
const DEFAULT_LIST_LIMIT = 50;

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

// Whole days between a past date and now (>= 0). null/invalid → Infinity (treat
// as maximally silent). Pure.
function daysSince(date, now = Date.now()) {
  if (!date) return Infinity;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, Math.floor((now - t) / 86400000));
}

// Classify a conversation by recency. Pure + testable.
function engagementTier(lastMessageAt, now = Date.now(), thresholds = DEFAULT_THRESHOLDS) {
  const d = daysSince(lastMessageAt, now);
  if (d <= thresholds.active) return 'active';
  if (d <= thresholds.cooling) return 'cooling';
  if (d <= thresholds.silent) return 'silent';
  return 'dormant';
}

// Tiers that warrant staff outreach. Pure.
function needsOutreach(tier) {
  return tier === 'silent' || tier === 'dormant';
}

function emptyInsight(sources = {}, thresholds = DEFAULT_THRESHOLDS) {
  return {
    thresholds,
    tiers: { active: 0, cooling: 0, silent: 0, dormant: 0 },
    total: 0,
    outreachList: [],
    scanned: 0,
    scanCapped: false,
    sources,
  };
}

/**
 * Build the engagement-health insight for a branch scope.
 * @param {object} opts
 * @param {string|null} [opts.branchScope] - effectiveBranchScope(req)
 * @param {number} [opts.now] - epoch ms (testability)
 * @param {object} [opts.thresholds] - { active, cooling, silent } in days
 * @param {number} [opts.listLimit] - max outreach rows
 * @returns {Promise<object>} insight payload (never throws)
 */
async function buildEngagementInsight(opts = {}) {
  const now = opts.now || Date.now();
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(opts.thresholds || {}) };
  const listLimit = Math.min(Number(opts.listLimit) || DEFAULT_LIST_LIMIT, 200);
  const Conversation =
    opts.deps && 'Conversation' in opts.deps
      ? opts.deps.Conversation
      : getModel('WhatsAppConversation');
  if (!Conversation) return emptyInsight({ conversations: 'unavailable' }, thresholds);

  try {
    const filter = { status: 'active' };
    if (opts.branchScope) filter.branchId = opts.branchScope;

    const rows = await Conversation.find(filter)
      .select('phone beneficiaryId branchId lastMessageAt')
      .sort({ lastMessageAt: 1 }) // oldest (most silent) first → cheap top-N
      .limit(SCAN_LIMIT + 1)
      .lean();

    const scanCapped = rows.length > SCAN_LIMIT;
    const scan = scanCapped ? rows.slice(0, SCAN_LIMIT) : rows;
    if (scanCapped) {
      logger?.warn?.(`[wa-engagement] scan capped at ${SCAN_LIMIT}; tier counts reflect the cap`);
    }

    const tiers = { active: 0, cooling: 0, silent: 0, dormant: 0 };
    const outreach = [];
    for (const c of scan) {
      const tier = engagementTier(c.lastMessageAt, now, thresholds);
      tiers[tier] += 1;
      if (needsOutreach(tier) && outreach.length < listLimit) {
        outreach.push({
          conversationId: String(c._id),
          beneficiaryId: c.beneficiaryId ? String(c.beneficiaryId) : null,
          phone: c.phone || null,
          tier,
          daysSilent: daysSince(c.lastMessageAt, now),
          lastMessageAt: c.lastMessageAt || null,
        });
      }
    }

    return {
      thresholds,
      tiers,
      total: scan.length,
      outreachList: outreach,
      scanned: scan.length,
      scanCapped,
      sources: { conversations: 'ok' },
    };
  } catch (err) {
    logger?.warn?.(`[wa-engagement] insight failed: ${err.message}`);
    return emptyInsight({ conversations: 'error' }, thresholds);
  }
}

module.exports = {
  buildEngagementInsight,
  // Pure helpers exported for the drift guard.
  engagementTier,
  daysSince,
  needsOutreach,
  emptyInsight,
  DEFAULT_THRESHOLDS,
  SCAN_LIMIT,
};
