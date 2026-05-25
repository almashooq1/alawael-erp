'use strict';

/**
 * W389 — subscriber-must-have-producer drift guard.
 *
 * The complementary half of W388. W388 checks "every producer is bridged".
 * W389 checks "every subscriber pattern resolves to a real contract" — the
 * inverse direction. Catches a different bug class:
 *
 *   - W377 deleted contracts (workflow/family/dashboards/tele-rehab/ar-vr/
 *     group-therapy/research/field-training + sessions.no_show + sessions.
 *     cancelled + goals.stalled + goals.measure_applied). Any subscriber
 *     still listening for these patterns is dead-on-arrival — code that
 *     never fires.
 *   - A subscriber typo in the pattern string (e.g., `'episodes.episode.
 *     phase_transition'` missing the final 'ed') would never receive.
 *   - A subscriber for a contract that was never wired (no producer).
 *
 * Scan `integration/dddCrossModuleSubscribers.js` for `pattern: 'X.Y.Z'`
 * literals. Split each into (domain, eventType) by first dot. Verify
 * `DDD_CONTRACTS[domain]` has a contract with that exact eventType.
 *
 * Baseline-ratchet pattern: existing dead subscribers go into
 * KNOWN_DEAD_SUBSCRIBERS until each is fixed (delete subscriber OR
 * re-add contract). Test (b) catches stale entries — forces removal.
 *
 * NOT IN SCOPE for W389 (separate guard if needed):
 *   - Subscribers in `integration/crossModuleSubscribers.js` (legacy non-DDD)
 *   - Module-connector subscribers (different pattern)
 *   - Verifying a producer EXISTS for each contract (W388 covers producer
 *     side from the bridge angle, indirectly).
 */

const fs = require('fs');
const path = require('path');
const contracts = require('../events/contracts/dddEventContracts');

const SUBSCRIBERS_FILE = path.join(__dirname, '..', 'integration', 'dddCrossModuleSubscribers.js');

// Patterns to extract: `pattern: '<domain>.<eventType>'` where eventType
// may contain dots (e.g., 'sessions.session.no_show' splits to domain
// 'sessions' + eventType 'session.no_show').
function extractSubscriberPatterns() {
  const src = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
  const re = /pattern:\s*['"]([^'"]+)['"]/g;
  const patterns = [];
  for (const m of src.matchAll(re)) {
    patterns.push(m[1]);
  }
  return patterns;
}

// Split a subscriber pattern into (domain, eventType) by first dot.
// 'sessions.session.completed' → { domain: 'sessions', eventType: 'session.completed' }
function splitPattern(pattern) {
  const firstDot = pattern.indexOf('.');
  if (firstDot === -1) return null;
  return {
    domain: pattern.slice(0, firstDot),
    eventType: pattern.slice(firstDot + 1),
  };
}

// Check if a given (domain, eventType) corresponds to a real contract.
function isLiveContract(domain, eventType) {
  const group = contracts.DDD_CONTRACTS[domain];
  if (!group) return false;
  return Object.values(group).some(evt => evt.eventType === eventType);
}

// Known dead subscribers baselined at W389 introduction (2026-05-25).
// These pattern strings point to contracts that W377 deleted as
// "aspirational, no producer intent". The subscribers remain in the
// codebase as dead handlers — they registered but never fire.
//
// REMOVAL OPTIONS:
//   (a) Delete the subscribers.push({ pattern: 'X', handler: ... }) block
//       from dddCrossModuleSubscribers.js. Subscribers had no impact pre-
//       W387 anyway (no producer fired the matching event). Clean removal.
//   (b) Restore the contract + wire a producer. Larger scope.
//
// Test (b) "stale baseline entries fail" forces removal in the SAME commit
// that addresses the subscriber.
const KNOWN_DEAD_SUBSCRIBERS = new Set([
  // W377 deleted SESSION_EVENTS.{CANCELLED, NO_SHOW} — subscribers remain
  'sessions.session.no_show',
  // W377 deleted ARVR_EVENTS whole group
  'ar-vr.arvr.safety_alert',
  // W377 deleted DASHBOARD_EVENTS whole group
  'dashboards.dashboard.alert_triggered',
  // W377 deleted FAMILY_EVENTS whole group
  'family.family.engagement_low',
]);

describe('W389 subscriber-must-have-producer drift guard', () => {
  describe('subscriber pattern → contract resolution', () => {
    it('every subscriber pattern resolves to a live contract (or is in KNOWN_DEAD_SUBSCRIBERS)', () => {
      const patterns = extractSubscriberPatterns();
      expect(patterns.length).toBeGreaterThanOrEqual(10); // sanity floor

      const dead = [];
      for (const pattern of patterns) {
        if (KNOWN_DEAD_SUBSCRIBERS.has(pattern)) continue;
        const split = splitPattern(pattern);
        if (!split) {
          dead.push({ pattern, reason: 'malformed (no dot)' });
          continue;
        }
        if (!isLiveContract(split.domain, split.eventType)) {
          dead.push({
            pattern,
            reason: `contract ${split.domain}.<>${split.eventType} not in DDD_CONTRACTS`,
          });
        }
      }

      if (dead.length > 0) {
        const lines = dead.map(d => `  - ${d.pattern}\n    ${d.reason}`).join('\n');
        throw new Error(
          `${dead.length} subscriber pattern(s) point to non-existent contracts:\n${lines}\n\n` +
            `Fix options:\n` +
            `  (a) Delete the subscriber from dddCrossModuleSubscribers.js (clean removal\n` +
            `      — these never fired anyway pre-W387 because no producer existed).\n` +
            `  (b) Restore the deleted contract in dddEventContracts.js + wire a producer.\n\n` +
            `Do NOT add to KNOWN_DEAD_SUBSCRIBERS without an ADR justification — that Set\n` +
            `only holds W389-discovery-time orphans pending cleanup.`
        );
      }
    });

    it('every entry in KNOWN_DEAD_SUBSCRIBERS still exists in subscribers source (ratchet-down)', () => {
      const patterns = new Set(extractSubscriberPatterns());
      const stale = [];
      for (const entry of KNOWN_DEAD_SUBSCRIBERS) {
        if (!patterns.has(entry)) stale.push(entry);
      }
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_DEAD_SUBSCRIBERS are no longer in source ` +
            `(subscriber removed). Remove from Set in same commit that deleted the subscriber:\n` +
            stale.map(s => `  - ${s}`).join('\n')
        );
      }
    });
  });

  describe('sanity', () => {
    it('subscribers file exists', () => {
      expect(fs.existsSync(SUBSCRIBERS_FILE)).toBe(true);
    });

    it('at least 10 subscriber patterns extracted (catches accidental deletion)', () => {
      expect(extractSubscriberPatterns().length).toBeGreaterThanOrEqual(10);
    });
  });
});
