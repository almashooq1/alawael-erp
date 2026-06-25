/**
 * WhatsApp Rehab Outcomes — مؤشرات أثر واتساب على نتائج التأهيل
 * ═══════════════════════════════════════════════════════════════════════════
 * Read-only analytics that connect WhatsApp engagement to rehab outcomes — the
 * blueprint's differentiator vs a generic chat dashboard. It segments
 * beneficiaries by "has an active WhatsApp conversation" and contrasts their
 * no-show rate + goal-achievement rate against the rest, plus channel adoption
 * and family NPS.
 *
 * IMPORTANT: these are CORRELATIONAL signals (WhatsApp-active families tend to…),
 * not causal proof. "Attendance after a specific reminder" needs reminder↔session
 * linkage that isn't tracked yet, so the WhatsApp-active-vs-not no-show contrast
 * is the honest available proxy.
 *
 * Defensive: lazy mongoose.model + Promise.allSettled, so one missing/failing
 * collection degrades to nulls in `sources` instead of breaking the panel.
 * Branch-isolated via the branchScope passed by the route.
 *
 * @module services/whatsapp/whatsappRehabOutcomes.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const DEFAULT_WINDOW_DAYS = 90;
// Sessions that reached a known attendance outcome (the no-show-rate denominator).
const RESOLVED_SESSION_STATUSES = ['completed', 'no_show'];
// Goals with a recorded lifecycle outcome (the achievement-rate denominator).
const COUNTED_GOAL_STATUSES = [
  'achieved',
  'partially_achieved',
  'not_achieved',
  'active',
  'modified',
  'discontinued',
  'deferred',
];

function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

// Percentage with 1 decimal, 0 when the denominator is 0. Pure.
function pct(part, whole) {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

// Split an overall + within-segment count into the two segments (avoids a slow
// $nin over a large id array — the complement is overall − within). Pure.
function splitSegments({ overallTotal, overallHit, withinTotal, withinHit }) {
  const ot = overallTotal || 0;
  const oh = overallHit || 0;
  const wt = Math.min(withinTotal || 0, ot);
  const wh = Math.min(withinHit || 0, oh);
  return {
    withWhatsApp: { total: wt, hit: wh },
    withoutWhatsApp: { total: ot - wt, hit: oh - wh },
  };
}

function noShowBlock(split) {
  return {
    withWhatsApp: {
      total: split.withWhatsApp.total,
      noShow: split.withWhatsApp.hit,
      ratePct: pct(split.withWhatsApp.hit, split.withWhatsApp.total),
    },
    withoutWhatsApp: {
      total: split.withoutWhatsApp.total,
      noShow: split.withoutWhatsApp.hit,
      ratePct: pct(split.withoutWhatsApp.hit, split.withoutWhatsApp.total),
    },
  };
}

function goalBlock(split) {
  return {
    withWhatsApp: {
      total: split.withWhatsApp.total,
      achieved: split.withWhatsApp.hit,
      achievedPct: pct(split.withWhatsApp.hit, split.withWhatsApp.total),
    },
    withoutWhatsApp: {
      total: split.withoutWhatsApp.total,
      achieved: split.withoutWhatsApp.hit,
      achievedPct: pct(split.withoutWhatsApp.hit, split.withoutWhatsApp.total),
    },
  };
}

function emptyOutcomes(sources = {}, windowDays = DEFAULT_WINDOW_DAYS) {
  return {
    windowDays,
    adoption: { withWhatsApp: 0, totalActive: 0, pct: 0 },
    noShow: noShowBlock(splitSegments({})),
    goals: goalBlock(splitSegments({})),
    nps: { average: null, count: 0 },
    engagement: { conversations: 0, familiesEngaged: 0 },
    sources,
  };
}

/**
 * Build the rehab-outcomes payload for one branch scope.
 * @param {string|null} branchScope - effectiveBranchScope(req)
 * @param {object} [opts] - { windowDays, now }
 * @returns {Promise<object>} never throws
 */
