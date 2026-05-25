'use strict';

/**
 * W375 — dddEventContracts dead-contract drift guard.
 *
 * DISCOVERY (2026-05-25 exploratory scan): 31 of 34 event contracts in
 * `backend/events/contracts/dddEventContracts.js` have ZERO string-literal
 * references anywhere in the codebase outside the contracts file itself.
 *
 * The 3 "alive" entries (by literal-reference detection):
 *
 *   - `beneficiary.registered`  → real subscriber in
 *       integration/dddCrossModuleSubscribers.js + infrastructure/messageQueue.js
 *   - `session.completed`       → notification template config only at
 *       seeds/notification-templates.seed.js (no actual producer)
 *   - `ai.risk_elevated`        → cross-module subscriber wiring
 *
 * NONE of the 17 named exports (BENEFICIARY_DDD_EVENTS, EPISODE_EVENTS, ...)
 * are imported anywhere else in the codebase except the aggregator
 * `DDD_CONTRACTS` in `startup/integrationBus.js`. The registry is structurally
 * orphaned from actual event emission.
 *
 * What actually fires in the codebase: ad-hoc names via service-local
 * EventEmitters. Example: `domains/episodes/index.js` does
 * `this.emit('episodeCreated', ...)` (camelCase, no dot) — does NOT match
 * the declared `episode.created` contract. Same for `phaseAdvanced`,
 * `teamMemberAdded`, etc.
 *
 * This means dddEventContracts.js is an **ASPIRATIONAL registry** — contracts
 * declared with intent + payload + delivery + consumers, but never connected
 * to producers. The W354 doctrine §3.2 illustrative examples + W374
 * structural-integrity guard are both built on this aspirational substrate.
 *
 * ─── W375 guards two invariants ─────────────────────────────────────────────
 *
 *   1. NO NEW contract may be added that isn't producer-wired (catches future
 *      "declared but disconnected" entries — fail-fast at commit time).
 *   2. Known-dead contracts are tracked in `KNOWN_DEAD_CONTRACTS` for explicit
 *      ratchet-down. Wire a producer (or delete the contract), remove the
 *      entry from the Set in the same commit — `it.b` catches stale entries.
 *
 * ─── Ratchet-down strategy (recommended ADR-027) ────────────────────────────
 *
 * Each dead contract has TWO valid resolutions:
 *
 *   (a) WIRE PRODUCER — find the place this event should fire (e.g. when an
 *       episode reaches a discharge phase, emit `episode.closed`). Rename the
 *       ad-hoc `service.emit('episodeClosed', ...)` to use the contract's
 *       eventType. Remove from KNOWN_DEAD_CONTRACTS.
 *
 *   (b) DELETE CONTRACT — if the team never intended to emit this, the
 *       contract is dead weight. Delete it from dddEventContracts.js. W374
 *       drift guard will catch the structural change (DDD_CONTRACTS shrinks);
 *       update W375's KNOWN_DEAD_CONTRACTS + W374's MIN_TOTAL_EVENTS together.
 *
 * Either path shrinks the baseline. Both are valid — the team picks per event.
 *
 * Detection: load contracts, scan all backend/*.js (minus tests/archived/
 * contracts file itself), look for `'<eventType>'` or `"<eventType>"` string
 * literal. Loose — catches both producer + consumer references. Strict
 * producer-only detection (`.emit('X')`, `.publish('X')`) is a follow-up if
 * needed; the goal here is "any callsite exists" as a floor.
 */

const fs = require('fs');
const path = require('path');
const contracts = require('../events/contracts/dddEventContracts');

const BACKEND_ROOT = path.join(__dirname, '..');

const SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
  'events', // contracts file lives here; we exclude self-references
  '_test-fixtures',
]);

