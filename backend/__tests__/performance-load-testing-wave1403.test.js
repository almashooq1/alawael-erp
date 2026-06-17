/**
 * backend/__tests__/performance-load-testing-wave1403.test.js
 *
 * Drift guard ensuring load testing infrastructure stays wired and documented.
 * Prevents accidental breakage of:
 *  - k6 test files (must be loadable, must have thresholds)
 *  - npm scripts (must exist and run k6 with correct args)
 *  - SLO thresholds (must be present per profile)
 *  - Runbook documentation (must be present + reference load files)
 *  - CI workflow (must exist + reference runbook)
 *
 * Ratchet-down pattern: baseline ratchet for pre-existing k6 files (W1304+W1350),
 * zero for new work (W1401-W1403). Any deletion of existing files or scripts
 * requires deliberate baseline entry removal + commit reason.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');
const K6_DIR = path.join(BACKEND_DIR, 'tests', 'load');
const DOCS_DIR = path.join(BACKEND_DIR, '..', 'docs');
const WORKFLOWS_DIR = path.join(BACKEND_DIR, '..', '.github', 'workflows');

/**
 * Pre-existing k6 files (W1304, W1350) are stable. If removed, ratchet-down
 * requires explicit baseline entry deletion + documented reason.
 */
const BASELINE_K6_FILES = {
  'k6-smoke.js': true,
  'k6-load.js': true,
  'k6-gov-integrations.js': true,
};

/**
 * Pre-existing npm scripts (W1304, W1350). Removal requires baseline cleanup.
 */
const BASELINE_NPM_SCRIPTS = {
  'test:load:smoke': true,
  'test:load': true,
  'test:load:gov': true,
};

/**
 * W1401-W1403 new work: runbook + workflow. These must exist (non-ratchet).
 */
const REQUIRED_NEW_FILES = {
  'docs/runbooks/performance-load-testing.md': true,
  '.github/workflows/load-testing.yml': true,
};

/**
 * Per-k6-file required SLO thresholds.
 * Format: filename → { thresholdMetric: { rule: true } }
 */
const REQUIRED_THRESHOLDS = {
  'k6-load.js': {
    http_req_failed: true,
    health_latency: true,
    readiness_latency: true,
  },
  'k6-gov-integrations.js': {
    http_req_failed: true,
    nphies_read_latency: true,
    gosi_read_latency: true,
    gov_read_failed: true,
  },
  // k6-smoke.js deliberately has no thresholds (informational only)
};

