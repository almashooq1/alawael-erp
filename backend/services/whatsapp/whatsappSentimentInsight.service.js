/**
 * WhatsApp Family Sentiment Insight — مزاج الأسر عبر واتساب
 * ═══════════════════════════════════════════════════════════════════════════
 * Read-only intelligence over the sentiment the NLU already tags on every
 * inbound message (WhatsAppConversation.messages[].sentiment). Per family it
 * computes a current mood + a trend (improving / declining) and surfaces the
 * families whose mood is negative or worsening — an early, tone-level signal of
 * dissatisfaction that a silence count (W1526) can't see.
 *
 * Distinct from:
 *   - whatsappEngagementInsight (W1526) → SILENCE (lastMessageAt recency).
 *   - whatsappRehabOutcomes        → aggregate KPI counts.
 * This reads the actual *tone* of what families say. Never throws; branch-scoped.
 *
 * @module services/whatsapp/whatsappSentimentInsight.service
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const DEFAULT_WINDOW_DAYS = 30;
const SCAN_LIMIT = 5000;
const DEFAULT_LIST_LIMIT = 50;
const MIN_FOR_TREND = 4; // need a few messages before a trend is meaningful

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// ─── Pure helpers (exported for the drift guard) ─────────────────────────────

// Map a tagged sentiment to a numeric score. 'urgent' is treated as negative
// (it flags distress). Unknown → 0. Pure.
function sentimentScore(s) {
  if (s === 'positive') return 1;
  if (s === 'negative' || s === 'urgent') return -1;
  return 0; // neutral / unknown
}

function classifyMood(avg) {
  if (avg > 0.2) return 'positive';
  if (avg < -0.2) return 'negative';
  return 'neutral';
}

// Compare the newer half of the scores to the older half. Pure.
function trendOf(scores) {
  if (!Array.isArray(scores) || scores.length < MIN_FOR_TREND) return 'unknown';
  const mid = Math.floor(scores.length / 2);
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const older = mean(scores.slice(0, mid));
  const newer = mean(scores.slice(mid));
  if (newer - older > 0.25) return 'improving';
  if (older - newer > 0.25) return 'declining';
  return 'stable';
}

function needsAttention(mood, trend) {
  return mood === 'negative' || trend === 'declining';
}

function emptyInsight(sources = {}, windowDays = DEFAULT_WINDOW_DAYS) {
  return {
    windowDays,
    moods: { positive: 0, neutral: 0, negative: 0 },
    trends: { improving: 0, declining: 0, stable: 0, unknown: 0 },
    total: 0,
    attentionList: [],
    scanned: 0,
    scanCapped: false,
    sources,
  };
}

/**
 * Build the family-sentiment insight for a branch scope.
 * @param {object} opts - { branchScope?, now?, windowDays?, listLimit?, deps? }
 * @returns {Promise<object>} never throws
 */
async function buildSentimentInsight(opts = {}) {
  const now = opts.now || Date.now();
  const windowDays = Number(opts.windowDays) > 0 ? Number(opts.windowDays) : DEFAULT_WINDOW_DAYS;
  const listLimit = Math.min(Number(opts.listLimit) || DEFAULT_LIST_LIMIT, 200);
  const Conversation =
    opts.deps && 'Conversation' in opts.deps
      ? opts.deps.Conversation
      : getModel('WhatsAppConversation');
  if (!Conversation) return emptyInsight({ conversations: 'unavailable' }, windowDays);

  try {
    const filter = { status: 'active' };
    if (opts.branchScope) filter.branchId = opts.branchScope;
    const since = now - windowDays * 86400000;

    const rows = await Conversation.find(filter)
      .select('phone beneficiaryId branchId messages')
      .sort({ lastMessageAt: -1 })
      .limit(SCAN_LIMIT + 1)
      .lean();

    const scanCapped = rows.length > SCAN_LIMIT;
    const scan = scanCapped ? rows.slice(0, SCAN_LIMIT) : rows;
    if (scanCapped) logger?.warn?.(`[wa-sentiment] scan capped at ${SCAN_LIMIT}`);

    const moods = { positive: 0, neutral: 0, negative: 0 };
    const trends = { improving: 0, declining: 0, stable: 0, unknown: 0 };
    const attention = [];
    let total = 0;

    for (const c of scan) {
      const msgs = (c.messages || [])
        .filter(
          m =>
            m &&
            m.direction === 'incoming' &&
            m.sentiment &&
            m.timestamp &&
            new Date(m.timestamp).getTime() >= since
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      if (!msgs.length) continue; // no tone signal in window

      total += 1;
      const scores = msgs.map(m => sentimentScore(m.sentiment));
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const mood = classifyMood(avg);
      const trend = trendOf(scores);
      moods[mood] += 1;
      trends[trend] += 1;

      if (needsAttention(mood, trend) && attention.length < listLimit) {
        attention.push({
          conversationId: String(c._id),
          beneficiaryId: c.beneficiaryId ? String(c.beneficiaryId) : null,
          phone: c.phone || null,
          mood,
          trend,
          messages: scores.length,
          avgScore: Math.round(avg * 100) / 100,
        });
      }
    }

    // Worst first: negative+declining, then negative, then declining.
    const rank = a => (a.mood === 'negative' ? 2 : 0) + (a.trend === 'declining' ? 1 : 0);
    attention.sort((a, b) => rank(b) - rank(a) || a.avgScore - b.avgScore);

    return {
      windowDays,
      moods,
      trends,
      total,
      attentionList: attention,
      scanned: scan.length,
      scanCapped,
      sources: { conversations: 'ok' },
    };
  } catch (err) {
    logger?.warn?.(`[wa-sentiment] insight failed: ${err.message}`);
    return emptyInsight({ conversations: 'error' }, windowDays);
  }
}

module.exports = {
  buildSentimentInsight,
  sentimentScore,
  classifyMood,
  trendOf,
  needsAttention,
  emptyInsight,
  SCAN_LIMIT,
};
