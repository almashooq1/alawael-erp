'use strict';

/**
 * whatsappBotInsights.service — W1417 bot tuning-feedback loop.
 * ════════════════════════════════════════════════════════════════════════════
 * Records the free-text phrases the menu bot could NOT route to any unit, so an
 * admin can review them and extend the keyword catalogue (data-driven tuning).
 * Env-gated by ENABLE_WHATSAPP_BOT_INSIGHTS; recording is best-effort and never
 * blocks or throws into the inbound webhook path.
 *
 * Pure `shouldRecord` is unit-testable without a DB; the upsert/read use the
 * model lazily so unit tests that mock mongoose don't pull it in.
 */

const reg = require('../../intelligence/whatsapp-bot-flow.registry');

function getModel() {
  try {
    return require('../../models/WhatsAppBotUnmatchedIntent');
  } catch {
    return null;
  }
}

// Trivial acknowledgements / greetings are NOT missed intents — recording them
// would bury the real misses an admin needs to see. Normalized forms.
const TRIVIAL = new Set([
  'سلام',
  'السلام عليكم',
  'هلا',
  'اهلا',
  'مرحبا',
  'شكرا',
  'شكرا جزيلا',
  'تمام',
  'اوك',
  'حسنا',
  'ok',
  'okay',
  'hi',
  'hello',
  'hey',
  'thanks',
  'thank you',
]);

/**
 * Decide whether a normalized phrase is worth recording as a missed intent.
 * Skips empties, ultra-short tokens, and trivial greetings. Pure / testable.
 * @param {string} normalized output of reg.normalize()
 * @returns {boolean}
 */
function shouldRecord(normalized) {
  if (!normalized || typeof normalized !== 'string') return false;
  if (normalized.length < 3) return false; // too short to be a tunable intent
  if (TRIVIAL.has(normalized)) return false;
  return true;
}

/**
 * Record one unmatched free-text phrase (best-effort; upserts + increments).
 * @param {string} rawText the user's original message
 * @returns {Promise<{ok:boolean, phrase?:string, reason?:string}>}
 */
async function recordUnmatched(rawText) {
  const phrase = reg.normalize(rawText);
  if (!shouldRecord(phrase)) return { ok: false, reason: 'skipped' };
  const Model = getModel();
  if (!Model) return { ok: false, reason: 'model_unavailable' };
  const sample = String(rawText || '').slice(0, 120);
  const now = new Date();
  await Model.updateOne(
    { phrase },
    { $inc: { count: 1 }, $set: { lastSeen: now, sample }, $setOnInsert: { firstSeen: now } },
    { upsert: true }
  );
  return { ok: true, phrase };
}

/**
 * Top unmatched intents by frequency (admin review for keyword tuning).
 * @param {number} [limit=50]
 * @returns {Promise<Array<object>>}
 */
async function topUnmatched(limit = 50) {
  const Model = getModel();
  if (!Model) return [];
  const lim = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  return Model.find({}).sort({ count: -1, lastSeen: -1 }).limit(lim).lean();
}

module.exports = { shouldRecord, recordUnmatched, topUnmatched, TRIVIAL };
