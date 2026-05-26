'use strict';

/**
 * no-unprotected-beneficiary-param-wave440.test.js — Wave 440.
 *
 * Drift guard preventing regression of the cross-branch PHI-leak bug
 * class closed by W269 → W440. Any route file that uses
 * `req.params.beneficiaryId` MUST employ at least one of three
 * enforcement layers:
 *
 *   1. `branchScopedBeneficiaryParam` from middleware/assertBranchMatch.js
 *      via `router.param('beneficiaryId', branchScopedBeneficiaryParam)`
 *      (the W440 single-line auto-enforcement pattern)
 *
 *   2. `branchFilter(req)` from middleware/branchScope.middleware.js
 *      injected into all queries (Layer A — the goalProgress /
 *      standardizedAssessments pattern)
 *
 *   3. Caseload guard pattern (therapist-portal style — STRONGER than
 *      branch isolation): `Appointment.countDocuments({therapist,
 *      beneficiary, date: >= 12-months-ago}) → 403`
 *
 *   4. Explicit per-callsite `enforceBeneficiaryBranch(req,
 *      beneficiaryId)` or `assertBranchMatch(req, doc.branchId, ...)`.
 *
 * Why this guard is load-bearing:
 *   - The W269 audit found 17 routes with 78 `req.params.beneficiaryId`
 *     usages and ZERO branch enforcement on any of them. That's a
 *     cross-branch PHI leak class (any authenticated user can read
 *     any beneficiary's PHI by knowing the ObjectId).
 *   - W440 closed all 17 via the `router.param` auto-enforcement.
 *   - This guard ratchets the win: any future PR that adds a new
 *     `req.params.beneficiaryId` lookup without one of the four
 *     enforcement signals will fail CI before merge.
 *
 * Implementation: parse `routes/**\/*.js`, strip comments, then for
 * each file:
 *   - Count `req.params.beneficiaryId` mentions (active code only)
 *   - If > 0 and the file does NOT match any of the 4 enforcement
 *     signals, FAIL the test with the file name and the missing
 *     signal types.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REPO_BACKEND = path.resolve(__dirname, '..');

// Strip JS comments (block + line) so docstring mentions of the
// anti-pattern don't trip the guard.
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n\r]*/g, '');
}

// Signals that indicate the file has branch enforcement on its
// beneficiary-keyed routes.
const ENFORCEMENT_SIGNALS = [
  // Layer A — branchFilter from branchScope.middleware
  { name: 'branchFilter (Layer A)', regex: /\bbranchFilter\s*\(\s*req\s*\)/ },
  // Layer B — assertBranchMatch helper family
  { name: 'enforceBeneficiaryBranch', regex: /\benforceBeneficiaryBranch\b/ },
  { name: 'assertBranchMatch', regex: /\bassertBranchMatch\b/ },
  { name: 'branchScopedBeneficiaryParam', regex: /\bbranchScopedBeneficiaryParam\b/ },
  // W441 — body-keyed enforcement middleware
  { name: 'bodyScopedBeneficiaryGuard', regex: /\bbodyScopedBeneficiaryGuard\b/ },
  // Caseload guard pattern — Appointment.countDocuments with therapist
  // + beneficiary scoping
  {
    name: 'caseload guard (Appointment count)',
    regex: /Appointment\([^\)]*\)\.countDocuments\s*\(\s*\{[^}]*\btherapist\b[^}]*\bbeneficiary\b/m,
  },
  // Alternative caseload signal — _ownsCaseloadItem helper used in
  // therapist-portal mutations
  { name: '_ownsCaseloadItem (caseload helper)', regex: /\b_ownsCaseloadItem\s*\(/ },
];

// Files explicitly exempted from the check. Each entry MUST have a
// recorded reason — adding to this list is a security-review decision.
const EXEMPT_PATHS = new Set([
  // Test helper / not a route — accidental match in fixture data
  // (none currently)
]);

// W442-specific exemptions for the FK-singular / snake-case body
// patterns. Each entry MUST document why the route is safe.
const W442_EXEMPT_PATHS = new Set([
  // (none currently — every flagged file now applies bodyScopedBeneficiaryGuard,
  //  even when the field is a context object: the guard ObjectId-shape-checks
  //  before enforcing, so applying it is harmless AND future-proofs the route.)
]);

