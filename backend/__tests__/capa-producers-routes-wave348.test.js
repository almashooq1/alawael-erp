'use strict';

/**
 * W348 — CAPA Pass 6 producer routes drift guard.
 *
 * Static-analysis test (W345 pattern). Asserts the producer-route contract:
 * endpoints, MFA tiers, error mapping, parent doc load + linkedCapaId write,
 * orphaned-CAPA logging, bootstrap mount, producers factory wiring.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'capa-producers.routes.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

describe('W348 — capa-producers REST surface contract', () => {
  it('mounts authenticate + attachMfaActor as global middleware', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
  });

  it('exposes POST /audit/:occurrenceId/findings/:findingId (tier 1)', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/audit\/:occurrenceId\/findings\/:findingId['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
  });

  it('exposes POST /rca/:rcaId/root-causes/:rootCauseId (tier 1)', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/rca\/:rcaId\/root-causes\/:rootCauseId['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
  });

  it('exposes POST /fmea/:fmeaId/rows/:rowId/actions/:actionId (tier 1)', () => {
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/fmea\/:fmeaId\/rows\/:rowId\/actions\/:actionId['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
  });

  it('reads producers via req.app._capaProducers (late binding)', () => {
    expect(ROUTES_SRC).toMatch(/req\.app\._capaProducers/);
  });

  it('audit handler updates linkedCapaId + capaCreated:true on the source finding', () => {
    expect(ROUTES_SRC).toMatch(/finding\.linkedCapaId\s*=\s*capa\._id/);
    expect(ROUTES_SRC).toMatch(/finding\.capaCreated\s*=\s*true/);
  });

  it('rca handler updates linkedCapaId + addressed:true on the source root cause', () => {
    expect(ROUTES_SRC).toMatch(/root\.linkedCapaId\s*=\s*capa\._id/);
    expect(ROUTES_SRC).toMatch(/root\.addressed\s*=\s*true/);
  });

  it('fmea handler updates action.linkedCapaId AND appends to fmeaDoc.relatedCapaIds[]', () => {
    expect(ROUTES_SRC).toMatch(/action\.linkedCapaId\s*=\s*capa\._id/);
    expect(ROUTES_SRC).toMatch(/fmeaDoc\.relatedCapaIds\.push\(\s*capa\._id\s*\)/);
  });

  it('orphan logging fires when CAPA is created but parent save fails', () => {
    // All 3 handlers should log loudly on saveErr.
    const orphanMatches = ROUTES_SRC.match(
      /WARNING: CAPA \$\{capa\.capaNumber\} created but linkedCapaId update FAILED/g
    );
    expect(orphanMatches).not.toBeNull();
    expect(orphanMatches.length).toBe(3);
  });

  it('mapErrorToHttp maps all 6 known error codes correctly', () => {
    expect(ROUTES_SRC).toMatch(/INVALID_INPUT[\s\S]*status:\s*400/);
    expect(ROUTES_SRC).toMatch(/MISSING_SUB_DOC[\s\S]*status:\s*404/);
    expect(ROUTES_SRC).toMatch(/PARENT_NOT_FOUND[\s\S]*status:\s*404/);
    expect(ROUTES_SRC).toMatch(/SERVICE_NOT_WIRED[\s\S]*status:\s*503/);
    expect(ROUTES_SRC).toMatch(/MFA_TIER_INSUFFICIENT[\s\S]*status:\s*403/);
    expect(ROUTES_SRC).toMatch(/REASON_CODE_REQUIRED[\s\S]*status:\s*400/);
  });

  it('parent-not-found yields 404 PARENT_NOT_FOUND', () => {
    // Each of the 3 handlers should set err.code = 'PARENT_NOT_FOUND' when parent doc missing
    const matches = ROUTES_SRC.match(/err\.code\s*=\s*['"]PARENT_NOT_FOUND['"]/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBe(3);
  });

  it('SERVICE_NOT_WIRED defensive when bootstrap not called', () => {
    expect(ROUTES_SRC).toMatch(/err\.code\s*=\s*['"]SERVICE_NOT_WIRED['"]/);
  });
});

describe('W348 — bootstrap wires producers factory + mounts routes', () => {
  it('imports createCapaProducers + constructs with the same service', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/services\/quality\/capa-producers\.service['"]\s*\)/
    );
    expect(BOOTSTRAP_SRC).toMatch(/createCapaProducers\(\s*\{\s*capaService:\s*service\s*\}\s*\)/);
  });

  it('attaches producers to app._capaProducers for late binding', () => {
    expect(BOOTSTRAP_SRC).toMatch(/app\._capaProducers\s*=\s*createCapaProducers/);
  });

  it('mounts producer routes at /api/quality/capa-producers + /api/v1/...', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/quality\/capa-producers['"]\s*,\s*producersRouter\s*\)/
    );
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/v1\/quality\/capa-producers['"]\s*,\s*producersRouter\s*\)/
    );
  });

  it('producer route mount uses require path ../routes/quality/capa-producers.routes', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/routes\/quality\/capa-producers\.routes['"]\s*\)/
    );
  });
});
