'use strict';

/**
 * phantom-imports-fixes-wave1384.test.js
 *
 * W1384 generalised the W1378 launch blocker (a route destructures a name a
 * module does not export → undefined → 500 at call time) into a whole-
 * codebase audit (scripts/check-phantom-imports.js). The sweep found 8 real,
 * latent call-time 500s across 7 route files, all hidden by pre-adoption prod.
 * This locks the fixes so they cannot regress + asserts the audit stays clean.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(BACKEND, p), 'utf8');

describe('W1384 — escapeRegex imported as the default export (module.exports = fn)', () => {
  const files = [
    'routes/audit-trail-enhanced.routes.js',
    'routes/elearning-enhanced.routes.js',
    'routes/hr-module.routes.js',
    'routes/inventory-enhanced.routes.js',
  ];
  for (const f of files) {
    test(`${path.basename(f)} uses const escapeRegex = require(.../escapeRegex)`, () => {
      const src = read(f);
      expect(src).toMatch(/const escapeRegex = require\('\.\.\/utils\/escapeRegex'\)/);
      // the broken destructure form must not return
      expect(src).not.toMatch(/const \{ escapeRegex \} = require\('\.\.\/utils\/escapeRegex'\)/);
    });
  }

  test('utils/escapeRegex really is a single function export (justifies the fix)', () => {
    const mod = require('../utils/escapeRegex');
    expect(typeof mod).toBe('function');
    expect(mod.escapeRegex).toBeUndefined();
  });
});

describe('W1384 — ParentPortal exports ParentOtp (not ParentOTP)', () => {
  test('parentPortal.routes aliases the real ParentOtp export', () => {
    const src = read('routes/parentPortal.routes.js');
    expect(src).toMatch(/ParentOtp: ParentOTP/);
    expect(src).not.toMatch(/const \{ ParentOTP \} = require\('\.\.\/models\/ParentPortal'\)/);
  });

  test('models/ParentPortal exports ParentOtp, not ParentOTP', () => {
    const mod = require('../models/ParentPortal');
    expect(mod.ParentOtp).toBeDefined();
    expect(mod.ParentOTP).toBeUndefined();
  });
});

describe('W1384 — effectiveBranchScope imported from assertBranchMatch', () => {
  test('assertBranchMatch exports it; branchScope.middleware does not', () => {
    const asm = require('../middleware/assertBranchMatch');
    const bsm = require('../middleware/branchScope.middleware');
    expect(typeof asm.effectiveBranchScope).toBe('function');
    expect(bsm.effectiveBranchScope).toBeUndefined();
  });

  for (const f of ['routes/stories.routes.js', 'routes/waitlist.routes.js']) {
    test(`${path.basename(f)} imports effectiveBranchScope from assertBranchMatch`, () => {
      const src = read(f);
      expect(src).toMatch(/effectiveBranchScope.*=\s*require\('\.\.\/middleware\/assertBranchMatch'\)/s);
      // and NOT from branchScope.middleware
      const bsmBlock = src.match(/\{[^}]*\}\s*=\s*require\('\.\.\/middleware\/branchScope\.middleware'\)/s);
      if (bsmBlock) expect(bsmBlock[0]).not.toMatch(/effectiveBranchScope/);
    });
  }
});

describe('W1384 — the audit script itself stays clean', () => {
  test('check:phantom-imports reports zero phantoms (exit 0)', () => {
    // Exits non-zero on a NEW phantom; this asserts the sweep is clean.
    let exit = 0;
    try {
      execFileSync(process.execPath, [path.join(BACKEND, 'scripts/check-phantom-imports.js')], {
        cwd: BACKEND,
        stdio: 'pipe',
      });
    } catch (e) {
      exit = e.status ?? 1;
    }
    expect(exit).toBe(0);
  }, 120000);
});