describe('W440/W441 — req.params + req.body beneficiaryId enforcement drift guard', () => {
  test('every route file using req.params.beneficiaryId enforces branch isolation', () => {
    const files = glob.sync('routes/**/*.js', { cwd: REPO_BACKEND, nodir: true });
    const offenders = [];

    for (const rel of files) {
      const norm = rel.replace(/\\/g, '/');
      if (EXEMPT_PATHS.has(norm)) continue;

      const abs = path.join(REPO_BACKEND, rel);
      const src = fs.readFileSync(abs, 'utf8');
      const stripped = stripJsComments(src);

      const usages = stripped.match(/\breq\.params\.beneficiaryId\b/g);
      if (!usages || usages.length === 0) continue;

      // File uses :beneficiaryId — must have at least one enforcement signal.
      const present = ENFORCEMENT_SIGNALS.filter(s => s.regex.test(stripped)).map(s => s.name);
      if (present.length === 0) {
        offenders.push({
          file: norm,
          uses: usages.length,
          signals: 'NONE',
        });
      }
    }

    if (offenders.length > 0) {
      const lines = offenders
        .map(
          o =>
            `  - ${o.file} (${o.uses} req.params.beneficiaryId usage${
              o.uses === 1 ? '' : 's'
            }, ${o.signals})`
        )
        .join('\n');
      throw new Error(
        `W440: ${offenders.length} route file(s) use req.params.beneficiaryId WITHOUT branch enforcement.\n` +
          "Either add `router.param('beneficiaryId', branchScopedBeneficiaryParam)` from\n" +
          'middleware/assertBranchMatch.js (recommended), OR use branchFilter(req) in queries,\n' +
          'OR apply the caseload-guard pattern (Appointment.countDocuments + therapist + beneficiary).\n' +
          'Affected files:\n' +
          lines
      );
    }
    expect(offenders).toEqual([]);
  });

  test('W441: every route file using req.body.beneficiaryId enforces branch isolation', () => {
    const files = glob.sync('routes/**/*.js', { cwd: REPO_BACKEND, nodir: true });
    const offenders = [];

    for (const rel of files) {
      const norm = rel.replace(/\\/g, '/');
      if (EXEMPT_PATHS.has(norm)) continue;

      const abs = path.join(REPO_BACKEND, rel);
      const src = fs.readFileSync(abs, 'utf8');
      const stripped = stripJsComments(src);

      // Match either `req.body.beneficiaryId` or a destructured
      // `const { beneficiaryId } = req.body` (followed by usage).
      const bodyUsages =
        (stripped.match(/\breq\.body\.beneficiaryId\b/g) || []).length +
        (stripped.match(/\{\s*[^}]*\bbeneficiaryId\b[^}]*\}\s*=\s*req\.body\b/g) || []).length;
      if (bodyUsages === 0) continue;

      const present = ENFORCEMENT_SIGNALS.filter(s => s.regex.test(stripped)).map(s => s.name);
      if (present.length === 0) {
        offenders.push({
          file: norm,
          uses: bodyUsages,
          signals: 'NONE',
        });
      }
    }

    if (offenders.length > 0) {
      const lines = offenders
        .map(
          o =>
            `  - ${o.file} (${o.uses} req.body.beneficiaryId usage${
              o.uses === 1 ? '' : 's'
            }, ${o.signals})`
        )
        .join('\n');
      throw new Error(
        `W441: ${offenders.length} route file(s) accept beneficiaryId in body WITHOUT branch enforcement.\n` +
          'Add `router.use(bodyScopedBeneficiaryGuard)` from middleware/assertBranchMatch.js\n' +
          '(must be AFTER `router.use(requireBranchAccess)` so req.branchScope is populated).\n' +
          'Affected files:\n' +
          lines
      );
    }
    expect(offenders).toEqual([]);
  });

  test('W442: every route file using req.body.beneficiary (FK singular) or req.body.beneficiary_id (snake_case) enforces branch isolation', () => {
    const files = glob.sync('routes/**/*.js', { cwd: REPO_BACKEND, nodir: true });
    const offenders = [];

    for (const rel of files) {
      const norm = rel.replace(/\\/g, '/');
      if (W442_EXEMPT_PATHS.has(norm)) continue;
      if (EXEMPT_PATHS.has(norm)) continue;

      const abs = path.join(REPO_BACKEND, rel);
      const src = fs.readFileSync(abs, 'utf8');
      const stripped = stripJsComments(src);

      // W442 covers 4 patterns:
      //   1. `req.body.beneficiary`        — FK singular access
      //   2. `req.body.beneficiary_id`     — snake_case FK access
      //   3. `const { beneficiary } = req.body`     — destructured singular
      //   4. `const { beneficiary_id } = req.body`  — destructured snake
      // The negative-lookahead `(?!Id\b)` on the first match prevents
      // double-counting `req.body.beneficiaryId` (already handled by W441).
      const bodyUsages =
        (stripped.match(/\breq\.body\.beneficiary(?!Id\b|_id\b|\w)/g) || []).length +
        (stripped.match(/\breq\.body\.beneficiary_id\b/g) || []).length +
        (stripped.match(/\{\s*[^}]*\bbeneficiary\b(?!Id)[^}]*\}\s*=\s*req\.body\b/g) || []).length +
        (stripped.match(/\{\s*[^}]*\bbeneficiary_id\b[^}]*\}\s*=\s*req\.body\b/g) || []).length;
      if (bodyUsages === 0) continue;

      const present = ENFORCEMENT_SIGNALS.filter(s => s.regex.test(stripped)).map(s => s.name);
      if (present.length === 0) {
        offenders.push({
          file: norm,
          uses: bodyUsages,
          signals: 'NONE',
        });
      }
    }

    if (offenders.length > 0) {
      const lines = offenders
        .map(
          o =>
            `  - ${o.file} (${o.uses} req.body.beneficiary{,_id} usage${
              o.uses === 1 ? '' : 's'
            }, ${o.signals})`
        )
        .join('\n');
      throw new Error(
        `W442: ${offenders.length} route file(s) accept beneficiary FK in body WITHOUT branch enforcement.\n` +
          'Add `router.use(bodyScopedBeneficiaryGuard)` from middleware/assertBranchMatch.js.\n' +
          'The guard auto-detects all 3 canonical FK field names\n' +
          '(beneficiaryId, beneficiary, beneficiary_id) and ObjectId-shape-checks before enforcing.\n' +
          'Place AFTER `router.use(requireBranchAccess)` so req.branchScope is populated.\n' +
          'If the field is a context object (not an FK), the guard auto-skips by ObjectId regex —\n' +
          'still apply the guard to satisfy this drift check + future-proof the route.\n' +
          'Affected files:\n' +
          lines
      );
    }
    expect(offenders).toEqual([]);
  });

  test('sanity: the comment-stripper preserves real code while removing comments', () => {
    const sample = `
      // req.params.beneficiaryId in comment — stripped
      /* block: req.params.beneficiaryId — also stripped */
      const id = req.params.beneficiaryId;  // real use — caught
    `;
    const stripped = stripJsComments(sample);
    const matches = stripped.match(/\breq\.params\.beneficiaryId\b/g);
    expect(matches).toHaveLength(1);
  });

  test('helper export surface includes branchScopedBeneficiaryParam', () => {
    const helper = require('../middleware/assertBranchMatch');
    expect(typeof helper.branchScopedBeneficiaryParam).toBe('function');
    expect(helper.branchScopedBeneficiaryParam.length).toBeGreaterThanOrEqual(4);
  });

  test('integration: branchScopedBeneficiaryParam denies cross-branch by 403', async () => {
    const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
    const mongoose = require('mongoose');

    // Spy mongoose.model so the helper resolves a fake Beneficiary
    // (matches the W269 test pattern).
    const originalModel = mongoose.model.bind(mongoose);
    const beneficiaryModel = {
      findById: jest.fn(() => ({
        select: () => ({ lean: () => Promise.resolve({ _id: 'b1', branchId: 'branch-B' }) }),
      })),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      return originalModel(name);
    });

    try {
      const req = {
        branchScope: { restricted: true, branchId: 'branch-A' },
      };
      const res = {
        _status: null,
        _body: null,
        status(s) {
          this._status = s;
          return this;
        },
        json(b) {
          this._body = b;
          return this;
        },
      };
      const next = jest.fn();
      await branchScopedBeneficiaryParam(req, res, next, 'b1');

      expect(res._status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  test('integration: branchScopedBeneficiaryParam is no-op for cross-branch role', async () => {
    const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
    const req = { branchScope: { restricted: false, branchId: null } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    await branchScopedBeneficiaryParam(req, res, next, 'b1');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('integration: branchScopedBeneficiaryParam is no-op when req.branchScope absent (back-compat)', async () => {
    const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    await branchScopedBeneficiaryParam(req, res, next, 'b1');
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
