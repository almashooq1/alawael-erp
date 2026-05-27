/**
 * W503 — close authentication bypass via X-User-Id header trust.
 *
 * Pattern found in 14 domain route files (workflow / tele-rehab /
 * goals / field-training / research / reports / family / quality /
 * programs / group-therapy / dashboards / ar-vr / ai-recommendations /
 * behavior):
 *
 *   function getUserId(req) {
 *     return req.user?._id || req.user?.id || req.headers['x-user-id'];
 *   }
 *
 * Even after W502 wrapped these mounts with `authenticate` middleware
 * (so req.user is now reliably populated on every request), the
 * header fallback opened a CLASSIC IMPERSONATION attack:
 *
 *   - An authenticated user could set `X-User-Id: <victim-id>` and
 *     have every audit-trail / createdBy / modifiedBy / actor field
 *     record the VICTIM as the actor — letting the attacker frame
 *     someone else for sensitive operations.
 *
 *   - Routes that filter "my data" by `getUserId(req)` (e.g. "my
 *     therapy goals", "my dashboards") would leak another user's
 *     data on a simple `X-User-Id: <other>` swap.
 *
 *   - Authorization decisions downstream (governance.hasPermission)
 *     would consult the WRONG user's roles/permissions on the same
 *     swap — privilege escalation if the spoofed ID belongs to a
 *     higher-privilege user.
 *
 * The fallback was leftover from the pre-W502 era when these mounts
 * had no authenticate middleware at all — the header was a dev/test
 * convenience that hardened into a production attack vector after
 * the auth-wrap landed.
 *
 * Fix: replace the header fallback with `null` so that any caller
 * lacking req.user gets a null actor (downstream code handles null
 * by returning 401/400 as appropriate, never by trusting a header).
 *
 *   - return req.user?._id || req.user?.id || req.headers['x-user-id'];
 *   + return req.user?._id || req.user?.id || null;
 *
 * This drift guard asserts NO source file under backend/domains/ or
 * backend/routes/ references `headers['x-user-id']` or
 * `headers["x-user-id"]` again. Adding it back fails CI.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function walkJs(root, results = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '_archived' || entry.name === 'node_modules' || entry.name === '__tests__') {
      continue;
    }
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkJs(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

describe('W503 — no X-User-Id header trust anywhere in routes/domains', () => {
  const BACKEND = path.join(__dirname, '..');
  const SCAN_ROOTS = [path.join(BACKEND, 'domains'), path.join(BACKEND, 'routes')];

  const offenders = [];
  for (const root of SCAN_ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const file of walkJs(root)) {
      const src = fs.readFileSync(file, 'utf8');
      // Match both single- and double-quoted forms
      if (/headers\[['"]x-user-id['"]\]/i.test(src)) {
        offenders.push(path.relative(BACKEND, file));
      }
    }
  }

  test('no source file trusts X-User-Id header (impersonation bypass)', () => {
    expect(offenders).toEqual([]);
  });

  test('14 W503-affected files exist and lack the bypass', () => {
    const w503Files = [
      'domains/workflow/routes/workflow.routes.js',
      'domains/tele-rehab/routes/tele-rehab.routes.js',
      'domains/goals/routes/measures.routes.js',
      'domains/field-training/routes/field-training.routes.js',
      'domains/research/routes/research.routes.js',
      'domains/reports/routes/reports.routes.js',
      'domains/family/routes/family.routes.js',
      'domains/quality/routes/quality.routes.js',
      'domains/programs/routes/programs.routes.js',
      'domains/group-therapy/routes/group-therapy.routes.js',
      'domains/dashboards/routes/dashboards.routes.js',
      'domains/ar-vr/routes/ar-vr.routes.js',
      'domains/ai-recommendations/routes/recommendations.routes.js',
      'domains/behavior/routes/behavior.routes.js',
    ];

    for (const rel of w503Files) {
      const full = path.join(BACKEND, rel);
      expect(fs.existsSync(full)).toBe(true);
      const src = fs.readFileSync(full, 'utf8');
      expect(src).not.toMatch(/headers\[['"]x-user-id['"]\]/i);
      // Sanity: the getUserId helper is still present (we didn't delete it,
      // just stripped its header fallback).
      expect(src).toMatch(/req\.user\?\._id\s*\|\|\s*req\.user\?\.id/);
    }
  });
});
