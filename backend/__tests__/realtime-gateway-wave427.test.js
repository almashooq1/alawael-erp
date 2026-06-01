/**
 * realtime-gateway-wave427.test.js — Wave 427 (Phase A1 — Real-Time Backbone).
 *
 * Locks the contract for the SSE Gateway that bridges integrationBus +
 * qualityEventBus to the W135 in-process broker. Combines:
 *
 *   1. Topic ACL registry shape + behavioural assertions
 *   2. Bridge fan-out: integration envelope + quality emit → broker.publish
 *   3. Cross-tenant clamp: restricted role gets foreign branch dropped
 *   4. Per-event ACL inside the SSE handler (defense-in-depth)
 *   5. Anti-orphaning sentinel: app.js MUST require the bootstrap, the
 *      bootstrap MUST subscribe to both buses, the broker MUST be on
 *      app._realtimeBroker. Same lesson as W225 wallet + W377.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
  isTopicAllowed,
  allowedTopicsFor,
  knownRoles,
  ROLE_TOPIC_ALLOWLIST,
  _entryMatches,
} = require('../intelligence/realtime-topic-acl.registry');

const APP_JS = path.resolve(__dirname, '..', 'app.js');
const BOOTSTRAP_JS = path.resolve(__dirname, '..', 'startup', 'realtimeGatewayBootstrap.js');
const ROUTES_JS = path.resolve(__dirname, '..', 'routes', 'realtime.routes.js');
const READ = p => fs.readFileSync(p, 'utf8');

// ──────────────────────────────────────────────────────────────────
//  1. Topic ACL registry
// ──────────────────────────────────────────────────────────────────

describe('W427 — topic ACL registry', () => {
  test('knownRoles covers super_admin, doctor, parent, dpo, guest', () => {
    const roles = knownRoles();
    for (const r of ['super_admin', 'doctor', 'parent', 'dpo', 'guest']) {
      expect(roles).toContain(r);
    }
  });

  test('super_admin gets * (firehose); guest/viewer/data_entry empty (default-deny)', () => {
    expect(allowedTopicsFor('super_admin')).toContain('*');
    expect(allowedTopicsFor('guest')).toHaveLength(0);
    expect(allowedTopicsFor('viewer')).toHaveLength(0);
    expect(allowedTopicsFor('data_entry')).toHaveLength(0);
  });

  test('unknown role → no topics (default-deny)', () => {
    expect(allowedTopicsFor('hacker_role_xyz')).toHaveLength(0);
    expect(isTopicAllowed('hacker_role_xyz', 'quality.capa.overdue')).toBe(false);
  });

  test('exact match: nurse may read session.completed but NOT session.scheduled', () => {
    expect(isTopicAllowed('nurse', 'session.completed')).toBe(true);
    expect(isTopicAllowed('nurse', 'session.scheduled')).toBe(false);
  });

  test('prefix match: doctor.medical.* covers medical.vital_signs', () => {
    expect(isTopicAllowed('doctor', 'medical.vital_signs')).toBe(true);
    expect(isTopicAllowed('doctor', 'medical.risk.alert_raised')).toBe(true);
  });

  test('parent CANNOT subscribe to quality.capa.* (clinical events only)', () => {
    expect(isTopicAllowed('parent', 'quality.capa.overdue')).toBe(false);
    expect(isTopicAllowed('parent', 'goal.achieved')).toBe(true);
  });

  test('dpo gets audit.* + compliance.* but NOT episode.*', () => {
    expect(isTopicAllowed('dpo', 'audit.log.created')).toBe(true);
    expect(isTopicAllowed('dpo', 'compliance.evidence.recorded')).toBe(true);
    expect(isTopicAllowed('dpo', 'episode.created')).toBe(false);
  });

  test('_entryMatches: wildcard, prefix, exact', () => {
    expect(_entryMatches('*', 'anything.at.all')).toBe(true);
    expect(_entryMatches('quality.*', 'quality.capa.overdue')).toBe(true);
    expect(_entryMatches('quality.*', 'quality')).toBe(true);
    expect(_entryMatches('quality.*', 'qualitysomething')).toBe(false);
    expect(_entryMatches('session.completed', 'session.completed')).toBe(true);
    expect(_entryMatches('session.completed', 'session.completed.x')).toBe(false);
  });

  test('only super_admin + head_office_admin may have * entries (audit guard)', () => {
    for (const [role, entries] of Object.entries(ROLE_TOPIC_ALLOWLIST)) {
      if (role === 'super_admin' || role === 'head_office_admin') continue;
      expect(entries).not.toContain('*');
    }
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. Anti-orphaning sentinel + bootstrap shape (static)
// ──────────────────────────────────────────────────────────────────

describe('W427 — bootstrap + wiring sentinel', () => {
  test('app.js requires realtimeGatewayBootstrap', () => {
    const src = READ(APP_JS);
    expect(src).toMatch(
      /require\(['"]\.\/startup\/realtimeGatewayBootstrap['"]\)\.wireRealtimeGateway\(app/
    );
  });

  test('bootstrap subscribes to BOTH integrationBus AND qualityEventBus', () => {
    const src = READ(BOOTSTRAP_JS);
    // integrationBus bridge — subscribeAll('*') wildcard
    expect(src).toMatch(/integrationBus\.subscribeAll/);
    // qualityEventBus bridge — must use getDefault() (W349 lesson, not
    // module.emit or module.default.emit which are silent no-ops)
    expect(src).toMatch(/qualityBusModule\.getDefault\(\)/);
    expect(src).toMatch(/qualityBus\.on\(\s*['"]\*['"]/);
  });

  test('bootstrap attaches broker to app._realtimeBroker for late binding', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/app\._realtimeBroker\s*=\s*broker/);
  });

  test('routes file mounts /stream + /stats + /topics with auth + branch scope', () => {
    const src = READ(ROUTES_JS);
    expect(src).toMatch(
      /router\.get\(['"]\/stream['"]\s*,\s*authenticate\s*,\s*requireBranchAccess/
    );
    expect(src).toMatch(
      /router\.get\(['"]\/stats['"]\s*,\s*authenticate\s*,\s*requireBranchAccess/
    );
    expect(src).toMatch(
      /router\.get\(['"]\/topics['"]\s*,\s*authenticate\s*,\s*requireBranchAccess/
    );
  });

  test('SSE handler enforces ACL on every event (defense-in-depth)', () => {
    const src = READ(ROUTES_JS);
    // The onEvent callback must call isTopicAllowed before res.write
    expect(src).toMatch(/onEvent:\s*event\s*=>\s*\{[\s\S]*?isTopicAllowed\(role,\s*event\.topic\)/);
  });

  test('SSE handler clamps branchId to caller scope (cross-tenant guard)', () => {
    const src = READ(ROUTES_JS);
    // Must derive callerBranchId from branchId(req) and use it as the
    // primary filter — query-string branchId can only override when
    // caller is cross-branch.
    expect(src).toMatch(/callerBranchId\s*=\s*branchId\(req\)/);
    expect(src).toMatch(/if\s*\(callerBranchId\)/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. Bridge fan-out — integration envelope → broker
// ──────────────────────────────────────────────────────────────────

describe('W427 — bridge fan-out (integration envelope → broker)', () => {
  test('integration envelope topic format = domain.eventType', () => {
    const src = READ(BOOTSTRAP_JS);
    // The bridge constructs topic from envelope.domain + envelope.eventType
    expect(src).toMatch(/`\$\{envelope\.domain\}\.\$\{envelope\.eventType\}`/);
  });

  test('quality bus event name used verbatim as broker topic', () => {
    const src = READ(BOOTSTRAP_JS);
    // qualityBus.on('*', (payload, name) => broker.publish({ topic: name })
    expect(src).toMatch(/topic:\s*name/);
  });

  test('eventId carries source prefix for cross-bus dedupe', () => {
    const src = READ(BOOTSTRAP_JS);
    expect(src).toMatch(/`integration:\$\{topic\}/);
    expect(src).toMatch(/`quality:\$\{name\}/);
  });

  test('every delivery wraps in try/catch — one bad listener does not break others', () => {
    const src = READ(BOOTSTRAP_JS);
    // Both bridges declare + reference innerErr (2 occurrences each = 4)
    expect((src.match(/innerErr/g) || []).length).toBeGreaterThanOrEqual(4);
    // Both bridges log via logger.warn with `bridge delivery failed`
    const deliveryFailedMatches = src.match(/bridge delivery failed/g) || [];
    expect(deliveryFailedMatches.length).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. Broker behaviour smoke (uses the real W135 broker)
// ──────────────────────────────────────────────────────────────────

describe('W427 — broker behaviour smoke', () => {
  const { createRealtimeEventBroker } = require('../intelligence/realtime-event-broker.service');

  test('publish fans out to a subscriber matching by topic', () => {
    const broker = createRealtimeEventBroker({ logger: { warn: () => {}, info: () => {} } });
    const got = [];
    broker.subscribe({
      filter: { topic: 'quality.capa.overdue' },
      onEvent: e => got.push(e),
    });
    const r = broker.publish({
      eventId: 'evt-1',
      topic: 'quality.capa.overdue',
      payload: { capaId: 'CAPA-1' },
    });
    expect(r.ok).toBe(true);
    expect(r.delivered).toBe(1);
    expect(got).toHaveLength(1);
    expect(got[0].topic).toBe('quality.capa.overdue');
  });

  test('idempotency: same eventId twice → second is no-op', () => {
    const broker = createRealtimeEventBroker({ logger: { warn: () => {}, info: () => {} } });
    const got = [];
    broker.subscribe({ onEvent: e => got.push(e) });
    broker.publish({ eventId: 'X', topic: 't', payload: { n: 1 } });
    broker.publish({ eventId: 'X', topic: 't', payload: { n: 2 } });
    expect(got).toHaveLength(1);
  });
});
