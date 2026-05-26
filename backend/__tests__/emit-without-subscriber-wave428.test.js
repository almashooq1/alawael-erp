/**
 * emit-without-subscriber-wave428.test.js — Wave 428 (Phase A3 — Real-Time Backbone).
 *
 * Drift guard that catches the W349 class: code calls `.emit(...)` or
 * `.publish(...)` on what looks like an event bus, but the call is a
 * silent no-op because the value isn't actually a bus instance.
 *
 * The original W349 bug: capaBootstrap did
 *   const bus = require('./qualityEventBus.service');
 *   bus.emit('quality.capa.overdue', payload);   // SILENT NO-OP
 *
 * Because qualityEventBus.service.js exports `{ getDefault, createQualityEventBus,
 * QualityEventBus, ... }` — NOT a singleton bus. So `bus.emit` was undefined
 * and the throw was swallowed (or, depending on harness, silently dropped
 * because there was a try/catch around emit). Producer chain (W346/W348)
 * emitted events nobody received for ~30 waves.
 *
 * Three static checks, run on the live codebase tree:
 *
 *   ── Check 1 — qualityEventBus W349-style anti-pattern ──
 *   Any file that requires qualityEventBus.service.js MUST either:
 *     (a) call .getDefault() before .emit/.on/.subscribers
 *     (b) call createQualityEventBus(...) before using the result
 *     (c) instantiate via `new QualityEventBus(...)`
 *     (d) destructure only NON-INSTANCE exports (createX / getDefault / etc.)
 *   The file MUST NOT call .emit() / .on() / .subscribers() directly on
 *   the module-export result without one of the above. The realtime
 *   gateway bootstrap (W427) is the reference pattern.
 *
 *   ── Check 2 — integrationBus alive-and-subscribed ──
 *   `integration/systemIntegrationBus.js` must export `integrationBus`
 *   instance + the W427 realtime gateway must subscribe via
 *   `subscribeAll(...)`. If the bridge is removed, dozens of producers
 *   become silent again.
 *
 *   ── Check 3 — realtime broker has ≥1 consumer ──
 *   The W135 broker existed orphaned for ~290 waves. W427 wired bridges
 *   from both buses. This check asserts the bootstrap is loaded by
 *   app.js — preventing future PRs from accidentally orphaning it
 *   again (same "built but disconnected" class as W225 wallet).
 *
 * Static analysis only (no mongoose, no DB, no app boot). Runs in ~50ms.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// ── helpers ─────────────────────────────────────────────────────────

function _walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip non-source dirs
      if (
        e.name === 'node_modules' ||
        e.name === 'coverage' ||
        e.name === '.jest-cache' ||
        e.name === '__tests__' ||
        e.name === 'tests' ||
        e.name === 'archived'
      ) {
        continue;
      }
      _walk(full, out);
    } else if (e.isFile() && e.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const ALL_SOURCE_FILES = _walk(BACKEND_ROOT);

function _read(p) {
  return fs.readFileSync(p, 'utf8');
}

function _relativePath(p) {
  return path.relative(BACKEND_ROOT, p).replace(/\\/g, '/');
}

// ── Check 1: qualityEventBus W349 anti-pattern ──────────────────────

const QUALITY_REQUIRE_RE =
  /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*['"][^'"]*qualityEventBus(?:\.service)?['"]\s*\)\s*;?/g;
const QUALITY_DESTRUCTURE_RE =
  /(?:const|let|var)\s+\{[^}]+\}\s*=\s*require\(\s*['"][^'"]*qualityEventBus(?:\.service)?['"]\s*\)\s*;?/g;

// Acceptable per-file usage patterns once a binding name is captured.
function _hasSafeQualityUsage(src, varName) {
  // (a) varName.getDefault() — the W349 fix
  if (new RegExp(`\\b${varName}\\.getDefault\\(`).test(src)) return true;
  // (b) varName.createQualityEventBus( — explicit factory
  if (new RegExp(`\\b${varName}\\.createQualityEventBus\\(`).test(src)) return true;
  // (c) varName.QualityEventBus( with new
  if (new RegExp(`new\\s+${varName}\\.QualityEventBus\\(`).test(src)) return true;
  return false;
}

function _hasDangerousQualityCall(src, varName) {
  // .emit / .on / .subscribers / .off / .flush — direct calls on the
  // module exports (which lack these methods) are the W349 bug.
  const dangerous = ['emit', 'on', 'off', 'subscribers', 'flush', 'recent'];
  for (const m of dangerous) {
    if (new RegExp(`\\b${varName}\\.${m}\\(`).test(src)) return true;
  }
  return false;
}

describe('W428 — qualityEventBus W349-style anti-pattern', () => {
  test('every qualityEventBus consumer either uses getDefault() or only destructures factory exports', () => {
    const violations = [];
    for (const file of ALL_SOURCE_FILES) {
      const src = _read(file);
      // Reset regex state
      QUALITY_REQUIRE_RE.lastIndex = 0;
      let m;
      while ((m = QUALITY_REQUIRE_RE.exec(src))) {
        const varName = m[1];
        // Skip self-references (the bus implementation file itself)
        if (file.endsWith('qualityEventBus.service.js')) continue;
        if (_hasDangerousQualityCall(src, varName) && !_hasSafeQualityUsage(src, varName)) {
          violations.push(
            `${_relativePath(file)}: variable '${varName}' bound to qualityEventBus module exports is called as if it were a bus instance (e.g. ${varName}.emit / .on). Use ${varName}.getDefault() first — see startup/realtimeGatewayBootstrap.js for the W349 fix pattern.`
          );
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `W428 — found ${violations.length} W349-style silent-no-op pattern(s):\n  - ` +
          violations.join('\n  - ')
      );
    }
  });

  test('qualityEventBus.service.js exports the documented factory shape', () => {
    const file = path.join(BACKEND_ROOT, 'services', 'quality', 'qualityEventBus.service.js');
    const src = _read(file);
    // Must export: createQualityEventBus, getDefault, QualityEventBus
    expect(src).toMatch(/module\.exports\s*=\s*\{[\s\S]*createQualityEventBus[\s\S]*\}/);
    expect(src).toMatch(/getDefault/);
    expect(src).toMatch(/QualityEventBus/);
  });
});

// ── Check 2: integrationBus alive-and-subscribed ────────────────────

describe('W428 — integrationBus has a wildcard subscriber (W427 bridge)', () => {
  test('startup/realtimeGatewayBootstrap.js subscribes to integrationBus via subscribeAll', () => {
    const file = path.join(BACKEND_ROOT, 'startup', 'realtimeGatewayBootstrap.js');
    expect(fs.existsSync(file)).toBe(true);
    const src = _read(file);
    expect(src).toMatch(/integrationBus\.subscribeAll\s*\(/);
  });

  test('startup/realtimeGatewayBootstrap.js subscribes to qualityEventBus via getDefault().on("*", ...)', () => {
    const file = path.join(BACKEND_ROOT, 'startup', 'realtimeGatewayBootstrap.js');
    const src = _read(file);
    // The W349 fix pattern: getDefault() THEN .on('*')
    expect(src).toMatch(/getDefault\(\)/);
    expect(src).toMatch(/\.on\(\s*['"]\*['"]/);
  });

  test('app.js requires realtimeGatewayBootstrap (broker not orphaned)', () => {
    const file = path.join(BACKEND_ROOT, 'app.js');
    const src = _read(file);
    expect(src).toMatch(
      /require\(['"]\.\/startup\/realtimeGatewayBootstrap['"]\)\.wireRealtimeGateway\(app/
    );
  });
});

// ── Check 3: realtime broker has ≥1 consumer (anti-orphaning) ───────

describe('W428 — realtime broker is wired (anti-W225/W377 orphan recurrence)', () => {
  test('intelligence/realtime-event-broker.service.js exists and is required by the bootstrap', () => {
    const broker = path.join(BACKEND_ROOT, 'intelligence', 'realtime-event-broker.service.js');
    expect(fs.existsSync(broker)).toBe(true);
    const bootstrap = path.join(BACKEND_ROOT, 'startup', 'realtimeGatewayBootstrap.js');
    expect(fs.existsSync(bootstrap)).toBe(true);
    const bootstrapSrc = _read(bootstrap);
    expect(bootstrapSrc).toMatch(
      /require\(['"]\.\.\/intelligence\/realtime-event-broker\.service['"]\)/
    );
  });

  test('routes/realtime.routes.js exists and mounts /stream', () => {
    const routes = path.join(BACKEND_ROOT, 'routes', 'realtime.routes.js');
    expect(fs.existsSync(routes)).toBe(true);
    const src = _read(routes);
    expect(src).toMatch(/router\.get\(['"]\/stream['"]/);
  });

  test('topic ACL registry exists and is required by the routes file', () => {
    const registry = path.join(BACKEND_ROOT, 'intelligence', 'realtime-topic-acl.registry.js');
    expect(fs.existsSync(registry)).toBe(true);
    const routes = path.join(BACKEND_ROOT, 'routes', 'realtime.routes.js');
    const routesSrc = _read(routes);
    expect(routesSrc).toMatch(
      /require\(['"]\.\.\/intelligence\/realtime-topic-acl\.registry['"]\)/
    );
  });
});

// ── Check 4: producer/consumer pairing on the LIVE bus ──────────────
//
// For every `bus.publish(domain, eventType, payload, ...)` callsite in
// production code, the topic `${domain}.${eventType}` is automatically
// consumed by the W427 realtime bridge (subscribeAll). This check just
// asserts the bridge file still calls subscribeAll — if it stops, every
// producer goes silent again.

describe('W428 — every integrationBus.publish has at least one consumer', () => {
  test('integrationBus producer count > 0 (sanity)', () => {
    let producerCount = 0;
    const producerFiles = new Set();
    const re = /integrationBus\.publish\s*\(/g;
    for (const file of ALL_SOURCE_FILES) {
      const src = _read(file);
      const matches = src.match(re);
      if (matches) {
        producerCount += matches.length;
        producerFiles.add(_relativePath(file));
      }
    }
    // If this drops to zero, integrationBus has no callers — surface in CI.
    expect(producerCount).toBeGreaterThan(0);
  });

  test('integrationBus subscriber count > 0 (the W427 bridge OR existing dddCrossModuleSubscribers)', () => {
    let subscriberCount = 0;
    const re = /integrationBus\.(subscribe|subscribeAll|subscribeDomain)\s*\(/g;
    for (const file of ALL_SOURCE_FILES) {
      const src = _read(file);
      const matches = src.match(re);
      if (matches) subscriberCount += matches.length;
    }
    expect(subscriberCount).toBeGreaterThan(0);
  });
});
