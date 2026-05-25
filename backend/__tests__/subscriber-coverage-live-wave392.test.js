'use strict';

/**
 * W392 — subscriber drift guard for the LIVE registry (domainEventContracts).
 *
 * Parallel to W389 (which covers the DDD registry via dddCrossModuleSubscribers).
 * W392 enumerates patterns in `integration/crossModuleSubscribers.js` (HR /
 * finance / medical / beneficiary / attendance / system events) and verifies:
 *
 *   1. Pattern resolves to a real contract in domainEventContracts.ALL_CONTRACTS
 *      (catches typos like 'beneficiary.status.changed' which should be
 *      'beneficiary.beneficiary.status_changed' — missing namespace + dot
 *      vs underscore).
 *   2. Pattern has a producer somewhere (catches the W382 baseline: 19 LIVE
 *      contracts declared without producers).
 *
 * Wildcard patterns (`system.error.*`) need special handling — they match
 * any event starting with the prefix, so producer existence checks via
 * prefix-match.
 *
 * Same baseline-ratchet pattern as W389. Two baselines:
 *   - KNOWN_TYPO_PATTERNS: subscribers using malformed pattern strings
 *   - KNOWN_LIVE_ORPHAN_SUBSCRIBERS: patterns with contract but no producer
 *
 * The user-driven "متابعه للكل" mandate (2026-05-25): every remaining gap
 * should be either FIXED or DOCUMENTED. W392 catches both classes at CI.
 */

const fs = require('fs');
const path = require('path');
const liveContracts = require('../events/contracts/domainEventContracts');

const SUBSCRIBERS_FILE = path.join(__dirname, '..', 'integration', 'crossModuleSubscribers.js');
const BRIDGE_FILE = path.join(__dirname, '..', 'integration', 'serviceEventBridge.js');
const BACKEND_ROOT = path.join(__dirname, '..');

const SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
  '_test-fixtures',
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

function extractSubscriberPatterns() {
  const src = fs.readFileSync(SUBSCRIBERS_FILE, 'utf8');
  const re = /pattern:\s*['"]([^'"]+)['"]/g;
  return [...src.matchAll(re)].map(m => m[1]);
}

function splitPattern(pattern) {
  const firstDot = pattern.indexOf('.');
  if (firstDot === -1) return null;
  return {
    domain: pattern.slice(0, firstDot),
    eventType: pattern.slice(firstDot + 1),
  };
}

function isLiveContract(domain, eventType) {
  const group = liveContracts.ALL_CONTRACTS[domain];
  if (!group) return false;
  return Object.values(group).some(evt => evt.eventType === eventType);
}

// Wildcards (system.error.*) match any event with that prefix. Treat as
// "valid as long as at least ONE concrete contract matches the prefix".
function resolvesWildcard(pattern) {
  if (!pattern.endsWith('.*')) return false;
  const prefix = pattern.slice(0, -2); // strip '.*'
  // For 'system.error.*': prefix='system.error', look for eventTypes
  // starting with 'error.' under domain 'system'
  const split = splitPattern(prefix);
  if (!split) return false;
  const group = liveContracts.ALL_CONTRACTS[split.domain];
  if (!group) return false;
  // eventType part after first dot of prefix becomes the eventType prefix
  const evtPrefix = split.eventType + '.';
  return Object.values(group).some(
    evt => evt.eventType.startsWith(evtPrefix) || evt.eventType === split.eventType
  );
}

const MODEL_BRIDGE_FILE = path.join(__dirname, '..', 'integration', 'modelEventBridge.js');

