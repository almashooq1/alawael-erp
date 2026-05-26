/**
 * W444 — safeguarding cross-tenant IDOR closure.
 *
 * Same pattern as W443 (assistive-device) but on the
 * SafeguardingConcern surface — which is HIGHER sensitivity:
 * concern records carry child-protection allegations, alleged-
 * perpetrator names, witness lists, and confidentiality marks.
 *
 * Pre-W444 a safeguarding_lead scoped to branch A could read or
 * modify branch B's active investigations by guessing ObjectIds.
 *
 * Static drift guard so no future PATCH can reintroduce a bare
 * `findById(req.params.id)` or omit branchFilter from list filters.
 */

const fs = require('fs');
const path = require('path');

describe('W444 — safeguarding branch-scope enforcement', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'safeguarding.routes.js'),
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

  test('NO bare Concern.findById(req.params.id) remains', () => {
    expect(src).not.toMatch(/Concern\.findById\(req\.params\.id\)/);
  });

  test('NO bare Concern.findByIdAndDelete(req.params.id) remains', () => {
    expect(src).not.toMatch(/Concern\.findByIdAndDelete\(req\.params\.id\)/);
  });

  test('every Concern.findOne instance load includes branchFilter(req)', () => {
    const matches = src.match(/Concern\.findOne\([^)]+\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
    for (const m of matches) {
      expect(m).toMatch(/branchFilter\(req\)/);
    }
  });

  test('Concern.findOneAndDelete includes branchFilter(req)', () => {
    const m = src.match(/Concern\.findOneAndDelete\([\s\S]+?\)/);
    expect(m).toBeTruthy();
    expect(m[0]).toMatch(/branchFilter\(req\)/);
  });

  test('every Concern.find list query is in a route block that uses branchFilter(req)', () => {
    // Find every `Concern.find(` (also countDocuments). For each, walk
    // back to enclosing `router.METHOD(` and forward to the next
    // `router.METHOD(` (or EOF) — assert `branchFilter(req)` appears
    // anywhere in that route block. Catches both inline-arg form
    // (`Concern.find({ ...branchFilter(req), x })`) and local-variable
    // form (`const filter = { ...branchFilter(req), x }; Concern.find(filter)`).
    const findIdxs = [];
    const re = /Concern\.(find|countDocuments)\(/g;
    let mm;
    while ((mm = re.exec(src)) !== null) findIdxs.push(mm.index);
    expect(findIdxs.length).toBeGreaterThan(0);

    const routeStartRe = /router\.(get|post|put|patch|delete)\(/g;
    const routeStarts = [];
    let rm;
    while ((rm = routeStartRe.exec(src)) !== null) routeStarts.push(rm.index);

    for (const i of findIdxs) {
      let blockStart = 0;
      let blockEnd = src.length;
      for (const rs of routeStarts) {
        if (rs <= i) blockStart = rs;
        else if (rs > i && blockEnd === src.length) {
          blockEnd = rs;
        }
      }
      const block = src.slice(blockStart, blockEnd);
      expect(block).toMatch(/branchFilter\(req\)/);
    }
  });

  test('module loads without throwing', () => {
    expect(() => require('../routes/safeguarding.routes')).not.toThrow();
  });
});
