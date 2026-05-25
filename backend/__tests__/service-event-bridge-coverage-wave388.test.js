'use strict';

/**
 * W388 — meta-drift-guard for the W387 serviceEventBridge.
 *
 * The W387 bridge `backend/integration/serviceEventBridge.js` hardcodes
 * mappings between domain services + contract eventTypes:
 *
 *   episodes.service → ['episode.created', 'episode.phase_transitioned', 'episode.closed']
 *   core.beneficiaryService → ['beneficiary.status_changed', 'beneficiary.profile_updated']
 *   ... etc
 *
 * If a future agent adds a new producer wire (e.g., wires `behavior.plan_approved`
 * via BehaviorService.approvePlan) but forgets to add the eventType to the
 * bridge's BehaviorService mapping, the event will fire locally but **never
 * reach integrationBus subscribers**. Exactly the W387 bug class. Drift
 * guards W375 + W382 + W384-W386 would all pass.
 *
 * W388 closes this meta-gap:
 *
 *   1. Scan backend source for `service.emit('<eventType>', payload)` and
 *      `bus.emit('<eventType>', ...)` calls where eventType matches a contract
 *      in dddEventContracts.js. These are PRODUCERS.
 *   2. Read serviceEventBridge.js source + extract all bridged eventType
 *      strings (those inside the `attachBridge(domain, service, [...])`
 *      arrays).
 *   3. Assert: every PRODUCER eventType is also in the bridge.
 *   4. Assert: every BRIDGE eventType has a producer somewhere (catches
 *      dead bridge mappings — useful for cleanup if a wire is later removed).
 *
 * Static analysis only (file reads + regex). No mongoose, no integration bus
 * instantiation. Pattern matches W354/W375/W382/W340 lineage.
 *
 * Edge cases handled:
 *   - Subscriber-only contracts (e.g., ai.risk_elevated): no producer
 *     anywhere → not in bridge → OK. These are wired via direct
 *     integrationBus.publish from other code paths (not our W379-W386 wires).
 *   - Multiple producers for the same eventType: still need bridge once.
 *   - Bridge fallback eventTypes (e.g., ones the bridge maps but no current
 *     producer fires): legitimate during refactor windows but flagged for
 *     cleanup.
 */

const fs = require('fs');
const path = require('path');
const contracts = require('../events/contracts/dddEventContracts');

const BACKEND_ROOT = path.join(__dirname, '..');
const BRIDGE_FILE = path.join(BACKEND_ROOT, 'integration', 'serviceEventBridge.js');

const SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
  'events', // contracts file lives here — exclude self-references
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

// All contract eventTypes from dddEventContracts.js
function allContractEventTypes() {
  const types = new Set();
  for (const group of Object.values(contracts.DDD_CONTRACTS)) {
    for (const evt of Object.values(group)) {
      types.add(evt.eventType);
    }
  }
  return types;
}

// Producers: scan all backend/*.js (minus tests/contracts) for
// `.emit('<eventType>', ...)` where eventType is a known contract string.
// Catches both `this.emit(...)` (BaseService) and `bus.emit(...)` (module emitters).
function findProducers() {
  const allTypes = allContractEventTypes();
  const producers = new Map(); // eventType → [files where emit found]
  const files = walkJs(BACKEND_ROOT);
  const emitRe = /\.emit\s*\(\s*['"]([\w.]+)['"]\s*,/g;

  // Exclude the bridge itself and the integrationBus (it `.emit(fullEventName, ...)`
  // for namespaced dispatch — those aren't producer wires, they're bus internals).
  const EXCLUDE_FROM_PRODUCERS = new Set([
    path.join(BACKEND_ROOT, 'integration', 'serviceEventBridge.js'),
    path.join(BACKEND_ROOT, 'integration', 'systemIntegrationBus.js'),
  ]);

  for (const f of files) {
    if (EXCLUDE_FROM_PRODUCERS.has(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(emitRe)) {
      const eventType = m[1];
      if (allTypes.has(eventType)) {
        const rel = path.relative(BACKEND_ROOT, f).replace(/\\/g, '/');
        if (!producers.has(eventType)) producers.set(eventType, []);
        producers.get(eventType).push(rel);
      }
    }
  }
  return producers;
}

// Bridge eventTypes: parse `serviceEventBridge.js` for the literal eventType
// strings inside attachBridge(...) calls. The bridge file has structure:
//   attachBridge('episodes', svc, [ 'episode.created', 'episode.phase_transitioned', ... ])
function bridgeEventTypes() {
  const src = fs.readFileSync(BRIDGE_FILE, 'utf8');
  const types = new Set();
  // Match strings like 'episode.created' that have a dot (event-name shape).
  // This is broad — but the bridge file is small and we filter by checking
  // against the contracts set.
  const allTypes = allContractEventTypes();
  const literalRe = /['"]([\w.]+\.[\w.]+)['"]/g;
  for (const m of src.matchAll(literalRe)) {
    if (allTypes.has(m[1])) types.add(m[1]);
  }
  return types;
}

describe('W388 serviceEventBridge coverage drift guard', () => {
  describe('producer-must-be-bridged invariant', () => {
    it('every contract eventType with a producer wire is included in serviceEventBridge', () => {
      const producers = findProducers();
      const bridged = bridgeEventTypes();

      const missing = [];
      for (const [eventType, files] of producers) {
        if (!bridged.has(eventType)) {
          missing.push({ eventType, files });
        }
      }

      if (missing.length > 0) {
        const lines = missing
          .map(
            ({ eventType, files }) =>
              `  - "${eventType}" emitted by ${files.length} producer(s):\n` +
              files.map(f => `      ${f}`).join('\n') +
              `\n    NOT FORWARDED by serviceEventBridge.js`
          )
          .join('\n');
        throw new Error(
          `${missing.length} contract eventType(s) have producer wires but are NOT in the W387 bridge:\n\n${lines}\n\n` +
            `Fix: add the missing eventType to the appropriate attachBridge(...) call in ` +
            `backend/integration/serviceEventBridge.js. Otherwise these events fire LOCALLY ` +
            `but never reach integrationBus subscribers (the W387 bug class).`
        );
      }
    });

    it('every bridged eventType has at least one producer somewhere', () => {
      const producers = findProducers();
      const bridged = bridgeEventTypes();
      const stale = [];
      for (const eventType of bridged) {
        if (!producers.has(eventType)) {
          stale.push(eventType);
        }
      }
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} eventType(s) bridged in serviceEventBridge.js but have NO producer:\n` +
            stale.map(s => `  - "${s}"`).join('\n') +
            `\n\nEither (a) the producer was removed without cleanup → drop from bridge, ` +
            `or (b) the bridge entry was added prematurely → wait until producer lands.`
        );
      }
    });
  });

  describe('sanity', () => {
    it('bridge file exists and is loadable', () => {
      expect(fs.existsSync(BRIDGE_FILE)).toBe(true);
      const mod = require('../integration/serviceEventBridge');
      expect(typeof mod.wireServiceEventBridge).toBe('function');
      expect(typeof mod.BRIDGE_FLAG).toBe('symbol');
    });

    it('at least 10 eventTypes are bridged (catches accidental mass-removal)', () => {
      // Post-W387 we wire 14 events. Floor of 10 leaves room for legitimate
      // shrinkage as contracts get deleted (per ADR-027 path b).
      const bridged = bridgeEventTypes();
      expect(bridged.size).toBeGreaterThanOrEqual(10);
    });
  });
});