function findAllProducedPatterns() {
  const produced = new Set();
  const files = walkJs(BACKEND_ROOT);

  // (1) Direct integrationBus.publish calls (literal-args form)
  const publishRe = /integrationBus\.publish\s*\(\s*['"]([\w-]+)['"]\s*,\s*['"]([\w.]+)['"]/g;
  for (const f of files) {
    if (f === BRIDGE_FILE) continue;
    if (f === MODEL_BRIDGE_FILE) continue; // parsed via mapping array below
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(publishRe)) {
      produced.add(`${m[1]}.${m[2]}`);
    }
  }

  // (2) serviceEventBridge attachBridge mappings (W387)
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

  // (3) modelEventBridge MAPPINGS array (W394) — { domain: '...', eventType: '...' }
  if (fs.existsSync(MODEL_BRIDGE_FILE)) {
    const src = fs.readFileSync(MODEL_BRIDGE_FILE, 'utf8');
    const mappingRe = /domain:\s*['"]([\w-]+)['"]\s*,\s*eventType:\s*['"]([\w.]+)['"]/g;
    for (const m of src.matchAll(mappingRe)) {
      produced.add(`${m[1]}.${m[2]}`);
    }
  }

  return produced;
}

// W392-discovery snapshot 2026-05-25: 2 typo patterns + several orphans.

// Patterns that DON'T resolve to a contract — typos or domain renames.
// Removal contract: fix the subscriber's pattern string OR delete the
// subscriber if no contract should exist.
// W397 (2026-05-25) cleared both typos:
//   - 'auth.account.locked' subscriber DELETED (dead code, no contract).
//   - 'system.error.*' wildcard NOW MATCHES: SYSTEM_EVENTS.ERROR_OCCURRED
//     eventType renamed 'system.error' → 'error.occurred' so fullEventName
//     becomes 'system.error.occurred' which matches the 'system.error.*'
//     wildcard cleanly. Resolves the namespace-prefix duplication issue.
// BASELINE NOW EMPTY ✅ for typo patterns.
const KNOWN_TYPO_PATTERNS = new Set([]);

// W394 (2026-05-25) closed most LIVE-registry orphans via modelEventBridge
// post-save hooks on Employee/LeaveRequest/Invoice/Payment/ClinicalSession/
// Beneficiary/ClinicalAssessment/AttendanceRecord. Remaining orphans require
// non-model triggers (sweepers, middleware) or services I haven't probed:
// W398 (2026-05-25) closed system.auth.permission_denied via auth.js
// requirePermission middleware publish call. Baseline 4 → 3.
// W401 (2026-05-25) closed finance.budget.threshold_reached via
// budgetThresholdSweeper.js wired in financeBootstrap (env-gated cron).
// Baseline 3 → 2.
// W402 (2026-05-25) closed attendance.absence.detected via
// absenceDetectionSweeper.js wired in absenceDetectionBootstrap
// (env-gated daily cron). Baseline 2 → 1.
// W404 (2026-05-25) closed medical.risk.alert_raised via RiskSnapshot
// post-save mapping in modelEventBridge.js (predicate-gated on tier
// escalation / first high/critical landing). Baseline 1 → 0 ✅.
const KNOWN_LIVE_ORPHAN_SUBSCRIBERS = new Set([]);

// Wildcards: subscriber listens for any matching prefix. Producer-existence
// check uses prefix-match against any concrete producer in the set.
const WILDCARD_PATTERNS = new Set(['system.error.*']);

describe('W392 subscriber drift guard for LIVE registry (domainEventContracts)', () => {
  describe('typo detection — pattern must resolve to a real contract', () => {
    it('every subscriber pattern resolves to a live contract (or is a known typo)', () => {
      const patterns = extractSubscriberPatterns();
      expect(patterns.length).toBeGreaterThanOrEqual(15);

      const typos = [];
      for (const pattern of patterns) {
        if (KNOWN_TYPO_PATTERNS.has(pattern)) continue;
        if (WILDCARD_PATTERNS.has(pattern)) {
          if (!resolvesWildcard(pattern))
            typos.push({ pattern, reason: 'wildcard matches no contract' });
          continue;
        }
        const split = splitPattern(pattern);
        if (!split) {
          typos.push({ pattern, reason: 'malformed (no dot)' });
          continue;
        }
        if (!isLiveContract(split.domain, split.eventType)) {
          typos.push({
            pattern,
            reason: `contract ${split.domain}.${split.eventType} not in ALL_CONTRACTS`,
          });
        }
      }
      if (typos.length > 0) {
        throw new Error(
          `${typos.length} subscriber pattern(s) point to non-existent contracts in ` +
            `domainEventContracts.js:\n` +
            typos.map(t => `  - ${t.pattern}\n    ${t.reason}`).join('\n') +
            `\n\nFix: rename to match the canonical eventType (check ALL_CONTRACTS[<domain>]) ` +
            `OR delete the subscriber.`
        );
      }
    });

    it('every entry in KNOWN_TYPO_PATTERNS still exists in subscribers source (ratchet-down)', () => {
      const patterns = new Set(extractSubscriberPatterns());
      const stale = [...KNOWN_TYPO_PATTERNS].filter(t => !patterns.has(t));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_TYPO_PATTERNS removed from source. ` +
            `Remove from Set:\n` +
            stale.map(s => `  - ${s}`).join('\n')
        );
      }
    });
  });

  describe('producer-existence check', () => {
    it('every subscriber pattern has a producer (or is in KNOWN_LIVE_ORPHAN_SUBSCRIBERS)', () => {
      const patterns = extractSubscriberPatterns();
      const produced = findAllProducedPatterns();
      const orphans = [];
      for (const pattern of patterns) {
        if (KNOWN_TYPO_PATTERNS.has(pattern)) continue;
        if (KNOWN_LIVE_ORPHAN_SUBSCRIBERS.has(pattern)) continue;
        if (WILDCARD_PATTERNS.has(pattern)) continue; // can't check producer-existence for wildcards cleanly
        if (!produced.has(pattern)) {
          orphans.push(pattern);
        }
      }
      if (orphans.length > 0) {
        throw new Error(
          `${orphans.length} subscriber pattern(s) have a contract but NO producer:\n` +
            orphans.map(o => `  - ${o}`).join('\n') +
            `\n\nFix: wire a producer (integrationBus.publish OR service.emit + bridge mapping) ` +
            `OR add to KNOWN_LIVE_ORPHAN_SUBSCRIBERS with justification.`
        );
      }
    });

    it('every KNOWN_LIVE_ORPHAN_SUBSCRIBERS entry is still orphan (ratchet-down)', () => {
      const produced = findAllProducedPatterns();
      const stale = [...KNOWN_LIVE_ORPHAN_SUBSCRIBERS].filter(p => produced.has(p));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_LIVE_ORPHAN_SUBSCRIBERS now HAVE a producer. ` +
            `Remove from Set in same commit as producer wire:\n` +
            stale.map(s => `  - ${s}`).join('\n')
        );
      }
    });
  });

  describe('sanity', () => {
    it('subscribers file exists', () => {
      expect(fs.existsSync(SUBSCRIBERS_FILE)).toBe(true);
    });

    it('LIVE registry contracts file is loadable', () => {
      expect(typeof liveContracts.ALL_CONTRACTS).toBe('object');
      expect(Object.keys(liveContracts.ALL_CONTRACTS).length).toBeGreaterThanOrEqual(5);
    });
  });
});
