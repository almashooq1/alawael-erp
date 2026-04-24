'use strict';

/**
 * notificationDispatch.registry.js — Phase 16 Commit 8 (4.0.73).
 *
 * Policy layer on top of the Phase-15 `notification-policies.registry`.
 * While the Phase-15 registry answers "WHO gets notified for event X",
 * this one answers "HOW — which channel(s), in what order, and
 * whether to send right now or queue for the morning digest".
 *
 * The key inputs for every dispatch decision:
 *
 *   • **priority** of the source policy (critical / high / normal / low)
 *   • **user preferences** (quiet hours, channel opt-ins, digest opt-in,
 *     explicit DND until a timestamp)
 *   • **environmental signals** (user currently in a therapy session or
 *     attending a meeting)
 *
 * The output is a *plan*: an ordered channel list, a `deferred` flag
 * with reason, and optionally a digest bucket. Dispatch execution and
 * digest flushing live in the service.
 *
 * Why a registry rather than hard-coded rules — HR / Compliance /
 * labour law (Saudi: no SMS between 22:00–06:00 by convention) evolves;
 * tuning the cadence should be a one-line edit, not a refactor.
 */

// ── priority → channel matrix ────────────────────────────────────────
//
// Default channels by priority. Fallback is the replacement channel
// when the primary fails. The service walks the array in order until
// one reports success.

const PRIORITY_CHANNEL_MATRIX = Object.freeze({
  critical: Object.freeze(['push', 'sms', 'email', 'slack']),
  high: Object.freeze(['push', 'email', 'slack']),
  normal: Object.freeze(['email', 'push']),
  low: Object.freeze(['email']),
});

// Priorities that BYPASS quiet hours, DND, and digest queuing. A
// critical alert must always pierce through.
const BYPASS_PRIORITIES = Object.freeze(['critical']);

// Priorities eligible for digest queuing when the user opts in.
const DIGEST_ELIGIBLE_PRIORITIES = Object.freeze(['low', 'normal']);

// Default quiet-hours window (24h clock) when a user has not
// customised their preferences. Saudi convention: 22:00–06:00.
const DEFAULT_QUIET_HOURS = Object.freeze({
  enabled: true,
  startHour: 22, // 22:00
  endHour: 6, // 06:00 (wraps midnight)
  timezone: 'Asia/Riyadh',
});

// Default digest window — send the accumulated digest at 08:00.
const DEFAULT_DIGEST_HOUR = 8;

// ── channel taxonomy ────────────────────────────────────────────────

const SUPPORTED_CHANNELS = Object.freeze(['email', 'sms', 'push', 'slack', 'in_app', 'whatsapp']);

// Channels safe to send during quiet hours for non-critical events.
// (None — all channels respect quiet hours unless bypassed.)
const QUIET_HOUR_SAFE_CHANNELS = Object.freeze([]);

// ── dispatch reasons ────────────────────────────────────────────────

const DEFERRAL_REASONS = Object.freeze([
  'quiet_hours',
  'dnd_active',
  'in_meeting',
  'digest_queued',
  'no_channel_available',
]);

// ── helpers ─────────────────────────────────────────────────────────

function channelsForPriority(priority) {
  return PRIORITY_CHANNEL_MATRIX[priority] || PRIORITY_CHANNEL_MATRIX.normal;
}

function bypassesQuietHours(priority) {
  return BYPASS_PRIORITIES.includes(priority);
}

function isDigestEligible(priority) {
  return DIGEST_ELIGIBLE_PRIORITIES.includes(priority);
}

/**
 * Given a reference time + a quiet-hours window, answer whether
 * the time falls inside the window. Handles wrap-around midnight
 * (e.g. 22:00 → 06:00) deterministically.
 *
 * The timezone is reduced to its hour-offset by the service; here
 * we just get the effective hour.
 */
function isInQuietHours(hourOfDay, { startHour, endHour, enabled } = {}) {
  if (!enabled) return false;
  if (typeof hourOfDay !== 'number' || hourOfDay < 0 || hourOfDay >= 24) return false;
  if (startHour === endHour) return false; // empty window
  if (startHour < endHour) {
    return hourOfDay >= startHour && hourOfDay < endHour;
  }
  // wraps midnight
  return hourOfDay >= startHour || hourOfDay < endHour;
}

/**
 * Filter channels against user preferences. Disabled channels are
 * stripped; order from the priority matrix is preserved.
 */
function filterEnabledChannels(channelList, userPrefs) {
  const prefs = (userPrefs && userPrefs.channelPreferences) || {};
  return channelList.filter(ch => prefs[ch]?.enabled !== false);
}

// ── validation ──────────────────────────────────────────────────────

function validate() {
  for (const [priority, channels] of Object.entries(PRIORITY_CHANNEL_MATRIX)) {
    if (!Array.isArray(channels) || channels.length === 0) {
      throw new Error(`notificationDispatch registry: priority '${priority}' has no channels`);
    }
    for (const ch of channels) {
      if (!SUPPORTED_CHANNELS.includes(ch)) {
        throw new Error(
          `notificationDispatch registry: priority '${priority}' → unknown channel '${ch}'`
        );
      }
    }
  }
  if (
    typeof DEFAULT_DIGEST_HOUR !== 'number' ||
    DEFAULT_DIGEST_HOUR < 0 ||
    DEFAULT_DIGEST_HOUR > 23
  ) {
    throw new Error(`notificationDispatch registry: DEFAULT_DIGEST_HOUR out of range`);
  }
  return true;
}

module.exports = {
  PRIORITY_CHANNEL_MATRIX,
  BYPASS_PRIORITIES,
  DIGEST_ELIGIBLE_PRIORITIES,
  DEFAULT_QUIET_HOURS,
  DEFAULT_DIGEST_HOUR,
  SUPPORTED_CHANNELS,
  QUIET_HOUR_SAFE_CHANNELS,
  DEFERRAL_REASONS,
  channelsForPriority,
  bypassesQuietHours,
  isDigestEligible,
  isInQuietHours,
  filterEnabledChannels,
  validate,
};
