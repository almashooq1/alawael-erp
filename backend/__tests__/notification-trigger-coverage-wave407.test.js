'use strict';

/**
 * W407 — subscriber drift guard for `integration/dddNotificationTriggers.js`.
 *
 * Sibling of W389 (covers `dddCrossModuleSubscribers.js`) and W392 (covers
 * `crossModuleSubscribers.js`). `dddNotificationTriggers.js` is the THIRD
 * subscriber file: 10 patterns dispatching push/SMS/email/in-app
 * notifications when DDD domain events fire. Same drift bug class as the
 * other two files:
 *
 *   - W377 deleted DDD contracts (dashboards/ar-vr/sessions.no_show, etc.).
 *     Any pre-W377 trigger listening for those patterns is now dead-on-
 *     arrival — handler can never fire.
 *   - Typo in a pattern string (drop the final 'ed' in 'phase_transitioned')
 *     silently breaks the subscriber without surfacing.
 *
 * **W407 discovery (2026-05-25)**: 3 of 10 triggers DEAD pre-fix:
 *   sessions.session.no_show / dashboards.dashboard.alert_triggered /
 *   ar-vr.arvr.safety_alert — all deleted by W377. Same commit removes
 *   the 3 handlers (W390 precedent: "deleted 4 dead subscribers"). Baseline
 *   starts at zero.
 *
 * Same shape as W389:
 *   1. Scan `integration/dddNotificationTriggers.js` for `pattern: 'X.Y.Z'`.
 *   2. Split each by first dot → (domain, eventType).
 *   3. Verify DDD_CONTRACTS[domain] has a contract with that exact eventType.
 *   4. Two assertions: (a) NEW dead patterns fail CI; (b) STALE baseline
 *      entries (now alive again) fail CI — forces ratchet-down.
 */

const fs = require('fs');
const path = require('path');
const contracts = require('../events/contracts/dddEventContracts');

const TRIGGERS_FILE = path.join(__dirname, '..', 'integration', 'dddNotificationTriggers.js');

function extractTriggerPatterns() {
  const src = fs.readFileSync(TRIGGERS_FILE, 'utf8');
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
  const group = contracts.DDD_CONTRACTS && contracts.DDD_CONTRACTS[domain];
  if (!group) return false;
  return Object.values(group).some(evt => evt.eventType === eventType);
}

// Baseline empty after the same-commit cleanup that deletes the 3 W377-orphan
// handlers (sessions.session.no_show / dashboards.dashboard.alert_triggered /
// ar-vr.arvr.safety_alert). Adding any NEW dead trigger fails CI immediately;
// stale baseline entries (now-alive patterns) also fail CI to enforce
// ratchet-down.
const KNOWN_DEAD_TRIGGERS = new Set([]);

describe('W407 notification-trigger drift guard (dddNotificationTriggers.js)', () => {
  it('every trigger pattern resolves to a live contract in DDD_CONTRACTS', () => {
    const patterns = extractTriggerPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(5);

    const dead = [];
    for (const pattern of patterns) {
      if (KNOWN_DEAD_TRIGGERS.has(pattern)) continue;
      const split = splitPattern(pattern);
      if (!split) {
        dead.push({ pattern, reason: 'malformed (no dot)' });
        continue;
      }
      if (!isLiveContract(split.domain, split.eventType)) {
        dead.push({
          pattern,
          reason: `contract ${split.domain}.${split.eventType} not in DDD_CONTRACTS`,
        });
      }
    }
    if (dead.length > 0) {
      throw new Error(
        `${dead.length} notification trigger(s) listen for non-existent DDD contracts:\n` +
          dead.map(d => `  - ${d.pattern}\n    ${d.reason}`).join('\n') +
          `\n\nFix: delete the trigger OR re-add the contract to dddEventContracts.js OR ` +
          `add to KNOWN_DEAD_TRIGGERS with justification.`
      );
    }
  });

  it('every entry in KNOWN_DEAD_TRIGGERS still appears as a trigger pattern (ratchet-down)', () => {
    const patterns = new Set(extractTriggerPatterns());
    const stale = [...KNOWN_DEAD_TRIGGERS].filter(p => !patterns.has(p));
    if (stale.length > 0) {
      throw new Error(
        `${stale.length} entry/entries in KNOWN_DEAD_TRIGGERS removed from source. ` +
          `Remove from Set:\n` +
          stale.map(s => `  - ${s}`).join('\n')
      );
    }
  });

  it('triggers file exists and contains at least 5 patterns', () => {
    expect(fs.existsSync(TRIGGERS_FILE)).toBe(true);
    expect(extractTriggerPatterns().length).toBeGreaterThanOrEqual(5);
  });
});
