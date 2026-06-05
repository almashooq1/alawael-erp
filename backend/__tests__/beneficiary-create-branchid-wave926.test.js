/**
 * Wave 926 — regression guard: POST /api/v1/beneficiaries must stamp the
 * creating user's branchId on the new document.
 *
 * Incident: the create handler in `routes/beneficiaries.js` built the
 * Beneficiary via `new Beneficiary({...})` but never set `branchId`. The
 * model doesn't require it and there's no tenant auto-inject plugin, so the
 * record saved with branchId=null — then vanished from the branch-scoped
 * list query (`branchFilter(req)` → { branchId: <user branch> }). Users
 * reported "registration doesn't save" (data was saved but invisible).
 *
 * Static source guard (pure-unit, no DB): asserts the create handler keeps
 * injecting branchId from `req.branchScope`. If someone deletes the line,
 * this fails and explains why.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(__dirname, '..', 'routes', 'beneficiaries.js');

describe('W926 — beneficiary create stamps branchId', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8');

  it('route file is readable and non-trivial', () => {
    expect(src.length).toBeGreaterThan(500);
  });

  it('the POST create handler injects branchId from req.branchScope', () => {
    // Isolate the POST '/' create handler body so we don't accidentally match
    // the branchId reads in GET/PUT handlers.
    const postIdx = src.indexOf("router.post('/'");
    expect(postIdx).toBeGreaterThan(-1);
    const putIdx = src.indexOf("router.put('/:id'", postIdx);
    const createBody = src.slice(postIdx, putIdx > -1 ? putIdx : undefined);

    // Must construct the doc...
    expect(createBody).toMatch(/new Beneficiary\s*\(/);
    // ...and set branchId from the authenticated branch scope.
    expect(createBody).toMatch(/branchId\s*:\s*req\.branchScope\?\.branchId/);
  });

  it('the create handler does NOT construct the doc without a branchId key', () => {
    const postIdx = src.indexOf("router.post('/'");
    const putIdx = src.indexOf("router.put('/:id'", postIdx);
    const createBody = src.slice(postIdx, putIdx > -1 ? putIdx : undefined);
    // The `new Beneficiary({...})` literal must contain a branchId property.
    const ctorMatch = createBody.match(/new Beneficiary\s*\(\s*\{([\s\S]*?)\}\s*\)/);
    expect(ctorMatch).not.toBeNull();
    expect(ctorMatch[1]).toMatch(/\bbranchId\b/);
  });
});
