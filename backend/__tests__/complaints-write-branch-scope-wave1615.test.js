/**
 * W1615 — complaints-enhanced write-path branch-stamp isolation (header-trust class).
 *
 * requireBranchAccess (branchScope.middleware) validates a client-supplied branchId
 * only in query / body / params — it does NOT inspect the `x-branch-id` HEADER. The
 * two complaint WRITE handlers (`POST /public-submit`, `POST /`) stamp the new
 * ComplaintV2.branchId, and `/public-submit` previously read it from
 * `req.headers['x-branch-id'] || req.body.branchId` — so an authenticated restricted
 * user could set the header and file a complaint into ANY branch, bypassing tenant
 * isolation. `POST /` used `req.body.branchId || req.user?.branchId`, where the
 * fallback is unreliable (the JWT omits branchId) → complaints stamped with no branch.
 *
 * Fix: both write stamps now lead with `effectiveBranchScope(req)` — which returns the
 * restricted caller's own branch (ignoring header/body/query) and null for cross-branch
 * roles (who may then legitimately name a branch via header/body). This is a STATIC
 * source guard (no DB) mirroring the header-trust drift-guard family.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'complaints-enhanced.routes.js'),
  'utf8'
);

// Strip line + block comments so the doc-comment above (which quotes the vulnerable
// pattern for context) can't produce false matches.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('W1615 complaints write-path branch-scope isolation', () => {
  test('imports the canonical effectiveBranchScope helper', () => {
    expect(CODE).toMatch(
      /effectiveBranchScope\s*}\s*=\s*require\(\s*['"][^'"]*assertBranchMatch['"]\s*\)/
    );
  });

  test('every write stamp of branchId leads with effectiveBranchScope(req)', () => {
    // Any assignment whose RHS starts from the request branch sources must have
    // effectiveBranchScope(req) as its FIRST term.
    const stampLines = CODE.split('\n').filter(
      l =>
        /=\s*.*(req\.headers\[['"]x-branch-id['"]\]|req\.body\.branchId|(^|[^.\w])branchId\s*\|\|)/.test(
          l
        ) && /const\s+(branchId|effectiveBranchId)\s*=/.test(l)
    );
    // There should be exactly the two write-path derivations, and both must lead
    // with effectiveBranchScope(req).
    expect(stampLines.length).toBeGreaterThanOrEqual(2);
    for (const l of stampLines) {
      expect(l).toMatch(/=\s*effectiveBranchScope\(req\)\s*\|\|/);
    }
  });

  test('the x-branch-id header is NEVER the leading branch source (anti-regression)', () => {
    // No assignment may take the header as its first source without the resolved
    // scope in front of it.
    expect(CODE).not.toMatch(/=\s*req\.headers\[['"]x-branch-id['"]\]\s*\|\|/);
  });

  test('POST / create no longer trusts body branchId ahead of the resolved scope', () => {
    expect(CODE).not.toMatch(/const\s+effectiveBranchId\s*=\s*branchId\s*\|\|\s*req\.user/);
  });
});
