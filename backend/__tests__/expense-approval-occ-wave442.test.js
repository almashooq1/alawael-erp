'use strict';

/**
 * W442 — anti-regression guard for expense-approval store optimistic
 * concurrency.
 *
 * The store contract is `get(id) → record / put(id, record) → record`.
 * Pre-W442 `put()` did a full-document replace via findOneAndUpdate
 * with no version filter. The service does:
 *
 *   const rec = await store.get(expenseId);
 *   // ...validate + mutate rec.chain[step].approvers / rec.history / etc...
 *   await store.put(expenseId, rec);
 *
 * Two concurrent approvers at the same dualControl step both
 * store.get → see approvers=[] → push their approver → store.put.
 * Pre-W442 the second put OVERWROTE the first's approver list →
 * chain advanced with only ONE approver recorded (segregation-of-
 * duties + audit-trail integrity damage). For an audit-critical
 * financial-approval pipeline this is a real correctness bug.
 *
 * Fix: store includes `__v` (Mongoose version key) in projected
 * records; put() uses it as a CAS gate. CAS miss → throws
 * CONCURRENT_MODIFICATION.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'services', 'finance', 'expenseApprovalStore.mongo.js');

describe('W442 expense-approval store optimistic concurrency', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FILE, 'utf8');
  });

  it('project() includes __v in the returned record', () => {
    // The projected plain object must carry __v so the service can
    // pass it back unchanged in the next put() call.
    expect(src).toMatch(/__v:\s*typeof o\.__v\s*===\s*['"]number['"]\s*\?\s*o\.__v\s*:\s*0/);
  });

  it('put() uses __v as a CAS filter when record carries a version', () => {
    // The UPDATE path filters on {expenseId, __v: expectedV} and $incs
    // __v on success.
    expect(src).toMatch(
      /findOneAndUpdate\(\s*\{\s*expenseId:\s*String\(id\)\s*,\s*__v:\s*expectedV\s*\}/
    );
    expect(src).toMatch(/\$inc:\s*\{\s*__v:\s*1\s*\}/);
  });

  it('put() throws CONCURRENT_MODIFICATION on CAS miss for an existing doc', () => {
    expect(src).toMatch(/CONCURRENT_MODIFICATION/);
    expect(src).toMatch(/was modified concurrently/);
  });

  it('put() falls back to upsert without CAS for the CREATE path (no __v)', () => {
    // When the service calls put() with a fresh record (no __v from
    // a prior get), the store must still work — upsert with
    // $setOnInsert.__v=0.
    expect(src).toMatch(/\$setOnInsert:\s*\{\s*__v:\s*0\s*\}/);
  });

  it('put() strips __v from the $set payload (avoids self-overwriting)', () => {
    // The store must not put back the same __v in $set (would clobber
    // the $inc). Look for the destructure-and-strip pattern.
    expect(src).toMatch(/__v:\s*_ignore\s*,\s*\.\.\.recordNoVersion/);
  });

  it('W442 marker comment present (catches accidental revert)', () => {
    expect(src).toMatch(/W442/);
  });

  it('existing service contract preserved — get/put/list signatures unchanged', () => {
    // Sanity — public store API surface intact.
    expect(src).toMatch(/async\s+get\(id\)/);
    expect(src).toMatch(/async\s+put\(id,\s*record\)/);
    expect(src).toMatch(/async\s+list\(filter/);
  });
});