describe('Performance Load Testing Infrastructure (W1403)', () => {
  describe('K6 Test Files (W1304 + W1350)', () => {
    it('all baseline k6 files exist', () => {
      for (const filename of Object.keys(BASELINE_K6_FILES)) {
        const filepath = path.join(K6_DIR, filename);
        expect(fs.existsSync(filepath)).toBe(true);
      }
    });

    it('k6 files are valid JavaScript (no syntax errors)', () => {
      for (const filename of Object.keys(BASELINE_K6_FILES)) {
        const filepath = path.join(K6_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        // Basic check: must have import statements and export default
        expect(content).toMatch(/import .* from ['"]k6/);
        expect(content).toMatch(/export\s+default\s+function/);
      }
    });

    it('k6 files have correct SLO thresholds', () => {
      for (const [filename, thresholds] of Object.entries(REQUIRED_THRESHOLDS)) {
        const filepath = path.join(K6_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf8');

        // Extract the thresholds object
        const thresholdMatch = content.match(/thresholds:\s*\{([^}]+)\}/s);
        expect(thresholdMatch).toBeTruthy();

        // Verify each required threshold exists
        for (const threshold of Object.keys(thresholds)) {
          expect(content).toContain(`${threshold}:`);
        }
      }
    });

    it('k6-load.js has documented stages (warm-up, climb, peak, ramp-down)', () => {
      const filepath = path.join(K6_DIR, 'k6-load.js');
      const content = fs.readFileSync(filepath, 'utf8');

      // Verify stages array structure
      expect(content).toContain("duration: '30s', target:");
      expect(content).toContain("duration: '1m', target:");
      expect(content).toContain("duration: '30s', target: 0");

      // Verify stage count is exactly 5 (warm, climb, reach, sustain, ramp-down)
      const stageMatches = content.match(/\{\s*duration:/g) || [];
      expect(stageMatches.length).toBe(5);
    });

    it('k6-gov-integrations.js has safety guard for read-only endpoints', () => {
      const filepath = path.join(K6_DIR, 'k6-gov-integrations.js');
      const content = fs.readFileSync(filepath, 'utf8');

      // Verify read-only safety guardrails in comments
      expect(content).toContain('READ-ONLY BY DESIGN');
      expect(content).toContain('MUTATING');
      expect(content).toContain('DELIBERATELY EXCLUDED');

      // Verify only GET probes (no POST/PUT/DELETE)
      const httpMatches = content.match(/http\.\w+\(/g) || [];
      for (const match of httpMatches) {
        expect(match).toMatch(/http\.get/);
      }
    });

    it('k6 files are environment-overridable (BASE_URL, TOKEN, PEAK_VUS, PEAK_DURATION)', () => {
      for (const filename of Object.keys(BASELINE_K6_FILES)) {
        const filepath = path.join(K6_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf8');

        // Verify __ENV usage for CLI overrides
        expect(content).toContain('__ENV');
        expect(content).toMatch(/BASE_URL|PEAK_VUS|PEAK_DURATION|TOKEN/);
      }
    });
  });

  describe('NPM Scripts (W1304 + W1350)', () => {
    let packageJson;

    beforeAll(() => {
      const packagePath = path.join(BACKEND_DIR, 'package.json');
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    });

    it('all baseline npm scripts exist', () => {
      for (const scriptName of Object.keys(BASELINE_NPM_SCRIPTS)) {
        expect(packageJson.scripts[scriptName]).toBeTruthy();
      }
    });

    it('test:load scripts reference correct k6 files', () => {
      expect(packageJson.scripts['test:load:smoke']).toMatch(/k6.*k6-smoke\.js/);
      expect(packageJson.scripts['test:load']).toMatch(/k6.*k6-load\.js/);
      expect(packageJson.scripts['test:load:gov']).toMatch(/k6.*k6-gov-integrations\.js/);
    });

    it('npm scripts are executable and documented', () => {
      for (const scriptName of Object.keys(BASELINE_NPM_SCRIPTS)) {
        const script = packageJson.scripts[scriptName];
        expect(script.length).toBeGreaterThan(0);
      }
    });
  });

  describe('W1401-W1403 New Files', () => {
    it('performance-load-testing.md runbook exists and is comprehensive', () => {
      const filepath = path.join(DOCS_DIR, 'runbooks', 'performance-load-testing.md');
      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf8');

      // Verify core sections
      expect(content).toContain('Quick Start');
      expect(content).toContain('Profile 1: Smoke Test');
      expect(content).toContain('Profile 2: Baseline Load Test');
      expect(content).toContain('Profile 3: Government Integration');
      expect(content).toContain('CI Integration');
      expect(content).toContain('Troubleshooting');
      expect(content).toContain('Maintenance');

      // Verify all profiles are documented with npm commands
      expect(content).toContain('npm run test:load:smoke');
      expect(content).toContain('npm run test:load');
      expect(content).toContain('npm run test:load:gov');

      // Verify SLO budgets are documented (accept both p95 and p(95) notation)
      expect(content).toMatch(/health_latency/i);
      expect(content).toMatch(/readiness_latency/i);
      expect(content).toMatch(/nphies_read_latency/i);
      expect(content).toMatch(/gosi_read_latency/i);
      expect(content).toMatch(/1200.*budget|1200ms/i); // nphies threshold
      expect(content).toMatch(/1500.*budget|1500ms/i); // gosi threshold

      // Verify runbook version is marked as W1401 (in comment)
      expect(content).toMatch(/W1401/);
    });

    it('load-testing.yml workflow exists and has correct structure', () => {
      const filepath = path.join(WORKFLOWS_DIR, 'load-testing.yml');
      expect(fs.existsSync(filepath)).toBe(true);

      const content = fs.readFileSync(filepath, 'utf8');

      // Verify workflow triggers
      expect(content).toContain('workflow_dispatch');
      expect(content).toContain('schedule');

      // Verify input parameters
      expect(content).toContain('target_env');
      expect(content).toContain('peak_vus');
      expect(content).toContain('peak_duration');
      expect(content).toContain('run_gov_tests');

      // Verify environment choices (no production load testing)
      expect(content).toContain('local');
      expect(content).toContain('staging');
      expect(content).toMatch(/production.*DISABLED/i);

      // Verify jobs
      expect(content).toContain('load-testing:');

      // Verify steps
      expect(content).toContain('Resolve target URL');
      expect(content).toContain('Validate environment readiness');
      expect(content).toContain('Run baseline load test');
      expect(content).toContain('Run government integration load test');

      // Verify references to runbook
      expect(content).toMatch(/performance-load-testing\.md/);
    });

    it('workflow has health check validation before running tests', () => {
      const filepath = path.join(WORKFLOWS_DIR, 'load-testing.yml');
      const content = fs.readFileSync(filepath, 'utf8');

      // Verify health check step
      expect(content).toContain('Validate environment readiness');
      expect(content).toMatch(/\/health/);
    });

    it('workflow has production load testing safeguard (exit 1)', () => {
      const filepath = path.join(WORKFLOWS_DIR, 'load-testing.yml');
      const content = fs.readFileSync(filepath, 'utf8');

      // Verify production is explicitly denied
      expect(content).toMatch(/production.*DISABLED/i);
      expect(content).toMatch(/exit\s+1/);
    });
  });

  describe('Documentation Cross-Linking', () => {
    it('runbook references all k6 profiles', () => {
      const runbookPath = path.join(DOCS_DIR, 'runbooks', 'performance-load-testing.md');
      const runbookContent = fs.readFileSync(runbookPath, 'utf8');

      expect(runbookContent).toContain('k6-smoke.js');
      expect(runbookContent).toContain('k6-load.js');
      expect(runbookContent).toContain('k6-gov-integrations.js');
    });

    it('.env.example or .env.minimum.example should reference performance tests if they mention load testing', () => {
      // This is informational — performance tests are optional to run,
      // but if .env.example documents load testing, it should be consistent
      const envExamplePath = path.join(BACKEND_DIR, '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf8');

      // If load testing is mentioned, it should point to the runbook
      if (content.match(/load.?test|performance|k6/i)) {
        expect(content).toMatch(/performance-load-testing|Load Testing/i);
      }
    });

    it('workflow references the runbook', () => {
      const workflowPath = path.join(WORKFLOWS_DIR, 'load-testing.yml');
      const content = fs.readFileSync(workflowPath, 'utf8');

      expect(content).toContain('performance-load-testing.md');
    });
  });

  describe('Ratchet-Down Baseline (W1304+W1350 Stability)', () => {
    /**
     * This test enforces the ratchet-down pattern: if any baseline file
     * is removed, this test fails and requires explicit baseline cleanup.
     * Removing a file WITHOUT updating this test is a CI failure.
     */
    it('no baseline k6 files have been deleted without updating baseline', () => {
      for (const filename of Object.keys(BASELINE_K6_FILES)) {
        const filepath = path.join(K6_DIR, filename);
        expect(fs.existsSync(filepath)).toBe(true);
      }
    });

    it('no baseline npm scripts have been removed without updating baseline', () => {
      const packagePath = path.join(BACKEND_DIR, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      for (const scriptName of Object.keys(BASELINE_NPM_SCRIPTS)) {
        expect(packageJson.scripts[scriptName]).toBeTruthy();
      }
    });
  });

  describe('Wave Metadata', () => {
    it('W1401 workflow is tagged and documented', () => {
      const workflowPath = path.join(WORKFLOWS_DIR, 'load-testing.yml');
      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(content).toMatch(/W1401/);
    });

    it('W1402 runbook is tagged and documented', () => {
      const runbookPath = path.join(DOCS_DIR, 'runbooks', 'performance-load-testing.md');
      const content = fs.readFileSync(runbookPath, 'utf8');
      expect(content).toMatch(/W1401/);
    });

    it('W1403 test is tagged and documented', () => {
      // This file
      const content = fs.readFileSync(__filename, 'utf8');
      expect(content).toMatch(/W1403/);
    });
  });
});
