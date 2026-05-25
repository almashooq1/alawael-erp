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

// W390 (2026-05-25) cleared the W389 introduction baseline of 4 entries by
// deleting the dead subscriber blocks from dddCrossModuleSubscribers.js (per
// option (a) — these never fired anyway because their contracts were W377-
// deleted). BASELINE NOW EMPTY ✅. Any new dead subscriber added in the future
// fails CI immediately + must be either deleted OR have its contract restored.
const KNOWN_DEAD_SUBSCRIBERS = new Set([]);

const BRIDGE_FILE = path.join(__dirname, '..', 'integration', 'serviceEventBridge.js');
const BACKEND_ROOT = path.join(__dirname, '..');

const PRODUCER_SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
  '_test-fixtures',
]);

function walkJsForProducers(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (PRODUCER_SCAN_SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsForProducers(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// W391: enumerate all event types that have a producer reachable from
// dddCrossModuleSubscribers. Two paths exist:
//   (1) Direct integrationBus.publish('<domain>', '<eventType>', ...) calls
//   (2) serviceEventBridge.attachBridge('<domain>', service, [...]) mappings —
//       the bridge calls integrationBus.publish, so anything in the bridge IS
//       a producer.
// Returns a Set of `<domain>.<eventType>` strings matching subscriber pattern shape.
function findAllProducedPatterns() {
  const produced = new Set();
  const files = walkJsForProducers(BACKEND_ROOT);

  // (1) Direct integrationBus.publish calls
  const publishRe = /integrationBus\.publish\s*\(\s*['"]([\w-]+)['"]\s*,\s*['"]([\w.]+)['"]/g;
  for (const f of files) {
    // Skip the bridge file itself — its publish calls are dispatched FROM
    // service-local emits and tracked separately below
    if (f === BRIDGE_FILE) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(publishRe)) {
      produced.add(`${m[1]}.${m[2]}`);
    }
  }

  // (2) Bridge mappings — parse attachBridge('<domain>', svc, ['<eventType>', ...])
  if (fs.existsSync(BRIDGE_FILE)) {
    const bridgeSrc = fs.readFileSync(BRIDGE_FILE, 'utf8');
    const attachRe = /attachBridge\s*\(\s*['"]([\w-]+)['"]\s*,\s*[^,]+,\s*\[([\s\S]*?)\]/g;
    for (const m of bridgeSrc.matchAll(attachRe)) {
      const domain = m[1];
      const eventsBlock = m[2];
      const eventRe = /['"]([\w.]+)['"]/g;
      for (const em of eventsBlock.matchAll(eventRe)) {
        produced.add(`${domain}.${em[1]}`);
      }
    }
  }

  return produced;
}

// W391: subscriber patterns whose producer existence is intentionally
// deferred (e.g., the event is meant to be fired by FUTURE wires). Each
// entry requires a justification comment. Removal-contract via ratchet-down.
// W395 (2026-05-25) closed core.beneficiary.registered by wiring producer in
// BeneficiaryService.afterCreate. Envelope sourced from
// {beneficiaryId, mrn, name, disabilityType, disabilityLevel} per
// BENEFICIARY_DDD_EVENTS.REGISTERED. Bridge mapping added in
// serviceEventBridge.attachBridge('core', beneficiaryService, [...]).
// BASELINE NOW EMPTY ✅
const KNOWN_ORPHAN_SUBSCRIBERS = new Set([]);

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

  describe('W391: subscriber → producer existence', () => {
    it('every subscriber pattern has a producer (direct publish OR bridged emit)', () => {
      const patterns = extractSubscriberPatterns();
      const produced = findAllProducedPatterns();

      const orphans = [];
      for (const pattern of patterns) {
        if (KNOWN_DEAD_SUBSCRIBERS.has(pattern)) continue; // handled by W389 check 1
        if (KNOWN_ORPHAN_SUBSCRIBERS.has(pattern)) continue;
        if (!produced.has(pattern)) {
          orphans.push(pattern);
        }
      }
      if (orphans.length > 0) {
        throw new Error(
          `${orphans.length} subscriber pattern(s) have a live contract but NO producer ` +
            `(direct integrationBus.publish OR bridge mapping):\n` +
            orphans.map(o => `  - ${o}`).join('\n') +
            `\n\nFix options:\n` +
            `  (a) Add a producer: call integrationBus.publish('<domain>', '<eventType>', payload) ` +
            `from the appropriate domain service, OR add an attachBridge entry in serviceEventBridge.js.\n` +
            `  (b) Delete the orphaned subscriber from dddCrossModuleSubscribers.js.\n` +
            `  (c) If the producer is genuinely deferred (e.g., pending stakeholder design), add ` +
            `the pattern to KNOWN_ORPHAN_SUBSCRIBERS with a justification comment.\n\n` +
            `This is the W387 bug class — subscribers that registered but never fire.`
        );
      }
    });

    it('every KNOWN_ORPHAN_SUBSCRIBERS entry is still actually orphan (ratchet-down)', () => {
      const produced = findAllProducedPatterns();
      const stale = [];
      for (const entry of KNOWN_ORPHAN_SUBSCRIBERS) {
        if (produced.has(entry)) stale.push(entry);
      }
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_ORPHAN_SUBSCRIBERS now HAVE a producer. ` +
            `Remove from the Set in the SAME commit that added the producer:\n` +
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
