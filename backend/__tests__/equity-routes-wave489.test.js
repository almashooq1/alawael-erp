'use strict';

/**
 * W489 drift guard — equity.routes.js (Phase G REST surface).
 *
 * Static source-shape assertions + mount-side verification in
 * features.registry.js.
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'equity.routes.js'), 'utf8');
const REG_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W489 — equity.routes structural', () => {
  it('declares GET /alerts', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/alerts['"]/);
  });

  it('declares GET /alerts/:id', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/alerts\/:id['"]/);
  });

  it('declares PATCH /alerts/:id', () => {
    expect(ROUTE_SRC).toMatch(/router\.patch\(\s*['"]\/alerts\/:id['"]/);
  });

  it('declares POST /alerts/:id/dismiss with tier 2 MFA', () => {
    expect(ROUTE_SRC).toMatch(
      /router\.post\(\s*['"]\/alerts\/:id\/dismiss['"][\s\S]+?requireMfaTier\(2\)/
    );
  });

  it('declares POST /audit with tier 2 MFA', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/audit['"][\s\S]+?requireMfaTier\(2\)/);
  });

  it('W504 declares POST /alerts/:id/retry-capa with tier 1 MFA', () => {
    expect(ROUTE_SRC).toMatch(
      /router\.post\(\s*['"]\/alerts\/:id\/retry-capa['"][\s\S]+?requireMfaTier\(1\)/
    );
  });

  it('W504 retry-capa returns 201 on CREATED, 200 on ALREADY_LINKED', () => {
    expect(ROUTE_SRC).toMatch(/result\.reason === 'ALREADY_LINKED' \? 200 : 201/);
  });

  it('W504 retry-capa maps ALERT_NOT_FOUND to 404', () => {
    expect(ROUTE_SRC).toMatch(/err\.code === 'ALERT_NOT_FOUND'/);
  });

  it('W504 retry-capa uses branch isolation via assertBranchMatch', () => {
    expect(ROUTE_SRC).toMatch(/retry-capa[\s\S]+?assertBranchMatch\(req,\s*alert\.branchId/);
  });

  it('declares GET /benchmarks', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/benchmarks['"]/);
  });

  it('all routes require authenticateToken globally', () => {
    expect(ROUTE_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('uses branchFilter from W269 isolation doctrine', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter\(req\)/);
  });

  it('uses assertBranchMatch on per-id reads + writes', () => {
    expect(ROUTE_SRC).toMatch(/assertBranchMatch\(req,/);
  });

  it('routes loaded via mongoose.model lookup (lazy registration)', () => {
    expect(ROUTE_SRC).toMatch(/mongoose\.model\(['"]EquityDisparityAlert['"]/);
    expect(ROUTE_SRC).toMatch(/mongoose\.model\(['"]OutcomeBenchmark['"]/);
  });

  it('dismiss endpoint requires reason >=5 chars', () => {
    expect(ROUTE_SRC).toMatch(/REASON_TOO_SHORT/);
    expect(ROUTE_SRC).toMatch(/reason\.length < 5/);
  });

  it('PATCH rejects status=dismissed (routes to /dismiss instead)', () => {
    expect(ROUTE_SRC).toMatch(/USE_DISMISS_ENDPOINT/);
  });

  it('list endpoint clamps limit at 200', () => {
    expect(ROUTE_SRC).toMatch(/Math\.min\([\s\S]+?,\s*200\)/);
  });

  it('audit endpoint defaults periodKind to ad-hoc', () => {
    expect(ROUTE_SRC).toMatch(/periodKind:\s*req\.body\.periodKind\s*\|\|\s*['"]ad-hoc['"]/);
  });
});

describe('W489 — features.registry mount', () => {
  it('safeRequire pulls equity.routes', () => {
    expect(REG_SRC).toMatch(/safeRequire\(['"]\.\.\/routes\/equity\.routes['"]\)/);
  });

  it('dualMount mounts equity surface', () => {
    expect(REG_SRC).toMatch(/dualMount\(app,\s*['"]equity['"]/);
  });

  it('logs W489 in mount announcement', () => {
    expect(REG_SRC).toMatch(/W489/);
  });
});
