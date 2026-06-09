'use strict';

/**
 * W1040 guard — clinical-safety-summary aggregation route.
 *
 * Two halves:
 *  1. UNIT test of the exported pure `buildSummary()` — the flag-computation
 *     core (no DB, deterministic).
 *  2. STATIC drift guard on the route source — 3 endpoints, branch-scoped,
 *     READ-ONLY (zero write ops), mounted via dualMountAuth.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'clinical-safety-summary.routes.js'),
  'utf8'
);
const REGISTRY_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

const route = require('../routes/clinical-safety-summary.routes');

const PAST = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const BID = '64b7f1a2c3d4e5f6a7b8c9d0';

// ═══════════════════════════════════════════════════════════════════════
// Unit — buildSummary flag computation
// ═══════════════════════════════════════════════════════════════════════

describe('W1040 buildSummary — empty + base', () => {
  it('exports buildSummary as a function', () => {
    expect(typeof route.buildSummary).toBe('function');
  });

  it('no sources → no flags, hasActiveFlag false', () => {
    const s = route.buildSummary(BID, {});
    expect(s.flags).toEqual([]);
    expect(s.flagCount).toBe(0);
    expect(s.hasActiveFlag).toBe(false);
    expect(s.beneficiaryId).toBe(BID);
  });
});

describe('W1040 buildSummary — falls', () => {
  it('high risk → falls_high_risk', () => {
    const s = route.buildSummary(BID, { falls: { riskLevel: 'high', status: 'finalized', nextReviewDue: FUTURE } });
    expect(s.flags).toContain('falls_high_risk');
    expect(s.falls.riskLevel).toBe('high');
  });

  it('finalized + past review → falls_reassessment_overdue', () => {
    const s = route.buildSummary(BID, { falls: { riskLevel: 'low', status: 'finalized', nextReviewDue: PAST } });
    expect(s.flags).toContain('falls_reassessment_overdue');
    expect(s.falls.overdue).toBe(true);
  });

  it('low risk + future review → no flags', () => {
    const s = route.buildSummary(BID, { falls: { riskLevel: 'low', status: 'finalized', nextReviewDue: FUTURE } });
    expect(s.flags).toEqual([]);
  });
});

describe('W1040 buildSummary — pressure injuries', () => {
  it('open injury → open_pressure_injury', () => {
    const s = route.buildSummary(BID, { injuries: [{ status: 'active', stage: 'stage_2', origin: 'present_on_admission' }] });
    expect(s.flags).toContain('open_pressure_injury');
    expect(s.pressureInjury.openCount).toBe(1);
  });

  it('stage_3 → pressure_injury_stage3plus; facility_acquired → HAPI flag', () => {
    const s = route.buildSummary(BID, { injuries: [{ status: 'active', stage: 'stage_3', origin: 'facility_acquired' }] });
    expect(s.flags).toContain('pressure_injury_stage3plus');
    expect(s.flags).toContain('hospital_acquired_pressure_injury');
    expect(s.pressureInjury.facilityAcquired).toBe(true);
    expect(s.pressureInjury.worstStage).toBe('stage_3');
  });

  it('open injury past review → pressure_injury_reassessment_overdue', () => {
    const s = route.buildSummary(BID, { injuries: [{ status: 'monitoring', stage: 'stage_1', origin: 'community_acquired', nextReviewDue: PAST }] });
    expect(s.flags).toContain('pressure_injury_reassessment_overdue');
  });
});

describe('W1040 buildSummary — sleep / mobility / driving / seizures', () => {
  it('severe sleep + OSA → two flags', () => {
    const s = route.buildSummary(BID, { sleep: { problemSeverity: 'severe', suspectedOSA: true, status: 'finalized', nextReviewDue: FUTURE } });
    expect(s.flags).toContain('severe_sleep_disturbance');
    expect(s.flags).toContain('suspected_sleep_apnea');
  });

  it('dependent mobility → mobility_dependent', () => {
    const s = route.buildSummary(BID, { om: { independenceLevel: 'dependent', status: 'finalized', nextReviewDue: FUTURE } });
    expect(s.flags).toContain('mobility_dependent');
  });

  it('not_fit_currently driving → not_fit_to_drive', () => {
    const s = route.buildSummary(BID, { driving: { recommendation: 'not_fit_currently', status: 'finalized', nextReviewDue: FUTURE } });
    expect(s.flags).toContain('not_fit_to_drive');
  });

  it('≥3 seizures in 30d → frequent_seizures', () => {
    const s = route.buildSummary(BID, { seizure30dCount: 4 });
    expect(s.flags).toContain('frequent_seizures');
    expect(s.seizure.last30dCount).toBe(4);
  });

  it('1 seizure → recorded but no frequent flag', () => {
    const s = route.buildSummary(BID, { seizure30dCount: 1 });
    expect(s.seizure.last30dCount).toBe(1);
    expect(s.flags).not.toContain('frequent_seizures');
  });
});

describe('W1040 buildSummary — flagCount aggregates across modules', () => {
  it('multiple modules sum their flags', () => {
    const s = route.buildSummary(BID, {
      falls: { riskLevel: 'high', status: 'finalized', nextReviewDue: FUTURE },
      sleep: { problemSeverity: 'severe', suspectedOSA: false, status: 'finalized', nextReviewDue: FUTURE },
      injuries: [{ status: 'active', stage: 'stage_4', origin: 'facility_acquired' }],
    });
    // falls_high_risk + severe_sleep + open_injury + stage3plus + hapi = 5
    expect(s.flagCount).toBe(5);
    expect(s.hasActiveFlag).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Static drift guard — endpoints + branch-scope + read-only + mount
// ═══════════════════════════════════════════════════════════════════════

describe('W1040 route — endpoint surface', () => {
  it('GET /by-beneficiary/:id', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/by-beneficiary\/:id['"]/);
  });
  it('GET /alerts', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/alerts['"]/);
  });
  it('GET /stats', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/stats['"]/);
  });

  it('authenticates + branch-scopes', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(authenticateToken\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(requireBranchAccess\)/);
    const branchFilterUses = ROUTES_SRC.match(/branchFilter\(req\)/g) || [];
    expect(branchFilterUses.length).toBeGreaterThanOrEqual(5);
  });

  it('is READ-ONLY — no write/mutation operations', () => {
    expect(ROUTES_SRC).not.toMatch(/router\.(post|put|patch|delete)\(/);
    expect(ROUTES_SRC).not.toMatch(/\.(create|save|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate|findOneAndDelete|findByIdAndUpdate|findByIdAndDelete)\(/);
  });

  it('only GET handlers are declared', () => {
    const gets = ROUTES_SRC.match(/router\.get\(/g) || [];
    expect(gets.length).toBe(3);
  });
});

describe('W1040 features.registry.js mount', () => {
  it("loads via safeRequire('../routes/clinical-safety-summary.routes')", () => {
    expect(REGISTRY_SRC).toMatch(
      /clinicalSafetySummaryRoutes\s*=\s*safeRequire\(['"]\.\.\/routes\/clinical-safety-summary\.routes['"]\)/
    );
  });

  it('mounts at /clinical-safety-summary via dualMountAuth', () => {
    expect(REGISTRY_SRC).toMatch(
      /dualMountAuth\(\s*app\s*,\s*['"]clinical-safety-summary['"]\s*,\s*clinicalSafetySummaryRoutes\s*,\s*authenticate\s*\)/
    );
  });

  it('wave comment cites W1040 + Arabic label', () => {
    expect(REGISTRY_SRC).toMatch(/Wave 1040/);
    expect(REGISTRY_SRC).toMatch(/ملخّص السلامة السريرية/);
  });
});
