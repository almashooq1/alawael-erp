'use strict';

/**
 * W524 — clinical-crisis REST surface drift guard.
 *
 * Static-analysis test (W345 capa-routes pattern). Asserts the route
 * contract that wires the W458 crisisOrchestrator.service: endpoints,
 * MFA tiers, branch isolation, error mapping, the features.registry
 * mount, and the ADR-033 domain-boundary separation from the legacy
 * facility-crisis route. Does NOT load mongoose.
 *
 * Why static: the orchestrator's own behavior is covered by the W458
 * unit suites (crisis-orchestrator-wave458 + behavioral). This guard
 * locks the WIRING — the exact gap (no route layer) the W522/W523
 * dormant audit surfaced.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'clinical-crisis.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);
const orchestrator = require('../services/crisisOrchestrator.service');

describe('W524 — clinical-crisis route surface', () => {
  it('delegates to the W458 crisisOrchestrator service (not a re-implementation)', () => {
    expect(ROUTES_SRC).toMatch(
      /require\(\s*['"]\.\.\/services\/crisisOrchestrator\.service['"]\s*\)/
    );
    expect(ROUTES_SRC).toMatch(/orchestrator\.reportCrisis\(/);
    expect(ROUTES_SRC).toMatch(/orchestrator\.escalate\(/);
    expect(ROUTES_SRC).toMatch(/orchestrator\.closeWithReview\(/);
    expect(ROUTES_SRC).toMatch(/orchestrator\.linkSpecializedRecord\(/);
    expect(ROUTES_SRC).toMatch(/orchestrator\.getActive\(/);
  });

  it('exposes a no-auth /health probe surfacing the service constants', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/health['"]/);
    expect(ROUTES_SRC).toMatch(/crisisTypes:\s*orchestrator\.ALLOWED_TYPES/);
    expect(ROUTES_SRC).toMatch(/severities:\s*orchestrator\.ALLOWED_SEVERITIES/);
    expect(ROUTES_SRC).toMatch(/actionTypes:\s*orchestrator\.ALLOWED_ACTION_TYPES/);
  });

  it('mounts authenticate + attachMfaActor + requireBranchAccess as global middleware', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  it('report (POST /) + close (POST /:id/close) require MFA tier 2 (ADR-019)', () => {
    expect(ROUTES_SRC).toMatch(/router\.post\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*2\s*\)/);
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/:id\/close['"]\s*,\s*requireMfaTier\(\s*2\s*\)/
    );
  });

  it('read + escalate + link require MFA tier 1', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/active['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/:id['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/:id\/escalate['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
    expect(ROUTES_SRC).toMatch(
      /router\.post\(\s*['"]\/:id\/link['"]\s*,\s*requireMfaTier\(\s*1\s*\)/
    );
  });

  it('enforces W269 branch isolation (assertBranchMatch + enforceBeneficiaryBranch + effectiveBranchScope)', () => {
    expect(ROUTES_SRC).toMatch(/assertBranchMatch\(/);
    expect(ROUTES_SRC).toMatch(/enforceBeneficiaryBranch\(\s*req\s*,\s*body\.beneficiaryId\s*\)/);
    expect(ROUTES_SRC).toMatch(/effectiveBranchScope\(\s*req\s*\)/);
  });

  it('does NOT read req.branchId (the W269h anti-pattern)', () => {
    expect(ROUTES_SRC).not.toMatch(/req\.branchId/);
  });

  it('report forces branchId from caller scope (ignores body spoofing) + sources reportedBy from req.user', () => {
    expect(ROUTES_SRC).toMatch(/effectiveBranchScope\(req\)\s*\|\|\s*body\.branchId/);
    expect(ROUTES_SRC).toMatch(/reportedBy:\s*req\.user/);
  });

  it('maps service errors to HTTP: status passthrough + not-found→404 + required/invalid→400', () => {
    expect(ROUTES_SRC).toMatch(/typeof err\.status === 'number'/);
    expect(ROUTES_SRC).toMatch(/not found/i);
    expect(ROUTES_SRC).toMatch(/required\|invalid/);
  });
});

describe('W524 — features.registry mount', () => {
  it('safeRequires clinical-crisis.routes', () => {
    expect(REGISTRY_SRC).toMatch(
      /safeRequire\(\s*['"]\.\.\/routes\/clinical-crisis\.routes['"]\s*\)/
    );
  });

  it('dualMountAuth at clinical-crisis with authenticate', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]clinical-crisis['"]\s*,\s*clinicalCrisisRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('ADR-033 boundary comment present (so future agents do not reconcile the two crisis systems)', () => {
    expect(REGISTRY_SRC).toMatch(/ADR-033/);
    expect(REGISTRY_SRC).toMatch(/FACILITY-emergency surface/i);
  });
});

describe('W524 — orchestrator constants are stable (route validators depend on them)', () => {
  it('exports the three constant arrays the route surfaces', () => {
    expect(Array.isArray(orchestrator.ALLOWED_TYPES)).toBe(true);
    expect(Array.isArray(orchestrator.ALLOWED_SEVERITIES)).toBe(true);
    expect(Array.isArray(orchestrator.ALLOWED_ACTION_TYPES)).toBe(true);
    expect(orchestrator.ALLOWED_SEVERITIES).toContain('critical');
    expect(orchestrator.ALLOWED_TYPES).toContain('safeguarding');
  });

  it('exposes the 5 documented orchestration methods', () => {
    for (const m of [
      'reportCrisis',
      'escalate',
      'closeWithReview',
      'linkSpecializedRecord',
      'getActive',
    ]) {
      expect(typeof orchestrator[m]).toBe('function');
    }
  });
});
