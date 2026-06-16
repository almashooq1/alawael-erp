'use strict';

/**
 * assert-beneficiary-in-scope-wave1378.test.js
 *
 * W1378 — 20 route files import `assertBeneficiaryInScope` from
 * middleware/assertBranchMatch.js, but it was never exported → every guarded
 * write path threw `assertBeneficiaryInScope is not a function` (HTTP 500),
 * silently dead until a write was exercised (pre-adoption prod hid it;
 * surfaced on the GO-LIVE episode-create walk). This locks:
 *   1. the function exists + honours the callers' (req, benId, res) → denied
 *      contract (allowed=false, cross-branch=true+writes 403, missing-res=throw);
 *   2. a DRIFT GUARD — every name destructured from assertBranchMatch in
 *      routes/ resolves to a real export (catches the next phantom import).
 */

const fs = require('fs');
const path = require('path');

const assertBranchMatch = require('../middleware/assertBranchMatch');
const { assertBeneficiaryInScope } = assertBranchMatch;

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

describe('W1378 assertBeneficiaryInScope — contract', () => {
  test('is exported as a function', () => {
    expect(typeof assertBeneficiaryInScope).toBe('function');
  });

  test('unrestricted / unscoped caller → allowed (false), no response written', async () => {
    const res = mockRes();
    const denied = await assertBeneficiaryInScope({}, 'anything', res);
    expect(denied).toBe(false);
    expect(res.statusCode).toBeNull();
  });

  test('restricted caller + missing beneficiaryId → denied (true) + 400 written', async () => {
    const req = { branchScope: { restricted: true } };
    const res = mockRes();
    const denied = await assertBeneficiaryInScope(req, null, res);
    expect(denied).toBe(true);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('without res, a denial RE-THROWS (2-arg call sites keep their try/catch)', async () => {
    const req = { branchScope: { restricted: true } };
    await expect(assertBeneficiaryInScope(req, null)).rejects.toThrow();
  });
});

describe('W1378 drift guard — every assertBranchMatch import resolves to a real export', () => {
  const exported = new Set(Object.keys(assertBranchMatch));
  const routesDir = path.join(__dirname, '..', 'routes');

  // Collect (file, names[]) for every `require('.../assertBranchMatch')` destructure.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.name.endsWith('.js')) {
        const src = fs.readFileSync(p, 'utf8');
        const m = src.match(/const\s*\{([^}]*)\}\s*=\s*require\(\s*['"][^'"]*assertBranchMatch['"]\s*\)/);
        if (!m) continue;
        const names = m[1]
          .split(',')
          .map((s) => s.trim().split(':')[0].trim())
          .filter(Boolean);
        for (const n of names) {
          if (!exported.has(n)) offenders.push(`${path.relative(routesDir, p)} → ${n}`);
        }
      }
    }
  };
  walk(routesDir);

  test('no route destructures a name assertBranchMatch does not export', () => {
    expect(offenders).toEqual([]);
  });
});