// Known-dead contracts baselined at W375 introduction (2026-05-25). Each entry
// is `<group>.<KEY>` where group is the DDD_CONTRACTS key and KEY is the
// contract's object key inside that group (NOT the eventType string).
//
// CONTRACT: when a producer is wired (or the contract is deleted), remove the
// entry here in the SAME commit. it.b ('every entry still dead') catches stale.
//
// To regenerate this set: temporarily comment out the KNOWN_DEAD_CONTRACTS
// filter in it.a and run — failing assertion will list current dead state.
// Baseline progression: 31 (W375 discovery) → 15 (W377 deletions) → 12 (W379
// episodes wired) → 4 (W380 BaseService-emit batch wired 8 events) → 1 (W381
// quality via qualityEventBus + ai-recommendations via module emitter).
//
// Single remaining entry: assessments.OVERDUE requires a NEW cron sweeper +
// integration with notification/dashboards consumers. Cost of building that
// (scheduler + service method + tests) significantly exceeds the marginal
// benefit of clearing the last entry. Deferred to a stakeholder-scoped wave
// where the overdue-detection cadence + notification routing get explicit
// decisions (e.g., daily/hourly sweep, severity thresholds, escalation chain).
const KNOWN_DEAD_CONTRACTS = new Set([
  // assessments (ASSESSMENT_EVENTS) — 1 dead, 1 alive after W380 wired completeAssessment
  'assessments.OVERDUE', // assessment.overdue — needs sweeper + cadence stakeholder decision
]);

function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SCAN_SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function loadSources() {
  const files = walkJs(BACKEND_ROOT);
  const map = new Map();
  for (const f of files) {
    map.set(f, fs.readFileSync(f, 'utf8'));
  }
  return map;
}

function findDeadContracts(sources) {
  const dead = new Set();
  for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
    for (const [eventKey, evt] of Object.entries(events)) {
      const needleSingle = `'${evt.eventType}'`;
      const needleDouble = `"${evt.eventType}"`;
      let referenced = false;
      for (const src of sources.values()) {
        if (src.includes(needleSingle) || src.includes(needleDouble)) {
          referenced = true;
          break;
        }
      }
      if (!referenced) dead.add(`${group}.${eventKey}`);
    }
  }
  return dead;
}

describe('W375 dddEventContracts dead-contract drift guard', () => {
  describe('discovery — referenceability', () => {
    it('no NEW dead contract appears beyond the W375 baseline', () => {
      const sources = loadSources();
      const currentDead = findDeadContracts(sources);
      const newDead = [...currentDead].filter(k => !KNOWN_DEAD_CONTRACTS.has(k));
      if (newDead.length > 0) {
        throw new Error(
          `${newDead.length} NEW dead contract(s) (declared in dddEventContracts.js but ` +
            `with zero references in backend/* outside the contracts file):\n` +
            newDead.map(k => `  - ${k}`).join('\n') +
            `\n\nEvery new event contract MUST be producer-wired in the same PR. ` +
            `Either (a) add the producer call (e.g. \`bus.emit('<eventType>', payload)\`) ` +
            `or (b) delete the contract.\n\nDo NOT add to KNOWN_DEAD_CONTRACTS without ` +
            `ADR justification — that set only holds W375-discovery-time dead entries ` +
            `pending reconciliation per ADR-027 (TBD).`
        );
      }
    });

    it('every entry in KNOWN_DEAD_CONTRACTS is still dead (ratchet-down check)', () => {
      const sources = loadSources();
      const currentDead = findDeadContracts(sources);
      const stale = [...KNOWN_DEAD_CONTRACTS].filter(k => !currentDead.has(k));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_DEAD_CONTRACTS are no longer dead ` +
            `(some file now references the eventType string). Remove these from the Set ` +
            `in the SAME commit that wired the producer:\n` +
            stale.map(s => `  - ${s}`).join('\n')
        );
      }
    });
  });

  describe('sanity', () => {
    it('total contracts is in expected range (catches accidental mass-deletion)', () => {
      let total = 0;
      for (const events of Object.values(contracts.DDD_CONTRACTS)) {
        total += Object.keys(events).length;
      }
      // W377 (2026-05-25) shrunk total 34 → 18 via ADR-027 deletions.
      expect(total).toBeGreaterThanOrEqual(10);
      expect(total).toBeLessThanOrEqual(200);
    });

    it('every KNOWN_DEAD_CONTRACTS entry resolves to a real contract (catches typos)', () => {
      const allContractKeys = new Set();
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const k of Object.keys(events)) {
          allContractKeys.add(`${group}.${k}`);
        }
      }
      const bogus = [...KNOWN_DEAD_CONTRACTS].filter(k => !allContractKeys.has(k));
      if (bogus.length > 0) {
        throw new Error(
          `${bogus.length} entry/entries in KNOWN_DEAD_CONTRACTS don't resolve to a real ` +
            `contract — either typo in the Set or the contract was renamed/deleted:\n` +
            bogus.map(b => `  - ${b}`).join('\n')
        );
      }
    });
  });
});
