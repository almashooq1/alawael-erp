/**
 * W443 — cross-tenant IDOR closure on assistive-device.routes.js.
 *
 * Pre-W443 the AssistiveDevice model carried `branchId` but the
 * routes filtered only optionally (when ?branchId= was passed) and
 * every instance load was a bare `Device.findById(req.params.id)` —
 * zero branch check. A clinician scoped to branch A could:
 *
 *   - LIST all devices in every branch (omit ?branchId)
 *   - READ a specific device in branch B if they knew its ObjectId
 *   - PATCH metadata on a branch-B device
 *   - RETIRE a branch-B device
 *   - DELETE a branch-B device
 *   - LOAN / APPROVE / CHECK-OUT / RETURN / MARK-LOST / MARK-DAMAGED
 *     / CANCEL a loan on a branch-B device
 *   - Run any of the 3 maintenance flows on a branch-B device
 *
 * Fix — single middleware + filter pattern:
 *   (1) router.use(requireBranchAccess) populates req.branchScope
 *   (2) every list filter is built as { ...branchFilter(req), ... }
 *       which adds `branchId: <user's branch>` for scoped users and
 *       `{}` for unrestricted admin/super_admin
 *   (3) every instance load becomes
 *       Device.findOne({ _id: req.params.id, ...branchFilter(req) })
 *       or Device.findOneAndDelete with the same filter — cross-tenant
 *       ID returns null → 404, never modifies the wrong row
 *
 * Static drift guard so no future PATCH can reintroduce a bare
 * `findById(req.params.id)` or omit branchFilter from the list filters.
 */

const fs = require('fs');
const path = require('path');

describe('W443 — assistive-device branch-scope enforcement', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'assistive-device.routes.js'),
    'utf8'
  );

  test('imports branchFilter + requireBranchAccess from branchScope.middleware', () => {
    expect(src).toMatch(/requireBranchAccess/);
    expect(src).toMatch(/branchFilter/);
    expect(src).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
  });

  test('router.use(requireBranchAccess) is wired', () => {
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('NO bare Device.findById(req.params.id) remains', () => {
    // The pre-W443 anti-pattern. The replacement is
    // Device.findOne({ _id: req.params.id, ...branchFilter(req) }).
    expect(src).not.toMatch(/Device\.findById\(req\.params\.id\)/);
  });

  test('NO bare Device.findByIdAndDelete(req.params.id) remains', () => {
    expect(src).not.toMatch(/Device\.findByIdAndDelete\(req\.params\.id\)/);
  });

  test('every Device.findOne instance load includes branchFilter(req)', () => {
    // Count Device.findOne occurrences and verify each one carries
    // the branchFilter spread.
    const findOneMatches = src.match(/Device\.findOne\([^)]+\)/g) || [];
    expect(findOneMatches.length).toBeGreaterThan(0);
    for (const m of findOneMatches) {
      expect(m).toMatch(/branchFilter\(req\)/);
    }
  });

  test('Device.findOneAndDelete includes branchFilter(req)', () => {
    const deleteMatch = src.match(/Device\.findOneAndDelete\([\s\S]+?\)/);
    expect(deleteMatch).toBeTruthy();
    expect(deleteMatch[0]).toMatch(/branchFilter\(req\)/);
  });

  test('every Device.find(filter) list query has branchFilter merged into filter', () => {
    // For each `Device.find(filter)` capture the local name then walk
    // backward to the *enclosing* route handler start (the most recent
    // `router.(get|post|put|patch|delete)`) and assert the local was
    // declared as `const <name> = { ...branchFilter(req), ... }` in
    // that handler. The lookback is bounded by the route start so we
    // don't accidentally credit branchFilter from a different route.
    const findCalls = [...src.matchAll(/Device\.find\((\w+)\)/g)];
    expect(findCalls.length).toBeGreaterThan(0);
    for (const m of findCalls) {
      const localName = m[1];
      const callStart = m.index;
      // find the enclosing router.METHOD(... start
      const routeStartRe = /router\.(get|post|put|patch|delete)\(/g;
      let lastRouteStart = 0;
      let rm;
      const head = src.slice(0, callStart);
      while ((rm = routeStartRe.exec(head)) !== null) {
        lastRouteStart = rm.index;
      }
      const block = src.slice(lastRouteStart, callStart);
      const declRe = new RegExp(
        `(?:const|let)\\s+${localName}\\s*=\\s*\\{[\\s\\S]*?branchFilter\\(req\\)`,
        'm'
      );
      expect(block).toMatch(declRe);
    }
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/assistive-device.routes')).not.toThrow();
  });
});