async function buildRehabOutcomes(branchScope, opts = {}) {
  const windowDays = Number(opts.windowDays) > 0 ? Number(opts.windowDays) : DEFAULT_WINDOW_DAYS;
  const nowMs = opts.now || Date.now();
  const cutoff = new Date(nowMs - windowDays * 24 * 60 * 60 * 1000);
  const branchMatch = branchScope ? { branchId: new mongoose.Types.ObjectId(String(branchScope)) } : {};
  const branchPlain = branchScope ? { branchId: branchScope } : {};

  const Conversation = tryModel('WhatsAppConversation');
  const Beneficiary = tryModel('Beneficiary');
  const Session = tryModel('ClinicalSession');
  const Goal = tryModel('TherapeuticGoal');
  const Nps = tryModel('NpsResponse');

  const sources = {};

  // The WhatsApp-active beneficiary set drives every segment, so resolve it
  // first (best-effort). Empty set → every "withWhatsApp" segment is 0.
  let waIds = [];
  if (Conversation) {
    try {
      waIds = (
        await Conversation.distinct('beneficiaryId', {
          ...branchPlain,
          isDeleted: false,
          beneficiaryId: { $ne: null },
        })
      ).filter(Boolean);
      sources.conversations = 'ok';
    } catch (err) {
      sources.conversations = 'error';
      logger?.warn?.(`[wa-outcomes] conversations: ${err.message}`);
    }
  } else {
    sources.conversations = 'unavailable';
  }

  const tasks = [
    [
      'adoption',
      Beneficiary,
      async () => {
        const totalActive = await Beneficiary.countDocuments({ ...branchPlain, status: 'active' });
        return { withWhatsApp: waIds.length, totalActive, pct: pct(waIds.length, totalActive) };
      },
    ],
    [
      'noShow',
      Session,
      async () => {
        const baseFilter = {
          ...branchPlain,
          scheduledDate: { $gte: cutoff },
          status: { $in: RESOLVED_SESSION_STATUSES },
        };
        const [overallTotal, overallHit, withinTotal, withinHit] = await Promise.all([
          Session.countDocuments(baseFilter),
          Session.countDocuments({ ...baseFilter, status: 'no_show' }),
          Session.countDocuments({ ...baseFilter, beneficiaryId: { $in: waIds } }),
          Session.countDocuments({ ...baseFilter, status: 'no_show', beneficiaryId: { $in: waIds } }),
        ]);
        return noShowBlock(splitSegments({ overallTotal, overallHit, withinTotal, withinHit }));
      },
    ],
    [
      'goals',
      Goal,
      async () => {
        // Goals carry no branchId — scope via the branch's beneficiary ids.
        let branchBenIds = null;
        if (branchScope && Beneficiary) {
          branchBenIds = await Beneficiary.distinct('_id', branchPlain);
        }
        const scope = branchBenIds ? { beneficiaryId: { $in: branchBenIds } } : {};
        const baseFilter = {
          ...scope,
          isDeleted: { $ne: true },
          status: { $in: COUNTED_GOAL_STATUSES },
        };
        const [overallTotal, overallHit, withinTotal, withinHit] = await Promise.all([
          Goal.countDocuments(baseFilter),
          Goal.countDocuments({ ...baseFilter, status: 'achieved' }),
          Goal.countDocuments({ ...baseFilter, beneficiaryId: { $in: waIds } }),
          Goal.countDocuments({ ...baseFilter, status: 'achieved', beneficiaryId: { $in: waIds } }),
        ]);
        return goalBlock(splitSegments({ overallTotal, overallHit, withinTotal, withinHit }));
      },
    ],
    [
      'nps',
      Nps,
      async () => {
        const rows = await Nps.aggregate([
          { $match: { ...branchMatch } },
          { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } },
        ]);
        const r = rows && rows[0];
        return {
          average: r && typeof r.average === 'number' ? Math.round(r.average * 10) / 10 : null,
          count: (r && r.count) || 0,
        };
      },
    ],
    [
      'engagement',
      Conversation,
      async () => {
        const conversations = await Conversation.countDocuments({ ...branchPlain, isDeleted: false });
        return { conversations, familiesEngaged: waIds.length };
      },
    ],
  ];

  const out = emptyOutcomes(sources, windowDays);
  const settled = await Promise.allSettled(
    tasks.map(async ([key, model, run]) => {
      if (!model) {
        sources[key] = 'unavailable';
        return { key, value: null };
      }
      try {
        const value = await run();
        sources[key] = 'ok';
        return { key, value };
      } catch (err) {
        sources[key] = 'error';
        logger?.warn?.(`[wa-outcomes] ${key}: ${err.message}`);
        return { key, value: null };
      }
    })
  );

  for (const r of settled) {
    if (r.status !== 'fulfilled' || !r.value || r.value.value == null) continue;
    out[r.value.key] = r.value.value;
  }
  return out;
}

module.exports = {
  buildRehabOutcomes,
  // Pure helpers exported for the drift guard.
  pct,
  splitSegments,
  noShowBlock,
  goalBlock,
  emptyOutcomes,
  DEFAULT_WINDOW_DAYS,
};
