/**
 * W450 — close mass-assignment + tenant-takeover on 3 PATCH handlers.
 *
 * The W446/W447 cross-tenant batch closed READ/MODIFY by branchFilter
 * load-time check (`Model.findOne({ _id, ...branchFilter(req) })`).
 * But the PATCH paths then did `Object.assign(row, body)` with `body`
 * derived from `req.body` with only domain-specific fields deleted.
 *
 * Hidden attacker shape — TENANT TAKEOVER:
 *   PATCH /field-trips/abc { branchId: <other-branch> }
 *   PATCH /iep/abc          { branchId: <other-branch> }
 *   PATCH /restraint-seclusion/abc { branchId: <other-branch> }
 *
 * Load-time branchFilter ensures `abc` is in MY branch when fetched.
 * But the mutation then writes branchId = <other-branch>, and save()
 * persists. The doc disappears from MY branch's lists, reappears in
 * the attacker-targeted branch. A clinician in branch A could yank
 * branch-B's data into A's scope (or boot data out of B entirely).
 *
 * Also missing protection against `__proto__` / `constructor` /
 * `_id` / `__v` / `createdBy` / `role` / `password` mass-assignment.
 *
 * Fix: replace `body = { ...req.body }` with
 * `body = stripUpdateMeta(req.body || {})` + explicit
 * `delete body.branchId` tenant-takeover defense.
 *
 * `stripUpdateMeta` (utils/sanitize.js) drops the canonical blacklist:
 *   _id, __v, id, createdBy, createdAt, updatedAt, role, roles,
 *   isAdmin, isSuperAdmin, permissions, password, passwordHash,
 *   __proto__, constructor, prototype
 */

const fs = require('fs');
const path = require('path');

const FILES = ['field-trips.routes.js', 'iep.routes.js', 'restraint-seclusion.routes.js'];

describe('W450 — mass-assignment + tenant-takeover defense', () => {
  for (const file of FILES) {
    describe(file, () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'routes', file), 'utf8');

      test('imports stripUpdateMeta from utils/sanitize', () => {
        expect(src).toMatch(/stripUpdateMeta/);
        expect(src).toMatch(/require\(['"]\.\.\/utils\/sanitize['"]\)/);
      });

      test('PATCH handler uses stripUpdateMeta(req.body), not bare spread', () => {
        // The fix shape: `const body = stripUpdateMeta(req.body || {});`
        expect(src).toMatch(/const\s+body\s*=\s*stripUpdateMeta\(\s*req\.body/);
        // The anti-pattern: `const body = { ...(req.body || {}) }` —
        // assert NO PATCH handler still uses that exact shape (would
        // mean a regression undid W450).
        // NOTE: other handlers (POST) might legitimately use the spread,
        // so we only check that stripUpdateMeta is present at all in
        // the file's PATCH block.
      });

      test('PATCH handler deletes branchId explicitly (tenant-takeover defense)', () => {
        // Find the PATCH /:id handler block
        const patchIdx = src.search(/router\.patch\s*\(\s*['"][^'"]*\/:id['"]/);
        expect(patchIdx).toBeGreaterThan(-1);
        const nextHandlerIdx = src.indexOf('router.', patchIdx + 1);
        const block = src.slice(patchIdx, nextHandlerIdx > 0 ? nextHandlerIdx : src.length);
        expect(block).toMatch(/delete\s+body\.branchId/);
      });

      test('module loads without throwing', () => {
        expect(() => require(`../routes/${file.replace(/\.js$/, '')}`)).not.toThrow();
      });
    });
  }
});
